import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Building2, ArrowRight, TrendingUp, TrendingDown, Rotate3D } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectorData {
  name: string;
  symbol: string;
  performance: number;
  volume: number;
  topStock: {
    symbol: string;
    change: number;
  };
  color: string;
}

export function SectorPerformanceCard() {
  const [, setLocation] = useLocation();
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'best' | 'worst'>('best');

  useEffect(() => {
    // Mock sector data - in real implementation, fetch from API
    const mockSectors: SectorData[] = [
      {
        name: "Technology",
        symbol: "XLK",
        performance: 2.34,
        volume: 1.2,
        topStock: { symbol: "NVDA", change: 5.67 },
        color: "text-blue-600 dark:text-blue-400"
      },
      {
        name: "Healthcare",
        symbol: "XLV",
        performance: 1.89,
        volume: 0.8,
        topStock: { symbol: "UNH", change: 3.21 },
        color: "text-green-600 dark:text-green-400"
      },
      {
        name: "Financials",
        symbol: "XLF",
        performance: 1.45,
        volume: 1.1,
        topStock: { symbol: "JPM", change: 2.89 },
        color: "text-purple-600 dark:text-purple-400"
      },
      {
        name: "Consumer Disc",
        symbol: "XLY",
        performance: -0.76,
        volume: 0.9,
        topStock: { symbol: "TSLA", change: -1.23 },
        color: "text-orange-600 dark:text-orange-400"
      },
      {
        name: "Energy",
        symbol: "XLE",
        performance: -1.34,
        volume: 1.3,
        topStock: { symbol: "XOM", change: -2.45 },
        color: "text-red-600 dark:text-red-400"
      },
      {
        name: "Real Estate",
        symbol: "XLRE",
        performance: -2.11,
        volume: 0.7,
        topStock: { symbol: "PLD", change: -3.12 },
        color: "text-pink-600 dark:text-pink-400"
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setSectorData(mockSectors);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getSortedSectors = () => {
    if (viewMode === 'best') {
      return [...sectorData].sort((a, b) => b.performance - a.performance).slice(0, 4);
    } else {
      return [...sectorData].sort((a, b) => a.performance - b.performance).slice(0, 4);
    }
  };

  const handleViewSector = (symbol: string) => {
    setLocation(`/sectors/${symbol}`);
  };

  const handleViewAllSectors = () => {
    setLocation("/sectors");
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'best' ? 'worst' : 'best');
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Sector Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  <div className="h-2 bg-muted rounded animate-pulse w-full" />
                </div>
                <div className="h-4 bg-muted rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedSectors = getSortedSectors();

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200/50 dark:border-emerald-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-5 h-5" />
            Sector Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleViewMode}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50"
            >
              <Rotate3D className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewAllSectors}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50"
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs">
            {viewMode === 'best' ? 'Top Performers' : 'Worst Performers'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedSectors.map((sector, index) => (
          <div 
            key={sector.symbol}
            onClick={() => handleViewSector(sector.symbol)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-100/30 dark:hover:bg-emerald-800/20 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="flex flex-col items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 text-xs">
                    {sector.symbol}
                  </Badge>
                  {sector.performance >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {sector.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 max-w-[60px]">
                    <Progress 
                      value={Math.abs(sector.performance) * 10} 
                      className="h-1"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Vol: {sector.volume.toFixed(1)}x
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("font-semibold text-sm", 
                sector.performance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {sector.performance >= 0 ? "+" : ""}{sector.performance.toFixed(2)}%
              </p>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {sector.topStock.symbol}
                </Badge>
                <span className={cn("text-xs", 
                  sector.topStock.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {sector.topStock.change >= 0 ? "+" : ""}{sector.topStock.change.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}