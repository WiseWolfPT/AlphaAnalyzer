-- EMERGENCY: BLOCK ALL ANONYMOUS ACCESS IMMEDIATELY
-- This creates deny-all policies for anonymous users

BEGIN;

-- PORTFOLIOS - Block all access for anon
DROP POLICY IF EXISTS block_anon_portfolios ON public.portfolios;
CREATE POLICY block_anon_portfolios ON public.portfolios
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_portfolios ON public.portfolios;
CREATE POLICY allow_auth_portfolios ON public.portfolios
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- PORTFOLIO_POSITIONS - Block all access for anon
DROP POLICY IF EXISTS block_anon_portfolio_positions ON public.portfolio_positions;
CREATE POLICY block_anon_portfolio_positions ON public.portfolio_positions
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_portfolio_positions ON public.portfolio_positions;
CREATE POLICY allow_auth_portfolio_positions ON public.portfolio_positions
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- WATCHLISTS - Block all access for anon
DROP POLICY IF EXISTS block_anon_watchlists ON public.watchlists;
CREATE POLICY block_anon_watchlists ON public.watchlists
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_watchlists ON public.watchlists;
CREATE POLICY allow_auth_watchlists ON public.watchlists
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- WATCHLIST_STOCKS - Block all access for anon
DROP POLICY IF EXISTS block_anon_watchlist_stocks ON public.watchlist_stocks;
CREATE POLICY block_anon_watchlist_stocks ON public.watchlist_stocks
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_watchlist_stocks ON public.watchlist_stocks;
CREATE POLICY allow_auth_watchlist_stocks ON public.watchlist_stocks
  FOR ALL TO authenticated USING (
    watchlist_id IN (SELECT id FROM public.watchlists WHERE user_id = auth.uid())
  );

-- PROFILES - Block all access for anon
DROP POLICY IF EXISTS block_anon_profiles ON public.profiles;
CREATE POLICY block_anon_profiles ON public.profiles
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_profiles ON public.profiles;
CREATE POLICY allow_auth_profiles ON public.profiles
  FOR ALL TO authenticated USING (id = auth.uid());

-- USERS - Block all access for anon (CRITICAL!)
DROP POLICY IF EXISTS block_anon_users ON public.users;
CREATE POLICY block_anon_users ON public.users
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_users ON public.users;
CREATE POLICY allow_auth_users ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

-- PRICE_ALERTS - Block all access for anon
DROP POLICY IF EXISTS block_anon_price_alerts ON public.price_alerts;
CREATE POLICY block_anon_price_alerts ON public.price_alerts
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_price_alerts ON public.price_alerts;
CREATE POLICY allow_auth_price_alerts ON public.price_alerts
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- REALTIME_ALERTS - Block all access for anon
DROP POLICY IF EXISTS block_anon_realtime_alerts ON public.realtime_alerts;
CREATE POLICY block_anon_realtime_alerts ON public.realtime_alerts
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_realtime_alerts ON public.realtime_alerts;
CREATE POLICY allow_auth_realtime_alerts ON public.realtime_alerts
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- USER_SESSIONS - Block all access for anon
DROP POLICY IF EXISTS block_anon_user_sessions ON public.user_sessions;
CREATE POLICY block_anon_user_sessions ON public.user_sessions
  FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS allow_auth_user_sessions ON public.user_sessions;
CREATE POLICY allow_auth_user_sessions ON public.user_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid());

COMMIT;

-- Verify RLS is enabled
SELECT tablename, relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE n.nspname = 'public'
AND tablename IN (
  'portfolios', 'portfolio_positions', 'watchlists', 'watchlist_stocks',
  'profiles', 'users', 'price_alerts', 'realtime_alerts', 'user_sessions'
)
ORDER BY tablename;