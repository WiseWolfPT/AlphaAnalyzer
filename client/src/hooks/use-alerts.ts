import { useState, useEffect, useCallback } from 'react';
import { db, realtime, type Alert, type AlertTrigger } from '@/lib/supabase';
// NEW: Event-driven alert system (zero polling)
import { alertRealtimeListener, type AlertRealtimeEvent } from '@/services/alert-realtime-listener';
import { notificationService } from '@/services/notification-service';

interface UseAlertsOptions {
  userId?: string;
  symbol?: string;
  autoRefresh?: boolean;
  subscribeToRealtime?: boolean;
}

interface UseAlertsReturn {
  alerts: Alert[];
  triggers: AlertTrigger[];
  isLoading: boolean;
  error: string | null;
  createAlert: (alertData: Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'triggered_count' | 'last_triggered_at'>) => Promise<Alert | null>;
  updateAlert: (alertId: string, updates: Partial<Alert>) => Promise<Alert | null>;
  deleteAlert: (alertId: string) => Promise<boolean>;
  toggleAlert: (alertId: string, isActive: boolean) => Promise<boolean>;
  snoozeAlert: (alertId: string, hours: number) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
  getAlertsBySymbol: (symbol: string) => Alert[];
  getActiveAlertsCount: () => number;
  getTriggeredAlertsCount: () => number;
}

export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const {
    userId,
    symbol,
    autoRefresh = true,
    subscribeToRealtime = true
  } = options;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load alerts data
  const loadAlerts = useCallback(async () => {
    if (!userId) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [alertsData, triggersData] = await Promise.all([
        db.getUserAlerts(userId),
        db.getRecentAlertTriggers(userId, 50)
      ]);

      // Filter by symbol if specified
      const filteredAlerts = symbol 
        ? alertsData.filter(alert => alert.symbol === symbol.toUpperCase())
        : alertsData;

      setAlerts(filteredAlerts);
      setTriggers(triggersData);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  }, [userId, symbol]);

  // Refresh alerts
  const refreshAlerts = useCallback(async () => {
    await loadAlerts();
  }, [loadAlerts]);

  // Create new alert
  const createAlert = useCallback(async (alertData: Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'triggered_count' | 'last_triggered_at'>): Promise<Alert | null> => {
    try {
      setError(null);
      
      const newAlert = await db.createAlert({
        ...alertData,
        user_id: userId!,
        triggered_count: 0
      });

      if (newAlert) {
        // DISABLED: Client-side alert engine interaction
        // Server-side Edge Functions automatically pick up new alerts from database
        // await alertEngine.addAlert(newAlert);
        
        // Refresh alerts list
        await refreshAlerts();
        
        // Show success notification
        await notificationService.showInAppNotification({
          title: 'Alert Created',
          body: `Alert for ${newAlert.symbol} has been created successfully`,
          data: { type: 'success' }
        });
      }

      return newAlert;
    } catch (err) {
      console.error('Error creating alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to create alert');
      return null;
    }
  }, [userId, refreshAlerts]);

  // Update alert
  const updateAlert = useCallback(async (alertId: string, updates: Partial<Alert>): Promise<Alert | null> => {
    try {
      setError(null);
      
      const updatedAlert = await db.updateAlert(alertId, updates);

      if (updatedAlert) {
        // DISABLED: Client-side alert engine interaction
        // Server-side Edge Functions automatically detect database changes
        // await alertEngine.updateAlert(updatedAlert);
        
        // Refresh alerts list
        await refreshAlerts();
        
        // Show success notification
        await notificationService.showInAppNotification({
          title: 'Alert Updated',
          body: `Alert for ${updatedAlert.symbol} has been updated`,
          data: { type: 'success' }
        });
      }

      return updatedAlert;
    } catch (err) {
      console.error('Error updating alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to update alert');
      return null;
    }
  }, [refreshAlerts]);

  // Delete alert
  const deleteAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await db.deleteAlert(alertId);

      if (success) {
        // DISABLED: Client-side alert engine interaction
        // Server-side Edge Functions automatically handle deleted alerts
        // await alertEngine.removeAlert(alertId);
        
        // Refresh alerts list
        await refreshAlerts();
        
        // Show success notification
        await notificationService.showInAppNotification({
          title: 'Alert Deleted',
          body: 'Alert has been deleted successfully',
          data: { type: 'success' }
        });
      }

      return success;
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
      return false;
    }
  }, [refreshAlerts]);

  // Toggle alert active state
  const toggleAlert = useCallback(async (alertId: string, isActive: boolean): Promise<boolean> => {
    try {
      setError(null);
      
      const success = await db.toggleAlert(alertId, isActive);

      if (success) {
        // DISABLED: Client-side alert engine interaction
        // Server-side Edge Functions automatically detect active state changes
        // const alert = alerts.find(a => a.id === alertId);
        // if (alert) {
        //   await alertEngine.updateAlert({ ...alert, is_active: isActive });
        // }
        
        // Refresh alerts list
        await refreshAlerts();
        
        // Show notification
        await notificationService.showInAppNotification({
          title: `Alert ${isActive ? 'Enabled' : 'Disabled'}`,
          body: `Alert has been ${isActive ? 'enabled' : 'disabled'}`,
          data: { type: 'info' }
        });
      }

      return success;
    } catch (err) {
      console.error('Error toggling alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle alert');
      return false;
    }
  }, [alerts, refreshAlerts]);

  // Snooze alert
  const snoozeAlert = useCallback(async (alertId: string, hours: number): Promise<boolean> => {
    try {
      setError(null);
      
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);
      
      const success = await db.snoozeAlert(alertId, snoozeUntil);

      if (success) {
        // Refresh alerts list
        await refreshAlerts();
        
        // Show notification
        await notificationService.showInAppNotification({
          title: 'Alert Snoozed',
          body: `Alert has been snoozed for ${hours} hour${hours !== 1 ? 's' : ''}`,
          data: { type: 'info' }
        });
      }

      return success;
    } catch (err) {
      console.error('Error snoozing alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to snooze alert');
      return false;
    }
  }, [refreshAlerts]);

  // Get alerts by symbol
  const getAlertsBySymbol = useCallback((targetSymbol: string): Alert[] => {
    return alerts.filter(alert => alert.symbol === targetSymbol.toUpperCase());
  }, [alerts]);

  // Get active alerts count
  const getActiveAlertsCount = useCallback((): number => {
    return alerts.filter(alert => alert.is_active).length;
  }, [alerts]);

  // Get triggered alerts count
  const getTriggeredAlertsCount = useCallback((): number => {
    return alerts.filter(alert => alert.triggered_count > 0).length;
  }, [alerts]);

  // Load alerts on mount and when dependencies change
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Set up real-time alert event listening (ZERO POLLING)
  useEffect(() => {
    if (!subscribeToRealtime || !userId) return;

    console.log(`📡 Starting realtime alert listening for user: ${userId}`);
    
    // Start listening for alert events via Realtime
    alertRealtimeListener.startListening(userId);

    // Add custom event handler for alert triggers
    const handleAlertTriggered = (event: AlertRealtimeEvent) => {
      console.log('🚨 Alert event received:', event);
      
      // Refresh alerts and triggers when events are received
      refreshAlerts();
      
      // Optional: Custom handling per symbol
      if (symbol && event.symbol !== symbol.toUpperCase()) {
        return; // Skip if not for current symbol
      }
    };

    // Register event handler
    alertRealtimeListener.addEventListener('alert_triggered', handleAlertTriggered);

    // Cleanup function
    return () => {
      console.log(`📡 Stopping realtime alert listening for user: ${userId}`);
      alertRealtimeListener.removeEventListener('alert_triggered', handleAlertTriggered);
      alertRealtimeListener.stopListening();
    };
  }, [userId, subscribeToRealtime, refreshAlerts, symbol]);

  // Auto-refresh alerts periodically
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      refreshAlerts();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [autoRefresh, userId, refreshAlerts]);

  return {
    alerts,
    triggers,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    snoozeAlert,
    refreshAlerts,
    getAlertsBySymbol,
    getActiveAlertsCount,
    getTriggeredAlertsCount
  };
}