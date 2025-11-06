#!/usr/bin/env python3
"""Compute per-industry regression coefficients for OracleValue replication.

The script reads `data/oracle_dataset.csv`, groups tickers por indústria e
testa diferentes combinações de features (MeanPS, MeanPB, DCF20, DFCF20,
DQF20) para encontrar o melhor ajuste linear (menor RMSE).  O resultado é
gravado em `data/industry_coefficients.csv`, contendo intercepto, coeficientes,
R² e RMSE por indústria, além de metadados como nº de observações e medianas
das razões Oracle/MeanPS etc.
"""

from __future__ import annotations

import argparse
import itertools
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence

import numpy as np
import pandas as pd
import statsmodels.api as sm

DATA_PATH = Path("data/oracle_dataset.csv")
OUTPUT_PATH = Path("data/industry_coefficients.csv")

# Candidate feature sets ordenados do mais completo para o mais simples
FEATURE_SETS: Sequence[Sequence[str]] = [
    ("meanPS", "meanPB", "dcf20"),
    ("meanPS", "meanPB", "dfcf20"),
    ("meanPS", "meanPB", "dni20"),
    ("meanPS", "meanPB"),
    ("meanPB", "dcf20"),
    ("meanPS", "dcf20"),
    ("meanPB",),
    ("meanPS",),
    ("dcf20",),
]

RATIO_COLS = {
    "ratio_oracle_meanPS": "med_ratio_meanPS",
    "ratio_oracle_meanPB": "med_ratio_meanPB",
    "ratio_oracle_dcf": "med_ratio_dcf",
}

MIN_ROWS_PER_GROUP = 5
MIN_ROWS_PER_MODEL = 3


@dataclass
class RegressionResult:
    industry: str
    n: int
    subset_n: int
    features: List[str]
    intercept: float
    coefficients: dict[str, float]
    rmse: float
    r2: float
    ratios: dict[str, float]


def to_float(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def compute_regression(
    industry: str, df: pd.DataFrame
) -> RegressionResult | None:
    df = df.copy()
    df["oracleValue"] = to_float(df["oracleValue"])

    # Normalizar features numéricas relevantes
    candidate_cols = sorted({col for cols in FEATURE_SETS for col in cols})
    for col in candidate_cols:
        if col in df.columns:
            df[col] = to_float(df[col])

    # Selecionar melhor combinação
    best_model = None

    for features in FEATURE_SETS:
        # pular combinações que não existem na base
        if any(col not in df.columns for col in features):
            continue
        subset = df.dropna(subset=["oracleValue", *features])
        if len(subset) < MIN_ROWS_PER_MODEL:
            continue

        X = subset[list(features)]
        y = subset["oracleValue"]
        X = sm.add_constant(X)
        model = sm.OLS(y, X).fit()
        residuals = model.resid
        rmse = float(np.sqrt(np.mean(residuals**2)))
        r2 = float(model.rsquared or 0.0)

        # Critério: menor RMSE, empatando com maior R², e preferindo menos features
        key = (rmse, -r2, len(features))
        if (
            best_model is None
            or key < best_model["key"]
        ):
            best_model = {
                "features": list(features),
                "model": model,
                "rmse": rmse,
                "r2": r2,
                "subset_size": len(subset),
                "key": key,
            }

    if best_model is None:
        return None

    model = best_model["model"]
    subset_n = best_model["subset_size"]
    params = model.params.to_dict()
    intercept = float(params.pop("const"))
    coefficients = {feat: float(params.get(feat, 0.0)) for feat in candidate_cols}

    ratios = {}
    for src_col, dst_col in RATIO_COLS.items():
        if src_col in df.columns:
            ratios[dst_col] = float(
                df[src_col].dropna().astype(float).median()
            ) if not df[src_col].dropna().empty else math.nan
        else:
            ratios[dst_col] = math.nan

    return RegressionResult(
        industry=industry,
        n=int(len(df)),
        subset_n=int(subset_n),
        features=best_model["features"],
        intercept=intercept,
        coefficients=coefficients,
        rmse=best_model["rmse"],
        r2=best_model["r2"],
        ratios=ratios,
    )


def main(min_rows: int) -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Dataset não encontrado: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    if "industry" not in df.columns:
        raise SystemExit("Coluna `industry` não encontrada no dataset.")

    results: list[RegressionResult] = []

    for industry, group in df.groupby("industry"):
        group = group.copy()
        if len(group) < min_rows:
            continue
        res = compute_regression(industry, group)
        if res:
            results.append(res)

    if not results:
        raise SystemExit("Nenhuma indústria com dados suficientes.")

    rows = []
    for res in sorted(results, key=lambda r: (r.industry.lower())):
        row = {
            "industry": res.industry,
            "n": res.n,
            "subset_n": res.subset_n,
            "features": ",".join(res.features),
            "intercept": round(res.intercept, 6),
            "rmse": round(res.rmse, 6),
            "r2": round(res.r2, 6),
            **res.ratios,
        }
        for feat in sorted({col for cols in FEATURE_SETS for col in cols}):
            row[f"coef_{feat}"] = (
                round(res.coefficients.get(feat, 0.0), 6)
                if feat in res.features
                else 0.0
            )
        rows.append(row)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(OUTPUT_PATH, index=False)
    print(f"Coeficientes gravados em {OUTPUT_PATH} ({len(rows)} indústrias).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Gerar regressões por indústria para replicar OracleValue."
    )
    parser.add_argument(
        "--min-rows",
        type=int,
        default=MIN_ROWS_PER_GROUP,
        help="Nº mínimo de observações por indústria (default: 5).",
    )
    args = parser.parse_args()
    main(args.min_rows)
