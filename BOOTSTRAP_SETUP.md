# Alpha Analyzer Bootstrap Setup Guide

This guide helps you set up Alpha Analyzer for a zero-cost launch using free-tier APIs and services.

## 🚀 Quick Start

1. **Copy Environment Variables**
   ```bash
   cp .env.example .env
   ```

2. **Get Free API Keys**
   - [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs) - 250 calls/day
   - [Alpha Vantage](https://www.alphavantage.co/support/#api-key) - 5 calls/minute, 500/day
   - [IEX Cloud](https://iexcloud.io/console/tokens) - 500,000 credits/month
   - [Finnhub](https://finnhub.io/register) - 60 calls/minute

3. **Set up Supabase (Free)**
   - Create account at [Supabase](https://supabase.com)
   - Create new project
   - Get URL and anon key from Settings > API

4. **Update .env file with your keys**

5. **Install and run**
   ```bash
   npm install
   npm run dev
   ```

## 🏗️ Architecture Overview

### Intelligent Caching System
- **Multi-tier caching** with different TTL for data types
- **LRU eviction** to manage memory efficiently
- **Category-based organization** (quotes, historical, company data)
- **Automatic cleanup** of expired entries

### API Rotation Strategy
- **Smart provider switching** to maximize free tier usage
- **Daily limit tracking** across all providers
- **Automatic fallback** when limits are reached
- **Usage statistics** for monitoring

### Authentication System
- **Supabase Auth** with Google OAuth
- **Profile management** with subscription tiers
- **Role-based access control** for features
- **Session management** with auto-refresh

### BETA Features
- **Feature limiting** for premium functionality
- **Community engagement** (Discord, Whop courses)
- **Gradual rollout** of advanced features
- **User feedback collection**

## 📊 API Usage Optimization

### Free Tier Limits
- **Financial Modeling Prep**: 250 calls/day
- **Alpha Vantage**: 5 calls/minute, 500/day  
- **IEX Cloud**: 500,000 credits/month
- **Finnhub**: 60 calls/minute

### Smart Caching Strategy
- **Stock quotes**: 5 minutes TTL
- **Historical data**: 30 minutes TTL
- **Company info**: 1 hour TTL
- **Real-time data**: 1 minute TTL (premium only)

### Usage Monitoring
- Enable debug mode: `VITE_DEBUG_MODE=true`
- View API statistics in dashboard
- Monitor cache hit rates
- Track provider usage

## 🔐 Authentication Setup

### Supabase Configuration
1. Create tables for user profiles and subscriptions
2. Set up RLS (Row Level Security) policies
3. Configure OAuth providers (Google, GitHub)
4. Set up email templates

### Database Schema
```sql
-- User profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- User watchlists
CREATE TABLE watchlists (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Monetization Strategy

### Free Tier (BETA)
- ✅ Basic stock data
- ✅ Mini charts
- ✅ Limited watchlists (3)
- ✅ Community access

### Pro Tier ($9/month - Future)
- ✅ Advanced charts
- ✅ Unlimited watchlists
- ✅ Portfolio tracking
- ✅ Email alerts

### Premium Tier ($19/month - Future)
- ✅ Real-time data
- ✅ Advanced analytics
- ✅ API access
- ✅ Priority support

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Environment
cp .env.example .env # Copy environment template
npm run typecheck    # TypeScript checking
npm run lint         # ESLint checking
```

## 📈 Community Building

### Content Strategy
- **TikTok**: Stock analysis shorts
- **YouTube**: Educational content
- **Discord**: Community discussions
- **Whop**: Premium courses

### Engagement Features
- BETA banner with community links
- Discord integration
- Course promotion
- User feedback collection

## 🐛 Debugging

### API Issues
- Check `.env` file has correct keys
- Verify API key permissions
- Monitor daily usage limits
- Check network connectivity

### Cache Issues
- Clear cache via API Stats component
- Verify TTL settings
- Check memory usage
- Monitor cache hit rates

### Authentication Issues
- Verify Supabase configuration
- Check OAuth settings
- Validate RLS policies
- Test email delivery

## 🚀 Deployment

### Environment Variables for Production
```bash
# Required for production
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_FMP_API_KEY=your_fmp_api_key
# ... other API keys

# Optional production settings
VITE_DEBUG_MODE=false
VITE_USE_MOCK_DATA=false
```

### Performance Optimization
- Enable caching in production
- Use CDN for static assets
- Implement lazy loading
- Optimize bundle size

---

This bootstrap setup allows you to launch Alpha Analyzer with zero upfront costs while building a community and gathering user feedback before investing in premium services.