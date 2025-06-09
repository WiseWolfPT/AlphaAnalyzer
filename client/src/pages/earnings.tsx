import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from "date-fns";
import type { Earnings } from "@shared/schema";

export default function EarningsCalendar() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [marketCapFilter, setMarketCapFilter] = useState("all");
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday

  const { data: earnings } = useQuery<Earnings[]>({
    queryKey: ["/api/earnings"],
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

  const getEarningsForDay = (day: Date, time: 'before_open' | 'after_close') => {
    // Mock earnings data for demonstration
    const mockEarnings = [
      { symbol: 'AAPL', day: 1, time: 'after_close', estimatedEPS: 2.11, estimatedRevenue: 125000000000 },
      { symbol: 'MSFT', day: 2, time: 'after_close', estimatedEPS: 2.78, estimatedRevenue: 58000000000 },
      { symbol: 'GOOGL', day: 2, time: 'before_open', estimatedEPS: 1.45, estimatedRevenue: 86000000000 },
      { symbol: 'AMZN', day: 3, time: 'after_close', estimatedEPS: 0.85, estimatedRevenue: 149000000000 },
      { symbol: 'TSLA', day: 4, time: 'after_close', estimatedEPS: 0.75, estimatedRevenue: 24000000000 },
      { symbol: 'META', day: 4, time: 'before_open', estimatedEPS: 3.20, estimatedRevenue: 40000000000 },
    ];

    const dayOfWeek = day.getDay();
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday (0) to 7

    return mockEarnings.filter(e => e.day === adjustedDay && e.time === time);
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
              <div className="grid grid-cols-5 gap-4">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="space-y-4">
                    {/* Day Header */}
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">{format(day, 'EEE')}</div>
                      <div className="w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
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
                          <div
                            key={idx}
                            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => setSelectedStock(earning.symbol)}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-medium">{earning.symbol.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium">{earning.symbol}</span>
                          </div>
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
                          <div
                            key={idx}
                            className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => setSelectedStock(earning.symbol)}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-medium">{earning.symbol.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium">{earning.symbol}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Panel */}
            {selectedStock && (
              <div className="w-80">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
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
                        <Calendar className="h-4 w-4" />
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
