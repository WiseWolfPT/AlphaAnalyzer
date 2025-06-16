import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EarningsTrends } from "@/components/stock/earnings-trends";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Target, BarChart3, Activity, DollarSign, Calendar, Percent, Clock, Bell } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getMockApiData, type MockStock } from "@/lib/mock-api";
import type { Stock } from "@shared/schema";

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  
  // Get stock data directly from mock data
  const getAllStocks = () => getMockApiData('/api/stocks') as MockStock[];
  const allStocks = getAllStocks();
  
  console.log('StockDetail - URL symbol parameter:', symbol);
  console.log('StockDetail - Available stocks:', allStocks.map(s => s.symbol));
  
  const stock = symbol ? allStocks.find(s => s.symbol === symbol.toUpperCase()) : null;
  console.log('StockDetail - Found stock:', stock?.symbol || 'NOT FOUND');
  
  const isLoading = false;
  const error = null;

  // Always use the first stock as fallback for debugging
  const finalStock = stock || allStocks[0];

  // Generate mock chart data based on timeframe
  const generateChartData = (timeframe: string, basePrice: number) => {
    const periods = {
      "1D": { points: 24, interval: "hour" },
      "1W": { points: 7, interval: "day" },
      "1M": { points: 30, interval: "day" },
      "3M": { points: 90, interval: "day" },
      "6M": { points: 180, interval: "day" },
      "1Y": { points: 252, interval: "day" },
      "5Y": { points: 60, interval: "month" }
    };

    const config = periods[timeframe as keyof typeof periods] || periods["1M"];
    const data = [];
    let currentPrice = basePrice;
    
    for (let i = 0; i < config.points; i++) {
      const date = new Date();
      if (config.interval === "hour") {
        date.setHours(date.getHours() - (config.points - i));
      } else if (config.interval === "day") {
        date.setDate(date.getDate() - (config.points - i));
      } else {
        date.setMonth(date.getMonth() - (config.points - i));
      }
      
      // Add realistic price movement
      const volatility = 0.02; // 2% daily volatility
      const change = (Math.random() - 0.5) * volatility * basePrice;
      currentPrice = Math.max(currentPrice + change, basePrice * 0.7); // Don't go below 70% of base
      
      const volume = Math.floor(Math.random() * 10000000) + 1000000; // 1M - 10M volume
      
      data.push({
        date: date.toLocaleDateString(),
        price: parseFloat(currentPrice.toFixed(2)),
        volume,
        high: parseFloat((currentPrice * 1.02).toFixed(2)),
        low: parseFloat((currentPrice * 0.98).toFixed(2)),
        open: parseFloat((currentPrice * 0.995).toFixed(2)),
        close: parseFloat(currentPrice.toFixed(2))
      });
    }
    
    return data;
  };

  // Generate financial data
  const generateFinancialData = () => {
    const quarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024'];
    return quarters.map(quarter => ({
      quarter,
      revenue: Math.floor(Math.random() * 50000) + 80000, // 80B - 130B
      earnings: Math.floor(Math.random() * 15000) + 20000, // 20B - 35B
      eps: parseFloat((Math.random() * 3 + 5).toFixed(2)), // 5-8 EPS
      margin: parseFloat((Math.random() * 10 + 40).toFixed(1)) // 40-50% margin
    }));
  };

  const timeframes = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];
  const chartData = generateChartData(selectedTimeframe, parseFloat(finalStock.price));
  const financialData = generateFinancialData();
  const isPositive = parseFloat(finalStock.changePercent) >= 0;

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
              {/* Enhanced Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
                    {finalStock.logo ? (
                      <img 
                        src={finalStock.logo} 
                        alt={`${finalStock.name} logo`}
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xl font-bold text-primary">{finalStock.symbol.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h1 className="text-4xl font-bold">{finalStock.symbol}</h1>
                      <Badge variant="secondary" className="text-sm">{finalStock.sector}</Badge>
                      {finalStock.intrinsicValue && (
                        <Badge 
                          variant={parseFloat(finalStock.intrinsicValue) > parseFloat(finalStock.price) ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            parseFloat(finalStock.intrinsicValue) > parseFloat(finalStock.price)
                              ? "bg-green-500/10 text-green-600 hover:bg-green-500/20" 
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          )}
                        >
                          {parseFloat(finalStock.intrinsicValue) > parseFloat(finalStock.price) ? 'Undervalued' : 'Overvalued'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl text-muted-foreground mb-3">{finalStock.name}</p>
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-4xl font-bold">${finalStock.price}</span>
                        <div className={cn(
                          "flex items-center gap-1 px-3 py-1 rounded-lg text-lg font-semibold",
                          isPositive 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : "bg-red-500/10 text-red-500"
                        )}>
                          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {isPositive ? '+' : ''}${finalStock.change} ({finalStock.changePercent}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 mt-2 text-sm text-muted-foreground">
                      <span>Day Range: ${(parseFloat(finalStock.price) * 0.98).toFixed(2)} - ${(parseFloat(finalStock.price) * 1.02).toFixed(2)}</span>
                      <span>52W Range: ${(parseFloat(finalStock.price) * 0.85).toFixed(2)} - ${(parseFloat(finalStock.price) * 1.45).toFixed(2)}</span>
                      <span>Volume: {(Math.random() * 50 + 10).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Link href={`/stock/${symbol}/charts`}>
                    <Button variant="default" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Advanced Charts
                    </Button>
                  </Link>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Watchlist
                  </Button>
                  <Button variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Analyze
                  </Button>
                  <Button variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Alert
                  </Button>
                </div>
              </div>

              {/* Price Chart */}
              <Card className="mb-8">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Price Chart
                    </CardTitle>
                    <div className="flex space-x-1">
                      {timeframes.map((timeframe) => (
                        <Button
                          key={timeframe}
                          variant={selectedTimeframe === timeframe ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedTimeframe(timeframe)}
                          className="px-3 py-1 h-8 text-xs"
                        >
                          {timeframe}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            if (selectedTimeframe === "1D") return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#9CA3AF' }}
                          tickFormatter={(value) => `$${value}`}
                          domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`$${value}`, 'Price']}
                          labelStyle={{ color: '#1F2937' }}
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke={isPositive ? "#10b981" : "#ef4444"}
                          strokeWidth={3}
                          fill="url(#priceGradient)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Mini Panels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valuation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">P/E Ratio</span>
                      <span className="text-sm font-medium">{finalStock.peRatio || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Market Cap</span>
                      <span className="text-sm font-medium">{finalStock.marketCap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">EPS</span>
                      <span className="text-sm font-medium">${finalStock.eps || 'N/A'}</span>
                    </div>
                    {finalStock.intrinsicValue && (
                      <div className="flex justify-between pt-1 border-t border-border/50">
                        <span className="text-sm">Intrinsic Value</span>
                        <span className="text-sm font-medium text-primary">${finalStock.intrinsicValue}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">1M</span>
                      <span className="text-sm font-medium text-positive">+{(Math.random() * 10 + 2).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">3M</span>
                      <span className="text-sm font-medium text-positive">+{(Math.random() * 15 + 5).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">YTD</span>
                      <span className="text-sm font-medium text-negative">-{(Math.random() * 5 + 1).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">1Y</span>
                      <span className="text-sm font-medium text-positive">+{(Math.random() * 25 + 10).toFixed(2)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Financials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Revenue (TTM)</span>
                      <span className="text-sm font-medium">${(Math.random() * 200 + 300).toFixed(0)}B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Net Income</span>
                      <span className="text-sm font-medium">${(Math.random() * 50 + 80).toFixed(0)}B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Gross Margin</span>
                      <span className="text-sm font-medium">{(Math.random() * 10 + 40).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">ROE</span>
                      <span className="text-sm font-medium">{(Math.random() * 15 + 15).toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Next Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Date</span>
                      <span className="text-sm font-medium">Jan 25, 2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Time</span>
                      <span className="text-sm font-medium">After Close</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Est. EPS</span>
                      <span className="text-sm font-medium">${(Math.random() * 2 + 1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Est. Revenue</span>
                      <span className="text-sm font-medium">${(Math.random() * 20 + 80).toFixed(0)}B</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Technical
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">RSI</span>
                      <span className="text-sm font-medium">{(Math.random() * 40 + 30).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Beta</span>
                      <span className="text-sm font-medium">{(Math.random() * 0.8 + 0.8).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">50D MA</span>
                      <span className="text-sm font-medium">${(parseFloat(finalStock.price) * (0.95 + Math.random() * 0.1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">200D MA</span>
                      <span className="text-sm font-medium">${(parseFloat(finalStock.price) * (0.9 + Math.random() * 0.1)).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Charts Section */}
              <Tabs defaultValue="financials" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="financials">Financial Performance</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings Trends</TabsTrigger>
                  <TabsTrigger value="valuation">Valuation Analysis</TabsTrigger>
                  <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="financials" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue & Earnings Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Revenue & Earnings Growth
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={financialData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#1F2937', 
                                  border: '1px solid #374151',
                                  borderRadius: '8px'
                                }}
                              />
                              <Legend />
                              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (M)" />
                              <Bar dataKey="earnings" fill="#10b981" name="Earnings (M)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* EPS Trend Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          EPS Trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={financialData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <Tooltip 
                                formatter={(value: any) => [`$${value}`, 'EPS']}
                                contentStyle={{ 
                                  backgroundColor: '#1F2937', 
                                  border: '1px solid #374151',
                                  borderRadius: '8px'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="eps" 
                                stroke="#f59e0b" 
                                strokeWidth={3}
                                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Profit Margin Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Percent className="h-5 w-5" />
                          Profit Margins
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={financialData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <Tooltip 
                                formatter={(value: any) => [`${value}%`, 'Margin']}
                                contentStyle={{ 
                                  backgroundColor: '#1F2937', 
                                  border: '1px solid #374151',
                                  borderRadius: '8px'
                                }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="margin" 
                                stroke="#8b5cf6" 
                                fill="#8b5cf6"
                                fillOpacity={0.3}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Volume Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Trading Volume (30D)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.slice(-30)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              />
                              <YAxis 
                                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                              />
                              <Tooltip 
                                formatter={(value: any) => [`${(value / 1000000).toFixed(2)}M`, 'Volume']}
                                contentStyle={{ 
                                  backgroundColor: '#1F2937', 
                                  border: '1px solid #374151',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar 
                                dataKey="volume" 
                                fill="#6366f1"
                                radius={[2, 2, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="earnings" className="space-y-6">
                  <EarningsTrends stock={finalStock} />
                </TabsContent>
                
                <TabsContent value="valuation" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* P/E Ratio Comparison */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          P/E Ratio vs Sector
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: finalStock.symbol, pe: parseFloat(finalStock.peRatio || "25") },
                              { name: "Sector Avg", pe: parseFloat(finalStock.peRatio || "25") * 1.2 },
                              { name: "S&P 500", pe: 22.5 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: '#1F2937', 
                                  border: '1px solid #374151',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar dataKey="pe" fill="#ef4444" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Intrinsic Value Analysis */}
                    {finalStock.intrinsicValue && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Price vs Intrinsic Value
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64 flex items-center justify-center">
                            <div className="text-center space-y-4">
                              <div className="grid grid-cols-2 gap-8">
                                <div>
                                  <div className="text-sm text-muted-foreground">Current Price</div>
                                  <div className="text-3xl font-bold">${finalStock.price}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-muted-foreground">Intrinsic Value</div>
                                  <div className="text-3xl font-bold text-primary">${finalStock.intrinsicValue}</div>
                                </div>
                              </div>
                              <div className={cn(
                                "text-xl font-bold p-4 rounded-lg",
                                parseFloat(finalStock.intrinsicValue) > parseFloat(finalStock.price)
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-red-500/10 text-red-600"
                              )}>
                                {parseFloat(finalStock.intrinsicValue) > parseFloat(finalStock.price) 
                                  ? `${(((parseFloat(finalStock.intrinsicValue) - parseFloat(finalStock.price)) / parseFloat(finalStock.price)) * 100).toFixed(1)}% Undervalued`
                                  : `${(((parseFloat(finalStock.price) - parseFloat(finalStock.intrinsicValue)) / parseFloat(finalStock.intrinsicValue)) * 100).toFixed(1)}% Overvalued`
                                }
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="technical" className="space-y-6">
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Technical Analysis Coming Soon</h3>
                    <p className="text-muted-foreground">Advanced technical indicators and analysis tools will be available here.</p>
                  </div>
                </TabsContent>
              </Tabs>
          </motion.div>
      </div>
    </MainLayout>
  );
}
