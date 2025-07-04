import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface EarningsEvent {
  symbol: string;
  name: string;
  date: Date;
  time: 'before-market' | 'after-market' | 'during-market';
  expectedMove: number;
  previousEps: number;
  estimatedEps: number;
  isWatched: boolean;
}

export function EarningsCard() {
  const [, setLocation] = useLocation();
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ROADMAP V4: Enhanced realistic earnings data
    console.log('📅 Loading upcoming earnings events...');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // More dynamic earnings data with realistic variations
    const generateRealisticEarnings = (): EarningsEvent[] => {
      const baseEvents = [
        {
          symbol: "NVDA",
          name: "NVIDIA Corp",
          date: today,
          time: "after-market" as const,
          baseExpectedMove: 7.2,
          basePreviousEps: 5.16,
          baseEstimatedEps: 5.65,
          isWatched: true
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc",
          date: tomorrow,
          time: "after-market" as const,
          baseExpectedMove: 5.8,
          basePreviousEps: 1.64,
          baseEstimatedEps: 1.71,
          isWatched: true
        },
        {
          symbol: "MSFT",
          name: "Microsoft",
          date: tomorrow,
          time: "before-market" as const,
          baseExpectedMove: 3.9,
          basePreviousEps: 3.30,
          baseEstimatedEps: 3.10,
          isWatched: false
        },
        {
          symbol: "TSLA",
          name: "Tesla Inc",
          date: dayAfter,
          time: "after-market" as const,
          baseExpectedMove: 9.5,
          basePreviousEps: 0.71,
          baseEstimatedEps: 0.74,
          isWatched: true
        },
        {
          symbol: "AMZN",
          name: "Amazon.com",
          date: nextWeek,
          time: "after-market" as const,
          baseExpectedMove: 6.2,
          basePreviousEps: 0.94,
          baseEstimatedEps: 1.05,
          isWatched: false
        }
      ];

      return baseEvents.map(event => ({
        symbol: event.symbol,
        name: event.name,
        date: event.date,
        time: event.time,
        expectedMove: Math.round((event.baseExpectedMove + (Math.random() - 0.5) * 2) * 100) / 100,
        previousEps: Math.round((event.basePreviousEps + (Math.random() - 0.5) * 0.2) * 100) / 100,
        estimatedEps: Math.round((event.baseEstimatedEps + (Math.random() - 0.5) * 0.15) * 100) / 100,
        isWatched: event.isWatched
      }));
    };

    // Simulate realistic API delay (500ms instead of 1s)
    setTimeout(() => {
      const earnings = generateRealisticEarnings();
      console.log('📅 Loaded', earnings.length, 'upcoming earnings events');
      setEarningsEvents(earnings);
      setIsLoading(false);
    }, 500);
  }, []);

  const getTimeLabel = (time: string) => {
    switch (time) {
      case 'before-market':
        return 'BMO';
      case 'after-market':
        return 'AMC';
      case 'during-market':
        return 'DMH';
      default:
        return 'TBD';
    }
  };

  const getTimeBadgeColor = (time: string) => {
    switch (time) {
      case 'before-market':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'after-market':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'during-market':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleViewStock = (symbol: string) => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleViewAllEarnings = () => {
    setLocation("/earnings");
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Earnings This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-16" />
                  <div className="h-3 bg-muted rounded animate-pulse w-24" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-muted rounded animate-pulse w-12" />
                  <div className="h-3 bg-muted rounded animate-pulse w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-shadow bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200/50 dark:border-indigo-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
            Earnings This Week
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewAllEarnings}
            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/50"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {earningsEvents.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No earnings this week</p>
          </div>
        ) : (
          earningsEvents.map((event, index) => (
            <div 
              key={`${event.symbol}-${index}`}
              onClick={() => handleViewStock(event.symbol)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-indigo-100/30 dark:hover:bg-indigo-800/20 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <Clock className="w-4 h-4 text-indigo-500 mb-1" />
                  <Badge className={cn("text-xs px-1 py-0", getTimeBadgeColor(event.time))}>
                    {getTimeLabel(event.time)}
                  </Badge>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300 text-xs">
                      {event.symbol}
                    </Badge>
                    {event.isWatched && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {formatDate(event.date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 mb-1">
                  {event.estimatedEps > event.previousEps ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className="text-xs font-medium">
                    Est: ${event.estimatedEps.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ±{event.expectedMove.toFixed(1)}% move
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}