import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar, ExternalLink, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { addDays, subWeeks, addWeeks, startOfWeek, endOfWeek, format } from "date-fns";

import { useStock } from "@/hooks/use-enhanced-stocks";
import { cn } from "@/lib/utils";
import { earningsService, type EarningsEvent } from "@/services/earnings-service";
import { useCachedEarnings } from "@/hooks/use-cache-data";

// Enhanced earnings item component with real data
function EarningsItem({ earning }: { earning: EarningsEvent }) {
  const [, setLocation] = useLocation();
  const { data: stock, isLoading } = useStock(earning.symbol);

  const handleClick = () => {
    setLocation(`/stock/${symbol}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg animate-pulse">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div>
            <div className="h-3 bg-gray-300 rounded w-12 mb-1"></div>
            <div className="h-2 bg-gray-300 rounded w-16"></div>
          </div>
        </div>
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg cursor-pointer transition-colors group"
      onClick={handleClick}
    >
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
          <span className="text-xs font-medium text-primary">{earning.symbol.charAt(0)}</span>
        </div>
        <div>
          <div className="text-xs font-medium group-hover:text-primary transition-colors">
            {earning.symbol}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-20">
            {earning.companyName || earning.symbol}
          </div>
          <div className="text-xs text-muted-foreground">
            EPS: ${earning.estimatedEPS?.toFixed(2) || "N/A"}
          </div>
        </div>
      </div>
      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  );
}

export default function EarningsCalendar() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [marketCapFilter, setMarketCapFilter] = useState("all");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday

  // Use cached earnings data from /api/cache/earnings
  const { data: earningsData, isLoading: earningsLoading, error: earningsError } = useQuery({
    queryKey: ["cache", "earnings-calendar", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      // For now, use mock data until cache endpoint is fully implemented
      // In production, this will fetch from /api/cache/earnings/calendar
      try {
        return await earningsService.getEarningsForWeek(weekStart, weekEnd);
      } catch (error) {
        console.error('Failed to fetch earnings:', error);
        // Return empty data structure on error
        return { 
          events: [], 
          source: 'error',
          fromCache: false 
        };
      }
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 24 * 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const goToPreviousWeek = () => {
    setCurrentWeek(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const getEarningsForDay = (day: Date, time: 'before_open' | 'after_close'): EarningsEvent[] => {
    if (!earningsData?.events) return [];

    const dayString = format(day, 'yyyy-MM-dd');
    
    return earningsData.events.filter(earning => 
      earning.reportDate === dayString && earning.time === time
    );
  };

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                Today
              </Button>
              <h1 className="text-xl font-bold">
                Earnings This Week – {format(weekStart, 'MMM dd')} → {format(weekEnd, 'MMM dd')}
              </h1>
              
              {/* Indicador de fonte de dados - Fase 3.7 */}
              <div className="flex items-center space-x-2">
                {earningsLoading ? (
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Loading...
                  </Badge>
                ) : earningsData?.fromCache ? (
                  <Badge variant="outline" className="text-xs">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Cached
                  </Badge>
                ) : earningsData?.source === 'mock' ? (
                  <Badge variant="destructive" className="text-xs">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Demo
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
                
                {earningsData && (
                  <span className="text-xs text-muted-foreground">
                    {earningsData.events.length} events
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <Input
              placeholder="Search ticker or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={marketCapFilter} onValueChange={setMarketCapFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Market Cap" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="100b+">100B+</SelectItem>
                <SelectItem value="10b+">10B+</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Watchlist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Filter</SelectItem>
                <SelectItem value="watchlist1">My Watchlist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-6">
            {/* Calendar Grid */}
            <div className="flex-1">
              {earningsLoading ? (
                <div className="grid grid-cols-5 gap-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="space-y-4">
                      <div className="text-center animate-pulse">
                        <div className="text-sm text-muted-foreground">Loading...</div>
                        <div className="w-8 h-8 mx-auto rounded-full bg-gray-300"></div>
                      </div>
                      <Card className="min-h-[120px] animate-pulse">
                        <CardHeader className="pb-2">
                          <div className="h-4 bg-gray-300 rounded w-20"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-8 bg-gray-300 rounded"></div>
                            <div className="h-8 bg-gray-300 rounded"></div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="min-h-[120px] animate-pulse">
                        <CardHeader className="pb-2">
                          <div className="h-4 bg-gray-300 rounded w-20"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="h-8 bg-gray-300 rounded"></div>
                            <div className="h-8 bg-gray-300 rounded"></div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : earningsError ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-2">⚠️ Erro ao carregar earnings</div>
                  <div className="text-sm text-muted-foreground">
                    Usando dados de demonstração
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-4">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="space-y-4">
                    {/* Day Header */}
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">{format(day, 'EEE')}</div>
                      <div className="w-8 h-8 mx-auto rounded-full bg-teya-green text-rich-black flex items-center justify-center text-sm font-medium">
                        {format(day, 'd')}
                      </div>
                    </div>

                    {/* Before Open */}
                    <Card className="min-h-[120px]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground">Before Open</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {getEarningsForDay(day, 'before_open').map((earning, idx) => (
                          <EarningsItem key={idx} earning={earning} />
                        ))}
                      </CardContent>
                    </Card>

                    {/* After Close */}
                    <Card className="min-h-[120px]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground">After Close</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {getEarningsForDay(day, 'after_close').map((earning, idx) => (
                          <EarningsItem key={idx} earning={earning} />
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}
                </div>
              )}
            </div>

            {/* Side Panel */}
            {selectedStock && (
              <div className="w-80">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-teya-green/20 flex items-center justify-center">
                        <span className="font-medium">{selectedStock.charAt(0)}</span>
                      </div>
                      <div>
                        <CardTitle>{selectedStock}</CardTitle>
                        <p className="text-sm text-muted-foreground">Company Name</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-2xl font-bold">$175.43</span>
                      <Badge className="bg-positive text-white">+2.34%</Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Next Earnings */}
                    <div>
                      <h4 className="font-medium mb-2">Next Earnings</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4" />
                        <span>Jan 25, 2024 - After Close</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Countdown: 5 days
                      </div>
                    </div>

                    {/* Estimates Chart Placeholder */}
                    <div>
                      <h4 className="font-medium mb-2">Revenue vs EPS Estimates</h4>
                      <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">Chart will be displayed here</span>
                      </div>
                    </div>

                    {/* Historical Earnings */}
                    <div>
                      <h4 className="font-medium mb-2">Historical Earnings (Last 4 Quarters)</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Q4 2023</span>
                          <div className="flex space-x-2">
                            <span className="text-muted-foreground">Est: $2.05</span>
                            <span className="text-positive">Act: $2.11</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Q3 2023</span>
                          <div className="flex space-x-2">
                            <span className="text-muted-foreground">Est: $1.89</span>
                            <span className="text-positive">Act: $1.95</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Q2 2023</span>
                          <div className="flex space-x-2">
                            <span className="text-muted-foreground">Est: $1.82</span>
                            <span className="text-negative">Act: $1.78</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Q1 2023</span>
                          <div className="flex space-x-2">
                            <span className="text-muted-foreground">Est: $1.95</span>
                            <span className="text-positive">Act: $2.02</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      Show Estimates
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
    </MainLayout>
  );
}
