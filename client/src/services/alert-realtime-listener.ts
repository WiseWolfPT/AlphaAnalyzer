/**
 * ALERT REALTIME LISTENER - Event-driven alert system
 * Replaces polling-based alert engine with 100% Realtime subscriptions
 * ZERO API calls from client - all processing done server-side
 */

import { supabase, realtime } from '@/lib/supabase';
import { notificationService } from './notification-service';

interface AlertRealtimeEvent {
  type: 'alert_triggered';
  alert_id: string;
  trigger_id: string;
  symbol: string;
  alert_type: string;
  trigger_value: number;
  message: string;
  timestamp: string;
  notification_methods: string[];
}

interface AlertListenerConfig {
  enabled: boolean;
  userId: string | null;
  autoShowNotifications: boolean;
  vibrationEnabled: boolean;
}

class AlertRealtimeListener {
  private config: AlertListenerConfig = {
    enabled: true,
    userId: null,
    autoShowNotifications: true,
    vibrationEnabled: true
  };
  
  private activeChannels = new Map<string, any>();
  private eventHandlers = new Map<string, ((event: AlertRealtimeEvent) => void)[]>();

  constructor() {
    console.log('📡 Alert Realtime Listener initialized');
    console.log('🚫 Zero polling - 100% event-driven via Supabase Realtime');
  }

  /**
   * Start listening for alerts for a specific user
   */
  async startListening(userId: string): Promise<void> {
    this.config.userId = userId;
    
    if (!this.config.enabled) {
      console.log('📡 Alert listener disabled');
      return;
    }

    try {
      // Subscribe to user-specific alert triggers
      const channelName = `alerts:${userId}`;
      const channel = supabase.channel(channelName);

      // Listen for alert trigger events
      channel.on('broadcast', { event: 'alert_triggered' }, (payload) => {
        this.handleAlertTriggered(payload.payload as AlertRealtimeEvent);
      });

      // Subscribe to channel
      const { error } = await channel.subscribe();
      
      if (error) {
        console.error('❌ Failed to subscribe to alert channel:', error);
        return;
      }

      this.activeChannels.set(channelName, channel);
      console.log(`📡 Started listening for alerts on channel: ${channelName}`);
      
    } catch (error) {
      console.error('❌ Failed to start alert listening:', error);
    }
  }

  /**
   * Stop listening for alerts
   */
  async stopListening(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const [channelName, channel] of this.activeChannels) {
        await supabase.removeChannel(channel);
        console.log(`📡 Stopped listening on channel: ${channelName}`);
      }
      
      this.activeChannels.clear();
      this.config.userId = null;
      
      console.log('📡 Alert listening stopped');
    } catch (error) {
      console.error('❌ Failed to stop alert listening:', error);
    }
  }

  /**
   * Handle incoming alert trigger events
   */
  private async handleAlertTriggered(event: AlertRealtimeEvent): Promise<void> {
    try {
      console.log(`🚨 ALERT TRIGGERED: ${event.symbol} - ${event.message}`);

      // Trigger custom event handlers
      this.triggerEventHandlers('alert_triggered', event);

      // Show in-app notification if enabled
      if (this.config.autoShowNotifications) {
        await this.showInAppNotification(event);
      }

      // Handle vibration for mobile devices
      if (this.config.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Browser notification if supported and permitted
      await this.showBrowserNotification(event);

    } catch (error) {
      console.error('❌ Failed to handle alert trigger:', error);
    }
  }

  /**
   * Show in-app notification
   */
  private async showInAppNotification(event: AlertRealtimeEvent): Promise<void> {
    try {
      await notificationService.showInAppNotification({
        title: `🚨 ${event.symbol} Alert`,
        body: event.message,
        data: {
          type: 'alert_triggered',
          alertId: event.alert_id,
          triggerId: event.trigger_id,
          symbol: event.symbol,
          alertType: event.alert_type,
          triggerValue: event.trigger_value,
          url: `/dashboard?symbol=${event.symbol}&alert=${event.alert_id}`
        }
      });
    } catch (error) {
      console.error('❌ Failed to show in-app notification:', error);
    }
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(event: AlertRealtimeEvent): Promise<void> {
    try {
      // Check if browser notifications are supported and permitted
      if (!('Notification' in window)) {
        return;
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification(`🚨 ${event.symbol} Alert`, {
          body: event.message,
          icon: '/icon-192.png',
          badge: '/badge-72x72.svg',
          tag: `alert-${event.alert_id}`,
          renotify: true,
          requireInteraction: true,
          data: {
            type: 'alert_triggered',
            alertId: event.alert_id,
            symbol: event.symbol,
            url: `/dashboard?symbol=${event.symbol}&alert=${event.alert_id}`
          }
        });

        // Handle notification click
        notification.onclick = () => {
          window.focus();
          window.location.href = notification.data.url;
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);

      } else if (Notification.permission === 'default') {
        // Request permission for future notifications
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Retry showing the notification
          await this.showBrowserNotification(event);
        }
      }
    } catch (error) {
      console.error('❌ Failed to show browser notification:', error);
    }
  }

  /**
   * Add custom event handler
   */
  addEventListener(eventType: string, handler: (event: AlertRealtimeEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove custom event handler
   */
  removeEventListener(eventType: string, handler: (event: AlertRealtimeEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Trigger custom event handlers
   */
  private triggerEventHandlers(eventType: string, event: AlertRealtimeEvent): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('❌ Event handler error:', error);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertListenerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Alert listener config updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertListenerConfig {
    return { ...this.config };
  }

  /**
   * Get status information
   */
  getStatus(): {
    isListening: boolean;
    userId: string | null;
    activeChannels: number;
    config: AlertListenerConfig;
  } {
    return {
      isListening: this.activeChannels.size > 0,
      userId: this.config.userId,
      activeChannels: this.activeChannels.size,
      config: this.getConfig()
    };
  }
}

// Create and export singleton instance
export const alertRealtimeListener = new AlertRealtimeListener();

// Export the class for testing
export { AlertRealtimeListener };

// Export types
export type { AlertRealtimeEvent, AlertListenerConfig };