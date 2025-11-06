#!/usr/bin/env python3
"""Generate ticker capture targets per StockOracle industry.

For each industry that is under-sampled in `data/oracle_dataset.csv`, this
script emits (to stdout) the list of tickers that still need to be captured
in order to reach a target minimum size (default: 5 observations).

Ticker suggestions are pulled from static lists (constructed manually or
from public sources). The output can be piped into fetch scripts or reviewed
manually before running `scripts/fetch_stockoracle_payloads.py`.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Set

import pandas as pd

DATASET_PATH = Path("data/oracle_dataset.csv")
DEFAULT_MIN_SIZE = 5

# Map industry -> list of candidate tickers to capture
INDUSTRY_TICKER_MAP: Dict[str, List[str]] = {
    # Financials
    "Asset Management": [
        "BLK", "TROW", "BEN", "IVZ", "AMP", "LAZ", "EVR", "PJT", "MC", "HLNE", "BX", "KKR", "CG",
        "ARES", "APO", "BXSL", "BAM", "BN"
    ],
    "Asset Management - Global": [
        "APO", "BAM", "BN", "BX", "KKR", "CG", "BXSL", "AB", "AMP", "IVZ", "TROW"
    ],
    "Financial - Capital Markets": [
        "GS", "MS", "EVR", "JEF", "LPLA", "MC", "PJT", "VIRT", "LAZ", "NMR", "BBD", "MORN", "SCHW"
    ],
    "Financial - Credit Services": [
        "SYF", "COF", "AXP", "ALLY", "SOFI", "AFRM", "UPST", "DFS", "ADS", "MA", "V", "PYPL"
    ],
    "Banks - Diversified": ["JPM", "BAC", "WFC", "C", "UBS", "HSBC", "BARC", "DB"],
    "Banks - Regional": ["USB", "PNC", "FITB", "KEY", "RF", "HBAN", "CFG", "ZION", "FHN", "MTB"],

    # Healthcare
    "Biotechnology": ["VRTX", "REGN", "MRNA", "AMGN", "BIIB", "BNTX", "SRPT", "NBIX"],
    "Drug Manufacturers - General": ["LLY", "JNJ", "GSK", "AZN", "PFE", "BMY", "NVS"],
    "Drug Manufacturers - Specialty & Generic": ["TEVA", "MYL", "LUMN", "ENZ", "ALKS" ],
    "Medical - Healthcare Plans": ["UNH", "HUM", "ELV", "CI", "CNC", "MOH", "CVS", "OSCR", "MCK", "WBA"],
    "Diagnostics & Research": ["ILMN", "DHR", "IDXX", "BIO", "QGEN"],

    # Consumer & Cyclical
    "Auto - Manufacturers": ["TSLA", "GM", "F", "TM", "HMC", "STLA", "RIVN", "LCID", "NIO", "LI", "XPEV"],
    "Consumer Cyclical": ["HD", "LOW", "MCD", "SBUX", "NKE", "ROST", "TJX"],
    "Retail - Specialty": ["AMZN", "BBY", "ULTA", "RH", "DKNG", "LULU", "CHWY", "ETSY", "COST"],
    "Travel Services": ["BKNG", "EXPE", "ABNB", "CCL", "RCL", "LYV", "SIX"],
    "Entertainment": ["NFLX", "DIS", "CMCSA", "WBD", "SONY"],

    # Technology
    "Software - Application": ["ADBE", "CRM", "INTU", "WDAY", "NOW", "TEAM", "SHOP", "SNOW", "DDOG"],
    "Software - Infrastructure": ["MSFT", "ORCL", "AMZN", "GOOGL", "META", "IBM", "SQ", "NET"],
    "Information Technology Services": ["ACN", "DXC", "CTSH", "EPAM", "IT", "GLOB", "PSFE"],
    "Communication Equipment": ["CSCO", "JNPR", "NOK", "ERIC", "UI", "ARRS", "ARLO"],
    "Semiconductors": ["NVDA", "AMD", "INTC", "TSM", "QCOM", "AVGO", "ADI", "TXN", "MU"],
    "Semiconductor Equipment & Materials": ["ASML", "AMAT", "LAM", "KLAC", "UCTT", "TER"],

    # Industrials & Materials
    "Industrial Conglomerates": ["GE", "HON", "MMM", "ETN", "EMR"],
    "Aerospace & Defense": ["BA", "LMT", "NOC", "RTX", "GD"],
    "Engineering & Construction": ["J", "FLR", "PWR", "ACM"],
    "Construction Materials": ["VMC", "MLM", "EXP", "SUM"],

    # Energy & Utilities
    "Regulated Electric": ["NEE", "DUK", "SO", "AEP", "XEL", "D", "ED", "PCG"],
    "Regulated Gas": ["NI", "ATO", "OGS", "SWX", "XEL", "NFG"],
    "Utilities - Independent Power Producers": ["VST", "NRG", "NEP", "AY", "ORA", "CWEN"],
    "Utilities - Diversified": ["SRE", "AES", "DTE", "EVRG"],
    "Oil & Gas E&P": ["COP", "EOG", "PXD", "FANG", "MRO"],
    "Oil & Gas Midstream": ["ENB", "KMI", "WMB", "EPD", "PAA"],

    # REITs
    "REIT - Office": ["ARE", "BXP", "DLR", "VNO", "KRC", "HIW", "CUZ"],
    "REIT - Industrial": ["PLD", "PSA", "TRNO", "STAG", "REXR", "EGP"],
    "REIT - Retail": ["SPG", "O", "FRT", "REG", "KIM"],
    "REIT - Diversified": ["WPC", "VICI", "HST", "BAM", "EQC"],
    "REIT - Specialty": ["AMT", "CCI", "EQIX", "DLR", "SBAC"],
    "REIT - Residential": ["AVB", "ESS", "MAA", "INVH", "EQR"],

    # Misc / Growth / Small caps
    "Small Cap": ["IWM", "VB", "SMH"],  # place-holder tickers; may need better list
    "Growth": ["ARKK", "QQQ", "SHOP", "SQ", "TWLO"],
}


@dataclass
class IndustryCoverage:
    industry: str
    current_count: int
    pending_tickers: List[str]


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise SystemExit(f"Dataset não encontrado: {path}")
    return pd.read_csv(path)


def current_tickers(df: pd.DataFrame, industry: str) -> Set[str]:
    return set(
        df[df["industry"] == industry]["ticker"]
        .dropna()
        .astype(str)
        .unique()
    )


def build_coverage(df: pd.DataFrame, min_size: int) -> List[IndustryCoverage]:
    coverages: List[IndustryCoverage] = []
    for industry, candidates in INDUSTRY_TICKER_MAP.items():
        present = current_tickers(df, industry)
        needed = max(0, min_size - len(present))
        if needed <= 0:
            continue
        remaining = [ticker for ticker in candidates if ticker not in present]
        if not remaining:
            continue
        coverages.append(
            IndustryCoverage(
                industry=industry,
                current_count=len(present),
                pending_tickers=remaining[: max(0, needed * 2)],
            )
        )
    return coverages


def main(argv: Iterable[str]) -> None:
    parser = argparse.ArgumentParser(description="Generate capture target tickers per industry.")
    parser.add_argument("--min-size", type=int, default=DEFAULT_MIN_SIZE, help="Desired minimum observations per industry.")
    parser.add_argument("--show-all", action="store_true", help="Show industries even if already satisfied.")
    args = parser.parse_args(list(argv))

    df = load_dataset(DATASET_PATH)
    coverages = build_coverage(df, args.min_size)

    if not coverages:
        print("Nenhuma indústria requer novas capturas (ou lista de candidatos vazia).")
        return

    for cov in coverages:
        print(f"# {cov.industry} (atual={cov.current_count}, alvo>={args.min_size})")
        if cov.pending_tickers:
            tickers_line = " ".join(cov.pending_tickers)
            print(tickers_line)
        else:
            print("(sem tickers candidatos)")
        print()


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
