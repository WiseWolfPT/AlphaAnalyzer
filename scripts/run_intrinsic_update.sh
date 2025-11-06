#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATA_DIR="data"
EXTRA_DIR="${DATA_DIR}/captures/${TIMESTAMP}"
mkdir -p "${EXTRA_DIR}"

python3 scripts/collect_sector_payloads.py   --output "${EXTRA_DIR}/asset_managers.json"   --tickers BLK,TROW,BX,KKR,APO,BAM,CG || true

python3 scripts/collect_sector_payloads.py   --output "${EXTRA_DIR}/reit_retail.json"   --tickers O,SPG,REG || true

python3 scripts/collect_sector_payloads.py   --output "${EXTRA_DIR}/reit_specialty.json"   --tickers AMT,CCI,EQIX || true

python3 scripts/collect_sector_payloads.py   --output "${EXTRA_DIR}/reit_industrial.json"   --tickers PSA,PLD,VICI || true

python3 scripts/collect_sector_payloads.py   --output "${EXTRA_DIR}/financials.json"   --tickers GS,MS,COF,AXP,USB,PNC || true

python3 scripts/update_oracle_dataset.py   --inputs "${EXTRA_DIR}"/*.json   --tag "playwright_capture_${TIMESTAMP}" || true

python3 scripts/analyze_industry_coefficients.py --min-rows 3 || true

python3 scripts/generate_intrinsic_report.py   --coefficients data/industry_coefficients.csv   --output "${EXTRA_DIR}/intrinsic_report.md" || true
