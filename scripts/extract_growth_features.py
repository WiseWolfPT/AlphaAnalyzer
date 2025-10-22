#!/usr/bin/env python3
"""
Build a growth-feature dataset (discount rate, projected growth, leverage proxies)
for a list of tickers using the captured intrinsic-value snapshots.

Usage examples:

  # Recreate the insurance dataset (order follows the --group sequence)
  python scripts/extract_growth_features.py \
      --group life=AFL \
      --group p_and_c=AIG,ALL,CB,HIG \
      --group life=LNC,MET,MFC \
      --group p_and_c=PGR \
      --group life=PRU,SLF \
      --group p_and_c=TRV \
      --group life=UNM \
      --output insurance_growth_features.json

  # Generate asset-manager features
  python scripts/extract_growth_features.py \
      --group traditional=BLK,TROW \
      --group alternative=BX,KKR,APO,ARES \
      --output asset_manager_growth_features.json
"""
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional


@dataclass
class TickerGroup:
    cluster: str
    tickers: List[str]


def _parse_group(raw: str) -> TickerGroup:
    if "=" not in raw:
        raise ValueError(f"Invalid --group payload '{raw}'. Expected format '<cluster>=T1,T2,...'.")
    cluster, raw_tickers = raw.split("=", 1)
    tickers = [t.strip().upper() for t in raw_tickers.split(",") if t.strip()]
    if not tickers:
        raise ValueError(f"No tickers provided for cluster '{cluster}'.")
    return TickerGroup(cluster=cluster.strip(), tickers=tickers)


def _load_dataset(path: Path) -> Dict[str, Dict]:
    data = json.loads(path.read_text())
    if not isinstance(data, list):
        raise TypeError("oracle_dataset.json is expected to be a list of entries.")
    return {entry["symbol"]: entry for entry in data if "symbol" in entry}


def _safe_float(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _detect_base_field(result: Dict[str, float]) -> Optional[str]:
    for field in ("freeCashFlow", "operationCashFlow", "netIncome"):
        if field in result and _safe_float(result.get(field)) is not None:
            return field
    return None


def _compute_net_debt_per_share(total_debt: Optional[float],
                                cash_st: Optional[float],
                                shares_outstanding: Optional[float]) -> Optional[float]:
    if total_debt is None or cash_st is None or shares_outstanding in (None, 0):
        return None
    return (total_debt - cash_st) / shares_outstanding


def _compute_cash_to_debt_ratio(cash_st: Optional[float],
                                total_debt: Optional[float]) -> Optional[float]:
    if cash_st is None or total_debt is None:
        return None
    if total_debt == 0:
        return None
    return cash_st / total_debt


def _load_snapshot(snapshot_dir: Path, symbol: str) -> Dict:
    path = snapshot_dir / f"{symbol}_intrinsic_snapshot.json"
    if not path.exists():
        raise FileNotFoundError(f"Snapshot not found for symbol '{symbol}' at {path}")
    return json.loads(path.read_text())


def _extract_row(symbol: str,
                 cluster: str,
                 dataset_entry: Dict,
                 snapshot: Dict) -> Dict:
    dcf_payload = snapshot.get("dcf", {}).get("result")
    if not dcf_payload:
        raise KeyError(f"Snapshot for {symbol} missing DCF payload (dcf.result).")

    discount_rate = _safe_float(dcf_payload.get("discountRate"))
    growth_1_5 = _safe_float(dcf_payload.get("growthRateFirsttoFifthYear"))
    growth_6_10 = _safe_float(dcf_payload.get("growthRateSixthToTenthYear"))
    growth_11_20 = _safe_float(dcf_payload.get("growthRateEleventhToTwentiethYear"))
    total_debt = _safe_float(dcf_payload.get("totalDebt"))
    cash_st = _safe_float(dcf_payload.get("cashandSTInvestment"))
    shares = _safe_float(dcf_payload.get("sharesOutstanding"))

    net_debt_share = _compute_net_debt_per_share(total_debt, cash_st, shares)
    cash_to_debt = _compute_cash_to_debt_ratio(cash_st, total_debt)

    metrics = dataset_entry.get("metrics", {}) if dataset_entry else {}
    dcf20 = _safe_float(metrics.get("Discounted Cash Flow 20-year (DCF-20) Value"))
    if dcf20 is None:
        intrinsic_value = _safe_float(dcf_payload.get("intrinsicValue"))
        dcf20 = intrinsic_value

    oracle_value = _safe_float(dataset_entry.get("oracle"))
    if oracle_value is None:
        oracle_value = _safe_float(snapshot.get("pp", {}).get("result", {}).get("intrinsicValue"))
    if oracle_value is None or dcf20 is None:
        raise ValueError(f"Unable to determine oracle/DCF20 values for {symbol}.")

    row = {
        "symbol": symbol,
        "cluster": cluster,
        "oracle": oracle_value,
        "dcf20": dcf20,
        "delta_oracle_minus_dcf": oracle_value - dcf20,
        "discount_rate": discount_rate,
        "growth_rate_first_to_fifth": growth_1_5,
        "growth_rate_sixth_to_tenth": growth_6_10,
        "growth_rate_eleventh_to_twentieth": growth_11_20,
        "net_debt_per_share": net_debt_share,
        "cash_to_debt_ratio": cash_to_debt,
    }

    base_field = _detect_base_field(dcf_payload)
    if base_field:
        row["base_cashflow_field"] = base_field

    sector = dataset_entry.get("sector")
    industry = dataset_entry.get("industry")
    if sector is not None:
        row["sector"] = sector
    if industry is not None:
        row["industry"] = industry

    return row


def iter_rows(groups: Iterable[TickerGroup],
             dataset_map: Dict[str, Dict],
             snapshot_dir: Path) -> Iterable[Dict]:
    for group in groups:
        for symbol in group.tickers:
            dataset_entry = dataset_map.get(symbol)
            snapshot = _load_snapshot(snapshot_dir, symbol)
            yield _extract_row(symbol, group.cluster, dataset_entry, snapshot)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract growth features from intrinsic snapshots.")
    parser.add_argument(
        "--group",
        action="append",
        required=True,
        help="Cluster and tickers in the form '<cluster>=SYM1,SYM2'. "
             "May be provided multiple times to control output ordering.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Destination JSON file for the extracted features.",
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("oracle_dataset.json"),
        help="Path to the oracle dataset JSON (default: oracle_dataset.json).",
    )
    parser.add_argument(
        "--snapshots-dir",
        type=Path,
        default=Path("snapshots"),
        help="Directory containing '<SYMBOL>_intrinsic_snapshot.json' captures.",
    )

    args = parser.parse_args()
    groups = [_parse_group(raw) for raw in args.group]
    dataset_map = _load_dataset(args.dataset)

    rows = list(iter_rows(groups, dataset_map, args.snapshots_dir))
    args.output.write_text(json.dumps(rows, indent=2) + "\n")
    print(f"Wrote {len(rows)} rows to {args.output}")


if __name__ == "__main__":
    main()
