import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Clock, HardDrive, Zap, AlertTriangle, TrendingUp, Cpu } from 'lucide-react';
import { usePerformanceMonitor, useMemoryMonitor, PerformanceUtils } from '@/hooks/use-performance-monitor';

interface PerformanceDebuggerProps {
  show?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function PerformanceDebugger({ 
  show = process.env.NODE_ENV === 'development' && !window.location.search.includes('hide-debug'),
  position = 'bottom-right'
}: PerformanceDebuggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceLog, setPerformanceLog] = useState<any[]>([]);
  const memoryStats = useMemoryMonitor(1000);
  
  // Global performance monitoring
  const { metrics } = usePerformanceMonitor('Global', {
    trackMemory: true,
    onReport: (metrics) => {
      setPerformanceLog(prev => [...prev.slice(-19), {
        ...metrics,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      }]);
    }
  });

  useEffect(() => {
    // Listen for performance entries
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.duration > 10) {
            setPerformanceLog(prev => [...prev.slice(-19), {
              type: 'measure',
              name: entry.name,
              duration: entry.duration,
              timestamp: Date.now(),
              id: Math.random().toString(36).substr(2, 9)
            }]);
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
      return () => observer.disconnect();
    }
  }, []);

  const clearLogs = () => setPerformanceLog([]);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getMemoryColor = () => {
    if (memoryStats.current > 200) return 'destructive';
    if (memoryStats.current > 100) return 'secondary';
    return 'default';
  };

  const getRenderTimeColor = (time: number) => {
    if (time > 50) return 'destructive';
    if (time > 16) return 'secondary';
    return 'default';
  };

  const exportPerformanceData = () => {
    const data = {
      memoryStats,
      performanceLog,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!show) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      {/* Floating Performance Button */}
      {!isVisible && (
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm border shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance
          <Badge variant={getMemoryColor()} className="ml-2">
            {memoryStats.current.toFixed(0)}MB
          </Badge>
        </Button>
      )}

      {/* Performance Panel */}
      {isVisible && (
        <Card className="w-96 bg-background/95 backdrop-blur-sm border shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Performance Monitor
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={exportPerformanceData}
                  title="Export Performance Data"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsVisible(false)}
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Tabs defaultValue="metrics" className="w-full">
              <TabsList className="grid w-full grid-cols-3 text-xs">
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="memory">Memory</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="metrics" className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Render Time</span>
                      <Badge variant={getRenderTimeColor(metrics.renderTime)}>
                        {metrics.renderTime.toFixed(1)}ms
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Re-renders</span>
                      <Badge variant="outline">
                        {metrics.reRenderCount}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Memory</span>
                      <Badge variant={getMemoryColor()}>
                        {memoryStats.current.toFixed(0)}MB
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Trend</span>
                      <Badge variant={
                        memoryStats.trend === 'increasing' ? 'destructive' :
                        memoryStats.trend === 'decreasing' ? 'default' : 'secondary'
                      }>
                        {memoryStats.trend}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Component Counts */}
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Component Renders</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {Object.entries(metrics.componentCounts).map(([component, count]) => (
                      <div key={component} className="flex justify-between text-xs">
                        <span className="truncate">{component}</span>
                        <Badge variant="outline" className="text-xs h-4">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="memory" className="space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span className="font-medium">Memory Usage</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current</span>
                      <span>{memoryStats.current.toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peak</span>
                      <span>{memoryStats.peak.toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trend</span>
                      <Badge variant={
                        memoryStats.trend === 'increasing' ? 'destructive' : 'default'
                      }>
                        {memoryStats.trend}
                      </Badge>
                    </div>
                  </div>

                  {memoryStats.trend === 'increasing' && memoryStats.current > 100 && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">Potential memory leak detected</span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="logs" className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Performance Log</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearLogs} className="text-xs h-6">
                    Clear
                  </Button>
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {performanceLog.slice(-10).reverse().map((log) => (
                    <div 
                      key={log.id} 
                      className="text-xs p-2 bg-muted/50 rounded flex justify-between items-center"
                    >
                      <div className="truncate flex-1">
                        <div className="font-medium">
                          {log.name || log.type || 'Render'}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge variant={getRenderTimeColor(log.duration || log.renderTime)} className="text-xs">
                        {(log.duration || log.renderTime || 0).toFixed(1)}ms
                      </Badge>
                    </div>
                  ))}
                  
                  {performanceLog.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-4">
                      No performance issues detected
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => PerformanceUtils.reportMemoryUsage('Manual Check')}
                className="text-xs flex-1"
              >
                <HardDrive className="h-3 w-3 mr-1" />
                Check Memory
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  performance.mark('manual-measurement-start');
                  setTimeout(() => {
                    performance.mark('manual-measurement-end');
                    performance.measure('Manual Measurement', 'manual-measurement-start', 'manual-measurement-end');
                  }, 10);
                }}
                className="text-xs flex-1"
              >
                <Zap className="h-3 w-3 mr-1" />
                Test Measure
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Performance insights component for production monitoring
export function PerformanceInsights() {
  const [insights, setInsights] = useState<string[]>([]);
  const memoryStats = useMemoryMonitor(5000);
  
  useEffect(() => {
    const newInsights: string[] = [];
    
    if (memoryStats.current > 200) {
      newInsights.push('High memory usage detected. Consider implementing virtualization.');
    }
    
    if (memoryStats.trend === 'increasing') {
      newInsights.push('Memory usage is increasing. Check for potential memory leaks.');
    }
    
    // Check for slow navigation
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            if (navEntry.loadEventEnd - navEntry.startTime > 3000) {
              newInsights.push('Slow page load detected. Consider code splitting and preloading.');
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
      return () => observer.disconnect();
    }
    
    setInsights(newInsights);
  }, [memoryStats]);

  if (insights.length === 0 || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Performance Insights
              </div>
              <div className="space-y-1">
                {insights.map((insight, index) => (
                  <div key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}