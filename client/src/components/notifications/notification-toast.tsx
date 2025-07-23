import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotificationStore, useNotifications } from '@/stores/notification-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  X, CheckCircle, AlertCircle, AlertTriangle, Info,
  TrendingUp, TrendingDown, Bell, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationToast() {
  const notifications = useNotifications();
  const { removeNotification, position } = useNotificationStore();
  
  // Create portal container
  useEffect(() => {
    const portalId = 'notification-portal';
    let portal = document.getElementById(portalId);
    
    if (!portal) {
      portal = document.createElement('div');
      portal.id = portalId;
      document.body.appendChild(portal);
    }
    
    return () => {
      if (portal && portal.childNodes.length === 0) {
        portal.remove();
      }
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getIcon = (type: string, category?: string) => {
    if (category === 'price') {
      return type === 'success' ? TrendingUp : TrendingDown;
    }
    
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
      default:
        return Info;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const portal = document.getElementById('notification-portal');
  if (!portal || notifications.length === 0) return null;

  return createPortal(
    <div className={cn(
      'fixed z-50 flex flex-col gap-2 max-w-md w-full',
      getPositionClasses()
    )}>
      {notifications.slice(0, 5).map((notification) => {
        const Icon = getIcon(notification.type, notification.category);
        
        return (
          <Card
            key={notification.id}
            className={cn(
              'overflow-hidden transition-all duration-300 animate-in slide-in-from-top-2',
              getTypeStyles(notification.type)
            )}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', getIconStyles(notification.type))} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-2 -mt-1"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {notification.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant={action.type === 'primary' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            action.action();
                            removeNotification(notification.id);
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {notification.duration && notification.duration > 0 && (
              <NotificationProgress
                duration={notification.duration}
                onComplete={() => removeNotification(notification.id)}
              />
            )}
          </Card>
        );
      })}
      
      {notifications.length > 5 && (
        <Card className="p-2 text-center text-sm text-muted-foreground">
          +{notifications.length - 5} more notifications
        </Card>
      )}
    </div>,
    portal
  );
}

// Progress bar for auto-dismiss notifications
function NotificationProgress({ 
  duration, 
  onComplete 
}: { 
  duration: number; 
  onComplete: () => void;
}) {
  const [progress, setProgress] = React.useState(100);
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 10);
    
    return () => clearInterval(interval);
  }, [duration, onComplete]);
  
  return (
    <div className="h-1 bg-black/10 dark:bg-white/10">
      <div 
        className="h-full bg-black/20 dark:bg-white/20 transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// Hook to show notifications imperatively
export function useNotification() {
  const { showSuccess, showError, showInfo, showWarning } = useNotificationStore();
  
  return {
    success: (title: string, message: string) => showSuccess(title, message),
    error: (title: string, message: string) => showError(title, message),
    info: (title: string, message: string) => showInfo(title, message),
    warning: (title: string, message: string) => showWarning(title, message),
  };
}