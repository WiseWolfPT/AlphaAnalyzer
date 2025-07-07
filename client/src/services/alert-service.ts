/**
 * ALERT SERVICE
 * Frontend service for alert management and real-time notifications
 * AGENTE 8: Complete notification system implementation
 */

import { env } from '@/lib/env';

// Types matching backend
export interface AlertCondition {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne' | 'contains' | 'pct_change';
  value: number | string;
  symbol?: string;
  timeframe?: string;
}

export interface AlertFrequency {
  type: 'immediate' | '5min' | '15min' | '1hour' | 'daily' | 'weekly' | 'custom';
  value?: number;
  cooldown?: number;
  maxPerDay?: number;
  quietHours?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    timezone: string;
  };
}

export interface CreateAlertRequest {
  name: string;
  description?: string;
  type: 'price_change' | 'price_threshold' | 'volume_spike' | 'earnings_reminder' | 'portfolio_performance';
  conditions: AlertCondition[];
  frequency: AlertFrequency;
  channels: ('in_app' | 'email' | 'push' | 'webhook')[];
  enabled?: boolean;
  metadata?: Record<string, any>;
}

export interface AlertConfig extends CreateAlertRequest {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AlertTrigger {
  id: string;
  alertId: string;
  userId: string;
  triggeredAt: string;
  currentValue: string;
  previousValue?: string;
  symbol?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  notificationsSent: string[];
  acknowledged: boolean;
  acknowledgedAt?: string;
  alert_name: string;
  alert_type: string;
}

export interface UserAlertPreferences {
  userId: string;
  globalEnabled: boolean;
  defaultChannels: ('in_app' | 'email' | 'push' | 'webhook')[];
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    timezone: string;
  };
  emailNotifications: boolean;
  pushNotifications: boolean;
  weekendAlerts: boolean;
  maxAlertsPerDay: number;
  preferredFrequency: 'immediate' | '5min' | '15min' | '1hour' | 'daily' | 'weekly' | 'custom';
  categories: Record<string, {
    enabled: boolean;
    channels: ('in_app' | 'email' | 'push' | 'webhook')[];
    frequency: 'immediate' | '5min' | '15min' | '1hour' | 'daily' | 'weekly' | 'custom';
  }>;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  symbol?: string;
  actionUrl?: string;
  icon?: string;
  timestamp: string;
  read: boolean;
  data?: Record<string, any>;
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  totalTriggers: number;
  triggersToday: number;
  unacknowledged: number;
}

class AlertService {
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private notificationCallbacks: ((notification: Notification) => void)[] = [];

  constructor() {
    this.baseUrl = env.VITE_API_URL || '/api';
  }

  /**
   * Authentication helpers
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Alert management
   */
  async getAlerts(params?: {
    type?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: AlertConfig[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.enabled !== undefined) searchParams.append('enabled', params.enabled.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${this.baseUrl}/alerts?${searchParams}`, {
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async getAlert(id: string): Promise<AlertConfig> {
    const response = await fetch(`${this.baseUrl}/alerts/${id}`, {
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async createAlert(alert: CreateAlertRequest): Promise<{ id: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(alert)
    });

    return this.handleResponse(response);
  }

  async updateAlert(id: string, updates: Partial<CreateAlertRequest>): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    return this.handleResponse(response);
  }

  async deleteAlert(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Alert triggers and history
   */
  async getTriggers(params?: {
    limit?: number;
    offset?: number;
    severity?: string;
    acknowledged?: boolean;
  }): Promise<{ triggers: AlertTrigger[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.severity) searchParams.append('severity', params.severity);
    if (params?.acknowledged !== undefined) searchParams.append('acknowledged', params.acknowledged.toString());

    const response = await fetch(`${this.baseUrl}/alerts/triggers?${searchParams}`, {
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async acknowledgeTrigger(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/triggers/${id}/acknowledge`, {
      method: 'POST',
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * User preferences
   */
  async getPreferences(): Promise<UserAlertPreferences> {
    const response = await fetch(`${this.baseUrl}/alerts/preferences`, {
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async updatePreferences(preferences: Partial<UserAlertPreferences>): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/preferences`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(preferences)
    });

    return this.handleResponse(response);
  }

  /**
   * Notifications
   */
  async getNotifications(limit?: number): Promise<{ 
    notifications: Notification[]; 
    unreadCount: number 
  }> {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', limit.toString());

    const response = await fetch(`${this.baseUrl}/alerts/notifications?${searchParams}`, {
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async markNotificationAsRead(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/notifications/${id}/read`, {
      method: 'POST',
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  async clearAllNotifications(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/notifications`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Statistics
   */
  async getStats(): Promise<AlertStats> {
    const response = await fetch(`${this.baseUrl}/alerts/stats`, {
      headers: await this.getAuthHeaders()
    });

    return this.handleResponse(response);
  }

  /**
   * Testing
   */
  async testNotification(
    channel: 'in_app' | 'email' | 'push' | 'webhook',
    message?: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const response = await fetch(`${this.baseUrl}/alerts/test`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ channel, message })
    });

    return this.handleResponse(response);
  }

  /**
   * Real-time notifications via Server-Sent Events
   */
  startRealtimeNotifications(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('No auth token available for real-time notifications');
      return;
    }

    try {
      this.eventSource = new EventSource(`${this.baseUrl}/alerts/stream?token=${encodeURIComponent(token)}`);

      this.eventSource.onopen = () => {
        console.log('📡 Real-time alert notifications connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          this.notifyCallbacks(notification);
          
          // Show browser notification if permitted
          this.showBrowserNotification(notification);
        } catch (error) {
          console.error('Error parsing notification:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Real-time notifications error:', error);
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (this.eventSource?.readyState !== EventSource.OPEN) {
            this.startRealtimeNotifications();
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Failed to start real-time notifications:', error);
    }
  }

  stopRealtimeNotifications(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('📡 Real-time alert notifications disconnected');
    }
  }

  /**
   * Notification callbacks
   */
  onNotification(callback: (notification: Notification) => void): () => void {
    this.notificationCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks(notification: Notification): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Browser notifications
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  private showBrowserNotification(notification: Notification): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        badge: '/favicon.ico',
        requireInteraction: notification.severity === 'critical',
        silent: notification.severity === 'low'
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for non-critical alerts
      if (notification.severity !== 'critical') {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }

    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  /**
   * Utility methods
   */
  formatAlertType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatFrequency(frequency: AlertFrequency): string {
    switch (frequency.type) {
      case 'immediate':
        return 'Immediate';
      case '5min':
        return 'Every 5 minutes';
      case '15min':
        return 'Every 15 minutes';
      case '1hour':
        return 'Every hour';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'custom':
        return `Every ${frequency.value} minutes`;
      default:
        return 'Unknown';
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  }

  getSeverityBadgeVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  }
}

// Export singleton instance
export const alertService = new AlertService();

// Auto-start real-time notifications when service is loaded
if (typeof window !== 'undefined') {
  // Check if user is authenticated
  const token = localStorage.getItem('auth_token');
  if (token) {
    alertService.startRealtimeNotifications();
  }
}

export default alertService;