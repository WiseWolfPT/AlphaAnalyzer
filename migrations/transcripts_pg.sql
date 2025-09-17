-- Transcripts table for PostgreSQL local (aligned with CLAUDE.md)
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quarter TEXT NOT NULL,
  year INT NOT NULL,
  call_date TIMESTAMPTZ NULL,
  raw_transcript TEXT NULL,
  ai_summary TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL,
  view_count INT NOT NULL DEFAULT 0,
  metadata JSONB NULL,
  CONSTRAINT uq_transcripts_ticker_yq UNIQUE (ticker, year, quarter)
);

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_transcripts_published_at ON transcripts (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_transcripts_ticker ON transcripts (ticker);
CREATE INDEX IF NOT EXISTS idx_transcripts_year_quarter ON transcripts (year, quarter);

