import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  TrendingUp, 
  Volume2, 
  Newspaper, 
  AlertCircle,
  MoreHorizontal,
  Play,
  Pause
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { db, realtime, type Alert as AlertType, type AlertTrigger } from '@/lib/supabase';
import { AlertForm } from './alert-form';
import { formatDistanceToNow } from 'date-fns';
import { alertEngine } from '@/services/alert-engine';

interface AlertManagementProps {
  userId: string;
}

interface AlertWithTriggers extends AlertType {
  recent_triggers?: AlertTrigger[];
}

const alertTypeIcons = {
  price_above: TrendingUp,
  price_below: TrendingUp,
  volume_spike: Volume2,
  news_sentiment: Newspaper,
  technical_indicator: AlertCircle
};

const alertTypeColors = {
  price_above: 'text-green-600',
  price_below: 'text-red-600',
  volume_spike: 'text-blue-600',
  news_sentiment: 'text-purple-600',
  technical_indicator: 'text-orange-600'
};

export function AlertManagement({ userId }: AlertManagementProps) {
  const [alerts, setAlerts] = useState<AlertWithTriggers[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertType | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  useEffect(() => {
    loadAlerts();
    loadRecentTriggers();
    
    // Subscribe to real-time updates
    const alertsChannel = realtime.subscribeToAlerts(userId, handleAlertUpdate);
    const triggersChannel = realtime.subscribeToAlertTriggers(userId, handleTriggerUpdate);

    return () => {
      realtime.unsubscribe(alertsChannel);
      realtime.unsubscribe(triggersChannel);
    };
  }, [userId]);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const alertsData = await db.getUserAlerts(userId);
      
      // Load recent triggers for each alert
      const alertsWithTriggers = await Promise.all(
        alertsData.map(async (alert) => {
          const recentTriggers = await db.getAlertTriggers(alert.id);
          return { ...alert, recent_triggers: recentTriggers.slice(0, 3) };
        })
      );
      
      setAlerts(alertsWithTriggers);
    } catch (err) {
      console.error('Error loading alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentTriggers = async () => {
    try {
      const triggersData = await db.getRecentAlertTriggers(userId, 20);
      setTriggers(triggersData);
    } catch (err) {
      console.error('Error loading triggers:', err);
    }
  };

  const handleAlertUpdate = (payload: any) => {
    console.log('Alert update:', payload);
    loadAlerts(); // Refresh alerts on any change
  };

  const handleTriggerUpdate = (payload: any) => {
    console.log('Trigger update:', payload);
    loadRecentTriggers(); // Refresh triggers on new triggers
  };

  const handleCreateAlert = async (alert: AlertType) => {
    setShowCreateForm(false);
    setSelectedSymbol('');
    await loadAlerts();
    
    // Add to alert engine
    await alertEngine.addAlert(alert);
  };

  const handleEditAlert = async (alert: AlertType) => {
    setEditingAlert(null);
    await loadAlerts();
    
    // Update in alert engine
    await alertEngine.updateAlert(alert);
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      await db.toggleAlert(alertId, isActive);
      
      // Update alert engine
      const updatedAlert = alerts.find(a => a.id === alertId);
      if (updatedAlert) {
        await alertEngine.updateAlert({ ...updatedAlert, is_active: isActive });
      }
      
      await loadAlerts();
    } catch (err) {
      console.error('Error toggling alert:', err);
      setError('Failed to update alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await db.deleteAlert(alertId);
      await alertEngine.removeAlert(alertId);
      await loadAlerts();
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert');
    }
  };

  const handleSnoozeAlert = async (alertId: string, hours: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);
      await db.snoozeAlert(alertId, snoozeUntil);
      await loadAlerts();
    } catch (err) {
      console.error('Error snoozing alert:', err);
      setError('Failed to snooze alert');
    }
  };

  const getAlertTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getThresholdDisplay = (alert: AlertType) => {
    if (!alert.threshold_value) return 'N/A';
    
    switch (alert.alert_type) {
      case 'price_above':
      case 'price_below':
        return `$${alert.threshold_value.toFixed(2)}`;
      case 'volume_spike':
        return `${alert.threshold_value}x`;
      case 'news_sentiment':
        return `${alert.threshold_value.toFixed(2)}`;
      case 'technical_indicator':
        return alert.threshold_value.toString();
      default:
        return alert.threshold_value.toString();
    }
  };

  const renderAlertCard = (alert: AlertWithTriggers) => {
    const Icon = alertTypeIcons[alert.alert_type];
    const iconColor = alertTypeColors[alert.alert_type];
    const isTriggered = alert.triggered_count > 0;
    const isSnoozed = alert.snooze_until && new Date(alert.snooze_until) > new Date();

    return (
      <Card key={alert.id} className={`${!alert.is_active ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {alert.symbol} - {getAlertTypeLabel(alert.alert_type)}
                </CardTitle>
                <CardDescription className="text-sm">
                  Threshold: {getThresholdDisplay(alert)}
                  {alert.threshold_operator && ` (${alert.threshold_operator})`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSnoozed && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Snoozed
                </Badge>
              )}
              {isTriggered && (
                <Badge variant="secondary" className="text-xs">
                  {alert.triggered_count} triggers
                </Badge>
              )}
              <Switch
                checked={alert.is_active}
                onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                size="sm"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingAlert(alert)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnoozeAlert(alert.id, 1)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Snooze 1h
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSnoozeAlert(alert.id, 24)}>
                    <Clock className="w-4 h-4 mr-2" />
                    Snooze 24h
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Notifications:</span>
              <div className="flex gap-1">
                {alert.notification_methods.split(',').map(method => (
                  <Badge key={method.trim()} variant="outline" className="text-xs">
                    {method.trim()}
                  </Badge>
                ))}
              </div>
            </div>
            
            {alert.last_triggered_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last triggered:</span>
                <span>{formatDistanceToNow(new Date(alert.last_triggered_at), { addSuffix: true })}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
            </div>

            {alert.recent_triggers && alert.recent_triggers.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Triggers</h4>
                <div className="space-y-1">
                  {alert.recent_triggers.map(trigger => (
                    <div key={trigger.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        ${trigger.trigger_value.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(trigger.triggered_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTriggerHistory = () => {
    if (triggers.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No alert triggers yet</p>
          <p className="text-sm">Create some alerts to see trigger history here</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {triggers.map(trigger => {
          const triggerData = trigger.trigger_data ? JSON.parse(trigger.trigger_data) : {};
          
          return (
            <Card key={trigger.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">
                      {triggerData.message || 'Alert triggered'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Value: ${trigger.trigger_value.toFixed(2)} • 
                      {formatDistanceToNow(new Date(trigger.triggered_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge 
                    variant={trigger.status === 'sent' ? 'default' : 
                             trigger.status === 'failed' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {trigger.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Alerts</h1>
          <p className="text-muted-foreground">Monitor your investments with intelligent alerts</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="history">Trigger History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No alerts configured</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first alert to get notified about price changes and market events
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {alerts.map(renderAlertCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          {renderTriggerHistory()}
        </TabsContent>
      </Tabs>

      {/* Create Alert Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Alert</DialogTitle>
            <DialogDescription>
              Set up intelligent monitoring for your investments
            </DialogDescription>
          </DialogHeader>
          <AlertForm
            symbol={selectedSymbol}
            userId={userId}
            onSuccess={handleCreateAlert}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Alert Dialog */}
      <Dialog open={!!editingAlert} onOpenChange={() => setEditingAlert(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Alert</DialogTitle>
            <DialogDescription>
              Modify your alert configuration
            </DialogDescription>
          </DialogHeader>
          {editingAlert && (
            <AlertForm
              userId={userId}
              onSuccess={handleEditAlert}
              onCancel={() => setEditingAlert(null)}
              initialData={editingAlert}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}