// Notification Service - Handle PWA, email, and in-app notifications
import { supabase } from '@/lib/supabase';

interface NotificationPayload {
  title: string;
  body: string;
  data?: {
    alertId?: string;
    triggerId?: string;
    symbol?: string;
    type?: string;
    url?: string;
  };
}

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

class NotificationService {
  private inAppNotifications: InAppNotification[] = [];
  private listeners: Array<(notifications: InAppNotification[]) => void> = [];
  private pushSupported = false;
  private permission: NotificationPermission = 'default';

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    // Check PWA push notification support
    this.pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (this.pushSupported) {
      this.permission = Notification.permission;
      console.log('🔔 Push notifications supported, permission:', this.permission);
    } else {
      console.warn('⚠️ Push notifications not supported in this browser');
    }

    // Register service worker for push notifications
    if (this.pushSupported && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('✅ Service worker registered for notifications');
      } catch (error) {
        console.error('❌ Service worker registration failed:', error);
      }
    }
  }

  // Request permission for push notifications
  async requestPermission(): Promise<boolean> {
    if (!this.pushSupported) {
      console.warn('⚠️ Push notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      this.permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', this.permission);
      return this.permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }

  // Send PWA push notification (REAL backend push)
  async sendPushNotification(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.pushSupported || this.permission !== 'granted') {
      console.warn('⚠️ Cannot send push notification - no permission or support');
      return;
    }

    try {
      // Send real push notification via backend API
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data,
          icon: '/icon-192.png',
          badge: '/badge-72x72.svg'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Real push notification sent:', result.message);
      } else {
        // Fallback to local notification if backend fails
        console.warn('⚠️ Backend push failed, using local notification');
        await this.sendLocalNotification(payload);
      }
    } catch (error) {
      console.error('❌ Failed to send real push notification:', error);
      // Fallback to local notification
      await this.sendLocalNotification(payload);
    }
  }

  // Fallback local notification (for development/offline)
  private async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(payload.title, {
          body: payload.body,
          icon: '/icon-192.png',
          badge: '/badge-72x72.svg',
          vibrate: [100, 50, 100],
          data: payload.data,
          actions: [
            {
              action: 'view',
              title: 'View'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ],
          requireInteraction: true,
          tag: payload.data?.alertId || 'general'
        });

        console.log('✅ Local notification sent via service worker');
      } else {
        // Browser notification API fallback
        new Notification(payload.title, {
          body: payload.body,
          icon: '/icon-192.png',
          data: payload.data
        });

        console.log('✅ Browser notification sent');
      }
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
      throw error;
    }
  }

  // Get authentication token for API calls
  private getAuthToken(): string {
    // Try to get token from localStorage or sessionStorage
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  }

  // Subscribe to push notifications
  async subscribeToPushNotifications(): Promise<boolean> {
    if (!this.pushSupported || this.permission !== 'granted') {
      console.warn('⚠️ Cannot subscribe to push notifications');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from backend
      const vapidResponse = await fetch('/api/push/vapid-public-key');
      if (!vapidResponse.ok) {
        console.error('❌ Failed to get VAPID public key');
        return false;
      }
      
      const { publicKey } = await vapidResponse.json();
      
      // Create push subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to backend
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(subscription)
      });

      if (subscribeResponse.ok) {
        console.log('✅ Push subscription successful');
        return true;
      } else {
        console.error('❌ Failed to save push subscription');
        return false;
      }
    } catch (error) {
      console.error('❌ Push subscription error:', error);
      return false;
    }
  }

  // Helper function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Send email notification via Supabase Edge Function
  async sendEmailNotification(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        console.warn('⚠️ No user email available for notification');
        return;
      }

      // Call Supabase Edge Function for email sending
      const { data, error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          to: user.email,
          subject: payload.title,
          body: payload.body,
          alertData: payload.data
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email notification sent');
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      // Don't throw - email is not critical
    }
  }

  // Show in-app notification (toast)
  async showInAppNotification(payload: NotificationPayload): Promise<void> {
    const notification: InAppNotification = {
      id: this.generateId(),
      title: payload.title,
      message: payload.body,
      type: this.getNotificationType(payload.data?.type),
      timestamp: new Date(),
      read: false,
      actions: payload.data?.url ? [
        {
          label: 'View',
          action: () => {
            window.location.href = payload.data!.url!;
            this.markAsRead(notification.id);
          }
        }
      ] : undefined
    };

    this.inAppNotifications.unshift(notification);
    
    // Limit to 50 notifications
    if (this.inAppNotifications.length > 50) {
      this.inAppNotifications = this.inAppNotifications.slice(0, 50);
    }

    this.notifyListeners();
    
    // Auto-remove after 10 seconds if no actions
    if (!notification.actions) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, 10000);
    }

    console.log('✅ In-app notification shown');
  }

  // Play notification sound
  playNotificationSound(): void {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      console.log('🔊 Notification sound played');
    } catch (error) {
      console.warn('⚠️ Failed to play notification sound:', error);
    }
  }

  // In-app notification management
  getInAppNotifications(): InAppNotification[] {
    return [...this.inAppNotifications];
  }

  getUnreadCount(): number {
    return this.inAppNotifications.filter(n => !n.read).length;
  }

  markAsRead(notificationId: string): void {
    const notification = this.inAppNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  markAllAsRead(): void {
    this.inAppNotifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  removeNotification(notificationId: string): void {
    this.inAppNotifications = this.inAppNotifications.filter(n => n.id !== notificationId);
    this.notifyListeners();
  }

  clearAllNotifications(): void {
    this.inAppNotifications = [];
    this.notifyListeners();
  }

  // Subscribe to in-app notification updates
  subscribe(listener: (notifications: InAppNotification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.inAppNotifications]);
      } catch (error) {
        console.error('❌ Error notifying notification listener:', error);
      }
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getNotificationType(alertType?: string): 'info' | 'success' | 'warning' | 'error' {
    switch (alertType) {
      case 'price_above':
        return 'success';
      case 'price_below':
        return 'warning';
      case 'volume_spike':
        return 'info';
      case 'news_sentiment':
        return 'info';
      case 'technical_indicator':
        return 'info';
      default:
        return 'info';
    }
  }

  // Utility methods
  canSendPush(): boolean {
    return this.pushSupported && this.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  isSupported(): boolean {
    return this.pushSupported;
  }

  // Test notification (updated for real push)
  async sendTestNotification(): Promise<void> {
    const testPayload: NotificationPayload = {
      title: 'Test Alert',
      body: 'This is a test notification from Alfalyzer 🚀',
      data: {
        type: 'test',
        url: '/dashboard'
      }
    };

    // Try all notification methods
    await Promise.allSettled([
      this.showInAppNotification(testPayload),
      this.sendPushNotification('test', testPayload)
    ]);

    console.log('✅ Test notification sent');
  }

  // Test real push notifications via backend
  async sendTestPushNotification(): Promise<void> {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backend test notification:', result.message);
      } else {
        const error = await response.json();
        console.error('❌ Backend test failed:', error.message);
      }
    } catch (error) {
      console.error('❌ Failed to send backend test notification:', error);
    }
  }

  // Auto-subscribe to push notifications when permission granted
  async enablePushNotifications(): Promise<boolean> {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      return await this.subscribeToPushNotifications();
    }
    return false;
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();

// Export types
export type { NotificationPayload, InAppNotification };