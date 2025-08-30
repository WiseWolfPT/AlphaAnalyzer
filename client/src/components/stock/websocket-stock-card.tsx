import React, { useRef, useEffect, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, ArrowDownIcon, Activity, Wifi, WifiOff, Plus, Calculator, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface WebSocketStockCardProps {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  initialPrice?: number;
  onRemove?: () => void;
  onQuoteUpdate?: (quote: any) => void;
}

// Memoized card to prevent unnecessary re-renders
export const WebSocketStockCard = memo(({
  symbol,
  companyName,
  industry,
  sector,
  initialPrice = 0,
  onRemove,
  onQuoteUpdate,
}: WebSocketStockCardProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Refs for DOM manipulation without re-render
  const priceRef = useRef<HTMLSpanElement>(null);
  const changeRef = useRef<HTMLSpanElement>(null);
  const changePercentRef = useRef<HTMLSpanElement>(null);
  const changeIconRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLSpanElement>(null);
  const timestampRef = useRef<HTMLSpanElement>(null);
  const connectionIconRef = useRef<HTMLDivElement>(null);
  
  // Store last values to detect changes
  const lastValuesRef = useRef({
    price: initialPrice,
    change: 0,
    changePercent: 0,
    volume: 0,
    connected: false,
  });

  // Handle quote updates via direct DOM manipulation
  const updateQuoteDisplay = (quote: any) => {
    // Update price with animation
    if (priceRef.current && quote.price != null) {
      const newPrice = Number(quote.price);
      const oldPrice = lastValuesRef.current.price;
      
      priceRef.current.textContent = `$${newPrice.toFixed(2)}`;
      
      // Add flash animation if price changed
      if (newPrice !== oldPrice) {
        priceRef.current.classList.remove('price-flash');
        void priceRef.current.offsetWidth; // Force reflow
        priceRef.current.classList.add('price-flash');
        lastValuesRef.current.price = newPrice;
      }
    }
    
    // Update change and change percent
    if (changeRef.current && quote.change != null) {
      const change = Number(quote.change);
      changeRef.current.textContent = change >= 0 ? `+$${Math.abs(change).toFixed(2)}` : `-$${Math.abs(change).toFixed(2)}`;
      changeRef.current.className = change >= 0 ? 'text-green-600' : 'text-red-600';
    }
    
    if (changePercentRef.current && quote.changePercent != null) {
      const changePercent = Number(quote.changePercent);
      changePercentRef.current.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
      changePercentRef.current.className = cn(
        'font-medium text-sm',
        changePercent >= 0 ? 'text-green-600' : 'text-red-600'
      );
    }
    
    // Update arrow icon
    if (changeIconRef.current && quote.changePercent != null) {
      const changePercent = Number(quote.changePercent);
      const isPositive = changePercent >= 0;
      changeIconRef.current.innerHTML = ''; // Clear existing
      
      const IconComponent = isPositive ? ArrowUpIcon : ArrowDownIcon;
      const icon = document.createElement('div');
      icon.className = cn(
        'w-4 h-4',
        isPositive ? 'text-green-600' : 'text-red-600'
      );
      // Simple SVG render
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('class', icon.className);
      
      if (isPositive) {
        svg.innerHTML = '<line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>';
      } else {
        svg.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline>';
      }
      
      changeIconRef.current.appendChild(svg);
    }
    
    // Update volume
    if (volumeRef.current && quote.volume != null) {
      const volume = Number(quote.volume);
      volumeRef.current.textContent = volume > 1000000 
        ? `${(volume / 1000000).toFixed(1)}M`
        : volume > 1000 
        ? `${(volume / 1000).toFixed(1)}K`
        : volume.toString();
    }
    
    // Update timestamp
    if (timestampRef.current) {
      const now = new Date();
      timestampRef.current.textContent = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }
    
    // Call external update handler if provided
    if (onQuoteUpdate) {
      onQuoteUpdate(quote);
    }
  };

  // Update connection status
  const updateConnectionStatus = (connected: boolean) => {
    if (connectionIconRef.current && connected !== lastValuesRef.current.connected) {
      connectionIconRef.current.innerHTML = '';
      const icon = document.createElement('div');
      icon.className = cn(
        'w-3 h-3',
        connected ? 'text-green-500' : 'text-gray-400'
      );
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('class', icon.className);
      
      // WiFi icon paths
      svg.innerHTML = connected 
        ? '<path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>'
        : '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>';
      
      connectionIconRef.current.appendChild(svg);
      lastValuesRef.current.connected = connected;
    }
  };

  // Expose update methods via window for Socket.IO to call
  useEffect(() => {
    // Store update function in a global map
    if (!window.__stockCardUpdaters) {
      window.__stockCardUpdaters = new Map();
    }
    
    window.__stockCardUpdaters.set(symbol, {
      updateQuote: updateQuoteDisplay,
      updateConnection: updateConnectionStatus,
    });
    
    return () => {
      window.__stockCardUpdaters?.delete(symbol);
    };
  }, [symbol]);

  const handleClick = () => {
    setLocation(`/stock/${symbol}`);
  };

  const handleAddToWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    // Get existing watchlist from localStorage
    const watchlistStr = localStorage.getItem('watchlist');
    const watchlist = watchlistStr ? JSON.parse(watchlistStr) : [];
    
    // Check if already in watchlist
    if (watchlist.some((item: any) => item.symbol === symbol)) {
      toast({
        title: "Already in Watchlist",
        description: `${symbol} is already in your watchlist`,
        variant: "default",
      });
      return;
    }
    
    // Add to watchlist
    watchlist.push({ symbol, name: companyName });
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    toast({
      title: "Added to Watchlist",
      description: `${symbol} has been added to your watchlist`,
      variant: "default",
    });
  };

  const handleCalculateIV = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setLocation(`/intrinsic-value?symbol=${symbol}`);
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-border/50 hover:border-teya-green/30 overflow-hidden relative websocket-card"
      onClick={handleClick}
      data-symbol={symbol}
    >
      {/* Connection indicator */}
      <div className="absolute top-2 right-2 z-10" ref={connectionIconRef}>
        <WifiOff className="w-3 h-3 text-gray-400" />
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {symbol.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{symbol}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {companyName}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span ref={priceRef} className="text-lg font-bold price-display">
              ${initialPrice.toFixed(2)}
            </span>
            <div className="flex items-center gap-1">
              <div ref={changeIconRef}>
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
              <span ref={changePercentRef} className="font-medium text-sm text-muted-foreground">
                0.00%
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span ref={changeRef}>$0.00</span>
            <div className="flex items-center gap-2">
              <span>Vol: <span ref={volumeRef}>-</span></span>
            </div>
          </div>
          
          {/* Quick Actions - appear on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-teya-green/10 hover:text-teya-green"
              onClick={handleAddToWatchlist}
            >
              <Plus className="w-3 h-3 mr-1" />
              Watchlist
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-blue-500/10 hover:text-blue-400"
              onClick={handleCalculateIV}
            >
              <Calculator className="w-3 h-3 mr-1" />
              IV Calc
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 px-2 text-xs hover:bg-orange-500/10 hover:text-orange-400"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/stock/${symbol}/charts`);
              }}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Charts
            </Button>
          </div>
          
          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="text-xs">
                {sector}
              </Badge>
              <span ref={timestampRef} className="text-xs text-muted-foreground">
                --:--:--
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      
      <style jsx>{`
        @keyframes priceFlash {
          0% { background-color: transparent; }
          50% { background-color: rgba(34, 197, 94, 0.2); }
          100% { background-color: transparent; }
        }
        
        .price-flash {
          animation: priceFlash 0.5s ease-in-out;
        }
      `}</style>
    </Card>
  );
});

WebSocketStockCard.displayName = 'WebSocketStockCard';

// Declare global type for TypeScript
declare global {
  interface Window {
    __stockCardUpdaters?: Map<string, {
      updateQuote: (quote: any) => void;
      updateConnection: (connected: boolean) => void;
    }>;
  }
}