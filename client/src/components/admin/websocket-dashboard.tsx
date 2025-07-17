import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { 
  Activity,
  Wifi,
  WifiOff,
  Users,
  TrendingUp,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';

interface WebSocketStats {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectedAt?: string;
  disconnectedAt?: string;
  reconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  lastMessage?: string;
  subscriptionsActive: string[];
  latency?: number;
}

interface WebSocketHealth {
  status: string;
  connected: boolean;
  subscriptions: number;
  uptime: number;
  pollingFallback: boolean;
}

interface WebSocketConnection {
  id: string;
  session_id: string;
  user_id?: string;
  connection_type: string;
  status: string;
  connected_at: string;
  disconnected_at?: string;
  last_ping?: string;
  subscriptions: string[];
  ip_address?: string;
  reconnect_count: number;
  messages_sent: number;
  messages_received: number;
}

interface WebSocketSubscription {
  id: string;
  session_id: string;
  symbol: string;
  subscribed_at: string;
  is_active: boolean;
  subscription_source: string;
  update_count: number;
}

interface RealtimeQuote {
  symbol: string;
  price: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  source: string;
  updated_at: string;
}

interface WebSocketDashboardData {
  service: {
    stats: WebSocketStats;
    health: WebSocketHealth;
    subscriptions: string[];
    isConnected: boolean;
  };
  database: {
    stats: any;
    recentConnections: WebSocketConnection[];
    recentQuotes: RealtimeQuote[];
  };
  timestamp: string;
}

export function WebSocketDashboard() {
  const [dashboardData, setDashboardData] = useState<WebSocketDashboardData | null>(null);
  const [connections, setConnections] = useState<WebSocketConnection[]>([]);
  const [subscriptions, setSubscriptions] = useState<WebSocketSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newSubscription, setNewSubscription] = useState('');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/websocket/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch connections
  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/admin/websocket/connections?limit=20');
      if (!response.ok) throw new Error('Failed to fetch connections');
      const data = await response.json();
      setConnections(data.connections);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/websocket/subscriptions');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchConnections(),
        fetchSubscriptions()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchConnections();
      fetchSubscriptions();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Restart WebSocket service
  const restartService = async () => {
    try {
      const response = await fetch('/api/admin/websocket/restart', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to restart service');
      
      // Refresh data after restart
      setTimeout(() => {
        fetchDashboardData();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart service');
    }
  };

  // Subscribe to symbol
  const subscribeToSymbol = async () => {
    if (!newSubscription.trim()) return;

    try {
      const response = await fetch('/api/admin/websocket/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: newSubscription.toUpperCase() })
      });
      
      if (!response.ok) throw new Error('Failed to subscribe');
      
      setNewSubscription('');
      fetchDashboardData();
      fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    }
  };

  // Unsubscribe from symbol
  const unsubscribeFromSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`/api/admin/websocket/subscribe/${symbol}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to unsubscribe');
      
      fetchDashboardData();
      fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
    }
  };

  // Format uptime
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2 text-lg">Loading WebSocket dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WebSocket Dashboard</h1>
          <p className="text-muted-foreground">Real-time market data streaming monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoRefresh ? 'Stop' : 'Start'} Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchDashboardData();
              fetchConnections();
              fetchSubscriptions();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={restartService}
          >
            <RefreshCw className="w-4 h-4" />
            Restart Service
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              {dashboardData.service.isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(dashboardData.service.stats.status)}`} />
                <span className="text-2xl font-bold capitalize">
                  {dashboardData.service.stats.status}
                </span>
              </div>
              {dashboardData.service.health.pollingFallback && (
                <Badge variant="secondary" className="mt-2">Polling Fallback</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.service.subscriptions.length}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.database.stats.unique_symbols || 0} unique symbols
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <Activity className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.service.stats.messagesReceived}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.service.stats.messagesSent} sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Users className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUptime(dashboardData.service.health.uptime)}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.service.stats.reconnectAttempts} reconnects
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Information */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="quotes">Live Quotes</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Symbol Subscriptions</CardTitle>
              <CardDescription>Manage active symbol subscriptions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Subscription */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="newSymbol">Symbol:</Label>
                <Input
                  id="newSymbol"
                  value={newSubscription}
                  onChange={(e) => setNewSubscription(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="w-32"
                />
                <Button onClick={subscribeToSymbol} size="sm">
                  <Plus className="w-4 h-4" />
                  Subscribe
                </Button>
              </div>

              {/* Active Subscriptions */}
              {dashboardData && (
                <div className="space-y-2">
                  <h4 className="font-medium">Active Subscriptions ({dashboardData.service.subscriptions.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {dashboardData.service.subscriptions.map((symbol) => (
                      <Badge key={symbol} variant="secondary" className="flex items-center space-x-1">
                        <span>{symbol}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => unsubscribeFromSymbol(symbol)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Connections</CardTitle>
              <CardDescription>WebSocket connection activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(conn.status)}`} />
                        <span className="font-medium">{conn.session_id.slice(0, 8)}...</span>
                        <Badge variant="outline">{conn.connection_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        IP: {conn.ip_address} • {conn.subscriptions.length} subscriptions
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Connected: {new Date(conn.connected_at).toLocaleString()}</p>
                      <p>Messages: {conn.messages_received}↓ {conn.messages_sent}↑</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Updates</CardTitle>
              <CardDescription>Latest real-time market data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardData?.database.recentQuotes.map((quote, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{quote.symbol}</span>
                      <Badge variant="outline" className="ml-2">{quote.source}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${quote.price.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.updated_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health</CardTitle>
              <CardDescription>Detailed service health information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Service Status</Label>
                      <p className="text-lg font-medium capitalize">{dashboardData.service.health.status}</p>
                    </div>
                    <div>
                      <Label>Connection State</Label>
                      <p className="text-lg font-medium">
                        {dashboardData.service.isConnected ? 'Connected' : 'Disconnected'}
                      </p>
                    </div>
                    <div>
                      <Label>Latency</Label>
                      <p className="text-lg font-medium">
                        {dashboardData.service.stats.latency ? `${dashboardData.service.stats.latency}ms` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label>Last Message</Label>
                      <p className="text-sm text-muted-foreground">
                        {dashboardData.service.stats.lastMessage 
                          ? new Date(dashboardData.service.stats.lastMessage).toLocaleString()
                          : 'None'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Connection Quality */}
                  <div>
                    <Label>Connection Quality</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Reconnect Attempts</span>
                        <span>{dashboardData.service.stats.reconnectAttempts}</span>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (dashboardData.service.stats.reconnectAttempts * 10))} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}