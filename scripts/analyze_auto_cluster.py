#!/usr/bin/env python3
"""
Generic diagnostics helper for StockOracle payload snapshots.

Given a JSON array (as exported via Chrome DevTools from the StockOracle APIs),
the script prints:
  * Ratios Oracle/DCF, Oracle/Mean{PS,PB} por ticker;
  * Resumo por cluster (medianas) – cluster pode vir do ficheiro ou ser
    imposto via `--cluster-map`;
  * Regressões simples (OLS) para estimar pesos de DCF e múltiplos.

Exemplos:
    python scripts/analyze_auto_cluster.py \
        --input stockoracle_payloads/auto_cluster_2025-10-25.json \
        --cluster-map TSLA=EV,RIVN=EV,LCID=EV,GM=Detroit,F=Detroit,TM=Japan,HMC=Japan

    python scripts/analyze_auto_cluster.py \
        --input stockoracle_payloads/utilities_cluster_2025-10-25.json \
        --cluster-field industry

O nome do ficheiro mantém-se por compatibilidade, mas o script é genérico.
"""

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np


@dataclass
class TickerRecord:
    ticker: str
    oracle: float
    dcf: Optional[float]
    mean_ps: Optional[float]
    mean_pb: Optional[float]
    mean_pe: Optional[float]
    rule40: Optional[float]
    discount_rate: Optional[float]
    growth_1_5: Optional[float]
    growth_6_10: Optional[float]
    growth_11_20: Optional[float]
    cluster: str

    @property
    def ratio_oracle_dcf(self) -> Optional[float]:
        return self._safe_ratio(self.oracle, self.dcf)

    @property
    def ratio_oracle_mean_ps(self) -> Optional[float]:
        return self._safe_ratio(self.oracle, self.mean_ps)

    @property
    def ratio_oracle_mean_pb(self) -> Optional[float]:
        return self._safe_ratio(self.oracle, self.mean_pb)

    @property
    def ratio_oracle_mean_pe(self) -> Optional[float]:
        return self._safe_ratio(self.oracle, self.mean_pe)

    @staticmethod
    def _safe_ratio(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
        if numerator is None or denominator in (None, 0):
            return None
        return numerator / denominator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze StockOracle payload snapshots (ratios + regressions).")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("stockoracle_payloads/auto_cluster_2025-10-25.json"),
        help="Path to JSON payload exported from StockOracle.",
    )
    parser.add_argument(
        "--cluster-field",
        type=str,
        default="cluster",
        help="Campo a usar como cluster caso `--cluster-map` não cubra o ticker (default: cluster, depois industry/sector).",
    )
    parser.add_argument(
        "--cluster-map",
        type=str,
        default="",
        help="Mapeamento manual ticker=Cluster separado por vírgulas (ex.: TSLA=EV,GM=Detroit).",
    )
    parser.add_argument(
        "--fallback-cluster-fields",
        type=str,
        default="industry,sector",
        help="Lista (separada por vírgulas) de campos alternativos para cluster caso o principal esteja vazio.",
    )
    return parser.parse_args()


def parse_cluster_map(raw: str) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    if not raw:
        return mapping
    parts = [item.strip() for item in raw.split(",") if item.strip()]
    for part in parts:
        if "=" not in part:
            raise ValueError(f"Mapa inválido (falta '='): {part}")
        ticker, cluster = part.split("=", 1)
        mapping[ticker.strip().upper()] = cluster.strip()
    return mapping


def resolve_cluster(
    item: Dict,
    ticker: str,
    mapping: Dict[str, str],
    primary_field: str,
    fallback_fields: Sequence[str],
) -> str:
    key = ticker.upper()
    if key in mapping:
        return mapping[key]
    # tenta campo primário
    value = item.get(primary_field)
    if isinstance(value, str) and value.strip():
        return value.strip()
    # tenta fallback
    for field in fallback_fields:
        candidate = item.get(field)
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return "Unclustered"


def load_records(path: Path, cluster_args: argparse.Namespace) -> List[TickerRecord]:
    data = json.loads(path.read_text())
    records: List[TickerRecord] = []
    mapping = parse_cluster_map(cluster_args.cluster_map)
    fallback_fields = [field.strip() for field in cluster_args.fallback_cluster_fields.split(",") if field.strip()]
    for item in data:
        ticker = item["ticker"]
        multiples = item.get("multiples") or {}
        growth = item.get("growth") or {}
        cluster = resolve_cluster(item, ticker, mapping, cluster_args.cluster_field, fallback_fields)
        records.append(
            TickerRecord(
                ticker=ticker,
                oracle=item.get("oracleValue"),
                dcf=item.get("dcf20"),
                mean_ps=_to_float(multiples.get("meanPS")),
                mean_pb=_to_float(multiples.get("meanPB")),
                mean_pe=_to_float(multiples.get("meanPE")),
                rule40=_to_float(multiples.get("ruleOf40")),
                discount_rate=_to_float(item.get("discountRate")),
                growth_1_5=_to_float(growth.get("g1_5")),
                growth_6_10=_to_float(growth.get("g6_10")),
                growth_11_20=_to_float(growth.get("g11_20")),
                cluster=cluster,
            )
        )
    return records


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def describe_ratios(records: Iterable[TickerRecord]) -> None:
    header = (
        "Ticker  Cluster           Oracle  DCF    Oracle/DCF  Oracle/MeanPS  "
        "Oracle/MeanPB  Rule40  DiscRate  g1_5  g6_10"
    )
    print(header)
    print("-" * len(header))
    for rec in records:
        row = [
            f"{rec.ticker:<6}",
            f"{rec.cluster:<16}",
            f"{rec.oracle:>7.2f}" if rec.oracle is not None else "   n/a ",
            f"{rec.dcf:>7.2f}" if rec.dcf is not None else "   n/a ",
            _fmt_ratio(rec.ratio_oracle_dcf),
            _fmt_ratio(rec.ratio_oracle_mean_ps),
            _fmt_ratio(rec.ratio_oracle_mean_pb),
            _fmt_ratio(rec.rule40, digits=2),
            _fmt_ratio(rec.discount_rate, digits=2),
            _fmt_ratio(rec.growth_1_5, digits=2),
            _fmt_ratio(rec.growth_6_10, digits=2),
        ]
        print("  ".join(row))
    print()


def _fmt_ratio(value: Optional[float], digits: int = 2) -> str:
    if value is None:
        return "   n/a "
    return f"{value:>7.{digits}f}"


def cluster_summary(records: Sequence[TickerRecord]) -> None:
    print("Cluster summaries (median ratios):")
    print("Cluster           #  med(Oracle/DCF)  med(Oracle/MeanPS)  med(Oracle/MeanPB)")
    print("--------------------------------------------------------------------------")
    cluster_names = sorted({rec.cluster for rec in records})
    for name in cluster_names:
        cluster_records = [rec for rec in records if rec.cluster == name]
        ratios = _median_ratios(cluster_records)
        print(
            f"{name:<16}  {len(cluster_records):>2}      "
            f"{ratios['oracle_dcf']:>7}             {ratios['oracle_mean_ps']:>7}             {ratios['oracle_mean_pb']:>7}"
        )
    print()


def _median_ratios(records: Sequence[TickerRecord]) -> Dict[str, str]:
    from statistics import median

    def median_safe(values: Sequence[Optional[float]]) -> str:
        numeric_values = [v for v in values if v is not None]
        if not numeric_values:
            return "n/a"
        return f"{median(numeric_values):.2f}"

    return {
        "oracle_dcf": median_safe([rec.ratio_oracle_dcf for rec in records]),
        "oracle_mean_ps": median_safe([rec.ratio_oracle_mean_ps for rec in records]),
        "oracle_mean_pb": median_safe([rec.ratio_oracle_mean_pb for rec in records]),
    }


def run_regressions(records: Sequence[TickerRecord]) -> None:
    combos: List[Tuple[str, Tuple[str, ...]]] = [
        ("DCF + MeanPS + MeanPB", ("dcf", "mean_ps", "mean_pb")),
        ("MeanPS + MeanPB", ("mean_ps", "mean_pb")),
        ("DCF only", ("dcf",)),
        ("MeanPB only", ("mean_pb",)),
    ]
    print("OLS regressions (OracleValue ≈ Σ θᵢ·featureᵢ + δ):")
    for cluster_name in sorted({rec.cluster for rec in records}):
        cluster_records = [rec for rec in records if rec.cluster == cluster_name]
        print(f"  Cluster: {cluster_name} (n={len(cluster_records)})")
        fitted_any = False
        for label, features in combos:
            X, y, tickers = _build_design_matrix(cluster_records, features=features)
            if len(y) < len(features) + 1:  # need >= features + intercept observations
                continue
            coefs, residuals = _ols(X, y)
            rmse = float(np.sqrt(residuals.item() / len(y))) if residuals.size else 0.0
            coeff_str = ", ".join(f"{name}={float(value):6.3f}" for name, value in zip(features, coefs[:-1]))
            delta = float(coefs[-1])
            print(f"    [{label:<22}] {coeff_str}, δ={delta:7.3f}, RMSE={rmse:6.3f}")
            _print_predictions(X, y, coefs, tickers)
            fitted_any = True
        if not fitted_any:
            print("    [skip] insuficient data for all model combos.")
    print()


def _build_design_matrix(
    records: Sequence[TickerRecord],
    features: Tuple[str, ...],
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    rows: List[List[float]] = []
    targets: List[float] = []
    tickers: List[str] = []
    for rec in records:
        values: List[float] = []
        skip = False
        for feature in features:
            value = getattr(rec, feature if feature.startswith("ratio_") else _feature_map(feature))
            if value is None:
                skip = True
                break
            values.append(value)
        if skip or rec.oracle is None:
            continue
        rows.append(values + [1.0])  # add intercept column
        targets.append(rec.oracle)
        tickers.append(rec.ticker)
    if not rows:
        return np.empty((0, len(features) + 1)), np.empty((0,)), tickers
    return np.array(rows, dtype=float), np.array(targets, dtype=float), tickers


def _feature_map(name: str) -> str:
    return {
        "dcf": "dcf",
        "mean_ps": "mean_ps",
        "mean_pb": "mean_pb",
        "mean_pe": "mean_pe",
    }.get(name, name)


def _ols(X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    coefs, residuals, *_ = np.linalg.lstsq(X, y, rcond=None)
    return np.asarray(coefs, dtype=float).reshape(-1), residuals


def _print_predictions(X: np.ndarray, y: np.ndarray, coefs: np.ndarray, tickers: List[str]) -> None:
    preds = X @ coefs
    diffs = preds - y
    print("      └─ residuals:", ", ".join(f"{t}:{d:+.2f}" for t, d in zip(tickers, diffs)))


def main() -> None:
    args = parse_args()
    records = load_records(args.input, args)
    describe_ratios(records)
    cluster_summary(records)
    run_regressions(records)


if __name__ == "__main__":
    main()
