-- Function to get database size in Supabase
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE(size BIGINT) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database()) as size;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_database_size() TO authenticated;
GRANT EXECUTE ON FUNCTION get_database_size() TO service_role;

-- Function to vacuum tables (clean up space)
CREATE OR REPLACE FUNCTION vacuum_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Note: VACUUM cannot be run inside a transaction block
  -- This is a placeholder - actual VACUUM must be run separately
  RAISE NOTICE 'VACUUM should be run manually or via pg_cron';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION vacuum_tables() TO service_role;