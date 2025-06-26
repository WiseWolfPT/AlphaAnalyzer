# API Keys Setup Guide for Alfalyzer

This guide will help you obtain and configure real stock market API keys for the Alfalyzer application.

## Overview

Alfalyzer uses multiple financial data APIs to provide comprehensive stock market information. All of these services offer generous free tiers that are perfect for getting started.

## Required API Services

### 1. Alpha Vantage API 🔑

**What it provides:** Company fundamentals, earnings data, income statements, balance sheets
**Free tier:** 25 API calls/day, 5 calls/minute
**Best for:** Fundamental analysis data

#### How to get your API key:
1. Visit [Alpha Vantage API Registration](https://www.alphavantage.co/support/#api-key)
2. Fill out the registration form with:
   - Your email address
   - First and last name
   - Organization (can be "Personal" or "Individual")
   - Intended use (can be "Personal Investment Research")
3. Click "GET FREE API KEY"
4. Your API key will be displayed immediately and sent to your email
5. Copy the API key (format: `XXXXXXXXXXXXXXXXX`)

**Rate Limits:**
- 25 requests per day (resets at midnight UTC)
- 5 requests per minute
- Rate limits are tracked by IP address

---

### 2. Finnhub API 📈

**What it provides:** Real-time stock prices, company profiles, basic financials, WebSocket feeds
**Free tier:** 60 API calls/minute
**Best for:** Real-time price data and basic company information

#### How to get your API key:
1. Visit [Finnhub Registration](https://finnhub.io/register)
2. Sign up with your email and create a password
3. Verify your email address
4. Log in to your dashboard at [finnhub.io/dashboard](https://finnhub.io/dashboard)
5. Your API key will be displayed on the dashboard
6. Copy the API key (format: `xxxxxxxxxxxxxxxxxxxx`)

**Rate Limits:**
- 60 API calls per minute
- Unlimited daily calls
- WebSocket: 50 symbols per connection
- US market data only on free tier

---

### 3. Twelve Data API 📊

**What it provides:** Stock quotes, time series data, real-time WebSocket feeds
**Free tier:** 800 API calls/day, 8 calls/minute
**Best for:** Historical price data and time series analysis

#### How to get your API key:
1. Visit [Twelve Data Pricing](https://twelvedata.com/pricing)
2. Click "Start Free" under the Basic plan
3. Create an account with your email
4. Verify your email address
5. Log in to your dashboard
6. Navigate to the API section
7. Copy your API key (format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

**Rate Limits:**
- 800 requests per day
- 8 requests per minute
- US equities, forex, and crypto included
- Real-time and historical data available

---

### 4. Financial Modeling Prep (FMP) API 💼

**What it provides:** Stock quotes, company profiles, financial statements, earnings calendar
**Free tier:** 250 API calls/day
**Best for:** Comprehensive financial statements and earnings data

#### How to get your API key:
1. Visit [FMP Developer Portal](https://financialmodelingprep.com/developer/docs)
2. Click "Sign Up" or "Get API Key"
3. Create an account with your email
4. Verify your email address
5. Log in to your dashboard
6. Navigate to your profile/API section
7. Copy your API key (format: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

**Rate Limits:**
- 250 API calls per day
- Access to 150+ endpoints
- 5 years of annual statements for US companies
- End-of-day historical data

---

## Environment Configuration

After obtaining all API keys, you need to configure them in your environment:

### 1. Copy the example environment file:
```bash
cp .env.example .env
```

### 2. Edit the `.env` file with your API keys:

```bash
# Alpha Vantage API
ALPHA_VANTAGE_API_KEY="your_actual_alpha_vantage_key_here"
VITE_ALPHA_VANTAGE_API_KEY="your_actual_alpha_vantage_key_here"

# Finnhub API
FINNHUB_API_KEY="your_actual_finnhub_key_here"
VITE_FINNHUB_API_KEY="your_actual_finnhub_key_here"

# Twelve Data API
TWELVE_DATA_API_KEY="your_actual_twelve_data_key_here"
VITE_TWELVE_DATA_API_KEY="your_actual_twelve_data_key_here"

# Financial Modeling Prep API
FMP_API_KEY="your_actual_fmp_key_here"
VITE_FMP_API_KEY="your_actual_fmp_key_here"
```

**Important Notes:**
- Both `API_KEY` and `VITE_API_KEY` versions are needed
- `VITE_` prefixed variables are used by the frontend (Vite build system)
- Non-prefixed variables are used by the backend server
- Keep your `.env` file secure and never commit it to version control

### 3. Restart your development server:
```bash
npm run dev
```

## API Usage Strategy

To maximize your free tier usage:

### Daily Allocation Recommendations:
- **Alpha Vantage (25/day):** Use for fundamental data only, cache aggressively
- **Finnhub (60/minute):** Primary source for real-time quotes and price updates
- **Twelve Data (800/day):** Use for historical data and time series analysis
- **FMP (250/day):** Use for detailed financial statements and earnings data

### Optimization Tips:
1. **Enable Caching:** The app includes intelligent caching to minimize API calls
2. **Batch Requests:** When possible, request multiple symbols in single API calls
3. **Monitor Usage:** Check the debug dashboard to track your API usage
4. **Prioritize Symbols:** Focus on stocks you're actively monitoring

## Testing Your Setup

1. Start the development server: `npm run dev`
2. Navigate to the stock search page
3. Search for a popular stock symbol (e.g., "AAPL")
4. Verify that data loads from all sources
5. Check the browser console for any API errors

## Troubleshooting

### Common Issues:

**"API key invalid" errors:**
- Double-check that you copied the API key correctly
- Ensure no extra spaces or characters
- Verify the API key is active in the provider's dashboard

**"Rate limit exceeded" errors:**
- You've hit the daily/minute limit for that API
- Wait for the limit to reset or upgrade to a paid plan
- Check the debug dashboard for usage statistics

**"No data available" errors:**
- The stock symbol might not be available in the free tier
- Try a different, more popular stock symbol
- Some APIs have limited coverage on free tiers

### Getting Help:

1. Check the provider's documentation and status pages
2. Contact API provider support for account-specific issues
3. Review the application logs in the browser console
4. Use the built-in cache dashboard to monitor API usage

## Cost Considerations

All these APIs offer generous free tiers suitable for personal use and development. If you need more data or higher limits:

- **Alpha Vantage:** Paid plans start at $49.99/month
- **Finnhub:** Paid plans start at $1,000/month
- **Twelve Data:** Paid plans start at $29/month
- **FMP:** Paid plans start at $14/month

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate keys regularly** if they become compromised
4. **Monitor usage** to detect unauthorized access
5. **Use HTTPS only** for all API communications

---

*This guide was last updated for 2024. API limits and pricing may change. Always check the official documentation for the most current information.*