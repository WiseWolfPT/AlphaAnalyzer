-- ALERTS SYSTEM DATABASE SCHEMA
-- Comprehensive alert and notification system for Alfalyzer
-- AGENTE 8: Complete notification system implementation

-- Alerts configuration table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  type TEXT NOT NULL CHECK (type IN (
    'price_change',
    'price_threshold', 
    'volume_spike',
    'earnings_reminder',
    'portfolio_performance',
    'system_health',
    'api_quota',
    'cost_protection',
    'news_mention',
    'technical_indicator'
  )),
  conditions TEXT NOT NULL, -- JSON string of AlertCondition[]
  frequency TEXT NOT NULL,  -- JSON string of AlertFrequency
  channels TEXT NOT NULL,   -- JSON string of NotificationChannel[]
  metadata TEXT,            -- JSON string for additional data
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_triggered TEXT,      -- ISO timestamp
  trigger_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Alert triggers history table
CREATE TABLE IF NOT EXISTS alert_triggers (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL, -- ISO timestamp
  current_value TEXT,         -- String representation of the trigger value
  previous_value TEXT,        -- String representation of the previous value
  symbol TEXT,                -- Stock symbol if applicable
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata TEXT,              -- JSON string for additional trigger data
  notifications_sent TEXT NOT NULL, -- JSON string of NotificationChannel[]
  acknowledged BOOLEAN NOT NULL DEFAULT 0,
  acknowledged_at TEXT,       -- ISO timestamp
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User alert preferences table
CREATE TABLE IF NOT EXISTS user_alert_preferences (
  user_id TEXT PRIMARY KEY,
  global_enabled BOOLEAN NOT NULL DEFAULT 1,
  default_channels TEXT NOT NULL DEFAULT '["in_app"]', -- JSON string of NotificationChannel[]
  quiet_hours TEXT NOT NULL DEFAULT '{"enabled":false,"startHour":22,"endHour":8,"timezone":"UTC"}', -- JSON string of QuietHours
  email_notifications BOOLEAN NOT NULL DEFAULT 0,
  push_notifications BOOLEAN NOT NULL DEFAULT 0,
  weekend_alerts BOOLEAN NOT NULL DEFAULT 1,
  max_alerts_per_day INTEGER NOT NULL DEFAULT 50,
  preferred_frequency TEXT NOT NULL DEFAULT 'every_15_minutes',
  categories TEXT NOT NULL DEFAULT '{}', -- JSON string of alert type preferences
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification delivery log table
CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_id TEXT,
  trigger_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push', 'webhook', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  external_id TEXT, -- For tracking with external services
  metadata TEXT,    -- JSON string for additional delivery data
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL,
  FOREIGN KEY (trigger_id) REFERENCES alert_triggers(id) ON DELETE SET NULL
);

-- Alert statistics summary table (for dashboard)
CREATE TABLE IF NOT EXISTS alert_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  total_alerts_active INTEGER NOT NULL DEFAULT 0,
  total_triggers INTEGER NOT NULL DEFAULT 0,
  total_notifications_sent INTEGER NOT NULL DEFAULT 0,
  total_notifications_delivered INTEGER NOT NULL DEFAULT 0,
  total_notifications_failed INTEGER NOT NULL DEFAULT 0,
  by_type TEXT NOT NULL DEFAULT '{}', -- JSON object with counts per alert type
  by_channel TEXT NOT NULL DEFAULT '{}', -- JSON object with counts per channel
  by_severity TEXT NOT NULL DEFAULT '{}', -- JSON object with counts per severity
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_enabled ON alerts(enabled);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_last_triggered ON alerts(last_triggered);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_alert_id ON alert_triggers(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_user_id ON alert_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_triggered_at ON alert_triggers(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_symbol ON alert_triggers(symbol);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_severity ON alert_triggers(severity);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_acknowledged ON alert_triggers(acknowledged);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

CREATE INDEX IF NOT EXISTS idx_alert_stats_date ON alert_stats(date);

-- Insert default alert preferences for existing users
INSERT OR IGNORE INTO user_alert_preferences (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_alert_preferences WHERE user_id = users.id
);

-- Create views for common queries
CREATE VIEW IF NOT EXISTS active_alerts_view AS
SELECT 
  a.*,
  u.email as user_email,
  COUNT(at.id) as recent_triggers
FROM alerts a
JOIN users u ON a.user_id = u.id
LEFT JOIN alert_triggers at ON a.id = at.alert_id 
  AND at.triggered_at > datetime('now', '-7 days')
WHERE a.enabled = 1
GROUP BY a.id;

CREATE VIEW IF NOT EXISTS alert_performance_view AS
SELECT 
  a.id,
  a.name,
  a.type,
  a.trigger_count,
  COUNT(DISTINCT at.id) as triggers_7d,
  COUNT(DISTINCT CASE WHEN at.acknowledged = 1 THEN at.id END) as acknowledged_7d,
  AVG(
    CASE 
      WHEN at.acknowledged_at IS NOT NULL 
      THEN (julianday(at.acknowledged_at) - julianday(at.triggered_at)) * 24 * 60 
    END
  ) as avg_acknowledgment_time_minutes
FROM alerts a
LEFT JOIN alert_triggers at ON a.id = at.alert_id 
  AND at.triggered_at > datetime('now', '-7 days')
GROUP BY a.id;

-- Trigger to update alert stats automatically
CREATE TRIGGER IF NOT EXISTS update_alert_updated_at
AFTER UPDATE ON alerts
BEGIN
  UPDATE alerts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update user preferences timestamp
CREATE TRIGGER IF NOT EXISTS update_user_alert_preferences_updated_at
AFTER UPDATE ON user_alert_preferences
BEGIN
  UPDATE user_alert_preferences SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;

-- Create a function to clean up old data (SQLite version using DELETE)
-- Note: This would be run periodically by a maintenance job

-- Sample alert configurations for testing (commented out for production)
/*
INSERT OR IGNORE INTO alerts (
  id, user_id, name, description, enabled, type, conditions, frequency, channels
) VALUES (
  'sample_price_alert_1',
  'test_user_1',
  'AAPL Price Movement Alert',
  'Alert when AAPL moves more than 5%',
  1,
  'price_change',
  '[{"field":"changePercent","operator":"gt","value":5,"symbol":"AAPL"}]',
  '{"type":"every_15_minutes","cooldown":60,"maxPerDay":10}',
  '["in_app","email"]'
);
*/

-- Add sample notification preferences
/*
INSERT OR IGNORE INTO user_alert_preferences (
  user_id,
  email_notifications,
  push_notifications,
  categories
) VALUES (
  'test_user_1',
  1,
  1,
  '{"price_change":{"enabled":true,"channels":["in_app","email"],"frequency":"every_15_minutes"}}'
);
*/