#!/usr/bin/env python3
"""
P0 Fix Investigation: Financials DCF Blocking
Analyzes why some financial stocks still have DCF methods.
"""

import json
import sys

data = json.load(sys.stdin)

print('## P0 FIX DEEP DIVE: Financials DCF Blocking Issue')
print()
print('**CRITICAL FINDING:** Financials DCF blocking shows 64.7% instead of expected 100%')
print()

# Find all financial stocks
financial_stocks = []
for stock in data['stocks']:
    sector = stock.get('sector', '')
    status_raw = stock.get('status', 0)

    # Convert status to int
    try:
        status = int(status_raw)
    except (ValueError, TypeError):
        status = 0

    if 'financial' in sector.lower() and status == 200:
        symbol = stock.get('symbol', '')
        methods = stock.get('methods', [])

        # Check for DCF methods
        dcf_methods = [m for m in methods if 'dcf' in m.lower()]

        financial_stocks.append({
            'symbol': symbol,
            'sector': sector,
            'method_count': stock.get('methodCount', 0),
            'has_dcf': len(dcf_methods) > 0,
            'dcf_methods': dcf_methods,
            'all_methods': methods
        })

print(f'**Total Financial Stocks with 200 status:** {len(financial_stocks)}')
print()

# Categorize
with_dcf = [s for s in financial_stocks if s['has_dcf']]
without_dcf = [s for s in financial_stocks if not s['has_dcf']]

print(f'**With DCF methods (BUG):** {len(with_dcf)}')
if with_dcf:
    print()
    for stock in with_dcf:
        print(f'### {stock["symbol"]} ({stock["sector"]})')
        print(f'  - Total methods: {stock["method_count"]}')
        print(f'  - DCF methods: {stock["dcf_methods"]}')
        print(f'  - All methods: {", ".join(stock["all_methods"][:8])}...')
        print()
else:
    print('  (None - all financial stocks correctly block DCF!)')

print()
print(f'**Without DCF methods (CORRECT):** {len(without_dcf)}')
if without_dcf:
    print()
    for stock in without_dcf[:5]:  # Show first 5
        print(f'  - {stock["symbol"]} ({stock["sector"]}) - {stock["method_count"]} methods')
        print(f'    Methods: {", ".join(stock["all_methods"][:5])}...')

print()
print()
print('**Analysis:**')
if with_dcf:
    print(f'❌ ISSUE CONFIRMED: {len(with_dcf)}/{len(financial_stocks)} financial stocks have DCF methods')
    print()
    print('**Possible causes:**')
    print('1. Classification logic not detecting these specific symbols as "bank"')
    print('2. Sector name mismatch in classification rules')
    print('3. These stocks classified as "value" or "growth" instead of "bank"')
    print('4. Classification happens before sector assignment')
    print()
    print('**Required action:**')
    print('- Verify classification logic in stock-classifier.ts')
    print('- Check if these symbols are in BANK_EXCEPTIONS or need to be added')
    print('- Ensure sector-based classification happens correctly')
else:
    print('✅ VERIFIED: All financial stocks correctly block DCF methods')
    print('P0.4 fix is working as expected.')
