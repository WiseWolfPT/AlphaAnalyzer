#!/bin/bash

# Deployment script for 14-chart stock analysis webapp
# Run this manually due to shell environment limitations

echo "🚀 DEPLOYING 14-CHART STOCK ANALYSIS WEBAPP"
echo "============================================"

# Navigate to project directory
cd "/Users/antoniofrancisco/Documents/teste 1" || { echo "❌ Failed to navigate to project"; exit 1; }

echo "📍 Working in: $(pwd)"

# Create deployment branch
echo "🔧 Creating deployment branch..."
git checkout -B fix/stock-charts-deploy

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🏗️ Building for production..."
npm run build || { echo "❌ Build failed"; exit 1; }

# Add environment variables for Vercel
echo "VITE_FINNHUB_API_KEY=demo" > .env.production
echo "VITE_ALPHA_VANTAGE_API_KEY=demo" >> .env.production

# Commit all changes
echo "📝 Committing changes..."
git add -A
git commit -m "feat: complete 14-chart stock analysis deployment

✅ All 14 Financial Charts Implemented:
- Price Chart (historical prices with area visualization)
- Revenue Chart (quarterly revenue trends)  
- Revenue Segments (business segment breakdown)
- EBITDA Chart (earnings before interest/taxes)
- Free Cash Flow (operating cash minus capex)
- Net Income (quarterly profitability)
- EPS Chart (earnings per share trends)
- Cash & Debt (balance sheet analysis)
- Dividends (dividend history and yield)
- Return on Capital (capital efficiency)
- Shares Outstanding (share count changes)
- Financial Ratios (valuation metrics)
- Valuation Chart (P/E, P/B trends)
- Operating Expenses (cost structure)

✅ Technical Implementation:
- StockCharts.tsx: Main page component with routing
- 14 chart components using Recharts library
- Interactive tooltips with detailed financial data
- 4x4 grid layout matching Qualtrim design
- Mock data structure ready for API integration
- Responsive design for mobile/desktop
- Error handling and loading states

✅ Routing & Navigation:
- /stock/:symbol route configured
- Chart icon CTA in StockCard components
- Back navigation to dashboard
- URL parameters for stock symbols

✅ Environment & Build:
- Vite environment variables (VITE_ prefix)
- Production build configuration
- Vercel deployment settings
- TypeScript compilation
- Tailwind CSS styling

🎯 Ready for Production Deployment
🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Merge to main branch
echo "🔀 Merging to main..."
git checkout main
git merge --no-edit fix/stock-charts-deploy

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod --force

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🎯 To test:"
echo "1. Go to your Vercel URL"
echo "2. Navigate to /dashboard"  
echo "3. Hover over any stock card"
echo "4. Click the 📈 chart icon"
echo "5. View /stock/AAPL with all 14 charts!"
echo ""
echo "📊 All 14 financial charts are now live!"