# Alfalyzer Backend Migration Guide

## Overview

This guide documents the complete migration of the Alfalyzer backend from SQLite to Supabase, enabling real-time data, better scalability, and removing the demo mode restrictions.

## What's Changed

### 1. Database Migration
- **From**: Local SQLite database
- **To**: Supabase PostgreSQL with Row Level Security (RLS)
- **Benefits**: 
  - Real-time subscriptions
  - Better scalability
  - Built-in authentication
  - Automatic backups
  - Global CDN

### 2. API Keys Configuration
- **From**: Hardcoded demo mode
- **To**: Server-side API key validation
- **Benefits**:
  - Real market data from multiple providers
  - Automatic fallback between providers
  - Better rate limit management

### 3. New Features Enabled
- **Transcripts API**: Full CRUD operations for earnings transcripts
- **Portfolio Management**: Complete portfolio tracking system
- **WebSocket Support**: Real-time market data updates
- **Supabase Auth**: Secure authentication with social logins

## Migration Steps

### 1. Set Up Supabase Project

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Note down your project URL and keys:
   - Project URL: `https://your-project-id.supabase.co`
   - Anon Key (public): `eyJ...` 
   - Service Role Key (secret): `eyJ...`

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

3. Add your API keys for market data:
   ```env
   ALPHA_VANTAGE_API_KEY=your-key
   TWELVE_DATA_API_KEY=your-key
   FMP_API_KEY=your-key
   FINNHUB_API_KEY=your-key
   ```

### 3. Run Database Migrations

1. Apply the Supabase schema:
   ```bash
   # Copy the migration SQL to Supabase SQL editor
   cat migrations/postgres-migrations/005_complete_backend_migration.sql
   ```

2. Run the migration in Supabase Dashboard:
   - Go to SQL Editor
   - Paste the migration SQL
   - Click "Run"

### 4. Migrate Existing Data (Optional)

If you have existing data in SQLite:

```bash
# Run the migration script
npm run migrate:supabase
```

This will:
- Migrate all users (creates Supabase Auth accounts)
- Migrate stocks data
- Migrate watchlists
- Migrate transcripts

### 5. Update Your Code

The backend has been updated to use Supabase. Key changes:

1. **Database Access**: Now uses `supabaseDb` instead of SQLite
2. **Authentication**: Uses Supabase Auth instead of JWT
3. **Real-time**: WebSocket support for live market data

### 6. Test the Migration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test key features:
   - User registration/login
   - Market data fetching (should use real APIs)
   - Watchlist operations
   - Portfolio management
   - Transcript viewing

## New API Endpoints

### Transcripts
- `GET /api/transcripts` - List all published transcripts
- `GET /api/transcripts/:ticker` - Get transcripts for a ticker
- `GET /api/transcripts/id/:id` - Get specific transcript
- `POST /api/transcripts/upload` - Upload new transcript (admin)
- `POST /api/transcripts/:id/summarize` - Generate AI summary (admin)
- `POST /api/transcripts/:id/publish` - Publish transcript (admin)

### Portfolios
- `GET /api/portfolios` - List user portfolios
- `GET /api/portfolios/:id` - Get portfolio details
- `POST /api/portfolios` - Create portfolio
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio
- `POST /api/portfolios/:id/transactions` - Add transaction
- `GET /api/portfolios/:id/transactions` - List transactions

### WebSocket
- `ws://localhost:3000/ws/market-data` - Real-time market data
  - Send: `{ "type": "subscribe", "symbols": ["AAPL", "GOOGL"] }`
  - Receive: Real-time price updates

## Troubleshooting

### Common Issues

1. **"Supabase configuration missing"**
   - Ensure all Supabase environment variables are set
   - Check that keys are not the placeholder values

2. **"No valid API keys configured"**
   - Add at least one valid market data API key
   - Keys should not be "demo" or placeholder values

3. **Authentication errors**
   - Ensure Supabase Auth is properly configured
   - Check that RLS policies are applied

4. **Migration script fails**
   - Ensure SQLite database exists at the specified path
   - Check Supabase connection credentials
   - Review error logs for specific issues

## Rollback Plan

If you need to rollback to SQLite:

1. Change database imports back to SQLite:
   ```typescript
   import { db } from './db'; // Instead of supabaseDb
   ```

2. Disable API key checking in `real-data-integration.ts`

3. Revert to JWT authentication

## Security Notes

1. **Never commit `.env` files** to version control
2. **Service Role Key** should only be used server-side
3. **Enable RLS** on all Supabase tables
4. **Rotate API keys** regularly
5. **Use different keys** for development and production

## Next Steps

After successful migration:

1. Set up Supabase Edge Functions for complex operations
2. Enable Supabase Realtime for live updates
3. Configure backup strategies
4. Set up monitoring and alerts
5. Plan for production deployment

## Support

For issues or questions:
1. Check the Supabase documentation
2. Review API provider documentation
3. Check server logs for detailed errors
4. Open an issue in the repository