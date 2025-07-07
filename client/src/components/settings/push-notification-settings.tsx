import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, CheckCircle, XCircle, AlertCircle, TestTube, Smartphone } from 'lucide-react';
import { notificationService } from '@/services/notification-service';
import { toast } from 'sonner';

interface PushNotificationSettingsProps {
  className?: string;
}

export function PushNotificationSettings({ className }: PushNotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  useEffect(() => {
    // Check initial state
    setIsSupported(notificationService.isSupported());
    setPermission(notificationService.getPermissionStatus());
    setIsEnabled(notificationService.canSendPush());
    
    // Fetch subscription count
    fetchSubscriptionCount();
  }, []);

  const fetchSubscriptionCount = async () => {
    try {
      const response = await fetch('/api/push/subscriptions', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptionCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch subscription count:', error);
    }
  };

  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await notificationService.enablePushNotifications();
      
      if (success) {
        setPermission('granted');
        setIsEnabled(true);
        await fetchSubscriptionCount();
        toast.success('Push notifications enabled successfully!');
      } else {
        toast.error('Failed to enable push notifications');
      }
    } catch (error) {
      console.error('Enable notifications error:', error);
      toast.error('Error enabling notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsLoading(true);
    try {
      await notificationService.sendTestPushNotification();
      toast.success('Test notification sent! Check your browser/device.');
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionIcon = () => {
    switch (permission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-100 text-green-800">Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">Not Set</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Browser notifications for stock alerts and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-muted-foreground">
              Push notifications are not supported in this browser
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Real-time browser notifications for stock alerts and market updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getPermissionIcon()}
            <div>
              <div className="font-medium">Permission Status</div>
              <div className="text-sm text-muted-foreground">
                Current browser notification permission
              </div>
            </div>
          </div>
          {getPermissionBadge()}
        </div>

        {/* Active Subscriptions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium">Active Devices</div>
              <div className="text-sm text-muted-foreground">
                Devices subscribed to notifications
              </div>
            </div>
          </div>
          <Badge variant="outline">{subscriptionCount} device(s)</Badge>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-muted-foreground">
                Receive notifications for stock alerts
              </div>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              if (checked && permission !== 'granted') {
                handleEnableNotifications();
              }
            }}
            disabled={permission === 'denied' || isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {permission !== 'granted' && (
            <Button 
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Enabling...' : 'Enable Push Notifications'}
            </Button>
          )}

          {permission === 'granted' && (
            <Button 
              variant="outline"
              onClick={handleSendTestNotification}
              disabled={isLoading}
              className="w-full"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            • Notifications work even when Alfalyzer is closed
          </p>
          <p>
            • You'll receive alerts for price changes, volume spikes, and news
          </p>
          <p>
            • You can manage notifications in your browser settings
          </p>
        </div>

        {/* Browser Blocked Warning */}
        {permission === 'denied' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-red-800">Notifications Blocked</div>
                <div className="text-red-700 mt-1">
                  You've blocked notifications for this site. To enable them:
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Click the lock icon in your address bar</li>
                    <li>Select "Allow" for notifications</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}