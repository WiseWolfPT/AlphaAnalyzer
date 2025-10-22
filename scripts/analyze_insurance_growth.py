#!/usr/bin/env python3
"""Explore OracleValue deltas vs growth features for any clustered dataset."""
import argparse
import json
import math
from pathlib import Path
from typing import Dict, List

import numpy as np

FEATURES = [
    "discount_rate",
    "growth_rate_first_to_fifth",
    "growth_rate_sixth_to_tenth",
    "growth_rate_eleventh_to_twentieth",
    "net_debt_per_share",
    "cash_to_debt_ratio",
]


def load_rows(path: Path) -> List[Dict]:
    return json.loads(path.read_text())


def corr(xs: List[float], ys: List[float]) -> float:
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    sx = math.sqrt(sum((x - mean_x) ** 2 for x in xs))
    sy = math.sqrt(sum((y - mean_y) ** 2 for y in ys))
    return cov / (sx * sy) if sx and sy else float("nan")


def regression(rows: List[Dict], feature_names: List[str]) -> np.ndarray:
    X = []
    y = []
    for row in rows:
        if any(row.get(f) is None for f in feature_names):
            continue
        X.append([1.0] + [row[f] for f in feature_names])
        y.append(row["delta_oracle_minus_dcf"])
    if not X:
        raise ValueError("no usable rows for regression")
    X_arr = np.array(X, dtype=float)
    y_arr = np.array(y, dtype=float)
    coeffs, *_ = np.linalg.lstsq(X_arr, y_arr, rcond=None)
    residuals = X_arr @ coeffs - y_arr
    rmse = math.sqrt(float(np.mean(residuals ** 2)))
    return coeffs, rmse


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Correlate OracleValue deltas with captured growth/leverage features."
    )
    parser.add_argument(
        "--features",
        type=Path,
        default=Path("insurance_growth_features.json"),
        help="Path to the feature dataset (default: insurance_growth_features.json).",
    )
    args = parser.parse_args()

    rows = load_rows(args.features)
    clusters: Dict[str, List[Dict]] = {}
    for row in rows:
        clusters.setdefault(row["cluster"], []).append(row)

    for cluster, cluster_rows in clusters.items():
        print(f"\n=== Cluster: {cluster} ===")
        deltas = [r["delta_oracle_minus_dcf"] for r in cluster_rows]
        for feature in FEATURES:
            values = [r[feature] for r in cluster_rows if r[feature] is not None]
            aligned = [r["delta_oracle_minus_dcf"] for r in cluster_rows if r[feature] is not None]
            if len(values) < 2:
                continue
            print(
                f"corr(delta, {feature}) = "
                f"{corr(values, aligned):.3f}"
            )
        coeffs, rmse = regression(cluster_rows, [
            "growth_rate_first_to_fifth",
            "growth_rate_sixth_to_tenth",
            "net_debt_per_share",
            "cash_to_debt_ratio",
        ])
        coef_str = ", ".join(f"{c:.3f}" for c in coeffs)
        print(f"OLS coeffs [intercept, g1-5, g6-10, netDebt/share, cash/debt] = {coef_str}")
        print(f"RMSE ≈ {rmse:.2f} USD")

    cluster_names = list(clusters.keys())
    if len(cluster_names) == 2:
        flag_cluster = cluster_names[0]
        usable_rows = [
            r for r in rows
            if all(r.get(f) is not None for f in [
                "growth_rate_first_to_fifth",
                "growth_rate_sixth_to_tenth",
                "net_debt_per_share",
                "cash_to_debt_ratio",
            ])
        ]
        if len(usable_rows) >= 2:
            X = []
            y = []
            for r in usable_rows:
                flag = 1.0 if r["cluster"] == flag_cluster else 0.0
                base = [
                    r["growth_rate_first_to_fifth"],
                    r["growth_rate_sixth_to_tenth"],
                    r["net_debt_per_share"],
                    r["cash_to_debt_ratio"],
                ]
                X.append([1.0, flag] + base + [flag * v for v in base])
                y.append(r["delta_oracle_minus_dcf"])
            X_arr = np.array(X, dtype=float)
            y_arr = np.array(y, dtype=float)
            coeffs, *_ = np.linalg.lstsq(X_arr, y_arr, rcond=None)
            rmse = math.sqrt(float(np.mean((X_arr @ coeffs - y_arr) ** 2)))
            coef_str = ", ".join(f"{c:.3f}" for c in coeffs)
            print(
                f"\nCombined model coeffs [intercept, {flag_cluster}_flag, "
                "g1-5, g6-10, netDebt/share, cash/debt, "
                f"{flag_cluster}*g1-5, {flag_cluster}*g6-10, "
                f"{flag_cluster}*netDebt/share, {flag_cluster}*cash/debt] ="
            )
            print(coef_str)
            print(f"RMSE ≈ {rmse:.2f} USD")


if __name__ == "__main__":
    main()
