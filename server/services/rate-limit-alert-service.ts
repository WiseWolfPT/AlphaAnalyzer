import { rateLimitTracker } from './rate-limit-tracker';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AlertRule {
  id: string;
  name: string;
  threshold: number; // Percentage (e.g., 80 for 80%)
  provider?: string; // Optional: specific provider to monitor
  endpoint?: string; // Optional: specific endpoint to monitor
  enabled: boolean;
  notificationChannels: ('email' | 'webhook' | 'console')[];
  cooldownMinutes: number; // Minimum time between alerts for same condition
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  provider: string;
  endpoint: string;
  usagePercent: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  notified: boolean;
  notificationChannels: string[];
}

/**
 * Rate Limit Alert Service
 * 
 * Monitors API quota usage and sends alerts when thresholds are exceeded.
 * Features:
 * - Configurable alert rules with different thresholds
 * - Multiple notification channels (email, webhook, console)
 * - Cooldown periods to prevent spam
 * - Severity levels for different types of alerts
 * - Historical alert tracking
 */
export class RateLimitAlertService {
  private alertRules: AlertRule[] = [
    {
      id: 'quota-warning-80',
      name: 'Quota Warning (80%)',
      threshold: 80,
      enabled: true,
      notificationChannels: ['console'],
      cooldownMinutes: 30,
      severity: 'medium'
    },
    {
      id: 'quota-critical-90',
      name: 'Quota Critical (90%)',
      threshold: 90,
      enabled: true,
      notificationChannels: ['console'],
      cooldownMinutes: 15,
      severity: 'high'
    },
    {
      id: 'quota-emergency-95',
      name: 'Quota Emergency (95%)',
      threshold: 95,
      enabled: true,
      notificationChannels: ['console'],
      cooldownMinutes: 5,
      severity: 'critical'
    }
  ];

  private recentAlerts = new Map<string, Date>(); // Track cooldowns
  private isRunning = false;

  /**
   * Start the alert monitoring service
   */
  start(): void {
    if (this.isRunning) {
      console.log('🚨 [RateLimitAlerts] Alert service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚨 [RateLimitAlerts] Starting alert monitoring service');

    // Run initial check
    this.checkAlerts();

    // Schedule regular checks every 5 minutes
    setInterval(() => {
      this.checkAlerts();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the alert monitoring service
   */
  stop(): void {
    this.isRunning = false;
    console.log('🚨 [RateLimitAlerts] Alert monitoring service stopped');
  }

  /**
   * Check all alert rules and trigger notifications
   */
  async checkAlerts(): Promise<void> {
    if (!this.isRunning) return;

    try {
      console.log('🔍 [RateLimitAlerts] Checking quota usage alerts...');
      
      const usage = await rateLimitTracker.getAllUsage();
      const alertsTriggered: AlertNotification[] = [];

      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        // Filter usage data based on rule criteria
        const relevantUsage = usage.filter(u => {
          if (rule.provider && u.provider !== rule.provider) return false;
          if (rule.endpoint && u.endpoint !== rule.endpoint) return false;
          return true;
        });

        for (const usageData of relevantUsage) {
          if (usageData.usagePercent >= rule.threshold) {
            const alertKey = `${rule.id}-${usageData.provider}-${usageData.endpoint}`;
            
            // Check cooldown
            if (this.isInCooldown(alertKey, rule.cooldownMinutes)) {
              continue;
            }

            // Create alert notification
            const alert: AlertNotification = {
              id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ruleId: rule.id,
              provider: usageData.provider,
              endpoint: usageData.endpoint,
              usagePercent: usageData.usagePercent,
              threshold: rule.threshold,
              severity: rule.severity,
              message: this.generateAlertMessage(rule, usageData),
              timestamp: new Date(),
              notified: false,
              notificationChannels: rule.notificationChannels
            };

            alertsTriggered.push(alert);

            // Record cooldown
            this.recentAlerts.set(alertKey, new Date());

            // Send notifications
            await this.sendNotifications(alert);
          }
        }
      }

      if (alertsTriggered.length > 0) {
        console.log(`🚨 [RateLimitAlerts] Triggered ${alertsTriggered.length} alerts`);
        
        // Store alerts in database for historical tracking
        await this.storeAlertsInDatabase(alertsTriggered);
      } else {
        console.log('✅ [RateLimitAlerts] All quotas within acceptable limits');
      }

    } catch (error) {
      console.error('❌ [RateLimitAlerts] Error checking alerts:', error);
    }
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: AlertNotification): Promise<void> {
    for (const channel of alert.notificationChannels) {
      try {
        switch (channel) {
          case 'console':
            await this.sendConsoleNotification(alert);
            break;
          case 'email':
            await this.sendEmailNotification(alert);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert);
            break;
          default:
            console.warn(`🚨 [RateLimitAlerts] Unknown notification channel: ${channel}`);
        }
      } catch (error) {
        console.error(`❌ [RateLimitAlerts] Failed to send ${channel} notification:`, error);
      }
    }
  }

  /**
   * Send console notification (always works)
   */
  private async sendConsoleNotification(alert: AlertNotification): Promise<void> {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);
    
    console.log(`${emoji} [RateLimitAlerts] ${color}${alert.message}${color === '\x1b[31m' ? '\x1b[0m' : ''}`);
    console.log(`   └─ Provider: ${alert.provider}, Endpoint: ${alert.endpoint}`);
    console.log(`   └─ Usage: ${alert.usagePercent}% (threshold: ${alert.threshold}%)`);
    console.log(`   └─ Severity: ${alert.severity.toUpperCase()}`);
  }

  /**
   * Send email notification (placeholder - would integrate with email service)
   */
  private async sendEmailNotification(alert: AlertNotification): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 [RateLimitAlerts] Email notification would be sent: ${alert.message}`);
  }

  /**
   * Send webhook notification (placeholder - would make HTTP request)
   */
  private async sendWebhookNotification(alert: AlertNotification): Promise<void> {
    // TODO: Integrate with webhook URL (Slack, Discord, custom endpoint)
    console.log(`🔗 [RateLimitAlerts] Webhook notification would be sent: ${alert.message}`);
  }

  /**
   * Store alerts in database for historical tracking
   */
  private async storeAlertsInDatabase(alerts: AlertNotification[]): Promise<void> {
    try {
      const alertRecords = alerts.map(alert => ({
        alert_id: alert.id,
        rule_id: alert.ruleId,
        provider: alert.provider,
        endpoint: alert.endpoint,
        usage_percent: alert.usagePercent,
        threshold: alert.threshold,
        severity: alert.severity,
        message: alert.message,
        notification_channels: alert.notificationChannels,
        created_at: alert.timestamp.toISOString()
      }));

      const { error } = await supabase
        .from('rate_limit_alerts')
        .insert(alertRecords);

      if (error) {
        console.error('❌ [RateLimitAlerts] Failed to store alerts in database:', error);
      } else {
        console.log(`📊 [RateLimitAlerts] Stored ${alerts.length} alerts in database`);
      }
    } catch (error) {
      console.error('❌ [RateLimitAlerts] Error storing alerts:', error);
    }
  }

  /**
   * Check if an alert is in cooldown period
   */
  private isInCooldown(alertKey: string, cooldownMinutes: number): boolean {
    const lastAlert = this.recentAlerts.get(alertKey);
    if (!lastAlert) return false;

    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastAlert.getTime() < cooldownMs;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, usage: any): string {
    return `${rule.name}: ${usage.provider}/${usage.endpoint} quota at ${usage.usagePercent}% (limit: ${usage.dailyLimit}, used: ${usage.used})`;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'low': return 'ℹ️';
      case 'medium': return '⚠️';
      case 'high': return '🚨';
      case 'critical': return '🆘';
      default: return '📊';
    }
  }

  /**
   * Get console color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return '\x1b[34m'; // Blue
      case 'medium': return '\x1b[33m'; // Yellow
      case 'high': return '\x1b[31m'; // Red
      case 'critical': return '\x1b[35m'; // Magenta
      default: return '';
    }
  }

  /**
   * Add a new alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
    console.log(`🚨 [RateLimitAlerts] Added new alert rule: ${rule.name}`);
  }

  /**
   * Update an existing alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    console.log(`🚨 [RateLimitAlerts] Updated alert rule: ${ruleId}`);
    return true;
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules.splice(ruleIndex, 1);
    console.log(`🚨 [RateLimitAlerts] Removed alert rule: ${ruleId}`);
    return true;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(hours = 24): Promise<{
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByProvider: Record<string, number>;
    mostTriggeredRules: Array<{ ruleId: string; count: number }>;
  }> {
    try {
      const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('rate_limit_alerts')
        .select('*')
        .gte('created_at', hoursAgo.toISOString());

      if (error) {
        console.error('❌ [RateLimitAlerts] Failed to get alert stats:', error);
        return {
          totalAlerts: 0,
          alertsBySeverity: {},
          alertsByProvider: {},
          mostTriggeredRules: []
        };
      }

      const alerts = data || [];
      const totalAlerts = alerts.length;

      // Group by severity
      const alertsBySeverity = alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by provider
      const alertsByProvider = alerts.reduce((acc, alert) => {
        acc[alert.provider] = (acc[alert.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Most triggered rules
      const ruleCount = alerts.reduce((acc, alert) => {
        acc[alert.rule_id] = (acc[alert.rule_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostTriggeredRules = Object.entries(ruleCount)
        .map(([ruleId, count]) => ({ ruleId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalAlerts,
        alertsBySeverity,
        alertsByProvider,
        mostTriggeredRules
      };
    } catch (error) {
      console.error('❌ [RateLimitAlerts] Error getting alert stats:', error);
      return {
        totalAlerts: 0,
        alertsBySeverity: {},
        alertsByProvider: {},
        mostTriggeredRules: []
      };
    }
  }

  /**
   * Manual alert check (for testing/debugging)
   */
  async runManualCheck(): Promise<void> {
    console.log('🔍 [RateLimitAlerts] Running manual alert check...');
    await this.checkAlerts();
  }

  /**
   * Test alert system with mock data
   */
  async testAlerts(): Promise<void> {
    console.log('🧪 [RateLimitAlerts] Running alert system test...');
    
    const testAlert: AlertNotification = {
      id: 'test-alert-' + Date.now(),
      ruleId: 'test-rule',
      provider: 'test-provider',
      endpoint: 'test-endpoint',
      usagePercent: 85,
      threshold: 80,
      severity: 'medium',
      message: 'TEST ALERT: This is a test of the alert system',
      timestamp: new Date(),
      notified: false,
      notificationChannels: ['console']
    };

    await this.sendNotifications(testAlert);
    console.log('✅ [RateLimitAlerts] Test alert sent successfully');
  }
}

// Export singleton instance
export const rateLimitAlertService = new RateLimitAlertService();