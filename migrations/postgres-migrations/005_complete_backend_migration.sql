-- =============================================================================
-- Migration: 005_complete_backend_migration.sql
-- Description: Complete backend migration with all required tables
-- Created: 2025-07-04
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STOCKS TABLE (for transcript references)
-- =============================================================================
CREATE TABLE IF NOT EXISTS stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exchange TEXT,
  sector TEXT,
  industry TEXT,
  market_cap BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks(name);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);

-- =============================================================================
-- TRANSCRIPTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quarter TEXT NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'FY')),
  year INTEGER NOT NULL CHECK(year >= 2000 AND year <= 2100),
  call_date DATE,
  call_time TEXT,
  raw_transcript TEXT,
  ai_summary JSONB,
  key_metrics JSONB,
  sentiment_score REAL CHECK(sentiment_score >= -1 AND sentiment_score <= 1),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'review', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id),
  view_count INTEGER DEFAULT 0 CHECK(view_count >= 0),
  
  -- Unique constraint to prevent duplicate transcripts
  CONSTRAINT unique_transcript_per_quarter UNIQUE (ticker, year, quarter)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transcripts_ticker ON transcripts(ticker);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_year_quarter ON transcripts(year, quarter);
CREATE INDEX IF NOT EXISTS idx_transcripts_published_at ON transcripts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_published_by ON transcripts(published_by);

-- =============================================================================
-- API USAGE TRACKING TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_timestamp ON api_usage_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage_logs(api_provider, timestamp DESC);

-- =============================================================================
-- CACHE TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  tags TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_tags ON cache USING GIN(tags);

-- =============================================================================
-- USER SESSIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at) WHERE active = TRUE;

-- =============================================================================
-- PROFILES TABLE (extended user data)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK(subscription_tier IN ('free', 'premium', 'pro')),
  email_verified BOOLEAN DEFAULT FALSE,
  email_notification_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_tier);

-- =============================================================================
-- SECURITY LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type, timestamp DESC);

-- =============================================================================
-- DATA ACCESS LOGS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS data_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_access_user ON data_access_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_resource ON data_access_logs(resource_type, resource_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- =============================================================================
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Transcripts: Public read for published, admin write
CREATE POLICY transcripts_public_read ON transcripts
  FOR SELECT USING (status = 'published');

CREATE POLICY transcripts_admin_all ON transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.subscription_tier IN ('pro', 'admin')
    )
  );

-- API Usage: Users can only see their own logs
CREATE POLICY api_usage_own_only ON api_usage_logs
  FOR ALL USING (auth.uid() = user_id);

-- Cache: Service role only (backend use)
-- No policies needed as this is backend-only

-- User Sessions: Users can only see their own sessions
CREATE POLICY sessions_own_only ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Profiles: Public read, own update
CREATE POLICY profiles_public_read ON profiles
  FOR SELECT USING (true);

CREATE POLICY profiles_own_update ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_own_insert ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Security logs: Users can see their own, admins see all
CREATE POLICY security_logs_own ON security_logs
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.subscription_tier = 'admin'
    )
  );

-- Data access logs: Similar to security logs
CREATE POLICY data_access_logs_own ON data_access_logs
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.subscription_tier = 'admin'
    )
  );

-- Stocks: Public read
CREATE POLICY stocks_public_read ON stocks
  FOR SELECT USING (true);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTIONS FOR TRANSCRIPT MANAGEMENT
-- =============================================================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_transcript_view_count(transcript_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE transcripts 
  SET view_count = view_count + 1 
  WHERE id = transcript_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to publish transcript
CREATE OR REPLACE FUNCTION publish_transcript(
  transcript_id UUID,
  publisher_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE transcripts 
  SET 
    status = 'published',
    published_at = NOW(),
    published_by = publisher_id
  WHERE id = transcript_id
  AND status IN ('pending', 'review');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE user_sessions 
  SET active = FALSE 
  WHERE expires_at < NOW() AND active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transcripts_ticker_year ON transcripts(ticker, year DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_provider ON api_usage_logs(user_id, api_provider);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions(user_id, active, expires_at);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================
COMMENT ON TABLE transcripts IS 'Earnings call transcripts with AI summaries';
COMMENT ON TABLE api_usage_logs IS 'Tracks API usage for rate limiting and analytics';
COMMENT ON TABLE cache IS 'Server-side cache for expensive API calls';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';
COMMENT ON TABLE profiles IS 'Extended user profile information';
COMMENT ON TABLE security_logs IS 'Security events for audit trail';
COMMENT ON TABLE data_access_logs IS 'Data access events for compliance';
COMMENT ON TABLE stocks IS 'Stock symbols and company information';

-- =============================================================================
-- SAMPLE DATA FOR DEVELOPMENT (Optional)
-- =============================================================================
-- Uncomment to insert sample stocks
/*
INSERT INTO stocks (symbol, name, exchange, sector, industry) VALUES
  ('AAPL', 'Apple Inc.', 'NASDAQ', 'Technology', 'Consumer Electronics'),
  ('MSFT', 'Microsoft Corporation', 'NASDAQ', 'Technology', 'Software'),
  ('GOOGL', 'Alphabet Inc.', 'NASDAQ', 'Technology', 'Internet Services'),
  ('AMZN', 'Amazon.com Inc.', 'NASDAQ', 'Consumer Cyclical', 'E-Commerce')
ON CONFLICT (symbol) DO NOTHING;
*/