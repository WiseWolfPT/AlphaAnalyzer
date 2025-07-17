-- Create job_queue table for background job processing
-- Part of PHASE 1 - Core Infrastructure implementation

CREATE TABLE IF NOT EXISTS job_queue (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  tier INTEGER DEFAULT 2,
  scheduled_for TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  result JSONB
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled ON job_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON job_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_type ON job_queue(type);

-- Create composite index for worker queries
CREATE INDEX IF NOT EXISTS idx_job_queue_worker_query 
ON job_queue(status, scheduled_for, priority DESC);

-- Add comments for documentation
COMMENT ON TABLE job_queue IS 'Background job processing queue for serverless functions';
COMMENT ON COLUMN job_queue.type IS 'Job type: update_stock_data, health_check, etc.';
COMMENT ON COLUMN job_queue.tier IS 'API tier: 1=free, 2=basic, 3=premium, 4=ultra';
COMMENT ON COLUMN job_queue.priority IS 'Higher number = higher priority';
COMMENT ON COLUMN job_queue.payload IS 'Job parameters and configuration';