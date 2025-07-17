-- Create backfill jobs table for historical data loading
-- This manages the queue and progress of historical data backfill operations

CREATE TABLE IF NOT EXISTS backfill_jobs (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK(priority >= 1 AND priority <= 10),
  data_types TEXT[] NOT NULL DEFAULT '{"aggregates"}',
  provider TEXT NOT NULL DEFAULT 'polygon' CHECK(provider IN ('polygon', 'twelve_data', 'fmp', 'alpha_vantage', 'finnhub')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'paused')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  estimated_duration_ms BIGINT,
  data_points_collected INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0
);

-- Create indexes for backfill_jobs
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status ON backfill_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_priority ON backfill_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_symbol ON backfill_jobs(symbol);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_provider ON backfill_jobs(provider);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_created_at ON backfill_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_backfill_jobs_status_priority ON backfill_jobs(status, priority DESC);

-- Create historical data table for storing the actual market data
CREATE TABLE IF NOT EXISTS historical_data (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  data_type TEXT NOT NULL CHECK(data_type IN ('aggregates', 'quote', 'fundamentals', 'splits', 'dividends')),
  provider TEXT NOT NULL,
  
  -- Price data (for aggregates and quotes)
  open DECIMAL(15,4),
  high DECIMAL(15,4),
  low DECIMAL(15,4),
  close DECIMAL(15,4),
  price DECIMAL(15,4), -- For current quotes
  
  -- Volume and market data
  volume BIGINT,
  market_cap BIGINT,
  shares_outstanding BIGINT,
  
  -- Change data
  change DECIMAL(15,4),
  change_percent DECIMAL(8,4),
  
  -- Fundamental data
  pe_ratio DECIMAL(10,4),
  eps DECIMAL(10,4),
  revenue BIGINT,
  book_value DECIMAL(15,4),
  
  -- Dividend/Split data
  dividend_amount DECIMAL(10,4),
  ex_dividend_date DATE,
  split_ratio DECIMAL(10,4),
  
  -- Metadata
  raw_data JSONB, -- Store complete API response for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure uniqueness per symbol/timestamp/data_type combination
  UNIQUE(symbol, timestamp, data_type)
);

-- Create indexes for historical_data
CREATE INDEX IF NOT EXISTS idx_historical_data_symbol ON historical_data(symbol);
CREATE INDEX IF NOT EXISTS idx_historical_data_timestamp ON historical_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_data_symbol_timestamp ON historical_data(symbol, timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_data_data_type ON historical_data(data_type);
CREATE INDEX IF NOT EXISTS idx_historical_data_provider ON historical_data(provider);
CREATE INDEX IF NOT EXISTS idx_historical_data_symbol_type_time ON historical_data(symbol, data_type, timestamp);

-- Create symbol metadata table for priority calculation
CREATE TABLE IF NOT EXISTS symbol_metadata (
  symbol TEXT PRIMARY KEY,
  company_name TEXT,
  market_cap BIGINT,
  avg_volume BIGINT,
  sector TEXT,
  industry TEXT,
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'USD',
  is_popular BOOLEAN DEFAULT FALSE,
  priority_score INTEGER DEFAULT 5,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Data availability tracking
  has_fundamentals BOOLEAN DEFAULT FALSE,
  has_dividends BOOLEAN DEFAULT FALSE,
  has_splits BOOLEAN DEFAULT FALSE,
  earliest_data_date DATE,
  latest_data_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for symbol_metadata
CREATE INDEX IF NOT EXISTS idx_symbol_metadata_priority ON symbol_metadata(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_symbol_metadata_market_cap ON symbol_metadata(market_cap DESC);
CREATE INDEX IF NOT EXISTS idx_symbol_metadata_popular ON symbol_metadata(is_popular);
CREATE INDEX IF NOT EXISTS idx_symbol_metadata_sector ON symbol_metadata(sector);

-- Insert popular symbols with high priority
INSERT INTO symbol_metadata (symbol, company_name, is_popular, priority_score) VALUES
  ('AAPL', 'Apple Inc.', TRUE, 10),
  ('MSFT', 'Microsoft Corporation', TRUE, 10),
  ('GOOGL', 'Alphabet Inc.', TRUE, 10),
  ('AMZN', 'Amazon.com Inc.', TRUE, 10),
  ('TSLA', 'Tesla Inc.', TRUE, 10),
  ('META', 'Meta Platforms Inc.', TRUE, 9),
  ('NFLX', 'Netflix Inc.', TRUE, 9),
  ('NVDA', 'NVIDIA Corporation', TRUE, 9),
  ('AMD', 'Advanced Micro Devices Inc.', TRUE, 8),
  ('INTC', 'Intel Corporation', TRUE, 8),
  ('CRM', 'Salesforce Inc.', TRUE, 8),
  ('ADBE', 'Adobe Inc.', TRUE, 8),
  ('PYPL', 'PayPal Holdings Inc.', TRUE, 7),
  ('DIS', 'Walt Disney Company', TRUE, 7),
  ('UBER', 'Uber Technologies Inc.', TRUE, 7),
  ('SPOT', 'Spotify Technology S.A.', TRUE, 7),
  ('SQ', 'Square Inc.', TRUE, 6),
  ('TWTR', 'Twitter Inc.', TRUE, 6),
  ('ZOOM', 'Zoom Video Communications', TRUE, 6),
  ('ROKU', 'Roku Inc.', TRUE, 6)
ON CONFLICT (symbol) DO NOTHING;

-- Create function to get next backfill job
CREATE OR REPLACE FUNCTION get_next_backfill_job()
RETURNS RECORD AS $$
DECLARE
  job RECORD;
BEGIN
  -- Get highest priority pending job
  SELECT *
  INTO job
  FROM backfill_jobs
  WHERE status = 'pending'
  ORDER BY priority DESC, created_at ASC
  LIMIT 1;
  
  -- If found, mark as running
  IF FOUND THEN
    UPDATE backfill_jobs 
    SET status = 'running', updated_at = NOW()
    WHERE id = job.id;
  END IF;
  
  RETURN job;
END;
$$ LANGUAGE plpgsql;

-- Create function to update job progress
CREATE OR REPLACE FUNCTION update_backfill_progress(
  p_job_id TEXT,
  p_progress INTEGER,
  p_data_points INTEGER DEFAULT NULL,
  p_errors INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE backfill_jobs 
  SET 
    progress = p_progress,
    updated_at = NOW(),
    data_points_collected = COALESCE(p_data_points, data_points_collected),
    errors_encountered = COALESCE(p_errors, errors_encountered)
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete backfill job
CREATE OR REPLACE FUNCTION complete_backfill_job(
  p_job_id TEXT,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE backfill_jobs 
  SET 
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    progress = CASE WHEN p_success THEN 100 ELSE progress END,
    completed_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
    error = p_error,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to get backfill statistics
CREATE OR REPLACE FUNCTION get_backfill_stats()
RETURNS TABLE (
  total_jobs INTEGER,
  pending_jobs INTEGER,
  running_jobs INTEGER,
  completed_jobs INTEGER,
  failed_jobs INTEGER,
  paused_jobs INTEGER,
  total_data_points BIGINT,
  avg_job_duration_ms BIGINT,
  jobs_completed_today INTEGER,
  most_active_provider TEXT,
  highest_priority_symbol TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_jobs,
    COUNT(CASE WHEN bj.status = 'pending' THEN 1 END)::INTEGER as pending_jobs,
    COUNT(CASE WHEN bj.status = 'running' THEN 1 END)::INTEGER as running_jobs,
    COUNT(CASE WHEN bj.status = 'completed' THEN 1 END)::INTEGER as completed_jobs,
    COUNT(CASE WHEN bj.status = 'failed' THEN 1 END)::INTEGER as failed_jobs,
    COUNT(CASE WHEN bj.status = 'paused' THEN 1 END)::INTEGER as paused_jobs,
    COALESCE(SUM(bj.data_points_collected), 0) as total_data_points,
    (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000)::BIGINT 
     FROM backfill_jobs 
     WHERE status = 'completed' AND completed_at IS NOT NULL) as avg_job_duration_ms,
    COUNT(CASE WHEN bj.status = 'completed' AND DATE(bj.completed_at) = CURRENT_DATE THEN 1 END)::INTEGER as jobs_completed_today,
    (SELECT provider FROM backfill_jobs GROUP BY provider ORDER BY COUNT(*) DESC LIMIT 1) as most_active_provider,
    (SELECT symbol FROM backfill_jobs WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1) as highest_priority_symbol
  FROM backfill_jobs bj;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old completed jobs (keep last 1000)
CREATE OR REPLACE FUNCTION cleanup_old_backfill_jobs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep only the 1000 most recent completed jobs
  DELETE FROM backfill_jobs 
  WHERE status = 'completed' 
    AND id NOT IN (
      SELECT id FROM backfill_jobs 
      WHERE status = 'completed' 
      ORDER BY completed_at DESC 
      LIMIT 1000
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get data gaps for a symbol
CREATE OR REPLACE FUNCTION get_data_gaps(
  p_symbol TEXT,
  p_data_type TEXT DEFAULT 'aggregates',
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  gap_start DATE,
  gap_end DATE,
  gap_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as date
  ),
  existing_data AS (
    SELECT DISTINCT timestamp::date as date
    FROM historical_data
    WHERE symbol = p_symbol AND data_type = p_data_type
      AND timestamp::date BETWEEN p_start_date AND p_end_date
  ),
  missing_dates AS (
    SELECT ds.date
    FROM date_series ds
    LEFT JOIN existing_data ed ON ds.date = ed.date
    WHERE ed.date IS NULL
      AND EXTRACT(DOW FROM ds.date) NOT IN (0, 6) -- Exclude weekends
  ),
  date_groups AS (
    SELECT 
      date,
      date - (ROW_NUMBER() OVER (ORDER BY date))::integer * interval '1 day' as group_id
    FROM missing_dates
  )
  SELECT 
    MIN(date)::date as gap_start,
    MAX(date)::date as gap_end,
    (MAX(date) - MIN(date))::integer + 1 as gap_days
  FROM date_groups
  GROUP BY group_id
  ORDER BY gap_start;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE backfill_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbol_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for backfill_jobs (admin only for write, read for authenticated users)
CREATE POLICY "backfill_jobs_read_authenticated" ON backfill_jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "backfill_jobs_admin_all" ON backfill_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create policies for historical_data (read for authenticated, system write)
CREATE POLICY "historical_data_read_authenticated" ON historical_data
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "historical_data_system_write" ON historical_data
  FOR INSERT WITH CHECK (true);

-- Create policies for symbol_metadata (read for all, admin write)
CREATE POLICY "symbol_metadata_read_all" ON symbol_metadata
  FOR SELECT USING (true);

CREATE POLICY "symbol_metadata_admin_write" ON symbol_metadata
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_backfill_jobs_updated_at
  BEFORE UPDATE ON backfill_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symbol_metadata_updated_at
  BEFORE UPDATE ON symbol_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();