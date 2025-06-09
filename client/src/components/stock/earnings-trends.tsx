import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Target, AlertCircle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, ComposedChart, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";
import type { MockStock } from "@/lib/mock-api";

interface EarningsTrendsProps {
  stock: MockStock;
}

interface EarningsData {
  quarter: string;
  reportedEPS: number;
  estimatedEPS: number;
  revenue: number;
  surprise: number;
  surprisePercent: number;
  date: string;
}

export function EarningsTrends({ stock }: EarningsTrendsProps) {
  // Generate mock earnings data for the last 8 quarters
  const generateEarningsData = (): EarningsData[] => {
    const quarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
    const baseEPS = parseFloat(stock.eps || "5");
    
    return quarters.map((quarter, index) => {
      const reportedEPS = baseEPS + (Math.random() - 0.5) * 2 + (index * 0.1); // Slight growth trend
      const estimatedEPS = reportedEPS + (Math.random() - 0.5) * 0.5; // Estimates close to actual
      const surprise = reportedEPS - estimatedEPS;
      const surprisePercent = (surprise / estimatedEPS) * 100;
      const revenue = (80000 + Math.random() * 30000 + index * 2000) / 1000; // In billions, growing trend
      
      // Generate dates for each quarter
      const year = quarter.includes('2023') ? 2023 : 2024;
      const quarterNum = parseInt(quarter.charAt(1));
      const month = (quarterNum - 1) * 3 + 1; // Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct
      
      return {
        quarter,
        reportedEPS: parseFloat(reportedEPS.toFixed(2)),
        estimatedEPS: parseFloat(estimatedEPS.toFixed(2)),
        revenue: parseFloat(revenue.toFixed(1)),
        surprise: parseFloat(surprise.toFixed(2)),
        surprisePercent: parseFloat(surprisePercent.toFixed(1)),
        date: new Date(year, month - 1, 15).toLocaleDateString()
      };
    });
  };

  const earningsData = generateEarningsData();
  const latestEarnings = earningsData[earningsData.length - 1];
  const avgSurprise = earningsData.reduce((sum, data) => sum + data.surprisePercent, 0) / earningsData.length;
  const epsGrowth = ((latestEarnings.reportedEPS - earningsData[0].reportedEPS) / earningsData[0].reportedEPS) * 100;
  const revenueGrowth = ((latestEarnings.revenue - earningsData[0].revenue) / earningsData[0].revenue) * 100;

  // Next earnings date (mock)
  const nextEarningsDate = new Date();
  nextEarningsDate.setDate(nextEarningsDate.getDate() + 45);

  return (
    <div className="space-y-6">
      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Latest EPS</span>
            </div>
            <div className="text-2xl font-bold">${latestEarnings.reportedEPS}</div>
            <div className={cn(
              "text-sm font-medium",
              latestEarnings.surprise >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {latestEarnings.surprise >= 0 ? '+' : ''}${latestEarnings.surprise} vs Est.
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">EPS Growth</span>
            </div>
            <div className="text-2xl font-bold">{epsGrowth.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">8 quarters</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Avg Surprise</span>
            </div>
            <div className="text-2xl font-bold">{avgSurprise.toFixed(1)}%</div>
            <div className={cn(
              "text-sm font-medium",
              avgSurprise >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {avgSurprise >= 0 ? 'Beat' : 'Miss'} estimates
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Next Earnings</span>
            </div>
            <div className="text-lg font-bold">{nextEarningsDate.toLocaleDateString()}</div>
            <div className="text-sm text-muted-foreground">In {Math.ceil((nextEarningsDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days</div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EPS Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              EPS vs Estimates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="quarter" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => [
                      `$${value}`, 
                      name === 'reportedEPS' ? 'Reported EPS' : 'Estimated EPS'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="estimatedEPS" 
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#94a3b8', strokeWidth: 2, r: 3 }}
                    name="estimatedEPS"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reportedEPS" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="reportedEPS"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="quarter" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(value) => `$${value}B`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`$${value}B`, 'Revenue']}
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">8-Quarter Growth</span>
                <span className={cn(
                  "font-bold",
                  revenueGrowth >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Surprises Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Earnings Surprises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={earningsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="quarter" 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value}%`, 'Surprise']}
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="surprisePercent" 
                    fill={(entry: any) => entry.surprisePercent >= 0 ? "#10b981" : "#ef4444"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Earnings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {earningsData.slice().reverse().map((earnings, index) => (
                <div key={earnings.quarter} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div>
                    <div className="font-medium">{earnings.quarter}</div>
                    <div className="text-sm text-muted-foreground">{earnings.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${earnings.reportedEPS}</div>
                    <div className={cn(
                      "text-sm",
                      earnings.surprise >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {earnings.surprise >= 0 ? '+' : ''}${earnings.surprise}
                    </div>
                  </div>
                  <Badge 
                    variant={earnings.surprise >= 0 ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {earnings.surprise >= 0 ? 'Beat' : 'Miss'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Earnings Alert */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <div className="font-medium text-foreground">
                Next Earnings Report: {nextEarningsDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                Estimated EPS: ${(latestEarnings.reportedEPS + 0.1).toFixed(2)} • 
                Time: After Market Close • 
                Revenue Est: ${(latestEarnings.revenue + 2).toFixed(1)}B
              </div>
            </div>
            <Button size="sm" variant="outline">
              Set Alert
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}