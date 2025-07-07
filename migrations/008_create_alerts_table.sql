-- UP
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'volume_spike', 'news_sentiment', 'technical_indicator')),
  threshold_value REAL,
  threshold_operator TEXT CHECK (threshold_operator IN ('>', '<', '>=', '<=', '=')),
  condition_data TEXT, -- JSON field for storing additional condition parameters
  is_active BOOLEAN DEFAULT 1,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  snooze_until DATETIME,
  notification_methods TEXT DEFAULT 'app,email', -- comma separated: app,email,push
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE alert_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id INTEGER NOT NULL,
  triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  trigger_value REAL NOT NULL,
  trigger_data TEXT, -- JSON field for storing trigger context
  notification_sent BOOLEAN DEFAULT 0,
  notification_sent_at DATETIME,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'dismissed')),
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_symbol ON alerts(symbol);
CREATE INDEX idx_alerts_active ON alerts(is_active);
CREATE INDEX idx_alert_triggers_alert_id ON alert_triggers(alert_id);
CREATE INDEX idx_alert_triggers_status ON alert_triggers(status);

-- DOWN
DROP TABLE IF EXISTS alert_triggers;
DROP TABLE IF EXISTS alerts;