import { useEffect, useState } from 'react';
import { AlertManagement } from '@/components/alerts/alert-management';
import { NotificationCenter, NotificationToast } from '@/components/alerts/notification-center';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Settings, 
  Play, 
  Pause, 
  BarChart3, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { auth } from '@/lib/supabase';
import { alertEngine } from '@/services/alert-engine';
import { notificationService } from '@/services/notification-service';

export default function AlertsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [engineStatus, setEngineStatus] = useState(alertEngine.getStatus());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const initializePage = async () => {
      try {
        // Get current user
        const { data: { user } } = await auth.getCurrentUser();
        setUserId(user?.id || null);

        // Get notification permission status
        setNotificationPermission(notificationService.getPermissionStatus());

        // Update engine status periodically
        const statusInterval = setInterval(() => {
          setEngineStatus(alertEngine.getStatus());
        }, 5000);

        setIsLoading(false);

        return () => clearInterval(statusInterval);
      } catch (error) {
        console.error('Error initializing alerts page:', error);
        setIsLoading(false);
      }
    };

    initializePage();
  }, []);

  const handleRequestNotificationPermission = async () => {
    const granted = await notificationService.requestPermission();
    setNotificationPermission(notificationService.getPermissionStatus());
    
    if (granted) {
      await notificationService.showInAppNotification({
        title: 'Notifications Enabled',
        body: 'You will now receive push notifications for your alerts',
        data: { type: 'success' }
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.sendTestNotification();
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  const handleToggleEngine = async () => {
    try {
      if (engineStatus.isRunning) {
        await alertEngine.stop();
      } else {
        await alertEngine.start();
      }
      setEngineStatus(alertEngine.getStatus());
    } catch (error) {
      console.error('Error toggling alert engine:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse w-1/4" />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              Please log in to access your smart alerts
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Notification Toast */}
      <NotificationToast />
      
      {/* Alert Engine Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Alert Engine Status
              </CardTitle>
              <CardDescription>
                Monitor and control the alert monitoring system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={engineStatus.isRunning ? 'default' : 'secondary'}>
                {engineStatus.isRunning ? (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Running
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 mr-1" />
                    Stopped
                  </>
                )}
              </Badge>
              <Switch
                checked={engineStatus.isRunning}
                onCheckedChange={handleToggleEngine}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{engineStatus.alertCount}</div>
              <div className="text-xs text-muted-foreground">Active Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{engineStatus.symbolCount}</div>
              <div className="text-xs text-muted-foreground">Monitored Symbols</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {engineStatus.config.checkInterval / 1000}s
              </div>
              <div className="text-xs text-muted-foreground">Check Interval</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {engineStatus.lastCheck ? new Date(engineStatus.lastCheck).toLocaleTimeString() : 'Never'}
              </div>
              <div className="text-xs text-muted-foreground">Last Check</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure how you receive alert notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Push Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Receive browser notifications when alerts trigger
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={notificationPermission === 'granted' ? 'default' : 'secondary'}>
                {notificationPermission === 'granted' ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Enabled
                  </>
                ) : notificationPermission === 'denied' ? (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Denied
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    Not Set
                  </>
                )}
              </Badge>
              {notificationPermission !== 'granted' && (
                <Button size="sm" onClick={handleRequestNotificationPermission}>
                  Enable
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">In-App Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Show notifications within the application
              </p>
            </div>
            <Badge variant="default">
              <CheckCircle className="w-3 h-3 mr-1" />
              Always Enabled
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Send email alerts for important triggers
              </p>
            </div>
            <Badge variant="secondary">
              <Settings className="w-3 h-3 mr-1" />
              Configure in alerts
            </Badge>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleTestNotification} className="w-full">
              Send Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Management */}
      <AlertManagement userId={userId} />
    </div>
  );
}