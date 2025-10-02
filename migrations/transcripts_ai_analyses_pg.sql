-- PostgreSQL migration for ai_analyses table
-- Matches the SQLite schema but optimized for PostgreSQL

-- Create ai_analyses table for storing AI analysis results
CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  transcript_id INTEGER NOT NULL,
  model_used TEXT NOT NULL CHECK (model_used IN ('gpt-4o-mini', 'gpt-3.5-turbo')),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('summary', 'sentiment', 'metrics', 'insights')),
  content JSONB NOT NULL, -- Use JSONB for better performance in PostgreSQL
  confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_analyses_transcript_id ON ai_analyses(transcript_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_model ON ai_analyses(model_used);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_cost ON ai_analyses(cost_usd);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_ai_analyses_transcript_type ON ai_analyses(transcript_id, analysis_type);

-- Create GIN index for JSONB content searches (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_ai_analyses_content_gin ON ai_analyses USING GIN (content);

-- Comments for documentation
COMMENT ON TABLE ai_analyses IS 'AI analysis results for earnings transcripts';
COMMENT ON COLUMN ai_analyses.transcript_id IS 'Foreign key to transcripts.id';
COMMENT ON COLUMN ai_analyses.content IS 'JSON content varies by analysis type - stored as JSONB for performance';
COMMENT ON COLUMN ai_analyses.confidence_score IS 'AI confidence score between 0 and 1';
COMMENT ON COLUMN ai_analyses.cost_usd IS 'OpenAI API cost in USD for this analysis';