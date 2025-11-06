#!/usr/bin/env python3
"""
Prototype implementation of the inferred OracleValue formula.

Reads:
  - data/oracle_dataset.csv (dataset consolidado)
  - data/industry_coefficients.csv (cap_ps, cap_pb, alpha_dcf por indústria)

Produces:
  - data/oracle_formula_prototype.csv com previsão, erro absoluto e relativo
  - imprime métricas globais (MAE, RMSE, MAPE) e medianas por indústria
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Callable, Dict, Optional

import pandas as pd

DATASET_PATH = Path("data/oracle_dataset.csv")
COEFF_PATH = Path("data/industry_coefficients.csv")
OUTPUT_PATH = Path("data/oracle_formula_prototype.csv")

CandidateDict = Dict[str, Optional[float]]
StrategyFunc = Callable[[CandidateDict, pd.Series, Dict[str, float]], Optional[float]]


DEFAULT_STRATEGY = "min_all"

STRATEGY_MAP: Dict[str, str] = {
    # Consumer Cyclical
    "Auto - Manufacturers": "auto_manufacturers",
    # Financials
    "Banks - Diversified": "min_ps_pb",
    "Banks - Regional": "min_ps_pb",
    "Financial - Capital Markets": "mean_ps_pb",
    "Financial - Credit Services": "median_all",
    # Healthcare
    "Biotechnology": "max_ps_pb",
    "Drug Manufacturers - General": "dcf_pref_ps_cap",
    "Medical - Healthcare Plans": "healthcare_plans",
    # Real Estate
    "REIT - Diversified": "min_ps_pb",
    "REIT - Industrial": "min_ps_pb",
    "REIT - Office": "mean_ps_pb",
    "REIT - Retail": "median_all",
    "REIT - Specialty": "max_ps_pb",
    # Utilities / Energy infrastructure
    "Diversified Utilities": "max_ps_pb",
    "Independent Power Producers": "mean_ps_pb",
    "Regulated Electric": "max_ps_pb",
    "Regulated Gas": "max_ps_pb",
}


AUTO_CLUSTER_MAP: Dict[str, str] = {
    # Legacy clusters calibrated via analyze_auto_cluster.py (27 Oct 2025)
    "TSLA": "EV_MATURE",
    "RIVN": "EV_MATURE",
    "LCID": "EV_MATURE",
    "GM": "DETROIT",
    "F": "DETROIT",
    "STLA": "DETROIT",
    "TM": "JAPAN",
    "HMC": "JAPAN",
    "NIO": "EV_NEW",
    "LI": "EV_NEW",
}

AUTO_CLUSTER_PARAMS: Dict[str, Dict[str, float]] = {
    # slope/intercept refer to pb_cap (cap_pb * meanPB) space.
    "DETROIT": {"slope": 0.5415261466069529, "intercept": 7.488623205645375},
    "JAPAN": {"slope": 1.0756594532031405, "intercept": -0.6611448668749823},
    "EV_MATURE": {"slope": 0.4703700151526501, "intercept": 17.473052317660336},
    "EV_NEW": {"slope": 0.8295934729324271, "intercept": 6.320115265215403},
}


def _agg_min_ps_pb(
    candidates: CandidateDict, _row: pd.Series, _coeffs: Dict[str, float]
) -> float | None:
    values = [candidates[key] for key in ("ps", "pb") if candidates.get(key) is not None]
    return min(values) if values else None


def _agg_max_ps_pb(
    candidates: CandidateDict, _row: pd.Series, _coeffs: Dict[str, float]
) -> float | None:
    values = [candidates[key] for key in ("ps", "pb") if candidates.get(key) is not None]
    return max(values) if values else None


def _agg_median_all(
    candidates: CandidateDict, _row: pd.Series, _coeffs: Dict[str, float]
) -> float | None:
    values = sorted(value for value in candidates.values() if value is not None)
    if not values:
        return None
    mid = len(values) // 2
    if len(values) % 2 == 0:
        return (values[mid - 1] + values[mid]) / 2
    return values[mid]


def _agg_mean_ps_pb(
    candidates: CandidateDict, _row: pd.Series, _coeffs: Dict[str, float]
) -> float | None:
    values = [candidates[key] for key in ("ps", "pb") if candidates.get(key) is not None]
    if not values:
        return None
    return sum(values) / len(values)


def _agg_min_all(
    candidates: CandidateDict, _row: pd.Series, _coeffs: Dict[str, float]
) -> float | None:
    values = [value for value in candidates.values() if value is not None]
    return min(values) if values else None


def _agg_dcf_only(
    candidates: CandidateDict, _row: pd.Series, _coeffs: Dict[str, float]
) -> float | None:
    return candidates.get("dcf")


def _agg_dcf_pref_ps_cap(
    candidates: CandidateDict, row: pd.Series, coeffs: Dict[str, float], threshold: float = 1.5
) -> float | None:
    dcf = candidates.get("dcf")
    ps = candidates.get("ps")
    if dcf is not None:
        if ps is not None and dcf > ps * threshold:
            return ps
        return dcf
    # Fall back to a robust central tendency when DCF is missing.
    return _agg_median_all(candidates, row, coeffs)


def _agg_healthcare_plans(
    candidates: CandidateDict, row: pd.Series, coeffs: Dict[str, float]
) -> float | None:
    ps_cap = candidates.get("ps")
    pb_cap = candidates.get("pb")
    if ps_cap is None and pb_cap is None:
        return candidates.get("dcf")

    base_candidates = [value for value in (ps_cap, pb_cap) if value is not None]
    base_min = min(base_candidates) if base_candidates else None
    if base_min is None:
        return candidates.get("dcf")

    base_mean = sum(base_candidates) / len(base_candidates)

    dcf_cap = candidates.get("dcf") or 0.0
    rule_40 = float(row.get("ruleOf40") or 0.0)
    growth_short = float(row.get("growth_1_5") or 0.0)

    estimate = (
        8.137664126607303 * base_min
        - 7.393590786022628 * base_mean
        - 0.16966873298208468 * dcf_cap
        + 43.40643005549187 * rule_40
        + 10.084686443820788 * growth_short
        - 507.36973485168613
    )

    # Guardrails: keep within reasonable band vs. observed caps/DCF
    if dcf_cap:
        lower = min(base_min, dcf_cap) * 0.6
        upper = max(base_candidates + [dcf_cap]) * 1.4
    else:
        lower = base_min * 0.6
        upper = max(base_candidates) * 1.35

    return max(lower, min(upper, estimate))


def _agg_auto_manufacturers(
    candidates: CandidateDict, row: pd.Series, coeffs: Dict[str, float]
) -> float | None:
    pb_cap = candidates.get("pb")
    ps_cap = candidates.get("ps")
    dcf_cap = candidates.get("dcf")

    ticker = str(row.get("ticker") or "").upper()
    cluster = AUTO_CLUSTER_MAP.get(ticker)

    if cluster is None:
        mean_pb = to_positive(row.get("meanPB"))
        rule_40 = row.get("ruleOf40") or 0.0
        if mean_pb is not None and mean_pb < 2:
            cluster = "EV_NEW" if rule_40 < 0 else "EV_MATURE"
        elif mean_pb is not None and mean_pb < 60:
            cluster = "DETROIT"
        elif rule_40 >= 10:
            cluster = "JAPAN"
        else:
            cluster = "DETROIT"

    params = AUTO_CLUSTER_PARAMS.get(cluster)

    if params and pb_cap is not None:
        estimate = params["slope"] * pb_cap + params["intercept"]

        # Blend slightly with DCF for EV clusters when the multiple is thin.
        if cluster in {"EV_MATURE", "EV_NEW"} and dcf_cap is not None and not math.isnan(dcf_cap):
            mix = 0.3 if pb_cap < 25 else 0.15
            estimate = (1 - mix) * estimate + mix * dcf_cap

        if estimate > 0:
            return estimate

    base = _agg_min_ps_pb(candidates, row, coeffs)
    if base is not None:
        return base

    if dcf_cap is not None and not math.isnan(dcf_cap):
        return dcf_cap

    fallback = ps_cap if ps_cap is not None else pb_cap
    return fallback
STRATEGY_FUNCS: Dict[str, StrategyFunc] = {
    "min_ps_pb": _agg_min_ps_pb,
    "max_ps_pb": _agg_max_ps_pb,
    "median_all": _agg_median_all,
    "mean_ps_pb": _agg_mean_ps_pb,
    "min_all": _agg_min_all,
    "dcf_only": _agg_dcf_only,
    "dcf_pref_ps_cap": _agg_dcf_pref_ps_cap,
    "healthcare_plans": _agg_healthcare_plans,
    "auto_manufacturers": _agg_auto_manufacturers,
}


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    dataset = pd.read_csv(DATASET_PATH)
    coeffs = pd.read_csv(COEFF_PATH)
    coeffs = coeffs.rename(
        columns={
            "industry": "industry",
            "cap_ps": "cap_ps",
            "cap_pb": "cap_pb",
            "alpha_dcf": "alpha_dcf",
        }
    )
    coeffs = coeffs.set_index("industry")
    return dataset, coeffs


def to_positive(value: float | int | None) -> float | None:
    if value is None or isinstance(value, str):
        return None
    if isinstance(value, (int, float)):
        if math.isnan(value) or value <= 0:
            return None
        return float(value)
    return None


def predict_row(row: pd.Series, coeffs: Dict[str, float], strategy: str) -> tuple[float | None, str | None]:
    mean_ps = to_positive(row.get("meanPS"))
    mean_pb = to_positive(row.get("meanPB"))
    dcf20 = to_positive(row.get("dcf20"))

    cap_ps = to_positive(coeffs.get("cap_ps"))
    cap_pb = to_positive(coeffs.get("cap_pb"))
    alpha_dcf = to_positive(coeffs.get("alpha_dcf"))

    candidates: CandidateDict = {
        "ps": cap_ps * mean_ps if (cap_ps and mean_ps) else None,
        "pb": cap_pb * mean_pb if (cap_pb and mean_pb) else None,
        "dcf": alpha_dcf * dcf20 if (alpha_dcf and dcf20) else None,
    }

    func = STRATEGY_FUNCS.get(strategy)
    applied_strategy = strategy if func else DEFAULT_STRATEGY
    func = func or STRATEGY_FUNCS[DEFAULT_STRATEGY]

    estimate = func(candidates, row, coeffs)
    if estimate is not None:
        return estimate, applied_strategy

    default_estimate = STRATEGY_FUNCS[DEFAULT_STRATEGY](candidates, row, coeffs)
    if default_estimate is not None:
        return default_estimate, DEFAULT_STRATEGY

    fallback_pool = [
        ("fallback:meanPS", mean_ps),
        ("fallback:meanPB", mean_pb),
        ("fallback:meanPE", to_positive(row.get("meanPE"))),
        ("fallback:meanPE_noNRI", to_positive(row.get("meanPE_noNRI"))),
    ]
    for label, value in fallback_pool:
        if value:
            return value, label

    return None, None


def main() -> None:
    dataset, coeffs_df = load_data()

    predictions: list[float | None] = []
    strategies_used: list[str | None] = []

    for _, row in dataset.iterrows():
        industry = row.get("industry", "")
        coeff_row = coeffs_df.loc[industry] if industry in coeffs_df.index else None
        if coeff_row is None:
            predictions.append(None)
            strategies_used.append(None)
            continue
        configured_strategy = STRATEGY_MAP.get(industry, DEFAULT_STRATEGY)
        pred, applied = predict_row(row, coeff_row.to_dict(), configured_strategy)
        predictions.append(pred)
        strategies_used.append(applied)

    dataset["predictedOracle"] = predictions
    dataset["strategyUsed"] = strategies_used
    dataset["absError"] = (dataset["predictedOracle"] - dataset["oracleValue"]).abs()
    dataset["pctError"] = dataset["absError"] / dataset["oracleValue"]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(OUTPUT_PATH, index=False)

    valid = dataset.dropna(subset=["predictedOracle"])
    if not valid.empty:
        mae = valid["absError"].mean()
        rmse = math.sqrt(((valid["predictedOracle"] - valid["oracleValue"]) ** 2).mean())
        mape = valid["pctError"].mean() * 100
        print(f"[info] Validação protótipo — MAE={mae:.2f} USD, RMSE={rmse:.2f} USD, MAPE={mape:.2f}% (n={len(valid)})")

        by_industry = (
            valid.groupby("industry")[["absError", "pctError"]]
            .median()
            .rename(columns={"absError": "medianAbsError", "pctError": "medianPctError"})
        )
        print("\n[info] Medianas por indústria:")
        print(by_industry.sort_values("medianAbsError"))
    else:
        print("[warn] Nenhuma previsão válida gerada.")


if __name__ == "__main__":
    main()
