import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types for notification state
export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // in milliseconds, undefined = no auto-dismiss
  persistent?: boolean;
  actions?: NotificationAction[];
  timestamp: number;
  read: boolean;
  category?: 'price' | 'news' | 'earnings' | 'system' | 'account';
  relatedSymbol?: string;
  relatedPortfolio?: string;
  data?: any; // Additional data for the notification
}

export interface NotificationAction {
  label: string;
  action: () => void;
  type?: 'primary' | 'secondary' | 'danger';
}

export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below' | 'change_up' | 'change_down';
  value: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
  userId: string;
}

export interface NotificationState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Settings
  soundEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  position: NotificationPosition;
  maxNotifications: number;
  
  // Price alerts
  priceAlerts: PriceAlert[];
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  clearByCategory: (category: string) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<Pick<NotificationState, 'soundEnabled' | 'pushEnabled' | 'emailEnabled' | 'position' | 'maxNotifications'>>) => void;
  
  // Price alerts actions
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  removePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  triggerPriceAlert: (id: string) => void;
  
  // Helper methods
  showSuccess: (title: string, message: string, options?: Partial<Notification>) => string;
  showError: (title: string, message: string, options?: Partial<Notification>) => string;
  showInfo: (title: string, message: string, options?: Partial<Notification>) => string;
  showWarning: (title: string, message: string, options?: Partial<Notification>) => string;
  
  // Stock-specific notifications
  showPriceAlert: (symbol: string, currentPrice: number, targetPrice: number, type: 'above' | 'below') => void;
  showEarningsAlert: (symbol: string, earningsDate: string, surprise?: number) => void;
  showNewsAlert: (symbol: string, headline: string, sentiment: 'positive' | 'negative' | 'neutral') => void;
  showPortfolioAlert: (portfolioId: string, message: string, type: NotificationType) => void;
}

// Generate unique ID for notifications
const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create the store
export const useNotificationStore = create<NotificationState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      soundEnabled: true,
      pushEnabled: true,
      emailEnabled: true,
      position: 'top-right',
      maxNotifications: 50,
      priceAlerts: [],

      // Actions
      addNotification: (notification) => {
        const id = generateId();
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          read: false,
        };

        set((state) => {
          // Add notification to the beginning of the array
          state.notifications.unshift(newNotification);
          
          // Increment unread count
          state.unreadCount += 1;
          
          // Trim notifications if exceeding max
          if (state.notifications.length > state.maxNotifications) {
            state.notifications = state.notifications.slice(0, state.maxNotifications);
          }
        });

        // Auto-dismiss if duration is specified
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }

        // Play sound if enabled
        if (get().soundEnabled) {
          playNotificationSound(notification.type);
        }

        return id;
      },

      removeNotification: (id) => {
        set((state) => {
          const notificationIndex = state.notifications.findIndex(n => n.id === id);
          if (notificationIndex !== -1) {
            const notification = state.notifications[notificationIndex];
            if (!notification.read) {
              state.unreadCount -= 1;
            }
            state.notifications.splice(notificationIndex, 1);
          }
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadCount -= 1;
          }
        });
      },

      markAllAsRead: () => {
        set((state) => {
          state.notifications.forEach(notification => {
            notification.read = true;
          });
          state.unreadCount = 0;
        });
      },

      clearAll: () => {
        set((state) => {
          state.notifications = [];
          state.unreadCount = 0;
        });
      },

      clearByCategory: (category) => {
        set((state) => {
          const removedCount = state.notifications.filter(n => n.category === category && !n.read).length;
          state.notifications = state.notifications.filter(n => n.category !== category);
          state.unreadCount -= removedCount;
        });
      },

      // Settings actions
      updateSettings: (settings) => {
        set((state) => {
          Object.assign(state, settings);
        });
      },

      // Price alerts actions
      addPriceAlert: (alert) => {
        set((state) => {
          const newAlert: PriceAlert = {
            ...alert,
            id: generateId(),
            createdAt: new Date().toISOString(),
          };
          state.priceAlerts.push(newAlert);
        });
      },

      removePriceAlert: (id) => {
        set((state) => {
          state.priceAlerts = state.priceAlerts.filter(alert => alert.id !== id);
        });
      },

      togglePriceAlert: (id) => {
        set((state) => {
          const alert = state.priceAlerts.find(a => a.id === id);
          if (alert) {
            alert.isActive = !alert.isActive;
          }
        });
      },

      triggerPriceAlert: (id) => {
        set((state) => {
          const alert = state.priceAlerts.find(a => a.id === id);
          if (alert) {
            alert.triggeredAt = new Date().toISOString();
            alert.isActive = false; // Deactivate after triggering
          }
        });
      },

      // Helper methods
      showSuccess: (title, message, options = {}) => {
        return get().addNotification({
          type: 'success',
          title,
          message,
          duration: 5000,
          ...options,
        });
      },

      showError: (title, message, options = {}) => {
        return get().addNotification({
          type: 'error',
          title,
          message,
          duration: 8000,
          ...options,
        });
      },

      showInfo: (title, message, options = {}) => {
        return get().addNotification({
          type: 'info',
          title,
          message,
          duration: 5000,
          ...options,
        });
      },

      showWarning: (title, message, options = {}) => {
        return get().addNotification({
          type: 'warning',
          title,
          message,
          duration: 6000,
          ...options,
        });
      },

      // Stock-specific notifications
      showPriceAlert: (symbol, currentPrice, targetPrice, type) => {
        const direction = type === 'above' ? 'above' : 'below';
        const emoji = type === 'above' ? '📈' : '📉';
        
        get().addNotification({
          type: 'info',
          title: `${emoji} Price Alert - ${symbol}`,
          message: `${symbol} is now ${direction} $${targetPrice}. Current price: $${currentPrice}`,
          category: 'price',
          relatedSymbol: symbol,
          duration: 10000,
          actions: [
            {
              label: 'View Chart',
              action: () => {
                // Navigation logic would go here
                console.log(`Navigate to ${symbol} chart`);
              },
            },
          ],
        });
      },

      showEarningsAlert: (symbol, earningsDate, surprise) => {
        const surpriseText = surprise 
          ? surprise > 0 
            ? `Beat by ${surprise}%` 
            : `Missed by ${Math.abs(surprise)}%`
          : '';
        
        get().addNotification({
          type: 'info',
          title: `📊 Earnings Alert - ${symbol}`,
          message: `${symbol} reports earnings on ${earningsDate}${surpriseText ? '. ' + surpriseText : ''}`,
          category: 'earnings',
          relatedSymbol: symbol,
          duration: 8000,
          actions: [
            {
              label: 'View Details',
              action: () => {
                console.log(`Navigate to ${symbol} earnings`);
              },
            },
          ],
        });
      },

      showNewsAlert: (symbol, headline, sentiment) => {
        const emoji = sentiment === 'positive' ? '📈' : sentiment === 'negative' ? '📉' : '📰';
        
        get().addNotification({
          type: sentiment === 'positive' ? 'success' : sentiment === 'negative' ? 'warning' : 'info',
          title: `${emoji} News Alert - ${symbol}`,
          message: headline,
          category: 'news',
          relatedSymbol: symbol,
          duration: 7000,
          actions: [
            {
              label: 'Read More',
              action: () => {
                console.log(`Open news for ${symbol}`);
              },
            },
          ],
        });
      },

      showPortfolioAlert: (portfolioId, message, type) => {
        get().addNotification({
          type,
          title: '💼 Portfolio Alert',
          message,
          category: 'account',
          relatedPortfolio: portfolioId,
          duration: 6000,
          actions: [
            {
              label: 'View Portfolio',
              action: () => {
                console.log(`Navigate to portfolio ${portfolioId}`);
              },
            },
          ],
        });
      },
    })),
    {
      name: 'notification-store',
    }
  )
);

// Selectors for commonly used state slices
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const usePriceAlerts = () => useNotificationStore((state) => state.priceAlerts);
export const useNotificationSettings = () => useNotificationStore((state) => ({
  soundEnabled: state.soundEnabled,
  pushEnabled: state.pushEnabled,
  emailEnabled: state.emailEnabled,
  position: state.position,
  maxNotifications: state.maxNotifications,
  updateSettings: state.updateSettings,
}));

// Notification actions
export const useNotificationActions = () => useNotificationStore((state) => ({
  showSuccess: state.showSuccess,
  showError: state.showError,
  showInfo: state.showInfo,
  showWarning: state.showWarning,
  showPriceAlert: state.showPriceAlert,
  showEarningsAlert: state.showEarningsAlert,
  showNewsAlert: state.showNewsAlert,
  showPortfolioAlert: state.showPortfolioAlert,
  removeNotification: state.removeNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  clearAll: state.clearAll,
}));

// Price alert actions
export const usePriceAlertActions = () => useNotificationStore((state) => ({
  addPriceAlert: state.addPriceAlert,
  removePriceAlert: state.removePriceAlert,
  togglePriceAlert: state.togglePriceAlert,
  triggerPriceAlert: state.triggerPriceAlert,
}));

// Helper functions
function playNotificationSound(type: NotificationType) {
  // Only play sound if browser supports it and user hasn't disabled it
  if (typeof Audio !== 'undefined') {
    try {
      const audio = new Audio();
      
      // Different sounds for different notification types
      switch (type) {
        case 'success':
          audio.src = '/sounds/success.mp3';
          break;
        case 'error':
          audio.src = '/sounds/error.mp3';
          break;
        case 'warning':
          audio.src = '/sounds/warning.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }
      
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors (e.g., no sound files available)
      });
    } catch (error) {
      // Ignore errors
    }
  }
}

// Utility functions for external use
export const notificationUtils = {
  /**
   * Create a notification with common stock patterns
   */
  createStockNotification: (
    symbol: string,
    type: NotificationType,
    message: string,
    options?: Partial<Notification>
  ) => {
    return useNotificationStore.getState().addNotification({
      type,
      title: `${symbol} Update`,
      message,
      category: 'price',
      relatedSymbol: symbol,
      duration: 5000,
      ...options,
    });
  },

  /**
   * Batch clear notifications by symbols
   */
  clearNotificationsForSymbols: (symbols: string[]) => {
    const { notifications, removeNotification } = useNotificationStore.getState();
    
    notifications
      .filter(n => symbols.includes(n.relatedSymbol || ''))
      .forEach(n => removeNotification(n.id));
  },

  /**
   * Check if a notification already exists
   */
  hasNotification: (title: string, message: string) => {
    const { notifications } = useNotificationStore.getState();
    return notifications.some(n => n.title === title && n.message === message);
  },
};