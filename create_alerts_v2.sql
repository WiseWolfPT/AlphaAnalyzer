-- ALERTS SYSTEM V2 DATABASE SCHEMA
-- Comprehensive alert and notification system for Alfalyzer
-- AGENTE 8: Complete notification system implementation

-- New alerts configuration table (v2)
CREATE TABLE IF NOT EXISTS alerts_v2 (
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
  trigger_count INTEGER NOT NULL DEFAULT 0
);

-- Alert triggers history table (v2)
CREATE TABLE IF NOT EXISTS alert_triggers_v2 (
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
  FOREIGN KEY (alert_id) REFERENCES alerts_v2(id) ON DELETE CASCADE
);

-- User alert preferences table (v2)
CREATE TABLE IF NOT EXISTS user_alert_preferences_v2 (
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
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notification delivery log table (v2)
CREATE TABLE IF NOT EXISTS notification_log_v2 (
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
  FOREIGN KEY (alert_id) REFERENCES alerts_v2(id) ON DELETE SET NULL,
  FOREIGN KEY (trigger_id) REFERENCES alert_triggers_v2(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_v2_user_id ON alerts_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_v2_enabled ON alerts_v2(enabled);
CREATE INDEX IF NOT EXISTS idx_alerts_v2_type ON alerts_v2(type);
CREATE INDEX IF NOT EXISTS idx_alerts_v2_last_triggered ON alerts_v2(last_triggered);

CREATE INDEX IF NOT EXISTS idx_alert_triggers_v2_alert_id ON alert_triggers_v2(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_v2_user_id ON alert_triggers_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_v2_triggered_at ON alert_triggers_v2(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_v2_symbol ON alert_triggers_v2(symbol);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_v2_severity ON alert_triggers_v2(severity);
CREATE INDEX IF NOT EXISTS idx_alert_triggers_v2_acknowledged ON alert_triggers_v2(acknowledged);

CREATE INDEX IF NOT EXISTS idx_notification_log_v2_user_id ON notification_log_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_v2_channel ON notification_log_v2(channel);
CREATE INDEX IF NOT EXISTS idx_notification_log_v2_status ON notification_log_v2(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_v2_sent_at ON notification_log_v2(sent_at);

-- Insert default alert preferences for existing users
INSERT OR IGNORE INTO user_alert_preferences_v2 (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_alert_preferences_v2 WHERE user_id = users.id
);

-- Trigger to update alert updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_alert_v2_updated_at
AFTER UPDATE ON alerts_v2
BEGIN
  UPDATE alerts_v2 SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update user preferences timestamp
CREATE TRIGGER IF NOT EXISTS update_user_alert_preferences_v2_updated_at
AFTER UPDATE ON user_alert_preferences_v2
BEGIN
  UPDATE user_alert_preferences_v2 SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;