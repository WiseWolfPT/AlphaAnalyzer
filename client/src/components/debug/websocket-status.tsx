// WebSocket Connection Status Dashboard
import React, { useState } from 'react';
import { useConnectionHealth } from '@/hooks/use-financial-stream';
import { websocketManager, DEFAULT_FINANCIAL_SOURCES, ConnectionState } from '@/lib/websocket-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  RefreshCw, 
  Activity,
  Clock,
  Zap,
  TrendingUp,
  Signal,
  Globe
} from 'lucide-react';

export function WebSocketStatus() {
  const {
    connectionStates,
    metrics,
    healthScore,
    getSourceHealth,
    totalSources,
    connectedSources,
    failedSources
  } = useConnectionHealth();

  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize sources if not already done
  React.useEffect(() => {
    if (totalSources === 0) {
      DEFAULT_FINANCIAL_SOURCES.forEach(source => {
        websocketManager.addDataSource(source);
      });
    }
  }, [totalSources]);

  const handleConnectAll = async () => {
    setIsConnecting(true);
    try {
      await websocketManager.connectAll();
    } catch (error) {
      console.error('Failed to connect all sources:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectAll = () => {
    websocketManager.disconnectAll();
  };

  const handleReconnectSource = async (sourceId: string) => {
    try {
      await websocketManager.connect(sourceId);
    } catch (error) {
      console.error(`Failed to reconnect ${sourceId}:`, error);
    }
  };

  const getStateIcon = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return <Wifi className="h-4 w-4 text-green-500" />;
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case ConnectionState.FAILED:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case ConnectionState.PAUSED:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStateBadgeVariant = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return 'default';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'secondary';
      case ConnectionState.FAILED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatLatency = (latency: number) => {
    if (latency === 0) return '--';
    return `${latency.toFixed(0)}ms`;
  };

  const formatUptime = (uptime: number) => {
    if (uptime === 0) return '--';
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connection Health</CardTitle>
          <div className="flex items-center gap-2">
            <Signal className="h-4 w-4 text-muted-foreground" />
            <Badge variant={healthScore > 80 ? 'default' : healthScore > 50 ? 'secondary' : 'destructive'}>
              {healthScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">{connectedSources}/{totalSources}</span>
            <span className="text-sm text-muted-foreground">Sources Connected</span>
          </div>
          <Progress value={healthScore} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{connectedSources} connected</span>
            <span>{failedSources} failed</span>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Connection Control
          </CardTitle>
          <CardDescription>
            Manage WebSocket connections to financial data sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={handleConnectAll} 
              disabled={isConnecting || connectedSources === totalSources}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              Connect All
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDisconnectAll}
              disabled={connectedSources === 0}
              className="flex items-center gap-2"
            >
              <WifiOff className="h-4 w-4" />
              Disconnect All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Source Information */}
      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sources" className="space-y-4">
          {Array.from(connectionStates.entries()).map(([sourceId, state]) => {
            const sourceHealth = getSourceHealth(sourceId);
            
            return (
              <Card key={sourceId}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    {getStateIcon(state)}
                    <CardTitle className="text-base">{sourceId}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStateBadgeVariant(state)}>
                      {state}
                    </Badge>
                    {state !== ConnectionState.CONNECTED && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReconnectSource(sourceId)}
                      >
                        Reconnect
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {sourceHealth && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Latency:</span>
                        <span className="font-medium">{formatLatency(sourceHealth.latency)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="font-medium">{formatUptime(sourceHealth.uptime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Messages:</span>
                        <span className="font-medium">{sourceHealth.messageCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Error Rate:</span>
                        <span className={`font-medium ${sourceHealth.errorRate > 0.1 ? 'text-red-500' : 'text-green-500'}`}>
                          {(sourceHealth.errorRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(metrics.entries()).map(([sourceId, metric]) => (
              <Card key={sourceId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{sourceId}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Throughput</span>
                    <span className="text-sm font-medium">{metric.throughput.toFixed(1)} msg/s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Latency</span>
                    <span className="text-sm font-medium">{formatLatency(metric.latency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Success Rate</span>
                    <span className="text-sm font-medium text-green-500">
                      {((1 - metric.errorRate) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Last Message</span>
                    <span className="text-sm font-medium">
                      {metric.lastMessageTime > 0 
                        ? new Date(metric.lastMessageTime).toLocaleTimeString()
                        : '--'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}