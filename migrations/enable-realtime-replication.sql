-- ====================================================================
-- ENABLE REALTIME REPLICATION FOR ALFALYZER TABLES
-- ====================================================================
-- Run this in Supabase SQL Editor to enable realtime on all tables
-- ====================================================================

-- First, ensure the tables are added to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_market_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_portfolio_updates;

-- Also add the cache tables for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_status;

-- Verify what tables are enabled for realtime
SELECT 
    schemaname,
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime'
ORDER BY 
    schemaname, tablename;