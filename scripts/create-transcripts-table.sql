-- Create transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  quarter VARCHAR(4) NOT NULL,
  year INTEGER NOT NULL,
  call_date DATE,
  raw_transcript TEXT,
  ai_summary TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transcripts_ticker ON transcripts(ticker);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_year ON transcripts(year);
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_published_at ON transcripts(published_at DESC);

-- Create unique constraint for ticker + quarter + year combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_transcripts_unique_period 
ON transcripts(ticker, quarter, year);

-- Create RPC function to increment view count atomically
CREATE OR REPLACE FUNCTION increment_transcript_views(transcript_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE transcripts 
  SET view_count = view_count + 1 
  WHERE id = transcript_id;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to get transcript statistics
CREATE OR REPLACE FUNCTION get_transcript_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total_count integer;
  total_views_sum integer;
  status_counts jsonb;
  year_counts jsonb;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count FROM transcripts;
  
  -- Get total views
  SELECT COALESCE(SUM(view_count), 0) INTO total_views_sum FROM transcripts;
  
  -- Get counts by status
  SELECT jsonb_object_agg(status, cnt) INTO status_counts
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM transcripts
    GROUP BY status
  ) s;
  
  -- Get counts by year
  SELECT jsonb_object_agg(year::text, cnt) INTO year_counts
  FROM (
    SELECT year, COUNT(*) as cnt
    FROM transcripts
    GROUP BY year
    ORDER BY year
  ) y;
  
  -- Build result
  result := jsonb_build_object(
    'total', total_count,
    'byStatus', COALESCE(status_counts, '{}'::jsonb),
    'byYear', COALESCE(year_counts, '{}'::jsonb),
    'totalViews', total_views_sum,
    'averageViews', CASE 
      WHEN total_count > 0 THEN ROUND(total_views_sum::decimal / total_count) 
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert some initial test data
INSERT INTO transcripts (ticker, company_name, quarter, year, call_date, raw_transcript, ai_summary, status, view_count, metadata)
VALUES 
  ('AAPL', 'Apple Inc.', 'Q4', 2024, '2024-01-25', 
   'Apple Inc. Q4 2024 Earnings Call Transcript...', 
   'Apple reported strong Q4 results with iPhone sales exceeding expectations...', 
   'published', 234, '{"source": "MarketBeat", "analyst_ratings": 5}'),
  ('GOOGL', 'Alphabet Inc.', 'Q4', 2024, '2024-01-30', 
   'Alphabet Inc. Q4 2024 Earnings Call Transcript...', 
   'Google showed strong growth in cloud services and AI initiatives...', 
   'review', 0, '{"source": "MarketBeat", "analyst_ratings": 4}'),
  ('MSFT', 'Microsoft Corporation', 'Q1', 2025, '2025-01-15', 
   '', '', 'pending', 0, '{"source": "Seeking Alpha", "analyst_ratings": 5}')
ON CONFLICT (ticker, quarter, year) DO NOTHING;

-- Enable Row Level Security (RLS) for transcripts
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published transcripts
CREATE POLICY "Published transcripts are publicly readable" ON transcripts
  FOR SELECT USING (status = 'published');

-- Create policy for admin full access (assuming admin role will be implemented)
-- For now, all operations are allowed via service role key
CREATE POLICY "Service role has full access" ON transcripts
  FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON transcripts TO anon, authenticated;
GRANT ALL ON transcripts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE transcripts_id_seq TO service_role;