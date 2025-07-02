import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { AdvancedTradingChart } from "@/components/charts/advanced-trading-chart";
import { StockHeaderV2 } from "@/components/stock/stock-header-v2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Share2, 
  Calculator, 
  FileText,
  ArrowLeft,
  Star,
  Plus,
  ChartLine,
  BarChart3,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock company data
const getCompanyData = (symbol: string) => {
  const companies: Record<string, any> = {
    'AAPL': {
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
      marketCap: '$2.7T',
      pe: '28.6',
      dividend: '0.96%',
      beta: '1.25',
      price: 203.92,
      change: 3.29,
      changePercent: 1.64,
      afterHoursPrice: 204.49,
      afterHoursChange: 0.57,
      afterHoursChangePercent: 0.28,
      volume: '52.3M',
      avgVolume: '48.1M',
      dayRange: '173.12 - 176.89',
      yearRange: '124.17 - 199.62',
      earningsDate: 'Jul 30',
      logo: 'https://logo.clearbit.com/apple.com'
    },
    'MSFT': {
      name: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software',
      description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
      marketCap: '$2.8T',
      pe: '35.2',
      dividend: '0.68%',
      beta: '0.89',
      price: 378.85,
      change: -1.23,
      changePercent: -0.32,
      afterHoursPrice: 379.15,
      afterHoursChange: 0.30,
      afterHoursChangePercent: 0.08,
      volume: '29.7M',
      avgVolume: '31.2M',
      dayRange: '377.45 - 380.21',
      yearRange: '309.45 - 427.33',
      earningsDate: 'Oct 24',
      logo: 'https://logo.clearbit.com/microsoft.com'
    }
  };

  return companies[symbol] || {
    name: `${symbol} Corporation`,
    sector: 'Technology',
    industry: 'Software',
    description: `${symbol} is a technology company operating in various segments.`,
    marketCap: '$150B',
    pe: '22.5',
    dividend: '1.2%',
    beta: '1.1',
    price: 150.00,
    change: 2.50,
    changePercent: 1.69,
    afterHoursPrice: 150.75,
    afterHoursChange: 0.75,
    afterHoursChangePercent: 0.50,
    volume: '25.0M',
    avgVolume: '28.5M',
    dayRange: '148.50 - 152.75',
    yearRange: '95.50 - 180.25',
    earningsDate: 'TBD',
    logo: `https://logo.clearbit.com/${symbol.toLowerCase()}.com`
  };
};

export default function StockDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const symbol = params.symbol?.toUpperCase() || 'AAPL';
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  
  const company = getCompanyData(symbol);
  const isPositive = company.change >= 0;

  const handleAddToWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    // Here you would implement the actual watchlist logic
  };

  const handleViewCharts = () => {
    setLocation(`/stock/${symbol}/charts`);
  };

  const handleCalculateValue = () => {
    setLocation(`/intrinsic-value?symbol=${symbol}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation('/find-stocks')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Find Stocks
          </Button>
        </div>

        {/* Stock Header - New Layout */}
        <StockHeaderV2
          symbol={symbol}
          company={company}
          isInWatchlist={isInWatchlist}
          onAddToWatchlist={handleAddToWatchlist}
          onShare={() => {
            // Handle share functionality
            if (navigator.share) {
              navigator.share({
                title: `${company.name} (${symbol})`,
                text: `Check out ${company.name} stock analysis on Alfalyzer`,
                url: window.location.href,
              });
            } else {
              // Fallback to copying to clipboard
              navigator.clipboard.writeText(window.location.href);
            }
          }}
        />

        {/* Price Information */}
        <Card className="border-chartreuse/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                <p className="text-3xl font-bold">${company.price.toFixed(2)}</p>
                <p className={cn("text-sm font-medium", isPositive ? "text-green-500" : "text-red-500")}>
                  {isPositive ? "+" : ""}{company.change.toFixed(2)} ({isPositive ? "+" : ""}{company.changePercent.toFixed(2)}%)
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Market Cap</p>
                <p className="text-xl font-bold">{company.marketCap}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">P/E Ratio</p>
                <p className="text-xl font-bold">{company.pe}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Dividend Yield</p>
                <p className="text-xl font-bold">{company.dividend}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Volume</p>
                <p className="text-xl font-bold">{company.volume}</p>
                <p className="text-xs text-muted-foreground">Avg: {company.avgVolume}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Beta</p>
                <p className="text-xl font-bold">{company.beta}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {company.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Day Range</p>
                      <p className="font-medium">{company.dayRange}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">52 Week Range</p>
                      <p className="font-medium">{company.yearRange}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleViewCharts}
                    className="w-full bg-chartreuse hover:bg-chartreuse-dark text-black gap-2"
                  >
                    <ChartLine className="w-4 h-4" />
                    View Advanced Charts
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCalculateValue}
                    className="w-full border-chartreuse/20 hover:bg-chartreuse/10 gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Calculate Intrinsic Value
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation(`/transcripts?symbol=${symbol}`)}
                    className="w-full border-chartreuse/20 hover:bg-chartreuse/10 gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    View Earnings Transcripts
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="charts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-chartreuse" />
                  Advanced Trading Chart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdvancedTradingChart 
                  symbol={symbol}
                  height={500}
                  showVolume={true}
                  showOrderBook={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Financial Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Revenue Growth</p>
                      <p className="text-2xl font-bold text-green-500">+12.5%</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Profit Margin</p>
                      <p className="text-2xl font-bold">24.3%</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">ROE</p>
                      <p className="text-2xl font-bold text-green-500">18.7%</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Debt/Equity</p>
                      <p className="text-2xl font-bold">0.42</p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCalculateValue}
                    className="w-full bg-chartreuse hover:bg-chartreuse-dark text-black gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Run Complete Valuation Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <Card>
              <CardHeader>
                <CardTitle>Latest News</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-chartreuse pl-4">
                    <h4 className="font-medium">Q4 Earnings Beat Expectations</h4>
                    <p className="text-sm text-muted-foreground">Strong performance in key segments drives revenue growth...</p>
                    <p className="text-xs text-muted-foreground mt-2">2 hours ago</p>
                  </div>
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">Analyst Upgrades Price Target</h4>
                    <p className="text-sm text-muted-foreground">Investment firm raises target citing strong fundamentals...</p>
                    <p className="text-xs text-muted-foreground mt-2">1 day ago</p>
                  </div>
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-medium">New Product Launch Announced</h4>
                    <p className="text-sm text-muted-foreground">Company unveils innovative solution for emerging market...</p>
                    <p className="text-xs text-muted-foreground mt-2">3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}