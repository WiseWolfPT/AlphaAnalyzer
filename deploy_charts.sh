#!/bin/bash
set -e

echo "Starting deployment of 14 financial charts to GitHub..."

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1"

# Check git status
echo "Checking git status..."
git status

# Add the StockCharts.tsx page
echo "Adding StockCharts.tsx page..."
git add client/src/pages/StockCharts.tsx

# Add all 14 chart components
echo "Adding all 14 chart components..."
git add client/src/components/charts/

# Show what will be committed
echo "Files to be committed:"
git status --cached

# Create the commit
echo "Creating commit..."
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

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main

echo "✅ Successfully deployed 14 financial charts to GitHub!"
echo "Vercel will automatically deploy the updated version."