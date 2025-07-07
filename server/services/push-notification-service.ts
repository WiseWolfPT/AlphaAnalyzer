// Push Notification Service - Real server-side push notifications
import webPush from 'web-push';
import { supabase } from '../lib/supabase';

interface PushSubscription {
  id: string;
  user_id: string;
  subscription_details: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  created_at: string;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  tag?: string;
}

class PushNotificationService {
  private isConfigured = false;

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@alfalyzer.com';

    if (!publicKey || !privateKey) {
      console.warn('⚠️ VAPID keys not configured - push notifications disabled');
      return;
    }

    // Configure web-push with VAPID keys
    webPush.setVapidDetails(subject, publicKey, privateKey);
    this.isConfigured = true;
    
    console.log('✅ Push notification service configured with VAPID keys');
  }

  /**
   * Save push subscription to database
   */
  async saveSubscription(userId: string, subscription: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate subscription format
      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return { success: false, error: 'Invalid subscription format' };
      }

      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('subscription_details->endpoint', subscription.endpoint)
        .single();

      if (existing) {
        console.log('💾 Push subscription already exists for user:', userId);
        return { success: true };
      }

      // Save new subscription
      const { data, error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          subscription_details: subscription
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to save push subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Push subscription saved for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving push subscription:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Remove push subscription from database
   */
  async removeSubscription(userId: string, endpoint: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('subscription_details->endpoint', endpoint);

      if (error) {
        console.error('❌ Failed to remove push subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Push subscription removed for user:', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing push subscription:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get all active subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Failed to fetch user subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error fetching user subscriptions:', error);
      return [];
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendPushToUser(userId: string, payload: PushPayload): Promise<{ success: boolean; sent: number; failed: number }> {
    if (!this.isConfigured) {
      console.warn('⚠️ Push service not configured - skipping notification');
      return { success: false, sent: 0, failed: 0 };
    }

    try {
      const subscriptions = await this.getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log('📭 No push subscriptions found for user:', userId);
        return { success: true, sent: 0, failed: 0 };
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendPushToSubscription(sub, payload))
      );

      let sent = 0;
      let failed = 0;
      const expiredSubscriptions: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            sent++;
          } else {
            failed++;
            if (result.value.expired) {
              expiredSubscriptions.push(subscriptions[index].id);
            }
          }
        } else {
          failed++;
          console.error('❌ Push notification promise rejected:', result.reason);
        }
      });

      // Clean up expired subscriptions
      if (expiredSubscriptions.length > 0) {
        await this.cleanupExpiredSubscriptions(expiredSubscriptions);
      }

      console.log(`📱 Push notification results - Sent: ${sent}, Failed: ${failed}`);
      return { success: true, sent, failed };
    } catch (error) {
      console.error('❌ Error sending push notifications to user:', error);
      return { success: false, sent: 0, failed: 0 };
    }
  }

  /**
   * Send push notification to single subscription
   */
  private async sendPushToSubscription(
    subscription: PushSubscription, 
    payload: PushPayload
  ): Promise<{ success: boolean; expired?: boolean }> {
    try {
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/badge-72x72.svg',
        image: payload.image,
        data: {
          ...payload.data,
          timestamp: Date.now(),
          url: payload.data?.url || '/'
        },
        actions: payload.actions || [
          { action: 'view', title: 'View', icon: '/icon-32.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: payload.requireInteraction || true,
        tag: payload.tag || 'alfalyzer-notification',
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      });

      await webPush.sendNotification(subscription.subscription_details, pushPayload);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to send push notification:', error);

      // Check if subscription is expired/invalid
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('🗑️ Push subscription expired, marking for cleanup');
        return { success: false, expired: true };
      }

      return { success: false };
    }
  }

  /**
   * Clean up expired subscriptions
   */
  private async cleanupExpiredSubscriptions(subscriptionIds: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', subscriptionIds);

      if (error) {
        console.error('❌ Failed to cleanup expired subscriptions:', error);
      } else {
        console.log(`🗑️ Cleaned up ${subscriptionIds.length} expired push subscriptions`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired subscriptions:', error);
    }
  }

  /**
   * Send test notification
   */
  async sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    const testPayload: PushPayload = {
      title: 'Alfalyzer Test',
      body: 'Push notifications are working! 🚀',
      icon: '/icon-192.png',
      badge: '/badge-72x72.svg',
      data: {
        type: 'test',
        url: '/dashboard'
      },
      actions: [
        { action: 'view', title: 'Open App', icon: '/icon-32.png' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: true,
      tag: 'test-notification'
    };

    const result = await this.sendPushToUser(userId, testPayload);
    
    if (result.success && result.sent > 0) {
      return { 
        success: true, 
        message: `Test notification sent to ${result.sent} device(s)` 
      };
    } else if (result.success && result.sent === 0) {
      return { 
        success: false, 
        message: 'No active push subscriptions found. Please enable notifications in your browser.' 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to send test notification' 
      };
    }
  }

  /**
   * Get service status
   */
  getStatus(): { configured: boolean; vapidPublicKey?: string } {
    return {
      configured: this.isConfigured,
      vapidPublicKey: this.isConfigured ? process.env.VAPID_PUBLIC_KEY : undefined
    };
  }

  // ===== ADMIN METHODS =====

  /**
   * Get system statistics for admin panel
   */
  async getSystemStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    subscriptionsByDay: Array<{ date: string; count: number }>;
    recentActivity: Array<{ date: string; notifications_sent: number }>;
    configStatus: { configured: boolean; vapidPublicKey?: string };
  }> {
    try {
      // Get total subscriptions
      const { count: totalSubscriptions } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      // Get subscriptions created in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSubscriptions } = await supabase
        .from('push_subscriptions')
        .select('created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      // Group subscriptions by day
      const subscriptionsByDay = this.groupByDay(recentSubscriptions || []);

      // Mock recent activity (in production, this would come from a notifications_log table)
      const recentActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        return {
          date: date.toISOString().split('T')[0],
          notifications_sent: Math.floor(Math.random() * 100) + 10
        };
      }).reverse();

      return {
        totalSubscriptions: totalSubscriptions || 0,
        activeSubscriptions: totalSubscriptions || 0, // All stored subscriptions are considered active
        subscriptionsByDay,
        recentActivity,
        configStatus: this.getStatus()
      };
    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * Get all subscriptions with pagination for admin panel
   */
  async getAllSubscriptions(page: number = 1, limit: number = 100): Promise<{
    subscriptions: Array<{
      id: string;
      user_id: string;
      endpoint: string;
      created_at: string;
      browser?: string;
      platform?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count: total } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      // Get paginated subscriptions
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, subscription_details, created_at')
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform data for admin display
      const transformedSubscriptions = (subscriptions || []).map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        endpoint: sub.subscription_details?.endpoint || 'Unknown',
        created_at: sub.created_at,
        browser: this.extractBrowserFromEndpoint(sub.subscription_details?.endpoint),
        platform: this.extractPlatformFromEndpoint(sub.subscription_details?.endpoint)
      }));

      return {
        subscriptions: transformedSubscriptions,
        pagination: {
          page,
          limit,
          total: total || 0,
          pages: Math.ceil((total || 0) / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting all subscriptions:', error);
      throw error;
    }
  }

  /**
   * Send broadcast notification to all users
   */
  async sendBroadcastNotification(
    title: string,
    body: string,
    options: {
      url?: string;
      icon?: string;
      badge?: string;
      tag?: string;
    } = {},
    targetAudience: 'all' | 'subscribed' | 'active' = 'subscribed'
  ): Promise<{ success: boolean; sent: number; failed: number; totalTargeted: number }> {
    if (!this.isConfigured) {
      console.warn('⚠️ Push service not configured - skipping broadcast');
      return { success: false, sent: 0, failed: 0, totalTargeted: 0 };
    }

    try {
      // Get all subscriptions
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*');

      if (error || !subscriptions) {
        throw new Error(`Failed to fetch subscriptions: ${error?.message}`);
      }

      if (subscriptions.length === 0) {
        console.log('📭 No push subscriptions found for broadcast');
        return { success: true, sent: 0, failed: 0, totalTargeted: 0 };
      }

      const payload: PushPayload = {
        title,
        body,
        icon: options.icon || '/icon-192.png',
        badge: options.badge || '/badge-72x72.svg',
        data: {
          type: 'broadcast',
          url: options.url || '/dashboard',
          timestamp: Date.now()
        },
        actions: [
          { action: 'view', title: 'View', icon: '/icon-32.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: true,
        tag: options.tag || 'broadcast-notification'
      };

      // Send to all subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendPushToSubscription(sub, payload))
      );

      let sent = 0;
      let failed = 0;
      const expiredSubscriptions: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            sent++;
          } else {
            failed++;
            if (result.value.expired) {
              expiredSubscriptions.push(subscriptions[index].id);
            }
          }
        } else {
          failed++;
          console.error('❌ Broadcast notification promise rejected:', result.reason);
        }
      });

      // Clean up expired subscriptions
      if (expiredSubscriptions.length > 0) {
        await this.cleanupExpiredSubscriptions(expiredSubscriptions);
      }

      console.log(`📢 Broadcast notification results - Sent: ${sent}, Failed: ${failed}, Total Targeted: ${subscriptions.length}`);
      return { 
        success: true, 
        sent, 
        failed, 
        totalTargeted: subscriptions.length 
      };
    } catch (error) {
      console.error('❌ Error sending broadcast notification:', error);
      return { success: false, sent: 0, failed: 0, totalTargeted: 0 };
    }
  }

  /**
   * Remove specific subscription by ID
   */
  async removeSubscription(subscriptionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) {
        console.error('❌ Failed to remove push subscription:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Push subscription removed by ID:', subscriptionId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing push subscription:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get analytics for push notifications
   */
  async getAnalytics(startTime: number, endTime: number): Promise<{
    totalSent: number;
    deliveryRate: number;
    subscriptionGrowth: Array<{ date: string; count: number }>;
    engagementMetrics: {
      clickRate: number;
      dismissRate: number;
    };
    platformBreakdown: Record<string, number>;
  }> {
    try {
      const startDate = new Date(startTime).toISOString();
      const endDate = new Date(endTime).toISOString();

      // Get subscriptions created in the time range
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('created_at, subscription_details')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Group subscriptions by day for growth chart
      const subscriptionGrowth = this.groupByDay(subscriptions || []);

      // Analyze platform breakdown
      const platformBreakdown: Record<string, number> = {};
      (subscriptions || []).forEach(sub => {
        const platform = this.extractPlatformFromEndpoint(sub.subscription_details?.endpoint);
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      });

      // Mock analytics data (in production, this would come from actual usage logs)
      return {
        totalSent: Math.floor(Math.random() * 1000) + 100,
        deliveryRate: 0.92 + Math.random() * 0.08, // 92-100%
        subscriptionGrowth,
        engagementMetrics: {
          clickRate: 0.05 + Math.random() * 0.10, // 5-15%
          dismissRate: 0.20 + Math.random() * 0.30  // 20-50%
        },
        platformBreakdown
      };
    } catch (error) {
      console.error('❌ Error getting push notification analytics:', error);
      throw error;
    }
  }

  /**
   * Update push notification system configuration
   */
  async updateConfig(config: {
    enabled?: boolean;
    defaultIcon?: string;
    defaultBadge?: string;
    ttl?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    maxDailyNotifications?: number;
  }): Promise<void> {
    try {
      // Store configuration in environment or database
      // For now, we'll just log the configuration update
      console.log('🔧 Push notification configuration updated:', config);
      
      // In production, you might want to store this in the database:
      // await supabase.from('push_config').upsert({ ...config, updated_at: new Date().toISOString() });
      
      // Apply configuration changes
      if (config.ttl !== undefined) {
        // Configure web-push TTL
        webPush.setTTL(config.ttl);
      }
      
      if (config.urgency !== undefined) {
        // Configure web-push urgency
        webPush.setUrgency(config.urgency);
      }
    } catch (error) {
      console.error('❌ Error updating push notification config:', error);
      throw error;
    }
  }

  /**
   * Public method to clean up expired subscriptions
   */
  async cleanupExpiredSubscriptions(): Promise<{ removed: number; error?: string }> {
    try {
      // For now, we'll remove subscriptions older than 30 days with no activity
      // In production, you'd want more sophisticated logic to detect truly expired subscriptions
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: oldSubscriptions } = await supabase
        .from('push_subscriptions')
        .select('id')
        .lt('created_at', thirtyDaysAgo);

      if (!oldSubscriptions || oldSubscriptions.length === 0) {
        return { removed: 0 };
      }

      const subscriptionIds = oldSubscriptions.map(sub => sub.id);
      
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', subscriptionIds);

      if (error) {
        console.error('❌ Failed to cleanup old subscriptions:', error);
        return { removed: 0, error: error.message };
      }

      console.log(`🗑️ Cleaned up ${subscriptionIds.length} old push subscriptions`);
      return { removed: subscriptionIds.length };
    } catch (error) {
      console.error('❌ Error cleaning up expired subscriptions:', error);
      return { removed: 0, error: 'Internal server error' };
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Group array of objects by day based on created_at
   */
  private groupByDay(items: Array<{ created_at: string }>): Array<{ date: string; count: number }> {
    const grouped = items.reduce((acc, item) => {
      const date = item.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Extract browser type from push endpoint
   */
  private extractBrowserFromEndpoint(endpoint?: string): string {
    if (!endpoint) return 'Unknown';
    
    if (endpoint.includes('fcm.googleapis.com')) return 'Chrome/Firefox';
    if (endpoint.includes('updates.push.services.mozilla.com')) return 'Firefox';
    if (endpoint.includes('wns.windows.com')) return 'Edge';
    if (endpoint.includes('notify.windows.com')) return 'Edge Legacy';
    
    return 'Unknown';
  }

  /**
   * Extract platform from push endpoint
   */
  private extractPlatformFromEndpoint(endpoint?: string): string {
    if (!endpoint) return 'Unknown';
    
    if (endpoint.includes('fcm.googleapis.com')) return 'Web/Android';
    if (endpoint.includes('updates.push.services.mozilla.com')) return 'Web';
    if (endpoint.includes('wns.windows.com')) return 'Windows';
    
    return 'Web';
  }
}

// Create and export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export class for testing
export { PushNotificationService };

// Export types
export type { PushSubscription, PushPayload };