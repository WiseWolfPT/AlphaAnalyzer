# Supabase RLS Policies (Versioned)

- File: `20250926_rls_policies.sql`
- Date: 2025-09-26
- Scope: portfolios, portfolio_positions, watchlists, watchlist_stocks, profiles, users, price_alerts, realtime_alerts, user_sessions

How to apply
1) Supabase Studio → SQL → Run `20250926_rls_policies.sql`
2) Verify with the RLS checker:
   ```bash
   SUPABASE_URL=... \
   SUPABASE_ANON_KEY=... \
   SUPABASE_SERVICE_ROLE_KEY=... \
   npm run security:check-rls
   ```

What it does
- Enables RLS on the listed tables
- Blocks all anonymous access (USING false)
- Grants owner-only access to authenticated users (USING id/user_id = auth.uid())
- Uses EXISTS for child tables (portfolio_positions, watchlist_stocks)
- Adds helpful indexes on keys used in policies

Rollback (if needed)
- You can drop individual policies and/or `DISABLE ROW LEVEL SECURITY` per table.
- Example:
  ```sql
  ALTER TABLE public.portfolios DISABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS portfolios_select ON public.portfolios;
  -- etc.
  ```

Notes
- Adjust owner column names as needed (e.g., `owner_id` instead of `user_id`).
- The `service_role` bypasses RLS; backend workers will continue to function.
- Consider rotating management tokens used to apply policies (audit trail).

