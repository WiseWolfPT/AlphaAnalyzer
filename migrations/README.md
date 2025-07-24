# Supabase Database Migrations

This directory contains SQL migrations for setting up the Alfalyzer cache and realtime infrastructure in Supabase.

## Migration Files

### 1. `supabase-cache-schema.sql`
Creates the cache schema and tables for storing market data:
- `cache.stock_quotes` - Individual stock quotes with TTL
- `cache.batch_quotes` - Batch quote requests
- `cache.market_status` - Market open/close status
- `cache.chart_data` - Historical chart data
- `cache.api_quota_usage` - API usage tracking

### 2. `supabase-realtime-schema.sql`
Creates tables for real-time updates:
- `public.realtime_quotes` - Real-time stock price updates
- `public.realtime_alerts` - User price alerts
- `public.realtime_market_status` - Market status changes
- `public.realtime_portfolio_updates` - Portfolio value updates

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of each migration file
5. Run the migrations in order:
   - First: `supabase-cache-schema.sql`
   - Second: `supabase-realtime-schema.sql`

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Direct Connection

```bash
# Using psql
psql -h db.your-project-ref.supabase.co -p 5432 -d postgres -U postgres -f supabase-cache-schema.sql
psql -h db.your-project-ref.supabase.co -p 5432 -d postgres -U postgres -f supabase-realtime-schema.sql
```

## Post-Migration Setup

### 1. Enable Realtime
In Supabase Dashboard:
1. Go to **Database** → **Replication**
2. Enable replication for:
   - `cache.stock_quotes`
   - `public.realtime_quotes`
   - `public.realtime_alerts`
   - `public.realtime_market_status`
   - `public.realtime_portfolio_updates`

### 2. Schedule Cleanup Jobs
In Supabase Dashboard:
1. Go to **Database** → **Extensions**
2. Enable `pg_cron` extension
3. Create cron jobs:

```sql
-- Clean expired cache entries every hour
SELECT cron.schedule(
  'cleanup-cache',
  '0 * * * *',
  'SELECT cache.cleanup_expired_entries();'
);

-- Clean old realtime data every hour
SELECT cron.schedule(
  'cleanup-realtime',
  '30 * * * *',
  'SELECT public.cleanup_old_realtime_data();'
);
```

### 3. Verify Installation

Run these queries to verify the schema was created correctly:

```sql
-- Check cache tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'cache';

-- Check realtime tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'realtime_%';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname IN ('cache', 'public')
AND tablename LIKE '%quotes%' OR tablename LIKE 'realtime_%';
```

## Environment Variables

Make sure your backend has these environment variables set:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

### Permission Errors
If you get permission errors, make sure you're using the correct database role:
- Use `postgres` role for schema creation
- Use `service_role` key in your backend application

### RLS Policy Issues
If data isn't accessible:
1. Check RLS policies are correctly set
2. Verify you're using the service role key for backend operations
3. Test with RLS disabled temporarily to isolate the issue

### Realtime Not Working
1. Verify tables are added to the `supabase_realtime` publication
2. Check WebSocket connections in browser console
3. Ensure your Supabase plan supports the number of concurrent connections

## Cache TTL Guidelines

Default TTLs configured in the application:
- Stock Quotes: 5 minutes
- Batch Quotes: 5 minutes
- Market Status: 15 minutes
- Chart Data: 
  - Intraday: 5 minutes
  - Daily: 1 hour
  - Weekly/Monthly: 24 hours