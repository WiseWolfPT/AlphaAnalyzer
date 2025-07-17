// Export all stores
export * from './app-store';
export * from './user-store';
export * from './notification-store';

// Store provider hook for initializing stores
import { useEffect } from 'react';
import { useAppStore } from './app-store';
import { useUserStore } from './user-store';
import { useNotificationStore } from './notification-store';

/**
 * Hook to initialize all stores and handle cross-store effects
 */
export const useStoreInitializer = () => {
  const { setIsInitializing } = useAppStore();
  const { setIsLoading } = useUserStore();
  const { updateSettings } = useNotificationStore();

  useEffect(() => {
    // Initialize stores
    const initializeStores = async () => {
      try {
        setIsInitializing(true);
        setIsLoading(true);

        // Initialize app store
        // Set up online/offline listeners
        const handleOnline = () => useAppStore.getState().setIsOnline(true);
        const handleOffline = () => useAppStore.getState().setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initialize user store
        // Check for existing authentication
        const token = localStorage.getItem('auth-token');
        if (token) {
          // Validate token and restore user state
          // This would typically involve an API call
          console.log('Restoring user session...');
        }

        // Initialize notification store
        // Request notification permissions if needed
        if ('Notification' in window && Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          updateSettings({
            pushEnabled: permission === 'granted',
          });
        }

        // Mark initialization as complete
        setIsInitializing(false);
        setIsLoading(false);

        // Cleanup function
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } catch (error) {
        console.error('Failed to initialize stores:', error);
        setIsInitializing(false);
        setIsLoading(false);
      }
    };

    initializeStores();
  }, [setIsInitializing, setIsLoading, updateSettings]);
};

/**
 * Store utilities for common operations
 */
export const storeUtils = {
  /**
   * Reset all stores to initial state
   */
  resetAllStores: () => {
    useAppStore.getState().resetSettings();
    useUserStore.getState().resetUserState();
    useNotificationStore.getState().clearAll();
  },

  /**
   * Get combined state for debugging
   */
  getFullState: () => ({
    app: useAppStore.getState(),
    user: useUserStore.getState(),
    notification: useNotificationStore.getState(),
  }),

  /**
   * Subscribe to store changes for debugging
   */
  subscribeToChanges: (callback: (state: any) => void) => {
    const unsubscribeApp = useAppStore.subscribe(callback);
    const unsubscribeUser = useUserStore.subscribe(callback);
    const unsubscribeNotification = useNotificationStore.subscribe(callback);

    return () => {
      unsubscribeApp();
      unsubscribeUser();
      unsubscribeNotification();
    };
  },
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  // Make stores available globally for debugging
  (window as any).stores = {
    app: useAppStore,
    user: useUserStore,
    notification: useNotificationStore,
    utils: storeUtils,
  };
}