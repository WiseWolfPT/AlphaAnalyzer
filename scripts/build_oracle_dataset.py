#!/usr/bin/env python3
"""
Aggregate StockOracle payloads into a single dataset for analysis.

By default, loads every JSON file in `stockoracle_payloads/` and emits a CSV
with both raw values (Oracle, DCF, múltiplos) e features derivados
(ex.: Oracle/DCF, flags de fallback).

Exemplo:
    python scripts/build_oracle_dataset.py --output data/oracle_dataset.csv
"""

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


DEFAULT_GLOB = "stockoracle_payloads/*.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build consolidated OracleValue dataset.")
    parser.add_argument("--glob", default=DEFAULT_GLOB, help="Glob de ficheiros JSON com payloads (default: stockoracle_payloads/*.json).")
    parser.add_argument("--output", type=Path, default=Path("data/oracle_dataset.csv"), help="Ficheiro de saída (CSV).")
    parser.add_argument("--include-null-dcf", action="store_true", help="Inclui linhas mesmo quando OracleValue está ausente (por defeito ignoramos).")
    return parser.parse_args()


def load_files(pattern: str) -> List[Path]:
    paths = sorted(Path().glob(pattern))
    return [p for p in paths if p.is_file()]


def safe_float(value: Any) -> Optional[float]:
    if value in (None, "", "null"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def compute_ratio(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator


def compute_flags(record: Dict[str, Any]) -> Dict[str, Any]:
    dcf = record.get("dcf20")
    dfcf = record.get("dfcf20")
    dni = record.get("dni20")
    mean_ps = record.get("meanPS")
    mean_pb = record.get("meanPB")

    flags = {
        "flag_dcf_missing": dcf is None,
        "flag_dcf_negative": isinstance(dcf, (int, float)) and dcf < 0,
        "flag_dfcf_missing": dfcf is None,
        "flag_dfcf_negative": isinstance(dfcf, (int, float)) and dfcf <= 0,
        "flag_dni_missing": dni is None,
        "flag_meanps_missing": mean_ps is None,
        "flag_meanpb_missing": mean_pb is None,
    }
    return flags


IV_METRIC_IDS = {
    "dcf20": "1863",
    "dfcf20": "2315",
    "dni20": "1865",
    "dfcfTerminal": "1867",
    "meanPS": "1040",
    "meanPB": "1037",
}

OTHER_RATIO_NAME_MAP = {
    "Mean Price to Sales (PS) Value": "meanPS",
    "Mean Price to Book (PB) Value": "meanPB",
    "Mean Price to Earnings (PE) Value": "meanPE",
    "Mean Price to Earnings (PE) Value without NRI": "meanPE_noNRI",
    "Median Price to Sales (PS) Value": "medianPS",
    "Median Price to Book (PB) Value": "medianPB",
    "Median Price to Earnings (PE) Value": "medianPE",
    "Median Price to Earnings (PE) Value without NRI": "medianPE_noNRI",
    "Rule of 40": "ruleOf40",
}


def normalize_raw_payload(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Transform a raw multi-endpoint capture into the compact payload format."""
    if "pp" not in raw or "stock_detail" not in raw:
        return None

    stock = (raw.get("stock_detail") or {}).get("result") or {}
    pp = (raw.get("pp") or {}).get("result") or {}
    dcf = (raw.get("dcf") or {}).get("result") or {}
    dfcf = (raw.get("dfcf") or {}).get("result") or {}
    dni = (raw.get("dni") or {}).get("result") or {}
    iv_line = (raw.get("iv_line") or {}).get("result") or {}
    other_ratio = (raw.get("other_ratio") or {}).get("result") or []

    multiples: Dict[str, Optional[float]] = {}
    for entry in other_ratio:
        name = entry.get("name")
        key = OTHER_RATIO_NAME_MAP.get(name)
        if key:
            multiples[key] = safe_float(entry.get("value"))

    payload = {
        "ticker": stock.get("symbol"),
        "sector": stock.get("sector"),
        "industry": stock.get("industry"),
        "oracleValue": safe_float(pp.get("intrinsicValue")),
        "oraclePremiumPct": safe_float(pp.get("discountandPremium")),
        "dcf20": safe_float(dcf.get("intrinsicValue")),
        "dfcf20": safe_float(dfcf.get("intrinsicValue")),
        "dni20": safe_float(dni.get("intrinsicValue")),
        "discountRate": safe_float(dcf.get("discountRate")),
        "growth": {
            "g1_5": safe_float(dcf.get("growthRateFirsttoFifthYear")),
            "g6_10": safe_float(dcf.get("growthRateSixthToTenthYear")),
            "g11_20": safe_float(dcf.get("growthRateEleventhToTwentiethYear")),
        },
        "multiples": multiples,
        "ivChart": iv_line.get("data"),
    }

    # Preserve original path for debugging if present
    if "meta" in raw and isinstance(raw["meta"], dict):
        payload["source_meta"] = raw["meta"]

    return payload


def extract_from_iv_chart(chart: Any, metric_key: str) -> Optional[float]:
    if not isinstance(chart, list):
        return None
    metric_id = IV_METRIC_IDS.get(metric_key)
    if metric_id is None:
        return None
    for entry in chart:
        if not isinstance(entry, list) or len(entry) < 2:
            continue
        if entry[0] == metric_id:
            return safe_float(entry[1])
    return None


def flatten_payload(path: Path, raw: Dict[str, Any], include_null: bool) -> Iterable[Dict[str, Any]]:
    results = raw if isinstance(raw, list) else raw.get("result")
    if not isinstance(results, list):
        results = [raw]

    for item in results:
        if "oracleValue" not in item and "pp" in item:
            normalized = normalize_raw_payload(item)
            if not normalized:
                continue
            item = normalized

        oracle = safe_float(item.get("oracleValue"))
        if oracle is None and not include_null:
            continue

        multiples = item.get("multiples") or {}
        growth = item.get("growth") or {}
        iv_chart = item.get("ivChart")

        row: Dict[str, Any] = {
            "source_file": str(path),
            "ticker": item.get("ticker"),
            "sector": item.get("sector"),
            "industry": item.get("industry"),
            "oracleValue": oracle,
            "oraclePremiumPct": safe_float(item.get("oraclePremiumPct")),
            "dcf20": safe_float(item.get("dcf20")) or extract_from_iv_chart(iv_chart, "dcf20"),
            "dfcf20": safe_float(item.get("dfcf20")) or extract_from_iv_chart(iv_chart, "dfcf20"),
            "dni20": safe_float(item.get("dni20")) or extract_from_iv_chart(iv_chart, "dni20"),
            "dfcfTerminal": extract_from_iv_chart(iv_chart, "dfcfTerminal"),
            "discountRate": safe_float(item.get("discountRate")),
            "growth_1_5": safe_float((growth or {}).get("g1_5")),
            "growth_6_10": safe_float((growth or {}).get("g6_10")),
            "growth_11_20": safe_float((growth or {}).get("g11_20")),
            "meanPE": safe_float(multiples.get("meanPE")),
            "meanPE_noNRI": safe_float(multiples.get("meanPE_noNRI")),
            "meanPS": safe_float(multiples.get("meanPS")) or extract_from_iv_chart(iv_chart, "meanPS"),
            "meanPB": safe_float(multiples.get("meanPB")) or extract_from_iv_chart(iv_chart, "meanPB"),
            "medianPE": safe_float(multiples.get("medianPE")),
            "medianPS": safe_float(multiples.get("medianPS")),
            "medianPB": safe_float(multiples.get("medianPB")),
            "ruleOf40": safe_float(multiples.get("ruleOf40")),
        }

        # Ratios
        row["ratio_oracle_dcf"] = compute_ratio(row["oracleValue"], row["dcf20"])
        row["ratio_oracle_meanPS"] = compute_ratio(row["oracleValue"], row["meanPS"])
        row["ratio_oracle_meanPB"] = compute_ratio(row["oracleValue"], row["meanPB"])
        row["ratio_oracle_medianPS"] = compute_ratio(row["oracleValue"], row["medianPS"])
        row["ratio_oracle_medianPB"] = compute_ratio(row["oracleValue"], row["medianPB"])

        flags = compute_flags(row)
        row.update(flags)

        yield row


def build_dataset(paths: List[Path], include_null: bool) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for path in paths:
        try:
            raw = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            print(f"[warn] Ignorado {path}: JSON inválido ({exc})")
            continue
        rows.extend(flatten_payload(path, raw, include_null))
    return rows


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        print("[info] Nenhum registo para gravar.")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = sorted(rows[0].keys())
    with path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"[info] Dataset escrito em {path} ({len(rows)} linhas).")


def main() -> None:
    args = parse_args()
    files = load_files(args.glob)
    if not files:
        print(f"[warn] Nenhum ficheiro encontrado para glob {args.glob}")
        return
    rows = build_dataset(files, include_null=args.include_null_dcf)
    write_csv(args.output, rows)


if __name__ == "__main__":
    main()
