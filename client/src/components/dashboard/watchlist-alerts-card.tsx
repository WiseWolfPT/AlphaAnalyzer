import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Bell, AlertCircle, ArrowUp, ArrowDown, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WatchlistAlert {
  symbol: string;
  name: string;
  price: number;
  alertType: 'price_target' | 'volume_spike' | 'news_impact' | 'technical_signal';
  alertMessage: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export function WatchlistAlertsCard() {
  const [, setLocation] = useLocation();
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data for watchlist alerts - in real implementation, fetch from API
    const mockAlerts: WatchlistAlert[] = [
      {
        symbol: "AAPL",
        name: "Apple Inc",
        price: 175.43,
        alertType: "price_target",
        alertMessage: "Hit resistance at $175",
        severity: "medium",
        timestamp: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      },
      {
        symbol: "TSLA",
        name: "Tesla Inc",
        price: 248.73,
        alertType: "volume_spike",
        alertMessage: "Volume 3x above average",
        severity: "high",
        timestamp: new Date(Date.now() - 32 * 60 * 1000) // 32 minutes ago
      },
      {
        symbol: "MSFT",
        name: "Microsoft",
        price: 378.85,
        alertType: "technical_signal",
        alertMessage: "Bullish divergence on RSI",
        severity: "medium",
        timestamp: new Date(Date.now() - 45 * 60 * 1000) // 45 minutes ago
      },
      {
        symbol: "GOOGL",
        name: "Alphabet",
        price: 141.28,
        alertType: "news_impact",
        alertMessage: "Earnings beat estimates",
        severity: "high",
        timestamp: new Date(Date.now() - 62 * 60 * 1000) // 1 hour ago
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setAlerts(mockAlerts);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price_target':
        return <ArrowUp className="w-4 h-4" />;
      case 'volume_spike':
        return <Volume2 className="w-4 h-4" />;
      case 'news_impact':
        return <AlertCircle className="w-4 h-4" />;
      case 'technical_signal':
        return <ArrowDown className="w-4 h-4" />;
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
    const now = new Date();
    const diff = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const handleViewStock = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
  };

  const handleViewAllAlerts = () => {
    setLocation("/watchlists?tab=alerts");
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
                <p className="text-xs text-muted-foreground">
                  {getTimeAgo(alert.timestamp)}
                </p>
                <div className={cn("w-2 h-2 rounded-full", 
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