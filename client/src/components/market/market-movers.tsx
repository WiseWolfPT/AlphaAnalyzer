import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, TrendingDown, Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface MarketMoversData {
  gainers: MarketMover[];
  losers: MarketMover[];
  mostActive: MarketMover[];
  timestamp: string;
}

export const MarketMovers: React.FC = () => {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<MarketMoversData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers');

  const fetchMarketMovers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/market-data/market/movers', {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch market movers: ${response.status}`);
      }
      
      const moversData = await response.json();
      setData(moversData);
    } catch (err) {
      console.error('Error fetching market movers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch market movers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketMovers();
    // Refresh every 5 minutes
    const interval = setInterval(fetchMarketMovers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStockClick = (symbol: string) => {
    setLocation(`/stock/${symbol}`);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  const renderMoverCard = (mover: MarketMover, index: number) => {
    const isPositive = mover.changePercent >= 0;
    
    return (
      <div
        key={mover.symbol}
        className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
        onClick={() => handleStockClick(mover.symbol)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold">
            {index + 1}
          </div>
          <div>
            <div className="font-semibold">{mover.symbol}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
              {mover.name}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-semibold">${mover.price.toFixed(2)}</div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium justify-end",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
            {isPositive ? '+' : ''}{mover.changePercent.toFixed(2)}%
          </div>
          {activeTab === 'active' && (
            <div className="text-xs text-muted-foreground">
              Vol: {formatVolume(mover.volume)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-12 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );

  const getCurrentMovers = () => {
    if (!data) return [];
    switch (activeTab) {
      case 'gainers':
        return data.gainers;
      case 'losers':
        return data.losers;
      case 'active':
        return data.mostActive;
      default:
        return [];
    }
  };

  return (
    <Card className="border-teya-green/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teya-green" />
            Market Movers
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchMarketMovers}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'gainers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('gainers')}
            className={activeTab === 'gainers' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Top Gainers
          </Button>
          <Button
            variant={activeTab === 'losers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('losers')}
            className={activeTab === 'losers' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            Top Losers
          </Button>
          <Button
            variant={activeTab === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('active')}
            className={activeTab === 'active' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <Activity className="w-4 h-4 mr-1" />
            Most Active
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMarketMovers}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : loading ? (
          renderLoadingState()
        ) : data && getCurrentMovers().length > 0 ? (
          <div className="space-y-2">
            {getCurrentMovers().map((mover, index) => renderMoverCard(mover, index))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No market movers available</p>
          </div>
        )}
        
        {data && !loading && !error && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Last updated: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};