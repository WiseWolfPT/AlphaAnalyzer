import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  X,
  TrendingUp,
  Volume2,
  Newspaper,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationService, type InAppNotification } from '@/services/notification-service';
import { useLocation } from 'wouter';

interface NotificationCenterProps {
  className?: string;
}

const notificationIcons = {
  info: Bell,
  success: TrendingUp,
  warning: AlertCircle,
  error: X
};

const notificationColors = {
  info: 'text-blue-600 bg-blue-100',
  success: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  error: 'text-red-600 bg-red-100'
};

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe((newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    });

    // Initial load
    setNotifications(notificationService.getInAppNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    return unsubscribe;
  }, []);

  const handleMarkAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleRemoveNotification = (notificationId: string) => {
    notificationService.removeNotification(notificationId);
  };

  const handleClearAll = () => {
    notificationService.clearAllNotifications();
  };

  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Execute notification actions
    if (notification.actions && notification.actions.length > 0) {
      notification.actions[0].action();
    }

    setIsOpen(false);
  };

  const renderNotification = (notification: InAppNotification) => {
    const Icon = notificationIcons[notification.type];
    const colorClass = notificationColors[notification.type];

    return (
      <Card
        key={notification.id}
        className={`mb-2 cursor-pointer transition-colors hover:bg-muted/50 ${
          !notification.read ? 'border-primary/50' : 'border-border'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-full flex-shrink-0 ${colorClass}`}>
              <Icon className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`text-sm font-medium truncate ${
                  !notification.read ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {notification.title}
                </h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveNotification(notification.id);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className={`text-xs mb-2 line-clamp-2 ${
                !notification.read ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {notification.message}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                </span>
                {notification.actions && notification.actions.length > 0 && (
                  <div className="flex gap-1">
                    {notification.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                          handleMarkAsRead(notification.id);
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
        </CardContent>
      </Card>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-8 px-2 text-xs"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLocation('/settings?tab=notifications');
                  setIsOpen(false);
                }}
                className="h-8 w-8 p-0"
              >
                <Settings className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(renderNotification)}
              </div>
            )}
          </div>
        </ScrollArea>

        {notifications.length > 5 && (
          <div className="p-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocation('/alerts?tab=history');
                setIsOpen(false);
              }}
              className="w-full text-xs"
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Toast notification component for immediate alerts
export function NotificationToast() {
  const [toastNotifications, setToastNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notifications) => {
      // Show only the most recent unread notification as toast
      const recentUnread = notifications.filter(n => !n.read).slice(0, 1);
      setToastNotifications(recentUnread);
    });

    return unsubscribe;
  }, []);

  const handleToastDismiss = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    setToastNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  if (toastNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toastNotifications.map((notification) => {
        const Icon = notificationIcons[notification.type];
        const colorClass = notificationColors[notification.type];

        return (
          <Card
            key={notification.id}
            className="w-80 shadow-lg border-l-4 animate-in slide-in-from-right"
            style={{
              borderLeftColor: notification.type === 'success' ? '#10b981' :
                              notification.type === 'warning' ? '#f59e0b' :
                              notification.type === 'error' ? '#ef4444' : '#3b82f6'
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleToastDismiss(notification.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {notification.message}
                  </p>
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="flex gap-2">
                      {notification.actions.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={() => {
                            action.action();
                            handleToastDismiss(notification.id);
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}