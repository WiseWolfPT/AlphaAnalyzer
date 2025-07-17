-- Create performance_logs table for tracking system performance
CREATE TABLE IF NOT EXISTS performance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  provider_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT 0,
  error_message TEXT,
  request_size INTEGER,
  response_size INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_logs_provider ON performance_logs(provider_name);
CREATE INDEX IF NOT EXISTS idx_performance_logs_success ON performance_logs(success);
CREATE INDEX IF NOT EXISTS idx_performance_logs_provider_timestamp ON performance_logs(provider_name, timestamp);

-- Create performance_summaries table for aggregated metrics
CREATE TABLE IF NOT EXISTS performance_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  provider_name TEXT NOT NULL,
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms REAL NOT NULL DEFAULT 0,
  min_response_time_ms INTEGER NOT NULL DEFAULT 0,
  max_response_time_ms INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  total_data_transferred INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date, provider_name)
);

-- Create indexes for performance summaries
CREATE INDEX IF NOT EXISTS idx_performance_summaries_date ON performance_summaries(date);
CREATE INDEX IF NOT EXISTS idx_performance_summaries_provider ON performance_summaries(provider_name);

-- Create trigger to automatically update performance summaries
CREATE TRIGGER IF NOT EXISTS update_performance_summary 
AFTER INSERT ON performance_logs
BEGIN
  INSERT OR REPLACE INTO performance_summaries (
    date, 
    provider_name, 
    total_requests,
    successful_requests,
    failed_requests,
    avg_response_time_ms,
    min_response_time_ms,
    max_response_time_ms,
    success_rate,
    total_data_transferred,
    updated_at
  ) 
  SELECT 
    DATE(NEW.timestamp) as date,
    NEW.provider_name,
    COUNT(*) as total_requests,
    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
    AVG(response_time_ms) as avg_response_time_ms,
    MIN(response_time_ms) as min_response_time_ms,
    MAX(response_time_ms) as max_response_time_ms,
    (CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)) * 100 as success_rate,
    SUM(COALESCE(request_size, 0) + COALESCE(response_size, 0)) as total_data_transferred,
    CURRENT_TIMESTAMP as updated_at
  FROM performance_logs 
  WHERE 
    DATE(timestamp) = DATE(NEW.timestamp) 
    AND provider_name = NEW.provider_name;
END;

-- Create system_metrics table for system-level performance tracking
CREATE TABLE IF NOT EXISTS system_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  metric_type TEXT NOT NULL, -- 'memory', 'cpu', 'disk', 'network', 'cache'
  metric_name TEXT NOT NULL, -- specific metric name
  metric_value REAL NOT NULL,
  metric_unit TEXT NOT NULL, -- 'bytes', 'percentage', 'ms', 'count'
  metadata TEXT, -- JSON string for additional context
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for system metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);

-- Insert some initial performance tracking setup
INSERT OR IGNORE INTO system_metrics (metric_type, metric_name, metric_value, metric_unit, metadata)
VALUES 
  ('system', 'tracking_enabled', 1, 'boolean', '{"description": "Performance tracking enabled"}'),
  ('system', 'retention_days', 30, 'days', '{"description": "Performance data retention period"}');

-- Create view for recent performance overview
CREATE VIEW IF NOT EXISTS performance_overview AS
SELECT 
  p.provider_name,
  COUNT(*) as total_requests_today,
  SUM(CASE WHEN p.success = 1 THEN 1 ELSE 0 END) as successful_requests_today,
  ROUND(AVG(p.response_time_ms), 2) as avg_response_time_today,
  ROUND((CAST(SUM(CASE WHEN p.success = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)) * 100, 2) as success_rate_today,
  MAX(p.timestamp) as last_request_time
FROM performance_logs p
WHERE DATE(p.timestamp) = DATE('now')
GROUP BY p.provider_name
ORDER BY p.provider_name;

-- Create view for historical performance trends
CREATE VIEW IF NOT EXISTS performance_trends AS
SELECT 
  s.date,
  s.provider_name,
  s.total_requests,
  s.success_rate,
  s.avg_response_time_ms,
  LAG(s.success_rate) OVER (PARTITION BY s.provider_name ORDER BY s.date) as prev_success_rate,
  LAG(s.avg_response_time_ms) OVER (PARTITION BY s.provider_name ORDER BY s.date) as prev_avg_response_time
FROM performance_summaries s
ORDER BY s.provider_name, s.date;

-- Create cleanup procedure (commented out - to be called manually or via scheduled job)
/*
-- Clean up old performance logs (keep last 30 days)
DELETE FROM performance_logs WHERE timestamp < datetime('now', '-30 days');

-- Clean up old performance summaries (keep last 90 days)
DELETE FROM performance_summaries WHERE date < date('now', '-90 days');

-- Clean up old system metrics (keep last 30 days)
DELETE FROM system_metrics WHERE timestamp < datetime('now', '-30 days');
*/