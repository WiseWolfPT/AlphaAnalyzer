import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Bell, AlertCircle, ArrowUp, ArrowDown, Volume2, TrendingUp, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/hooks/use-alerts";
import { db, auth, type AlertTrigger } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

interface WatchlistAlert {
  symbol: string;
  alertType: 'price_above' | 'price_below' | 'volume_spike' | 'news_sentiment' | 'technical_indicator';
  alertMessage: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  triggerId: string;
  triggerValue: number;
}

export function WatchlistAlertsCard() {
  const [, setLocation] = useLocation();
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await auth.getCurrentUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const { triggers } = useAlerts({ 
    userId: userId || undefined,
    subscribeToRealtime: true 
  });

  useEffect(() => {
    const loadRecentTriggers = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get recent alert triggers (last 24 hours)
        const recentTriggers = await db.getRecentAlertTriggers(userId, 10);
        
        // Convert triggers to watchlist alerts format
        const watchlistAlerts: WatchlistAlert[] = recentTriggers.map(trigger => {
          const triggerData = trigger.trigger_data ? JSON.parse(trigger.trigger_data) : {};
          
          return {
            symbol: (trigger as any).alerts?.symbol || 'UNKNOWN',
            alertType: (trigger as any).alerts?.alert_type || 'price_above',
            alertMessage: triggerData.message || 'Alert triggered',
            severity: getSeverityFromTrigger(trigger),
            timestamp: new Date(trigger.triggered_at),
            triggerId: trigger.id,
            triggerValue: trigger.trigger_value
          };
        });

        setAlerts(watchlistAlerts);
      } catch (error) {
        console.error('Error loading alert triggers:', error);
        setAlerts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentTriggers();
  }, [userId, triggers]);

  // Helper function to determine severity from trigger
  const getSeverityFromTrigger = (trigger: AlertTrigger): 'low' | 'medium' | 'high' => {
    const triggerData = trigger.trigger_data ? JSON.parse(trigger.trigger_data) : {};
    
    // High severity for large price movements or volume spikes
    if (triggerData.type === 'volume_spike' && triggerData.volume_ratio > 3) return 'high';
    if (triggerData.type === 'price_above' || triggerData.type === 'price_below') {
      const percentChange = Math.abs((trigger.trigger_value - (triggerData.threshold || 0)) / (triggerData.threshold || 1));
      if (percentChange > 0.05) return 'high'; // 5% move
      if (percentChange > 0.02) return 'medium'; // 2% move
      return 'low';
    }
    
    return 'medium';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_above':
        return <TrendingUp className="w-4 h-4" />;
      case 'price_below':
        return <ArrowDown className="w-4 h-4" />;
      case 'volume_spike':
        return <Volume2 className="w-4 h-4" />;
      case 'news_sentiment':
        return <Newspaper className="w-4 h-4" />;
      case 'technical_indicator':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const handleViewStock = (symbol: string) => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleViewAllAlerts = () => {
    setLocation("/alerts");
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Eye className="w-5 h-5" />
            Watchlist Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                  <div className="h-3 bg-muted rounded animate-pulse w-32" />
                </div>
                <div className="h-3 bg-muted rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Eye className="w-5 h-5" />
            Watchlist Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewAllAlerts}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active alerts</p>
            <p className="text-xs">Add stocks to your watchlist to get alerts</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div 
              key={`${alert.symbol}-${index}`}
              onClick={() => handleViewStock(alert.symbol)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-100/30 dark:hover:bg-blue-800/20 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-1 rounded-full", getSeverityColor(alert.severity))}>
                  {getAlertIcon(alert.alertType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300 text-xs">
                      {alert.symbol}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.alertMessage}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium">
                  ${alert.triggerValue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getTimeAgo(alert.timestamp)}
                </p>
                <div className={cn("w-2 h-2 rounded-full mt-1", 
                  alert.severity === 'high' ? 'bg-red-500' :
                  alert.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-blue-500'
                )} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}