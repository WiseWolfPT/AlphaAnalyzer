-- Add financial_metrics column to transcripts table for storing detailed stock-specific metrics
ALTER TABLE transcripts
ADD COLUMN IF NOT EXISTS financial_metrics JSONB;

-- Create index for better query performance on financial metrics
CREATE INDEX IF NOT EXISTS idx_transcripts_financial_metrics ON transcripts USING GIN (financial_metrics);

-- Update comment on column
COMMENT ON COLUMN transcripts.financial_metrics IS 'Stock-specific financial metrics extracted from earnings transcript including revenue, earnings, margins, guidance, and custom KPIs';