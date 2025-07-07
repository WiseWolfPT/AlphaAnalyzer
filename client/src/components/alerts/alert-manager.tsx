/**
 * ALERT MANAGER COMPONENT
 * Frontend interface for managing user alerts in Alfalyzer
 * AGENTE 8: Complete notification system implementation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Edit, Plus, Bell, BellOff, TrendingUp, TrendingDown, Volume2, Calendar, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface AlertCondition {
  field: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne' | 'contains' | 'pct_change';
  value: number | string;
  symbol?: string;
  timeframe?: string;
}

interface AlertFrequency {
  type: 'immediate' | '5min' | '15min' | '1hour' | 'daily' | 'weekly' | 'custom';
  value?: number;
  cooldown?: number;
  maxPerDay?: number;
}

interface AlertConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  type: 'price_change' | 'price_threshold' | 'volume_spike' | 'earnings_reminder' | 'portfolio_performance';
  conditions: AlertCondition[];
  frequency: AlertFrequency;
  channels: ('in_app' | 'email' | 'push' | 'webhook')[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

interface AlertTrigger {
  id: string;
  alertId: string;
  triggeredAt: string;
  currentValue: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  symbol?: string;
  acknowledged: boolean;
  alert_name: string;
  alert_type: string;
}

const AlertManager: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [triggers, setTriggers] = useState<AlertTrigger[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertConfig | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'alerts' | 'history'>('alerts');
  const { toast } = useToast();

  // New alert form state
  const [newAlert, setNewAlert] = useState<Partial<AlertConfig>>({
    name: '',
    description: '',
    type: 'price_change',
    enabled: true,
    conditions: [{
      field: 'changePercent',
      operator: 'gt',
      value: 5,
      symbol: 'AAPL'
    }],
    frequency: {
      type: '15min',
      cooldown: 60,
      maxPerDay: 10
    },
    channels: ['in_app']
  });

  useEffect(() => {
    loadAlerts();
    loadTriggers();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/alerts');
      const data = await response.json();
      
      if (response.ok) {
        setAlerts(data.alerts);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load alerts',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alerts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTriggers = async () => {
    try {
      const response = await fetch('/api/alerts/triggers?limit=20');
      const data = await response.json();
      
      if (response.ok) {
        setTriggers(data.triggers);
      }
    } catch (error) {
      console.error('Error loading triggers:', error);
    }
  };

  const createAlert = async () => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAlert)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Alert created successfully'
        });
        setShowCreateDialog(false);
        setNewAlert({
          name: '',
          description: '',
          type: 'price_change',
          enabled: true,
          conditions: [{
            field: 'changePercent',
            operator: 'gt',
            value: 5,
            symbol: 'AAPL'
          }],
          frequency: {
            type: '15min',
            cooldown: 60,
            maxPerDay: 10
          },
          channels: ['in_app']
        });
        loadAlerts();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create alert',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to create alert',
        variant: 'destructive'
      });
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Alert deleted successfully'
        });
        loadAlerts();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete alert',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        variant: 'destructive'
      });
    }
  };

  const toggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Alert ${enabled ? 'enabled' : 'disabled'} successfully`
        });
        loadAlerts();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update alert',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert',
        variant: 'destructive'
      });
    }
  };

  const acknowledgeAlert = async (triggerId: string) => {
    try {
      const response = await fetch(`/api/alerts/triggers/${triggerId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Alert acknowledged'
        });
        loadTriggers();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to acknowledge alert',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive'
      });
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_change':
      case 'price_threshold':
        return <TrendingUp className="h-4 w-4" />;
      case 'volume_spike':
        return <Volume2 className="h-4 w-4" />;
      case 'earnings_reminder':
        return <Calendar className="h-4 w-4" />;
      case 'portfolio_performance':
        return <PieChart className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatFrequency = (frequency: AlertFrequency) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alert Manager</h1>
          <p className="text-muted-foreground">
            Manage your stock and portfolio alerts
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Alert</DialogTitle>
              <DialogDescription>
                Set up a new alert to monitor your investments
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Alert Name</Label>
                  <Input
                    id="name"
                    value={newAlert.name || ''}
                    onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                    placeholder="e.g., AAPL Price Alert"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Alert Type</Label>
                  <Select
                    value={newAlert.type}
                    onValueChange={(value) => setNewAlert({ ...newAlert, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_change">Price Change</SelectItem>
                      <SelectItem value="price_threshold">Price Threshold</SelectItem>
                      <SelectItem value="volume_spike">Volume Spike</SelectItem>
                      <SelectItem value="earnings_reminder">Earnings Reminder</SelectItem>
                      <SelectItem value="portfolio_performance">Portfolio Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newAlert.description || ''}
                  onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                  placeholder="Describe when this alert should trigger..."
                  rows={2}
                />
              </div>

              {/* Conditions */}
              <div className="space-y-2">
                <Label>Alert Conditions</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      value={newAlert.conditions?.[0]?.symbol || ''}
                      onChange={(e) => {
                        const conditions = [...(newAlert.conditions || [])];
                        conditions[0] = { ...conditions[0], symbol: e.target.value };
                        setNewAlert({ ...newAlert, conditions });
                      }}
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="operator">Operator</Label>
                    <Select
                      value={newAlert.conditions?.[0]?.operator}
                      onValueChange={(value) => {
                        const conditions = [...(newAlert.conditions || [])];
                        conditions[0] = { ...conditions[0], operator: value as any };
                        setNewAlert({ ...newAlert, conditions });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="gte">Greater or equal</SelectItem>
                        <SelectItem value="lte">Less or equal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={newAlert.conditions?.[0]?.value || ''}
                      onChange={(e) => {
                        const conditions = [...(newAlert.conditions || [])];
                        conditions[0] = { ...conditions[0], value: Number(e.target.value) };
                        setNewAlert({ ...newAlert, conditions });
                      }}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="field">Field</Label>
                    <Select
                      value={newAlert.conditions?.[0]?.field}
                      onValueChange={(value) => {
                        const conditions = [...(newAlert.conditions || [])];
                        conditions[0] = { ...conditions[0], field: value };
                        setNewAlert({ ...newAlert, conditions });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="changePercent">Change %</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="frequency">Check Frequency</Label>
                  <Select
                    value={newAlert.frequency?.type}
                    onValueChange={(value) => setNewAlert({ 
                      ...newAlert, 
                      frequency: { ...newAlert.frequency!, type: value as any }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="5min">Every 5 minutes</SelectItem>
                      <SelectItem value="15min">Every 15 minutes</SelectItem>
                      <SelectItem value="1hour">Every hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cooldown">Cooldown (minutes)</Label>
                  <Input
                    id="cooldown"
                    type="number"
                    value={newAlert.frequency?.cooldown || ''}
                    onChange={(e) => setNewAlert({ 
                      ...newAlert, 
                      frequency: { ...newAlert.frequency!, cooldown: Number(e.target.value) }
                    })}
                    placeholder="60"
                  />
                </div>
              </div>

              {/* Notification Channels */}
              <div>
                <Label>Notification Channels</Label>
                <div className="flex space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="in_app"
                      checked={newAlert.channels?.includes('in_app')}
                      onChange={(e) => {
                        const channels = newAlert.channels || [];
                        if (e.target.checked) {
                          setNewAlert({ ...newAlert, channels: [...channels, 'in_app'] });
                        } else {
                          setNewAlert({ 
                            ...newAlert, 
                            channels: channels.filter(c => c !== 'in_app') 
                          });
                        }
                      }}
                    />
                    <Label htmlFor="in_app">In-App</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="email"
                      checked={newAlert.channels?.includes('email')}
                      onChange={(e) => {
                        const channels = newAlert.channels || [];
                        if (e.target.checked) {
                          setNewAlert({ ...newAlert, channels: [...channels, 'email'] });
                        } else {
                          setNewAlert({ 
                            ...newAlert, 
                            channels: channels.filter(c => c !== 'email') 
                          });
                        }
                      }}
                    />
                    <Label htmlFor="email">Email</Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={newAlert.enabled}
                  onCheckedChange={(checked) => setNewAlert({ ...newAlert, enabled: checked })}
                />
                <Label htmlFor="enabled">Enable alert immediately</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createAlert}>
                  Create Alert
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'alerts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Alert History ({triggers.filter(t => !t.acknowledged).length} unread)
        </button>
      </div>

      {/* Content */}
      {activeTab === 'alerts' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No alerts configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first alert to start monitoring your investments
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <h3 className="font-semibold">{alert.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {alert.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.enabled ? 'default' : 'secondary'}>
                        {alert.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline">
                        {alert.triggerCount} triggers
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm capitalize">{alert.type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Frequency</p>
                      <p className="text-sm">{formatFrequency(alert.frequency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Channels</p>
                      <p className="text-sm">{alert.channels.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Triggered</p>
                      <p className="text-sm">
                        {alert.lastTriggered 
                          ? new Date(alert.lastTriggered).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                      />
                      <span className="text-sm">
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {triggers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No alert history</h3>
                <p className="text-muted-foreground text-center">
                  Your alert triggers will appear here when they are activated
                </p>
              </CardContent>
            </Card>
          ) : (
            triggers.map((trigger) => (
              <Card key={trigger.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(trigger.severity)}`} />
                      <div>
                        <h3 className="font-semibold">{trigger.alert_name}</h3>
                        <p className="text-sm text-muted-foreground">{trigger.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {trigger.severity}
                      </Badge>
                      {trigger.symbol && (
                        <Badge variant="secondary">
                          {trigger.symbol}
                        </Badge>
                      )}
                      {!trigger.acknowledged && (
                        <Button
                          size="sm"
                          onClick={() => acknowledgeAlert(trigger.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Triggered</p>
                      <p className="text-sm">
                        {new Date(trigger.triggeredAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Current Value</p>
                      <p className="text-sm">{trigger.currentValue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="text-sm capitalize">{trigger.alert_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm">
                        {trigger.acknowledged ? '✅ Acknowledged' : '🔔 Pending'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AlertManager;