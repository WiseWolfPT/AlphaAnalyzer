# Alfalyzer API Integration Guide

## Overview

Alfalyzer now integrates with multiple financial data APIs to provide real-time stock prices and comprehensive fundamental data.

## API Providers

### 1. **Financial Modeling Prep (FMP)** - Primary for Fundamentals
- **Quota**: 250 calls/day (free tier)
- **Purpose**: Company fundamentals, financial statements, key metrics
- **Cache**: 24 hours for fundamental data

### 2. **Twelve Data** - Primary for Real-time Data
- **Quota**: 800 calls/day (free tier)
- **Purpose**: Real-time stock prices, historical data, WebSocket streaming
- **Cache**: 1 minute for price data

### 3. **Finnhub** - Backup Provider
- **Quota**: 60 calls/minute (free tier)
- **Purpose**: Backup for prices and basic fundamentals
- **Cache**: Based on data type

### 4. **Alpha Vantage** - Deep Fundamentals Backup
- **Quota**: 25 calls/day (free tier)
- **Purpose**: Detailed financial data when other sources fail
- **Cache**: 24 hours

## Backup API Providers (If Primary APIs Fail)

### 5. **Polygon.io** - Alternative Real-time Data
- **Quota**: 5 calls/minute (free tier)
- **Purpose**: Backup for US market data, aggregates, and real-time prices
- **Cache**: 1 minute for prices, 1 hour for aggregates
- **Note**: Excellent WebSocket support for live data

### 6. **Yahoo Finance** (via yfinance) - Unofficial but Reliable
- **Quota**: No official limit (use responsibly)
- **Purpose**: Comprehensive backup for all data types
- **Cache**: Follow same strategy as primary APIs
- **Warning**: For personal/non-commercial use initially. Consider official APIs when monetizing

### 7. **MarketStack** - Historical Data Alternative
- **Quota**: 1000 calls/month (free tier)
- **Purpose**: End-of-day historical data
- **Cache**: 24 hours minimum
- **Note**: Good for historical data but limited real-time capabilities

## Setup Instructions

### 1. Get API Keys

Sign up for free API keys:
- [FMP](https://site.financialmodelingprep.com/developer/docs)
- [Twelve Data](https://twelvedata.com/apikey)
- [Finnhub](https://finnhub.io/register)
- [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys
VITE_FMP_API_KEY=your_fmp_api_key_here
VITE_TWELVE_DATA_API_KEY=your_twelve_data_api_key_here
VITE_FINNHUB_API_KEY=your_finnhub_api_key_here
VITE_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# Supabase (existing)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Usage

The API integration is automatic. The system will:
1. Use cached data when available
2. Fetch from the most appropriate API based on data type
3. Fallback to alternative providers if primary fails
4. Track API usage to prevent quota exceeded

## Features

### Real-time Stock Data
- Current prices updated every minute
- Market indices (S&P 500, Dow, Nasdaq)
- Pre-market and after-hours data
- Volume and price changes

### Fundamental Data
- Income statements
- Balance sheets
- Cash flow statements
- Key financial ratios
- Intrinsic value calculations

### WebSocket Streaming
- Real-time price updates
- Automatic reconnection
- Multiple symbol support

## API Usage Monitoring

The dashboard displays real-time API usage:
- Percentage of quota used
- Remaining calls
- Auto-reset at midnight

## Cache Strategy

| Data Type | Cache Duration | Provider |
|-----------|---------------|----------|
| Stock Prices | 1 minute | Twelve Data |
| Fundamentals | 24 hours | FMP |
| Historical Data | Based on interval | Twelve Data |
| Company Overview | 24 hours | FMP/Alpha Vantage |

## Code Examples

### Using Enhanced Stock API

```typescript
import enhancedApi from '@/lib/enhanced-api';

// Get real-time stock data
const stock = await enhancedApi.stocks.getBySymbol('AAPL');

// Get multiple stocks
const stocks = await enhancedApi.stocks.getBatch(['AAPL', 'MSFT', 'GOOGL']);

// Get historical data
const history = await enhancedApi.stocks.getHistoricalData('AAPL', '1day', 30);

// Calculate intrinsic value with real fundamentals
const intrinsicValue = await enhancedApi.intrinsicValue.calculateWithRealData('AAPL');
```

### Using React Hooks

```typescript
import { useStock, useIntrinsicValue } from '@/hooks/use-enhanced-stocks';

function StockComponent({ symbol }) {
  const { data: stock, isLoading } = useStock(symbol);
  const { data: intrinsicValue } = useIntrinsicValue(symbol);
  
  // Data automatically refreshes every minute
}
```

## Troubleshooting

### API Key Issues
- Ensure all API keys are correctly set in `.env`
- Check that `.env` is not committed to git
- Verify API keys are active on provider dashboards

### Rate Limiting
- Monitor the API usage display on dashboard
- System automatically handles rate limits
- Falls back to cached data when limits reached

### Data Accuracy
- Fundamental data updates daily
- Price data updates every minute
- Cache can be manually refreshed using the refresh button

## Future Enhancements

1. **Additional Providers**: Integration with more data sources
2. **Advanced Analytics**: Technical indicators and predictions
3. **Export Features**: Download data for analysis
4. **Premium Features**: Higher rate limits for paid users