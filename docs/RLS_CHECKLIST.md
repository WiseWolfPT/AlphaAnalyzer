# Supabase RLS Checklist (Phase 7)

Goal: Ensure Row Level Security (RLS) is enabled and correct for user data tables; verify no table is left without RLS.

Scope tables (example):
- `portfolios` (user-owned)
- `watchlists` (user-owned)
- `transactions` (user-owned)
- `transcripts` (read mostly; write via worker)

Baseline checks (psql):
```sql
-- Show RLS status for all tables in public schema
SELECT tablename, relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.tablename = c.relname AND t.schemaname = n.nspname
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY tablename;

-- List policies per table
SELECT table_name, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY table_name, policyname;
```

Recommended policies (template):
```sql
-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Read/write only own rows (authenticated users)
CREATE POLICY portfolios_select ON public.portfolios
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY portfolios_modify ON public.portfolios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY portfolios_update ON public.portfolios
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY portfolios_delete ON public.portfolios
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

Apply similarly to `watchlists` and `transactions` (substitute table/column names).

Transcripts (read):
```sql
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Public read policy (if transcripts are public), or restrict per plan
CREATE POLICY transcripts_read ON public.transcripts
  FOR SELECT TO anon, authenticated
  USING (true);

-- Writes restricted to service role / backend only
REVOKE INSERT, UPDATE, DELETE ON public.transcripts FROM anon, authenticated;
```

Indexes:
- Ensure indexes on `user_id` columns and common filters.

Verification (API):
- As `anon` user: unable to read/modify other users’ rows.
- As `authenticated` user: can read/modify only own rows.
- As `service_role` (backend): unrestricted for maintenance jobs.

Notes:
- Keep secrets in server env; never expose via `VITE_`.
- Log PII redaction is enabled in server logs (emails/tokens masked).

