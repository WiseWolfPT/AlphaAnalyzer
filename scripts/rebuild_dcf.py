#!/usr/bin/env python3
"""
Reconstructs StockOracle's 20-year discounted valuation using the same inputs
exposed by the API (mirroring the historical Adam Khoo spreadsheet).

Usage:
    python scripts/rebuild_dcf.py snapshots/AAPL_intrinsic_snapshot.json --method dfcf20
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, Tuple


def _detect_base_field(result: Dict[str, float]) -> str:
    """Infer which field holds the starting cash-flow figure."""
    for field in ("freeCashFlow", "operationCashFlow", "netIncome"):
        if field in result:
            return field
    raise KeyError("Could not identify base cash-flow field in result payload.")


def _iter_projected_cashflows(
    base_value: float,
    rate1: float,
    rate2: float,
    rate3: float,
) -> Iterable[Tuple[int, float]]:
    """Yield (year, cash flow) pairs for 20 projection years."""
    cf = base_value
    for year in range(1, 21):
        if year <= 5:
            cf *= (1.0 + rate1)
        elif year <= 10:
            # year 6 reuses prior CF already grown in the previous step
            cf *= (1.0 + rate2)
        else:
            cf *= (1.0 + rate3)
        yield year, cf


def rebuild_intrinsic(result: Dict[str, float]) -> Dict[str, float]:
    """Compute PV, equity value and per-share intrinsic price from payload."""
    base_field = _detect_base_field(result)
    base_value = float(result[base_field])
    rate1 = float(result["growthRateFirsttoFifthYear"]) / 100.0
    rate2 = float(result["growthRateSixthToTenthYear"]) / 100.0
    rate3 = float(result["growthRateEleventhToTwentiethYear"]) / 100.0
    discount_rate = float(result["discountRate"]) / 100.0
    shares = float(result["sharesOutstanding"])
    total_debt = float(result["totalDebt"])
    cash_st = float(result["cashandSTInvestment"])

    discounted_sum = 0.0
    schedule = []
    for year, cash_flow in _iter_projected_cashflows(base_value, rate1, rate2, rate3):
        discount_factor = (1.0 + discount_rate) ** year
        present_value = cash_flow / discount_factor
        discounted_sum += present_value
        schedule.append(
            {
                "year": year,
                "cash_flow": cash_flow,
                "present_value": present_value,
            }
        )

    equity_value = discounted_sum - total_debt + cash_st
    intrinsic_per_share = equity_value / shares

    return {
        "baseField": base_field,
        "discountedCashFlowTotal": discounted_sum,
        "equityValue": equity_value,
        "intrinsicPerShare": intrinsic_per_share,
        "schedule": schedule,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild StockOracle DCF outputs.")
    parser.add_argument("snapshot", type=Path, help="Path to intrinsic snapshot JSON.")
    parser.add_argument(
        "--method",
        choices=("dcf", "dfcf20", "dni20"),
        help="Specific payload to inspect (default: all available)",
    )
    args = parser.parse_args()

    data = json.loads(args.snapshot.read_text())

    target_methods = [args.method] if args.method else ["dcf", "dfcf20", "dni20"]
    for method in target_methods:
        payload = data.get(method)
        if not payload or payload.get("message") is None:
            continue

        result = payload["result"]
        rebuilt = rebuild_intrinsic(result)
        intrinsic_api = float(result.get("intrinsicValue", 0.0))
        diff = rebuilt["intrinsicPerShare"] - intrinsic_api

        print(f"== {method.upper()} ==")
        print(f" Base cash-flow field : {rebuilt['baseField']}")
        print(f" Discounted CF total  : {rebuilt['discountedCashFlowTotal']:,.2f}")
        print(f" Equity value (M)     : {rebuilt['equityValue']:,.2f}")
        print(f" Intrinsic / share    : {rebuilt['intrinsicPerShare']:.4f}")
        print(f" API intrinsic / share: {intrinsic_api:.4f}")
        print(f" Difference           : {diff:.6f}\n")


if __name__ == "__main__":
    main()
