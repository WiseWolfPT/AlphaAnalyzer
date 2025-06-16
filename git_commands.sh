#!/bin/bash

# Change to the project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

echo "=== Git Status ==="
git status

echo ""
echo "=== Git Diff ==="
git diff

echo ""
echo "=== Recent Commits ==="
git log --oneline -5

echo ""
echo "=== Adding StockCharts.tsx ==="
git add client/src/pages/StockCharts.tsx

echo ""
echo "=== Adding all 14 chart components ==="
git add client/src/components/charts/

echo ""
echo "=== Final Git Status ==="
git status

echo ""
echo "=== Creating Commit ==="
git commit -m "feat: add comprehensive stock charts page with 14 financial analysis charts

- Add StockCharts.tsx page with professional layout and company header
- Add 14 chart components covering all major financial metrics:
  * PriceChart - Stock price trends
  * RevenueChart - Quarterly revenue analysis
  * RevenueSegmentChart - Revenue breakdown by business segments
  * EbitdaChart - EBITDA performance tracking
  * FreeCashFlowChart - Cash flow analysis
  * NetIncomeChart - Net income trends
  * EpsChart - Earnings per share tracking
  * CashDebtChart - Cash vs debt analysis
  * DividendsChart - Dividend payment history
  * ReturnCapitalChart - Return on capital metrics
  * SharesChart - Shares outstanding changes
  * RatiosChart - Financial ratios (P/E, ROE, ROA, margins)
  * ValuationChart - Stock valuation metrics
  * ExpensesChart - Operating expenses breakdown
- Implement responsive 4x4 grid layout matching Qualtrim design
- Add comprehensive key metrics display
- Include company information and action buttons
- Use mock data for demo purposes until API keys are configured

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo ""
echo "=== Final Git Status After Commit ==="
git status

echo ""
echo "=== Pushing to GitHub ==="
git push origin main