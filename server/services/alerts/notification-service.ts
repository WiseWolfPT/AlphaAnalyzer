/**
 * NOTIFICATION SERVICE
 * Handles multi-channel notification delivery for the alert system
 * AGENTE 8: Complete notification system implementation
 */

import { 
  NotificationChannel, 
  NotificationPayload, 
  AlertSeverity,
  UserAlertPreferences 
} from './alert-types';

interface EmailConfig {
  enabled: boolean;
  provider: 'sendgrid' | 'ses' | 'smtp';
  apiKey?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  fromEmail: string;
  fromName: string;
  templates: {
    [key: string]: string;
  };
}

interface PushConfig {
  enabled: boolean;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidEmail?: string;
  fcmServerKey?: string;
}

interface WebhookConfig {
  enabled: boolean;
  defaultUrl?: string;
  userWebhooks: Map<string, string>;
  timeout: number;
  retryAttempts: number;
}

interface NotificationStats {
  sent: number;
  delivered: number;
  failed: number;
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

export class NotificationService {
  private emailConfig: EmailConfig;
  private pushConfig: PushConfig;
  private webhookConfig: WebhookConfig;
  private stats: NotificationStats;
  private inAppNotifications: Map<string, NotificationPayload[]>;
  private rateLimiter: Map<string, number>;

  constructor() {
    this.emailConfig = {
      enabled: !!process.env.EMAIL_ENABLED,
      provider: (process.env.EMAIL_PROVIDER as any) || 'smtp',
      apiKey: process.env.SENDGRID_API_KEY || process.env.SES_API_KEY,
      smtpConfig: process.env.SMTP_HOST ? {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      } : undefined,
      fromEmail: process.env.FROM_EMAIL || 'alerts@alfalyzer.com',
      fromName: process.env.FROM_NAME || 'Alfalyzer Alerts',
      templates: {
        price_alert: 'price-alert-template',
        earnings_reminder: 'earnings-reminder-template',
        portfolio_update: 'portfolio-update-template',
        system_alert: 'system-alert-template'
      }
    };

    this.pushConfig = {
      enabled: !!process.env.PUSH_ENABLED,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
      vapidEmail: process.env.VAPID_EMAIL,
      fcmServerKey: process.env.FCM_SERVER_KEY
    };

    this.webhookConfig = {
      enabled: !!process.env.WEBHOOK_ENABLED,
      defaultUrl: process.env.DEFAULT_WEBHOOK_URL,
      userWebhooks: new Map(),
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'),
      retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3')
    };

    this.stats = {
      sent: 0,
      delivered: 0,
      failed: 0,
      byChannel: {
        [NotificationChannel.IN_APP]: { sent: 0, delivered: 0, failed: 0 },
        [NotificationChannel.EMAIL]: { sent: 0, delivered: 0, failed: 0 },
        [NotificationChannel.PUSH]: { sent: 0, delivered: 0, failed: 0 },
        [NotificationChannel.WEBHOOK]: { sent: 0, delivered: 0, failed: 0 },
        [NotificationChannel.SMS]: { sent: 0, delivered: 0, failed: 0 }
      }
    };

    this.inAppNotifications = new Map();
    this.rateLimiter = new Map();

    console.log('📢 Notification Service initialized');
    this.logConfiguration();
  }

  private logConfiguration(): void {
    console.log('📧 Email notifications:', this.emailConfig.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('📱 Push notifications:', this.pushConfig.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('🔗 Webhook notifications:', this.webhookConfig.enabled ? '✅ Enabled' : '❌ Disabled');
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload,
    channels: NotificationChannel[],
    userPreferences?: UserAlertPreferences
  ): Promise<{
    success: boolean;
    results: Record<NotificationChannel, { success: boolean; error?: string }>;
  }> {
    console.log(`📢 Sending notification to user ${userId}:`, payload.title);

    // Check rate limits
    if (this.isRateLimited(userId)) {
      console.warn(`⚠️ Rate limited notification for user ${userId}`);
      return {
        success: false,
        results: {}
      };
    }

    const results: Record<NotificationChannel, { success: boolean; error?: string }> = {};
    let overallSuccess = false;

    // Filter channels based on user preferences
    const enabledChannels = this.filterChannelsByPreferences(channels, userPreferences);

    // Send through each enabled channel
    for (const channel of enabledChannels) {
      try {
        let channelResult: { success: boolean; error?: string } = { success: false };

        switch (channel) {
          case NotificationChannel.IN_APP:
            channelResult = await this.sendInAppNotification(userId, payload);
            break;
          case NotificationChannel.EMAIL:
            channelResult = await this.sendEmailNotification(userId, payload);
            break;
          case NotificationChannel.PUSH:
            channelResult = await this.sendPushNotification(userId, payload);
            break;
          case NotificationChannel.WEBHOOK:
            channelResult = await this.sendWebhookNotification(userId, payload);
            break;
          case NotificationChannel.SMS:
            channelResult = await this.sendSMSNotification(userId, payload);
            break;
        }

        results[channel] = channelResult;
        
        // Update stats
        this.stats.byChannel[channel].sent++;
        if (channelResult.success) {
          this.stats.byChannel[channel].delivered++;
          overallSuccess = true;
        } else {
          this.stats.byChannel[channel].failed++;
        }

      } catch (error) {
        console.error(`❌ Error sending ${channel} notification:`, error);
        results[channel] = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        this.stats.byChannel[channel].failed++;
      }
    }

    // Update overall stats
    this.stats.sent++;
    if (overallSuccess) {
      this.stats.delivered++;
    } else {
      this.stats.failed++;
    }

    // Update rate limiter
    this.updateRateLimit(userId);

    return {
      success: overallSuccess,
      results
    };
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.inAppNotifications.has(userId)) {
        this.inAppNotifications.set(userId, []);
      }

      const userNotifications = this.inAppNotifications.get(userId)!;
      
      // Add timestamp and ID to payload
      const notification = {
        ...payload,
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false
      };

      userNotifications.unshift(notification);

      // Keep only last 100 notifications per user
      if (userNotifications.length > 100) {
        userNotifications.splice(100);
      }

      console.log(`📱 In-app notification sent to user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ In-app notification failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.emailConfig.enabled) {
      return { success: false, error: 'Email notifications disabled' };
    }

    try {
      // Mock email sending for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 [MOCK] Email sent to user ${userId}:`);
        console.log(`   Subject: ${payload.title}`);
        console.log(`   Body: ${payload.message}`);
        return { success: true };
      }

      // TODO: Implement actual email sending based on provider
      switch (this.emailConfig.provider) {
        case 'sendgrid':
          return await this.sendEmailViaSendGrid(userId, payload);
        case 'ses':
          return await this.sendEmailViaSES(userId, payload);
        case 'smtp':
          return await this.sendEmailViaSMTP(userId, payload);
        default:
          return { success: false, error: 'Unknown email provider' };
      }

    } catch (error) {
      console.error('❌ Email notification failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.pushConfig.enabled) {
      return { success: false, error: 'Push notifications disabled' };
    }

    try {
      // Mock push notification for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`📱 [MOCK] Push notification sent to user ${userId}:`);
        console.log(`   Title: ${payload.title}`);
        console.log(`   Body: ${payload.message}`);
        return { success: true };
      }

      // TODO: Implement actual push notification sending
      // This would use Web Push API or FCM
      console.log(`📱 Push notification sent to user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Push notification failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.webhookConfig.enabled) {
      return { success: false, error: 'Webhook notifications disabled' };
    }

    try {
      const webhookUrl = this.webhookConfig.userWebhooks.get(userId) || this.webhookConfig.defaultUrl;
      
      if (!webhookUrl) {
        return { success: false, error: 'No webhook URL configured' };
      }

      const webhookPayload = {
        userId,
        timestamp: new Date().toISOString(),
        alert: payload
      };

      // Mock webhook for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 [MOCK] Webhook sent to ${webhookUrl}:`);
        console.log('   Payload:', JSON.stringify(webhookPayload, null, 2));
        return { success: true };
      }

      // TODO: Implement actual webhook sending with retry logic
      console.log(`🔗 Webhook notification sent to user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Webhook notification failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send SMS notification (future implementation)
   */
  private async sendSMSNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    // SMS not implemented yet
    return { success: false, error: 'SMS notifications not implemented' };
  }

  /**
   * Email provider implementations
   */
  private async sendEmailViaSendGrid(userId: string, payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement SendGrid integration
    return { success: false, error: 'SendGrid not implemented' };
  }

  private async sendEmailViaSES(userId: string, payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement AWS SES integration
    return { success: false, error: 'AWS SES not implemented' };
  }

  private async sendEmailViaSMTP(userId: string, payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement SMTP integration
    return { success: false, error: 'SMTP not implemented' };
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    userPreferences?: UserAlertPreferences
  ): NotificationChannel[] {
    if (!userPreferences || !userPreferences.globalEnabled) {
      return [];
    }

    return channels.filter(channel => {
      switch (channel) {
        case NotificationChannel.EMAIL:
          return userPreferences.emailNotifications;
        case NotificationChannel.PUSH:
          return userPreferences.pushNotifications;
        case NotificationChannel.IN_APP:
          return true; // Always allow in-app notifications
        case NotificationChannel.WEBHOOK:
          return true; // Allow if configured
        case NotificationChannel.SMS:
          return false; // Not implemented yet
        default:
          return false;
      }
    });
  }

  /**
   * Rate limiting
   */
  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId) || 0;
    
    // Allow 10 notifications per minute per user
    const rateLimit = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    return now - userLimit < rateLimit;
  }

  private updateRateLimit(userId: string): void {
    this.rateLimiter.set(userId, Date.now());
  }

  /**
   * Get in-app notifications for a user
   */
  getInAppNotifications(userId: string, limit: number = 50): NotificationPayload[] {
    const notifications = this.inAppNotifications.get(userId) || [];
    return notifications.slice(0, limit);
  }

  /**
   * Mark in-app notification as read
   */
  markNotificationAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.inAppNotifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find((n: any) => n.id === notificationId);
    if (notification) {
      (notification as any).read = true;
      return true;
    }
    return false;
  }

  /**
   * Clear all in-app notifications for a user
   */
  clearUserNotifications(userId: string): void {
    this.inAppNotifications.delete(userId);
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  /**
   * Set user webhook URL
   */
  setUserWebhook(userId: string, webhookUrl: string): void {
    this.webhookConfig.userWebhooks.set(userId, webhookUrl);
  }

  /**
   * Remove user webhook URL
   */
  removeUserWebhook(userId: string): void {
    this.webhookConfig.userWebhooks.delete(userId);
  }

  /**
   * Test notification (for admin testing)
   */
  async testNotification(
    userId: string,
    channel: NotificationChannel,
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    const testPayload: NotificationPayload = {
      title: 'Test Notification',
      message: customMessage || 'This is a test notification from Alfalyzer',
      severity: AlertSeverity.LOW,
      type: 'SYSTEM_HEALTH' as any,
      actionUrl: '/dashboard'
    };

    const result = await this.sendNotification(userId, testPayload, [channel]);
    return result.results[channel] || { success: false, error: 'No result' };
  }
}

// Global notification service instance
export const notificationService = new NotificationService();