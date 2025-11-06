#!/usr/bin/env python3
"""Generate consolidated StockOracle payloads from raw API captures.

The raw JSON responses captured via Chrome DevTools live in
`stockoracle_payloads/raw_*.json`. This script normalises those responses into
the compact shape used throughout the repository, emitting two aggregated
files:

  - `stockoracle_payloads/healthcare_plans_extra_2025-10-27.json`
  - `stockoracle_payloads/auto_cluster_extra_2025-10-27.json`
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple


RAW_DIR = Path("stockoracle_payloads")
RAW_SOURCE_DIR = RAW_DIR / "raw"

HEALTHCARE_TICKERS = ["CNC", "MOH", "CVS", "OSCR"]
AUTO_TICKERS = ["STLA", "NIO", "LI", "XPEV"]


def load_raw(ticker: str) -> Dict[str, Any]:
    raw_path = RAW_SOURCE_DIR / f"raw_{ticker.lower()}.json"
    return json.loads(raw_path.read_text())


def to_float(value: Any) -> float | None:
    if value in (None, "", "null"):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def reduce_ratios(items: Iterable[Dict[str, Any]]) -> Dict[str, float | None]:
    mapping: Dict[str, float | None] = {}
    for item in items:
        mapping[item["name"]] = to_float(item.get("value"))
    return mapping


def iv_lookup(data: Dict[str, Any]) -> Dict[str, Tuple[float | None, float | None]]:
    result: Dict[str, Tuple[float | None, float | None]] = {}
    for entry in data.get("result", {}).get("data", []):
        if len(entry) >= 3:
            result[entry[0]] = (to_float(entry[1]), to_float(entry[2]))
    return result


def build_healthcare_payload(ticker: str) -> Dict[str, Any]:
    data = load_raw(ticker)
    detail = data["stock_detail"]["result"]
    pp = data["pp"]["result"]
    dcf = data["dcf"]["result"]
    dfcf = data.get("dfcf", {}).get("result", {})
    ratios = reduce_ratios(data["other_ratio"]["result"])
    iv = iv_lookup(data["iv_line"])

    def metric(metric_id: str) -> Tuple[float | None, float | None]:
        return iv.get(metric_id, (None, None))

    dcf20, dcf_pct = metric("1863")
    dfcf20, dfcf_pct = metric("2315")
    dni20, dni_pct = metric("1865")
    dfcf_terminal, dfcf_terminal_pct = metric("1867")
    _, oracle_pct = metric("1871")

    multiples = {
        "meanPE": ratios.get("Mean Price to Earnings (PE) Value"),
        "meanPE_noNRI": ratios.get("Mean Price to Earnings (PE) Value without NRI"),
        "meanPS": ratios.get("Mean Price to Sales (PS) Value"),
        "meanPB": ratios.get("Mean Price to Book (PB) Value"),
        "medianPE": ratios.get("Median Price to Earnings (PE) Value"),
        "medianPS": ratios.get("Median Price to Sales (PS) Value"),
        "medianPB": ratios.get("Median Price to Book (PB) Value"),
        "ruleOf40": ratios.get("Rule of 40"),
    }

    payload = {
        "ticker": detail["symbol"],
        "sector": detail["sector"],
        "industry": detail["industry"],
        "stockId": detail["id"],
        "guid": detail["guid"],
        "oracleValue": pp["intrinsicValue"],
        "oraclePremiumPct": pp.get("discountandPremium", oracle_pct),
        "dcf20": dcf20,
        "dcfBaseOn": dcf.get("baseOn"),
        "dcfPremiumPct": dcf_pct,
        "dfcf20": dfcf20,
        "dfcfPremiumPct": dfcf_pct,
        "dni20": dni20,
        "dniPremiumPct": dni_pct,
        "method_dcf": dcf.get("method"),
        "method_dfcf": dfcf.get("method"),
        "method_dni": 2,
        "growth": {
            "g1_5": dcf.get("growthRateFirsttoFifthYear"),
            "g6_10": dcf.get("growthRateSixthToTenthYear"),
            "g11_20": dcf.get("growthRateEleventhToTwentiethYear"),
        },
        "discountRate": dcf.get("discountRate"),
        "multiples": multiples,
        "ivChart": data["iv_line"]["result"]["data"],
    }

    if dfcf_terminal is not None:
        payload["dfcfTerminal"] = dfcf_terminal
        payload["dfcfTerminalPremiumPct"] = dfcf_terminal_pct

    return payload


def build_auto_payload(ticker: str) -> Dict[str, Any]:
    data = load_raw(ticker)
    detail = data["stock_detail"]["result"]
    pp = data["pp"]["result"]
    dcf = data["dcf"]["result"]
    ratios = reduce_ratios(data["other_ratio"]["result"])
    iv = iv_lookup(data["iv_line"])

    def metric(metric_id: str) -> Tuple[float | None, float | None]:
        return iv.get(metric_id, (None, None))

    dcf20, dcf_pct = metric("1863")
    dfcf20, dfcf_pct = metric("2315")
    dni20, dni_pct = metric("1865")
    dfcf_terminal, dfcf_terminal_pct = metric("1867")
    _, oracle_pct = metric("1871")

    multiples = {
        "meanPE": ratios.get("Mean Price to Earnings (PE) Value"),
        "meanPE_noNRI": ratios.get("Mean Price to Earnings (PE) Value without NRI"),
        "meanPS": ratios.get("Mean Price to Sales (PS) Value"),
        "meanPB": ratios.get("Mean Price to Book (PB) Value"),
        "medianPE": ratios.get("Median Price to Earnings (PE) Value"),
        "medianPS": ratios.get("Median Price to Sales (PS) Value"),
        "medianPB": ratios.get("Median Price to Book (PB) Value"),
        "ruleOf40": ratios.get("Rule of 40"),
    }

    payload = {
        "ticker": detail["symbol"],
        "sector": detail["sector"],
        "industry": detail["industry"],
        "stockId": detail["id"],
        "guid": detail["guid"],
        "oracleValue": pp["intrinsicValue"],
        "oraclePremiumPct": pp.get("discountandPremium", oracle_pct),
        "dcf20": dcf20,
        "dcfBaseOn": dcf.get("baseOn"),
        "dcfPremiumPct": dcf_pct,
        "dfcf20": dfcf20,
        "dfcfPremiumPct": dfcf_pct,
        "dni20": dni20,
        "dniPremiumPct": dni_pct,
        "growth": {
            "g1_5": dcf.get("growthRateFirsttoFifthYear"),
            "g6_10": dcf.get("growthRateSixthToTenthYear"),
            "g11_20": dcf.get("growthRateEleventhToTwentiethYear"),
        },
        "discountRate": dcf.get("discountRate"),
        "multiples": multiples,
        "ivChart": data["iv_line"]["result"]["data"],
    }

    if dfcf_terminal is not None:
        payload["dfcfTerminal"] = dfcf_terminal
        payload["dfcfTerminalPremiumPct"] = dfcf_terminal_pct

    return payload


def main() -> None:
    healthcare_payloads = [build_healthcare_payload(t) for t in HEALTHCARE_TICKERS]
    auto_payloads = [build_auto_payload(t) for t in AUTO_TICKERS]

    (RAW_DIR / "healthcare_plans_extra_2025-10-27.json").write_text(
        json.dumps(healthcare_payloads, indent=2) + "\n"
    )
    (RAW_DIR / "auto_cluster_extra_2025-10-27.json").write_text(
        json.dumps(auto_payloads, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
