// Logs Dashboard for viewing and analyzing system logs
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Bug, Info, AlertTriangle, RefreshCw, Trash2, Download } from 'lucide-react';
import logger, { LogLevel, setDebugMode, isDebugMode } from '@/lib/logger';
import { format } from 'date-fns';

interface LogEntry {
  timestamp: string;
  level: string;
  levelName?: string;
  message: string;
  metadata?: Record<string, any>;
  context?: Record<string, any>;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  recentErrors: Array<{
    timestamp: string;
    message: string;
    url?: string;
  }>;
  apiCalls: Record<string, number>;
}

export default function LogsDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugMode, setDebugModeState] = useState(isDebugMode());
  const [showLocalLogs, setShowLocalLogs] = useState(true);

  // Fetch logs from server
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/logs?limit=200');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      logger.error('Failed to fetch logs', { error });
    }
    setLoading(false);
  }, []);

  // Fetch log statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/logs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      logger.error('Failed to fetch log stats', { error });
    }
  }, []);

  // Load logs on mount
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs, fetchStats]);

  // Get local logs
  const getLocalLogs = (): LogEntry[] => {
    return logger.getLogs().map(log => ({
      timestamp: log.timestamp,
      level: LogLevel[log.level].toLowerCase(),
      levelName: log.levelName,
      message: log.message,
      context: log.context,
    }));
  };

  // Combined logs
  const allLogs = showLocalLogs 
    ? [...logs, ...getLocalLogs()].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    : logs;

  // Filter logs
  const filteredLogs = allLogs
    .filter(log => filter === 'all' || log.level === filter)
    .filter(log => 
      search === '' || 
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.context || log.metadata).toLowerCase().includes(search.toLowerCase())
    );

  // Clear logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs?')) return;
    
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      logger.clearLogs();
      fetchLogs();
      fetchStats();
    } catch (error) {
      logger.error('Failed to clear logs', { error });
    }
  };

  // Export logs
  const handleExportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle debug mode
  const handleDebugModeToggle = (enabled: boolean) => {
    setDebugMode(enabled);
    setDebugModeState(enabled);
    logger.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Get level icon
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warn': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'debug': return <Bug className="w-4 h-4" />;
      default: return null;
    }
  };

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500';
      case 'warn': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      case 'debug': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Logs Dashboard</h1>
        <p className="text-muted-foreground">Monitor and analyze system logs</p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh">Auto-refresh</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="local-logs"
                checked={showLocalLogs}
                onCheckedChange={setShowLocalLogs}
              />
              <Label htmlFor="local-logs">Show local logs</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="debug-mode"
                checked={debugMode}
                onCheckedChange={handleDebugModeToggle}
              />
              <Label htmlFor="debug-mode">Debug mode</Label>
            </div>
            
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchLogs();
                  fetchStats();
                }}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearLogs}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats.byLevel.error || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(stats.apiCalls).reduce((a, b) => a + b, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="outline">
                  Client: {stats.bySource.client || 0}
                </Badge>
                <Badge variant="outline">
                  Server: {stats.bySource.server || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Logs</TabsTrigger>
          <TabsTrigger value="errors">Errors Only</TabsTrigger>
          <TabsTrigger value="api">API Calls</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <LogEntryComponent key={index} log={log} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                Recent errors and exceptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs
                    .filter(log => log.level === 'error')
                    .map((log, index) => (
                      <LogEntryComponent key={index} log={log} />
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Call Logs</CardTitle>
              <CardDescription>
                External API requests and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs
                    .filter(log => 
                      log.context?.type === 'http-request' || 
                      log.context?.type === 'http-response' ||
                      log.metadata?.provider
                    )
                    .map((log, index) => (
                      <LogEntryComponent key={index} log={log} />
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="auth">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Logs</CardTitle>
              <CardDescription>
                Login attempts and auth events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full">
                <div className="space-y-2">
                  {filteredLogs
                    .filter(log => 
                      log.context?.type === 'auth' ||
                      log.message.toLowerCase().includes('auth') ||
                      log.message.includes('401')
                    )
                    .map((log, index) => (
                      <LogEntryComponent key={index} log={log} />
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Log Entry Component
function LogEntryComponent({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warn': return <AlertTriangle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
      case 'debug': return <Bug className="w-4 h-4" />;
      default: return null;
    }
  };
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-50 border-red-200';
      case 'warn': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'debug': return 'text-gray-500 bg-gray-50 border-gray-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };
  
  const metadata = log.metadata || log.context || {};
  
  return (
    <div 
      className={`border rounded-lg p-3 transition-colors cursor-pointer ${getLevelColor(log.level)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getLevelIcon(log.level)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">
              {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
            </span>
            <Badge variant="outline" className="text-xs">
              {log.level.toUpperCase()}
            </Badge>
            {metadata.type && (
              <Badge variant="secondary" className="text-xs">
                {metadata.type}
              </Badge>
            )}
            {metadata.status && (
              <Badge 
                variant={metadata.status >= 400 ? 'destructive' : 'default'} 
                className="text-xs"
              >
                {metadata.status}
              </Badge>
            )}
          </div>
          
          <div className="font-mono text-sm break-all">
            {log.message}
          </div>
          
          {expanded && Object.keys(metadata).length > 0 && (
            <div className="mt-2 text-xs">
              <pre className="bg-black/5 p-2 rounded overflow-x-auto">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}