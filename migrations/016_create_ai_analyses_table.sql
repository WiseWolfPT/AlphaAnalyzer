-- UP
-- Create ai_analyses table for storing AI analysis results
CREATE TABLE ai_analyses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  transcript_id TEXT NOT NULL,
  model_used TEXT NOT NULL CHECK (model_used IN ('gpt-4o-mini', 'gpt-3.5-turbo')),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('summary', 'sentiment', 'metrics', 'insights')),
  content TEXT NOT NULL, -- JSON content varies by analysis type
  confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_analyses_transcript_id ON ai_analyses(transcript_id);
CREATE INDEX idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX idx_ai_analyses_model ON ai_analyses(model_used);
CREATE INDEX idx_ai_analyses_created_at ON ai_analyses(created_at);
CREATE INDEX idx_ai_analyses_cost ON ai_analyses(cost_usd);

-- Create composite index for common queries
CREATE INDEX idx_ai_analyses_transcript_type ON ai_analyses(transcript_id, analysis_type);

-- DOWN
-- Drop the ai_analyses table and all related indexes
DROP INDEX IF EXISTS idx_ai_analyses_transcript_type;
DROP INDEX IF EXISTS idx_ai_analyses_cost;
DROP INDEX IF EXISTS idx_ai_analyses_created_at;
DROP INDEX IF EXISTS idx_ai_analyses_model;
DROP INDEX IF EXISTS idx_ai_analyses_type;
DROP INDEX IF EXISTS idx_ai_analyses_transcript_id;
DROP TABLE IF EXISTS ai_analyses;