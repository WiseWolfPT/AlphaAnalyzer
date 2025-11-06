#!/usr/bin/env python3
"""Capture StockOracle API payloads for one or more tickers.

Usage:
    STOCKORACLE_ACCESS_TOKEN=... python3 scripts/fetch_stockoracle_payloads.py BN MS JEF

The script hits the same endpoints que recolhemos manualmente via Playwright:
  - /api/stock-detail/{ticker}
  - /api/stock-detail-intrinsic/get-pp-automation/{guid}
  - /api/stock-detail-intrinsic/get-dcf-automation/{guid}
  - /api/stock-detail-intrinsic/get-dfcf-automation/{guid}
  - /api/stock-detail-intrinsic/get-dni-automation/{guid}
  - /api/stock-detail-chart/intrinsic-value/iv-line-absolute-chart/{guid}
  - /api/stock-detail-intrinsic/intrinsic-value/other-valuation-ratio/{guid}?type=Valuation
  - /api/stock-detail-intrinsic/intrinsic-value/ratio-widget/{guid}?type=Valuation
  - /api/stock-detail/overview/public/{guid}
  - /api/stock-detail/1.1/overview/financial-ratios/{guid}

Each ticker is saved as `stockoracle_payloads/raw/raw_<ticker>.json`.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, Iterable

import requests


API_BASE = "https://api.stockoracle.com"
RAW_DIR = Path("stockoracle_payloads/raw")
COOKIE_ENV = "STOCKORACLE_COOKIE_STRING"


class FetchError(RuntimeError):
    pass


def build_session(token: str, refresh: str | None) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Origin": "https://app.stockoracle.com",
            "time-zone": "Europe/Lisbon",
            "Referer": "https://app.stockoracle.com/",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
            ),
        }
    )
    for domain in ("app.stockoracle.com", "api.stockoracle.com"):
        session.cookies.set("ACCESS_TOKEN_APP", token, domain=domain, path="/")
        session.cookies.set("TOKEN_TYPE", "ACCESS_TOKEN", domain=domain, path="/")
        if refresh:
            session.cookies.set("REFRESH_TOKEN_APP", refresh, domain=domain, path="/")

    extra_cookie = os.getenv(COOKIE_ENV)
    if extra_cookie:
        for raw_item in extra_cookie.split(";"):
            item = raw_item.strip()
            if not item or "=" not in item:
                continue
            name, value = item.split("=", 1)
            for domain in ("app.stockoracle.com", "api.stockoracle.com"):
                session.cookies.set(name.strip(), value.strip(), domain=domain, path="/")
    return session


def request_json(session: requests.Session, path: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    url = f"{API_BASE}{path}"
    response = session.get(url, params=params, timeout=30)
    try:
        data = response.json()
    except ValueError:
        raise FetchError(f"Invalid JSON response for {url!r}: {response.status_code} {response.text[:200]!r}")

    if not response.ok:
        raise FetchError(f"Request failed for {url!r}: {response.status_code} {data}")
    return data


def fetch_for_ticker(session: requests.Session, ticker: str) -> Dict[str, Any]:
    """Fetch the full payload bundle for a ticker."""
    ticker = ticker.upper()
    stock_detail = request_json(session, f"/api/stock-detail/{ticker}")

    result = {
        "meta": {"ticker": ticker, "guid": stock_detail["result"]["guid"]},
        "stock_detail": stock_detail,
    }

    guid = stock_detail["result"]["guid"]
    routes = {
        "pp": f"/api/stock-detail-intrinsic/get-pp-automation/{guid}",
        "dcf": f"/api/stock-detail-intrinsic/get-dcf-automation/{guid}",
        "dfcf": f"/api/stock-detail-intrinsic/get-dfcf-automation/{guid}",
        "dni": f"/api/stock-detail-intrinsic/get-dni-automation/{guid}",
        "iv_line": f"/api/stock-detail-chart/intrinsic-value/iv-line-absolute-chart/{guid}",
        "other_ratio": (
            f"/api/stock-detail-intrinsic/intrinsic-value/other-valuation-ratio/{guid}"
        ),
        "ratio_widget": (
            f"/api/stock-detail-intrinsic/intrinsic-value/ratio-widget/{guid}"
        ),
        "overview_public": f"/api/stock-detail/overview/public/{guid}",
        "financial_ratios": f"/api/stock-detail/1.1/overview/financial-ratios/{guid}",
    }

    for key, path in routes.items():
        params = None
        if key in {"other_ratio", "ratio_widget"}:
            params = {"type": "Valuation"}
        result[key] = request_json(session, path, params=params)

    return result


def save_payload(ticker: str, payload: Dict[str, Any]) -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / f"raw_{ticker.lower()}.json"
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    return out_path


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch StockOracle payloads for tickers.")
    parser.add_argument("tickers", nargs="+", help="Ticker symbols (e.g. BN BXSL MS)")
    parser.add_argument(
        "--refresh-token",
        dest="refresh_token",
        default=os.getenv("STOCKORACLE_REFRESH_TOKEN"),
        help="Optional refresh token cookie (also read from STOCKORACLE_REFRESH_TOKEN).",
    )
    parser.add_argument(
        "--access-token",
        dest="access_token",
        default=os.getenv("STOCKORACLE_ACCESS_TOKEN"),
        help="Access token (defaults to STOCKORACLE_ACCESS_TOKEN env variable).",
    )
    return parser.parse_args(argv)


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    if not args.access_token:
        print("error: STOCKORACLE_ACCESS_TOKEN env var (or --access-token) is required", file=sys.stderr)
        return 1

    session = build_session(args.access_token, args.refresh_token)
    failures: Dict[str, str] = {}

    for ticker in args.tickers:
        try:
            payload = fetch_for_ticker(session, ticker)
            out_path = save_payload(ticker, payload)
            print(f"[ok] {ticker.upper()} -> {out_path}")
        except Exception as exc:  # noqa: BLE001
            failures[ticker.upper()] = str(exc)
            print(f"[fail] {ticker.upper()}: {exc}", file=sys.stderr)

    if failures:
        print("\nSome tickers failed:", file=sys.stderr)
        for ticker, message in failures.items():
            print(f"  - {ticker}: {message}", file=sys.stderr)
        return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
