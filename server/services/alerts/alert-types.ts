/**
 * ALERT TYPES - Complete notification system types
 * AGENTE 8: Comprehensive type definitions for the alert system
 */

export enum AlertType {
  PRICE_ALERT = 'price_alert',
  VOLUME_SPIKE = 'volume_spike',
  EARNINGS_REMINDER = 'earnings_reminder',
  PORTFOLIO_PERFORMANCE = 'portfolio_performance',
  SYSTEM_HEALTH = 'system_health',
  COST_PROTECTION = 'cost_protection',
  NEWS_ALERT = 'news_alert',
  TECHNICAL_INDICATOR = 'technical_indicator'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  WEBHOOK = 'webhook'
}

export enum FrequencyType {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  REAL_TIME = 'real_time'
}

export enum ConditionOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  PERCENTAGE_CHANGE = 'pct_change',
  MOVING_AVERAGE = 'moving_avg'
}

export interface AlertCondition {
  field: string;
  operator: ConditionOperator;
  value: number | string;
  timeframe?: string; // '1h', '1d', '1w', etc.
}

export interface AlertTrigger {
  id?: number;
  alert_id: number;
  condition: AlertCondition;
  is_active: boolean;
  last_triggered?: Date;
  trigger_count: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface AlertConfig {
  id?: number;
  user_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  symbol?: string;
  conditions: AlertCondition[];
  frequency: FrequencyType;
  channels: NotificationChannel[];
  is_active: boolean;
  expires_at?: Date;
  created_at?: Date;
  updated_at?: Date;
  last_triggered?: Date;
  trigger_count: number;
  metadata?: Record<string, any>;
}

export interface UserAlertPreferences {
  id?: number;
  user_id: string;
  enabled_channels: NotificationChannel[];
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;
  max_alerts_per_hour: number;
  email_digest_frequency: FrequencyType;
  push_notifications_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface NotificationLog {
  id?: number;
  alert_id: number;
  user_id: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: 'sent' | 'failed' | 'pending';
  metadata?: Record<string, any>;
  sent_at?: Date;
  read_at?: Date;
  created_at?: Date;
}

export interface AlertMetrics {
  total_alerts: number;
  active_alerts: number;
  triggered_today: number;
  success_rate: number;
  average_response_time: number;
  alerts_by_severity: Record<AlertSeverity, number>;
  alerts_by_type: Record<AlertType, number>;
  channel_performance: Record<NotificationChannel, {
    sent: number;
    failed: number;
    success_rate: number;
  }>;
}

export interface ActiveAlert {
  config: AlertConfig;
  triggers: AlertTrigger[];
  last_check: Date;
  next_check: Date;
  is_processing: boolean;
}

// Email template data
export interface EmailTemplateData {
  user_name: string;
  alert_title: string;
  alert_message: string;
  symbol?: string;
  current_value?: number;
  target_value?: number;
  percentage_change?: number;
  alert_url?: string;
  unsubscribe_url?: string;
}

// Push notification data
export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Webhook payload
export interface WebhookPayload {
  alert_id: number;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  symbol?: string;
  timestamp: string;
  user_id: string;
  metadata?: Record<string, any>;
}

// Alert processing context
export interface AlertProcessingContext {
  alert: AlertConfig;
  current_data: Record<string, any>;
  historical_data?: Record<string, any>;
  market_hours: boolean;
  user_preferences: UserAlertPreferences;
}

// Alert evaluation result
export interface AlertEvaluationResult {
  triggered: boolean;
  message?: string;
  severity?: AlertSeverity;
  metadata?: Record<string, any>;
  next_check?: Date;
}

// Rate limiting for notifications
export interface NotificationRateLimit {
  user_id: string;
  channel: NotificationChannel;
  count: number;
  window_start: Date;
  max_per_hour: number;
}

// Alert statistics
export interface AlertStats {
  alert_id: number;
  total_triggers: number;
  last_triggered: Date;
  average_frequency: number; // triggers per day
  success_rate: number;
  false_positive_rate: number;
}

// System alert types for monitoring
export interface SystemAlert {
  type: 'api_quota' | 'server_error' | 'database_issue' | 'high_latency';
  severity: AlertSeverity;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolved_at?: Date;
}

// Alert template for common alert types
export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  default_conditions: AlertCondition[];
  suggested_channels: NotificationChannel[];
  category: 'price' | 'volume' | 'technical' | 'fundamental' | 'news';
}

// Batch alert processing
export interface BatchAlertJob {
  id: string;
  alerts: AlertConfig[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  results?: AlertEvaluationResult[];
  error?: string;
}