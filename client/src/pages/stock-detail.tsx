import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import type { Stock } from "@shared/schema";

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  
  const { data: stock, isLoading, error } = useQuery<Stock>({
    queryKey: ["stocks", symbol],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/${symbol}`);
      if (!response.ok) {
        throw new Error('Stock not found');
      }
      return response.json();
    },
    enabled: !!symbol,
  });

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <div className="p-4 bg-destructive/10 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <ArrowLeft className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive mb-2">Stock Not Found</h1>
            <p className="text-muted-foreground mb-6">The stock symbol "{symbol}" could not be found.</p>
            <Link href="/insights">
              <Button className="bg-primary hover:bg-primary/90">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/insights">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {/* Header Skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
              
              {/* Content Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </div>
          ) : stock ? (
            <>
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
                <div className="flex items-center space-x-4">
                  {stock.logo && (
                    <img 
                      src={stock.logo} 
                      alt={`${stock.name} logo`}
                      className="h-16 w-16 rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <div>
                    <div className="flex items-center space-x-3">
                      <h1 className="text-3xl font-bold">{stock.symbol}</h1>
                      <Badge variant="secondary">{stock.sector}</Badge>
                    </div>
                    <p className="text-xl text-muted-foreground">{stock.name}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-2xl font-bold">${stock.price}</span>
                      <span className={`text-lg font-medium ${
                        parseFloat(stock.changePercent) >= 0 ? 'text-positive' : 'text-negative'
                      }`}>
                        {parseFloat(stock.changePercent) >= 0 ? '+' : ''}${stock.change} ({stock.changePercent}%)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button className="bg-chart-1 hover:bg-chart-1/80 text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Watchlist
                  </Button>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Portfolio
                  </Button>
                </div>
              </div>

              {/* Mini Panels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Valuation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">P/E Ratio</span>
                      <span className="text-sm font-medium">{stock.peRatio || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Market Cap</span>
                      <span className="text-sm font-medium">{stock.marketCap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">EPS</span>
                      <span className="text-sm font-medium">${stock.eps || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">1M</span>
                      <span className="text-sm font-medium text-positive">+5.67%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">3M</span>
                      <span className="text-sm font-medium text-positive">+12.34%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">YTD</span>
                      <span className="text-sm font-medium text-negative">-2.11%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Financials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Revenue</span>
                      <span className="text-sm font-medium">$394.3B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Net Income</span>
                      <span className="text-sm font-medium">$99.8B</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Gross Margin</span>
                      <span className="text-sm font-medium">44.1%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Next Earnings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
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
                      <span className="text-sm font-medium">$2.11</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Toggle View */}
              <div className="mb-6">
                <Tabs defaultValue="quarterly" className="w-full">
                  <TabsList>
                    <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                    <TabsTrigger value="ttm">Quarterly (TTM)</TabsTrigger>
                    <TabsTrigger value="annual">Annually</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="quarterly" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Chart placeholders */}
                      {Array.from({ length: 12 }).map((_, index) => (
                        <Card key={index} className="h-64">
                          <CardHeader>
                            <CardTitle className="text-sm">Chart {index + 1}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex items-center justify-center h-full">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                              <TrendingUp className="h-8 w-8" />
                              <span>Chart data will be displayed here</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ttm" className="mt-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">TTM data view coming soon</p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="annual" className="mt-6">
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Annual data view coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : null}
      </div>
    </MainLayout>
  );
}
