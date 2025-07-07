/**
 * ALERT TYPES AND INTERFACES
 * Comprehensive type definitions for the Alfalyzer alert system
 * AGENTE 8: Complete notification system implementation
 */

// Base alert configuration
export interface AlertConfig {
  id: string;
  userId: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: AlertType;
  conditions: AlertCondition[];
  frequency: AlertFrequency;
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

// Alert types
export enum AlertType {
  PRICE_CHANGE = 'price_change',
  PRICE_THRESHOLD = 'price_threshold',
  VOLUME_SPIKE = 'volume_spike',
  EARNINGS_REMINDER = 'earnings_reminder',
  PORTFOLIO_PERFORMANCE = 'portfolio_performance',
  SYSTEM_HEALTH = 'system_health',
  API_QUOTA = 'api_quota',
  COST_PROTECTION = 'cost_protection',
  NEWS_MENTION = 'news_mention',
  TECHNICAL_INDICATOR = 'technical_indicator'
}

// Alert conditions
export interface AlertCondition {
  field: string; // 'price', 'change_percent', 'volume', 'market_cap', etc.
  operator: ConditionOperator;
  value: number | string;
  symbol?: string; // For stock-specific alerts
  timeframe?: string; // '1d', '1w', '1m', etc.
}

export enum ConditionOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  CONTAINS = 'contains',
  PERCENTAGE_CHANGE = 'pct_change'
}

// Alert frequency settings
export interface AlertFrequency {
  type: FrequencyType;
  value?: number; // For CUSTOM type
  cooldown?: number; // Minimum minutes between alerts of same type
  maxPerDay?: number; // Maximum alerts per day
  quietHours?: QuietHours; // Don't send alerts during these hours
}

export enum FrequencyType {
  IMMEDIATE = 'immediate',
  EVERY_5_MINUTES = '5min',
  EVERY_15_MINUTES = '15min',
  EVERY_HOUR = '1hour',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  CUSTOM = 'custom'
}

export interface QuietHours {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
}

// Notification channels
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  SMS = 'sms' // Future implementation
}

// Alert trigger event
export interface AlertTrigger {
  id: string;
  alertId: string;
  userId: string;
  triggeredAt: Date;
  currentValue: number | string;
  previousValue?: number | string;
  symbol?: string;
  message: string;
  severity: AlertSeverity;
  metadata?: Record<string, any>;
  notificationsSent: NotificationChannel[];
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Notification payload
export interface NotificationPayload {
  title: string;
  message: string;
  severity: AlertSeverity;
  type: AlertType;
  symbol?: string;
  actionUrl?: string;
  icon?: string;
  data?: Record<string, any>;
}

// System alert types
export interface SystemHealthAlert {
  service: string;
  status: 'degraded' | 'offline' | 'recovered';
  message: string;
  responseTime?: number;
  uptime?: number;
  details?: Record<string, any>;
}

export interface ApiQuotaAlert {
  provider: string;
  currentUsage: number;
  limit: number;
  usagePercent: number;
  timeToReset: number;
  rateLimited: boolean;
}

export interface CostProtectionAlert {
  alertType: 'budget_warning' | 'budget_exceeded' | 'emergency_stop';
  currentCost: number;
  budgetLimit: number;
  costPercent: number;
  timeframe: string;
  actions: string[];
}

// User preferences for alerts
export interface UserAlertPreferences {
  userId: string;
  globalEnabled: boolean;
  defaultChannels: NotificationChannel[];
  quietHours: QuietHours;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weekendAlerts: boolean;
  maxAlertsPerDay: number;
  preferredFrequency: FrequencyType;
  categories: {
    [key in AlertType]?: {
      enabled: boolean;
      channels: NotificationChannel[];
      frequency: FrequencyType;
    };
  };
}

// Alert statistics and analytics
export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  triggeredThisWeek: number;
  triggeredThisMonth: number;
  averageResponseTime: number;
  mostTriggeredType: AlertType;
  successRate: number;
  byType: Record<AlertType, number>;
  byChannel: Record<NotificationChannel, number>;
  byUser: Record<string, number>;
}

// Alert manager configuration
export interface AlertManagerConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  batchSize: number;
  maxConcurrentChecks: number;
  retryAttempts: number;
  retryDelay: number;
  cacheTimeout: number;
  enableRealTimeUpdates: boolean;
  enableSystemAlerts: boolean;
  enableCostProtection: boolean;
  rateLimits: {
    perUser: number;
    global: number;
    timeWindow: number;
  };
}

// Real-time market data for alerts
export interface MarketDataSnapshot {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: Date;
  source: string;
}

// Portfolio performance data
export interface PortfolioPerformance {
  userId: string;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  dayChange: number;
  dayChangePercent: number;
  topGainer?: {
    symbol: string;
    change: number;
    changePercent: number;
  };
  topLoser?: {
    symbol: string;
    change: number;
    changePercent: number;
  };
  positions: Array<{
    symbol: string;
    quantity: number;
    currentPrice: number;
    totalValue: number;
    change: number;
    changePercent: number;
  }>;
}

// Earnings calendar event
export interface EarningsEvent {
  symbol: string;
  companyName: string;
  date: Date;
  time: 'before_market' | 'after_market' | 'during_market';
  quarter: string;
  estimatedEPS?: number;
  actualEPS?: number;
  surprisePercent?: number;
  revenue?: number;
  revenueEstimate?: number;
}

// News mention for alerts
export interface NewsMention {
  symbol: string;
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  source: string;
  publishedAt: Date;
  url: string;
  relevanceScore: number;
}

// Technical indicator data
export interface TechnicalIndicator {
  symbol: string;
  indicator: string; // 'rsi', 'macd', 'bollinger_bands', etc.
  value: number;
  signal: 'buy' | 'sell' | 'hold';
  strength: number; // 0-100
  timestamp: Date;
}

// Database schema types
export interface AlertRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: AlertType;
  conditions: string; // JSON string
  frequency: string; // JSON string
  channels: string; // JSON string
  metadata?: string; // JSON string
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  trigger_count: number;
}

export interface AlertTriggerRecord {
  id: string;
  alert_id: string;
  user_id: string;
  triggered_at: string;
  current_value: string;
  previous_value?: string;
  symbol?: string;
  message: string;
  severity: AlertSeverity;
  metadata?: string; // JSON string
  notifications_sent: string; // JSON string
  acknowledged: boolean;
  acknowledged_at?: string;
}

export interface UserAlertPreferencesRecord {
  user_id: string;
  global_enabled: boolean;
  default_channels: string; // JSON string
  quiet_hours: string; // JSON string
  email_notifications: boolean;
  push_notifications: boolean;
  weekend_alerts: boolean;
  max_alerts_per_day: number;
  preferred_frequency: FrequencyType;
  categories: string; // JSON string
  updated_at: string;
}