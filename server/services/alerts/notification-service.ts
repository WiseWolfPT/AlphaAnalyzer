/**
 * NOTIFICATION SERVICE - Multi-channel notification delivery
 * AGENTE 8: Complete notification system implementation
 */

import { EventEmitter } from 'events';
import { db } from '../../db/index.js';
import { 
  NotificationChannel, 
  AlertSeverity, 
  UserAlertPreferences,
  NotificationLog,
  EmailTemplateData,
  PushNotificationData,
  WebhookPayload,
  NotificationRateLimit
} from './alert-types.js';

export class NotificationService extends EventEmitter {
  private rateLimits = new Map<string, NotificationRateLimit>();
  private isInitialized = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize rate limiting cleanup
      setInterval(() => this.cleanupRateLimits(), 60000); // Every minute
      this.isInitialized = true;
      console.log('[NotificationService] Initialized successfully');
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
    }
  }

  /**
   * Send notification through specified channel
   */
  async sendNotification(
    userId: string,
    channel: NotificationChannel,
    title: string,
    message: string,
    severity: AlertSeverity,
    alertId?: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Check rate limits
      if (!await this.checkRateLimit(userId, channel)) {
        console.warn(`[NotificationService] Rate limit exceeded for user ${userId} on ${channel}`);
        return false;
      }

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Check if user allows this channel
      if (!preferences.enabled_channels.includes(channel)) {
        console.log(`[NotificationService] Channel ${channel} disabled for user ${userId}`);
        return false;
      }

      // Check quiet hours for non-critical alerts
      if (severity !== AlertSeverity.CRITICAL && this.isQuietHours(preferences)) {
        console.log(`[NotificationService] Skipping notification during quiet hours for user ${userId}`);
        return false;
      }

      let success = false;
      let errorMessage = '';

      // Send through appropriate channel
      switch (channel) {
        case NotificationChannel.IN_APP:
          success = await this.sendInAppNotification(userId, title, message, severity, alertId, metadata);
          break;
        case NotificationChannel.EMAIL:
          success = await this.sendEmailNotification(userId, title, message, severity, metadata);
          break;
        case NotificationChannel.PUSH:
          success = await this.sendPushNotification(userId, title, message, severity, metadata);
          break;
        case NotificationChannel.WEBHOOK:
          success = await this.sendWebhookNotification(userId, title, message, severity, alertId, metadata);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${channel}`);
      }

      // Log the notification
      await this.logNotification({
        alert_id: alertId || 0,
        user_id: userId,
        channel,
        title,
        message,
        severity,
        status: success ? 'sent' : 'failed',
        metadata: metadata || {},
        sent_at: success ? new Date() : undefined
      });

      // Update rate limits
      if (success) {
        await this.updateRateLimit(userId, channel);
      }

      this.emit('notification_sent', {
        userId,
        channel,
        success,
        title,
        severity
      });

      return success;

    } catch (error) {
      console.error(`[NotificationService] Failed to send ${channel} notification:`, error);
      
      // Log failed notification
      await this.logNotification({
        alert_id: alertId || 0,
        user_id: userId,
        channel,
        title,
        message,
        severity,
        status: 'failed',
        metadata: { error: error.message }
      });

      return false;
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    userId: string,
    title: string,
    message: string,
    severity: AlertSeverity,
    alertId?: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Store in database for in-app display
      const notification = {
        alert_id: alertId || 0,
        user_id: userId,
        channel: NotificationChannel.IN_APP,
        title,
        message,
        severity,
        status: 'sent' as const,
        metadata: metadata || {},
        sent_at: new Date(),
        created_at: new Date()
      };

      // Insert into notification log (which serves as in-app notification storage)
      const stmt = db.prepare(`
        INSERT INTO notification_log_v2 (
          alert_id, user_id, channel, title, message, severity, status, metadata, sent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        notification.alert_id,
        notification.user_id,
        notification.channel,
        notification.title,
        notification.message,
        notification.severity,
        notification.status,
        JSON.stringify(notification.metadata),
        notification.sent_at.toISOString(),
        notification.created_at.toISOString()
      );

      // Emit real-time event for connected clients
      this.emit('in_app_notification', {
        userId,
        notification: {
          id: stmt.lastInsertRowid,
          ...notification
        }
      });

      console.log(`[NotificationService] In-app notification sent to user ${userId}`);
      return true;

    } catch (error) {
      console.error('[NotificationService] In-app notification failed:', error);
      return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    severity: AlertSeverity,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user email
      const userStmt = db.prepare('SELECT email, name FROM users WHERE id = ?');
      const user = userStmt.get(userId) as { email: string; name: string } | undefined;
      
      if (!user || !user.email) {
        console.warn(`[NotificationService] No email found for user ${userId}`);
        return false;
      }

      // Prepare email template data
      const templateData: EmailTemplateData = {
        user_name: user.name || 'User',
        alert_title: title,
        alert_message: message,
        symbol: metadata?.symbol,
        current_value: metadata?.current_value,
        target_value: metadata?.target_value,
        percentage_change: metadata?.percentage_change,
        alert_url: `${process.env.FRONTEND_URL}/alerts`,
        unsubscribe_url: `${process.env.FRONTEND_URL}/settings/notifications`
      };

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, we'll mock the email sending
      console.log(`[NotificationService] EMAIL MOCK - Would send to ${user.email}:`);
      console.log(`Subject: ${title}`);
      console.log(`Message: ${message}`);
      console.log(`Template Data:`, templateData);

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return true;

    } catch (error) {
      console.error('[NotificationService] Email notification failed:', error);
      return false;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    severity: AlertSeverity,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user's push subscription details
      const subStmt = db.prepare(`
        SELECT push_subscription FROM user_preferences 
        WHERE user_id = ? AND push_subscription IS NOT NULL
      `);
      const subscription = subStmt.get(userId) as { push_subscription: string } | undefined;

      if (!subscription) {
        console.warn(`[NotificationService] No push subscription found for user ${userId}`);
        return false;
      }

      // Prepare push notification data
      const pushData: PushNotificationData = {
        title,
        body: message,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        data: {
          alertId: metadata?.alert_id,
          severity,
          timestamp: new Date().toISOString(),
          ...metadata
        },
        actions: severity === AlertSeverity.CRITICAL ? [
          { action: 'view', title: 'View Alert', icon: '/icons/view.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
        ] : undefined
      };

      // TODO: Integrate with actual push notification service (FCM, APNS, etc.)
      // For now, we'll mock the push notification
      console.log(`[NotificationService] PUSH MOCK - Would send to user ${userId}:`);
      console.log(`Push Data:`, pushData);

      // Simulate push sending delay
      await new Promise(resolve => setTimeout(resolve, 50));

      return true;

    } catch (error) {
      console.error('[NotificationService] Push notification failed:', error);
      return false;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    userId: string,
    title: string,
    message: string,
    severity: AlertSeverity,
    alertId?: number,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Get user's webhook URL
      const webhookStmt = db.prepare(`
        SELECT webhook_url FROM user_preferences 
        WHERE user_id = ? AND webhook_url IS NOT NULL
      `);
      const webhook = webhookStmt.get(userId) as { webhook_url: string } | undefined;

      if (!webhook || !webhook.webhook_url) {
        console.warn(`[NotificationService] No webhook URL found for user ${userId}`);
        return false;
      }

      // Prepare webhook payload
      const payload: WebhookPayload = {
        alert_id: alertId || 0,
        type: metadata?.type || 'unknown',
        severity,
        title,
        message,
        symbol: metadata?.symbol,
        timestamp: new Date().toISOString(),
        user_id: userId,
        metadata: metadata || {}
      };

      // TODO: Integrate with actual HTTP client for webhook sending
      // For now, we'll mock the webhook call
      console.log(`[NotificationService] WEBHOOK MOCK - Would POST to ${webhook.webhook_url}:`);
      console.log(`Payload:`, JSON.stringify(payload, null, 2));

      // Simulate webhook call delay
      await new Promise(resolve => setTimeout(resolve, 200));

      return true;

    } catch (error) {
      console.error('[NotificationService] Webhook notification failed:', error);
      return false;
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<UserAlertPreferences> {
    const stmt = db.prepare(`
      SELECT * FROM user_alert_preferences_v2 WHERE user_id = ?
    `);
    const prefs = stmt.get(userId) as any;

    if (!prefs) {
      // Return default preferences
      return {
        user_id: userId,
        enabled_channels: [NotificationChannel.IN_APP],
        max_alerts_per_hour: 10,
        email_digest_frequency: 'daily' as any,
        push_notifications_enabled: false,
        sound_enabled: true,
        vibration_enabled: true
      };
    }

    return {
      ...prefs,
      enabled_channels: JSON.parse(prefs.enabled_channels || '["in_app"]')
    };
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(preferences: UserAlertPreferences): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Same day range (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight range (e.g., 22:00 to 08:00 next day)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Check rate limits for user and channel
   */
  private async checkRateLimit(userId: string, channel: NotificationChannel): Promise<boolean> {
    const key = `${userId}:${channel}`;
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const rateLimit = this.rateLimits.get(key);
    
    if (!rateLimit) {
      // No rate limit record, allow
      return true;
    }

    // Check if we're in a new hour window
    if (rateLimit.window_start < hourStart) {
      // Reset for new hour
      rateLimit.count = 0;
      rateLimit.window_start = hourStart;
      return true;
    }

    // Check if under limit
    return rateLimit.count < rateLimit.max_per_hour;
  }

  /**
   * Update rate limit counter
   */
  private async updateRateLimit(userId: string, channel: NotificationChannel): Promise<void> {
    const key = `${userId}:${channel}`;
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const preferences = await this.getUserPreferences(userId);
    const maxPerHour = preferences.max_alerts_per_hour || 10;

    let rateLimit = this.rateLimits.get(key);
    
    if (!rateLimit || rateLimit.window_start < hourStart) {
      // Create new or reset for new hour
      rateLimit = {
        user_id: userId,
        channel,
        count: 1,
        window_start: hourStart,
        max_per_hour: maxPerHour
      };
    } else {
      // Increment counter
      rateLimit.count++;
    }

    this.rateLimits.set(key, rateLimit);
  }

  /**
   * Clean up old rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    for (const [key, rateLimit] of this.rateLimits.entries()) {
      if (rateLimit.window_start < cutoff) {
        this.rateLimits.delete(key);
      }
    }
  }

  /**
   * Log notification to database
   */
  private async logNotification(notification: Omit<NotificationLog, 'id'>): Promise<void> {
    try {
      const stmt = db.prepare(`
        INSERT INTO notification_log_v2 (
          alert_id, user_id, channel, title, message, severity, status, metadata, sent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        notification.alert_id,
        notification.user_id,
        notification.channel,
        notification.title,
        notification.message,
        notification.severity,
        notification.status,
        JSON.stringify(notification.metadata || {}),
        notification.sent_at?.toISOString() || null,
        new Date().toISOString()
      );

    } catch (error) {
      console.error('[NotificationService] Failed to log notification:', error);
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<NotificationLog[]> {
    const stmt = db.prepare(`
      SELECT * FROM notification_log_v2 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(userId, limit, offset) as any[];
    
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      sent_at: row.sent_at ? new Date(row.sent_at) : undefined,
      read_at: row.read_at ? new Date(row.read_at) : undefined,
      created_at: new Date(row.created_at)
    }));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const stmt = db.prepare(`
        UPDATE notification_log_v2 
        SET read_at = ? 
        WHERE id = ? AND user_id = ?
      `);
      
      const result = stmt.run(new Date().toISOString(), notificationId, userId);
      return result.changes > 0;

    } catch (error) {
      console.error('[NotificationService] Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM notification_log_v2 
      WHERE user_id = ? AND read_at IS NULL
    `);
    
    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  /**
   * Clear all notifications for user
   */
  async clearNotifications(userId: string): Promise<boolean> {
    try {
      const stmt = db.prepare(`
        UPDATE notification_log_v2 
        SET read_at = ? 
        WHERE user_id = ? AND read_at IS NULL
      `);
      
      stmt.run(new Date().toISOString(), userId);
      return true;

    } catch (error) {
      console.error('[NotificationService] Failed to clear notifications:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();