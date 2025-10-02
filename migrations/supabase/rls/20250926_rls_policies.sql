-- Supabase RLS Policies (Versioned) - 2025-09-26
-- Scope: portfolios, portfolio_positions, watchlists, watchlist_stocks, profiles, users, price_alerts, realtime_alerts, user_sessions
-- Notes:
--  - Adjust owner columns if needed (user_id vs id)
--  - EXISTS policies rely on FK columns (portfolio_id, watchlist_id)
--  - Service role bypasses RLS by design (backend workers unaffected)

BEGIN;

-- ===== Indexes for performance =====
CREATE INDEX IF NOT EXISTS portfolios_user_id_idx ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS portfolio_positions_portfolio_id_idx ON public.portfolio_positions(portfolio_id);
CREATE INDEX IF NOT EXISTS watchlists_user_id_idx ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS watchlist_stocks_watchlist_id_idx ON public.watchlist_stocks(watchlist_id);
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);
CREATE INDEX IF NOT EXISTS users_id_idx ON public.users(id);
CREATE INDEX IF NOT EXISTS price_alerts_user_id_idx ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS realtime_alerts_user_id_idx ON public.realtime_alerts(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON public.user_sessions(user_id);

-- ===== portfolios =====
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_portfolios ON public.portfolios;
DROP POLICY IF EXISTS portfolios_select ON public.portfolios;
DROP POLICY IF EXISTS portfolios_insert ON public.portfolios;
DROP POLICY IF EXISTS portfolios_update ON public.portfolios;
DROP POLICY IF EXISTS portfolios_delete ON public.portfolios;
CREATE POLICY block_anon_portfolios ON public.portfolios FOR ALL TO anon USING (false);
CREATE POLICY portfolios_select ON public.portfolios FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY portfolios_insert ON public.portfolios FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY portfolios_update ON public.portfolios FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY portfolios_delete ON public.portfolios FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.portfolios FROM anon;

-- ===== portfolio_positions (via parent portfolios) =====
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_portfolio_positions ON public.portfolio_positions;
DROP POLICY IF EXISTS portfolio_positions_select ON public.portfolio_positions;
DROP POLICY IF EXISTS portfolio_positions_insert ON public.portfolio_positions;
DROP POLICY IF EXISTS portfolio_positions_update ON public.portfolio_positions;
DROP POLICY IF EXISTS portfolio_positions_delete ON public.portfolio_positions;
CREATE POLICY block_anon_portfolio_positions ON public.portfolio_positions FOR ALL TO anon USING (false);
CREATE POLICY portfolio_positions_select ON public.portfolio_positions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = public.portfolio_positions.portfolio_id
      AND p.user_id = auth.uid()
  )
);
CREATE POLICY portfolio_positions_insert ON public.portfolio_positions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = public.portfolio_positions.portfolio_id
      AND p.user_id = auth.uid()
  )
);
CREATE POLICY portfolio_positions_update ON public.portfolio_positions FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = public.portfolio_positions.portfolio_id
      AND p.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = public.portfolio_positions.portfolio_id
      AND p.user_id = auth.uid()
  )
);
CREATE POLICY portfolio_positions_delete ON public.portfolio_positions FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.portfolios p
    WHERE p.id = public.portfolio_positions.portfolio_id
      AND p.user_id = auth.uid()
  )
);
REVOKE ALL ON public.portfolio_positions FROM anon;

-- ===== watchlists =====
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_watchlists ON public.watchlists;
DROP POLICY IF EXISTS watchlists_select ON public.watchlists;
DROP POLICY IF EXISTS watchlists_insert ON public.watchlists;
DROP POLICY IF EXISTS watchlists_update ON public.watchlists;
DROP POLICY IF EXISTS watchlists_delete ON public.watchlists;
CREATE POLICY block_anon_watchlists ON public.watchlists FOR ALL TO anon USING (false);
CREATE POLICY watchlists_select ON public.watchlists FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY watchlists_insert ON public.watchlists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY watchlists_update ON public.watchlists FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY watchlists_delete ON public.watchlists FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.watchlists FROM anon;

-- ===== watchlist_stocks (via parent watchlists) =====
ALTER TABLE public.watchlist_stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_watchlist_stocks ON public.watchlist_stocks;
DROP POLICY IF EXISTS watchlist_stocks_select ON public.watchlist_stocks;
DROP POLICY IF EXISTS watchlist_stocks_insert ON public.watchlist_stocks;
DROP POLICY IF EXISTS watchlist_stocks_update ON public.watchlist_stocks;
DROP POLICY IF EXISTS watchlist_stocks_delete ON public.watchlist_stocks;
CREATE POLICY block_anon_watchlist_stocks ON public.watchlist_stocks FOR ALL TO anon USING (false);
CREATE POLICY watchlist_stocks_select ON public.watchlist_stocks FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.watchlists w
    WHERE w.id = public.watchlist_stocks.watchlist_id
      AND w.user_id = auth.uid()
  )
);
CREATE POLICY watchlist_stocks_insert ON public.watchlist_stocks FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.watchlists w
    WHERE w.id = public.watchlist_stocks.watchlist_id
      AND w.user_id = auth.uid()
  )
);
CREATE POLICY watchlist_stocks_update ON public.watchlist_stocks FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.watchlists w
    WHERE w.id = public.watchlist_stocks.watchlist_id
      AND w.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.watchlists w
    WHERE w.id = public.watchlist_stocks.watchlist_id
      AND w.user_id = auth.uid()
  )
);
CREATE POLICY watchlist_stocks_delete ON public.watchlist_stocks FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.watchlists w
    WHERE w.id = public.watchlist_stocks.watchlist_id
      AND w.user_id = auth.uid()
  )
);
REVOKE ALL ON public.watchlist_stocks FROM anon;

-- ===== profiles (owner by id = auth.uid()) =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_profiles ON public.profiles;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY block_anon_profiles ON public.profiles FOR ALL TO anon USING (false);
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;

-- ===== users (read-only self; no DML) =====
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_users ON public.users;
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY block_anon_users ON public.users FOR ALL TO anon USING (false);
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;

-- ===== price_alerts =====
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_price_alerts ON public.price_alerts;
DROP POLICY IF EXISTS price_alerts_select ON public.price_alerts;
DROP POLICY IF EXISTS price_alerts_insert ON public.price_alerts;
DROP POLICY IF EXISTS price_alerts_update ON public.price_alerts;
DROP POLICY IF EXISTS price_alerts_delete ON public.price_alerts;
CREATE POLICY block_anon_price_alerts ON public.price_alerts FOR ALL TO anon USING (false);
CREATE POLICY price_alerts_select ON public.price_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY price_alerts_insert ON public.price_alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY price_alerts_update ON public.price_alerts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY price_alerts_delete ON public.price_alerts FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.price_alerts FROM anon;

-- ===== realtime_alerts =====
ALTER TABLE public.realtime_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_realtime_alerts ON public.realtime_alerts;
DROP POLICY IF EXISTS realtime_alerts_select ON public.realtime_alerts;
DROP POLICY IF EXISTS realtime_alerts_insert ON public.realtime_alerts;
DROP POLICY IF EXISTS realtime_alerts_update ON public.realtime_alerts;
DROP POLICY IF EXISTS realtime_alerts_delete ON public.realtime_alerts;
CREATE POLICY block_anon_realtime_alerts ON public.realtime_alerts FOR ALL TO anon USING (false);
CREATE POLICY realtime_alerts_select ON public.realtime_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY realtime_alerts_insert ON public.realtime_alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY realtime_alerts_update ON public.realtime_alerts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY realtime_alerts_delete ON public.realtime_alerts FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.realtime_alerts FROM anon;

-- ===== user_sessions =====
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS block_anon_user_sessions ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_select ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_insert ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_update ON public.user_sessions;
DROP POLICY IF EXISTS user_sessions_delete ON public.user_sessions;
CREATE POLICY block_anon_user_sessions ON public.user_sessions FOR ALL TO anon USING (false);
CREATE POLICY user_sessions_select ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_sessions_insert ON public.user_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_sessions_update ON public.user_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY user_sessions_delete ON public.user_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.user_sessions FROM anon;

COMMIT;

