import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

interface IncomeStatement {
  date: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  ebitda: number;
  eps: number;
}

interface StockFinancialsChartProps {
  data: IncomeStatement[];
  isLoading?: boolean;
}

export function StockFinancialsChart({ data, isLoading }: StockFinancialsChartProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-secondary rounded w-32 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-secondary/20 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">No financial data available.</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts (reverse to show oldest to newest)
  const chartData = [...data].reverse().map(item => ({
    quarter: item.date.substring(0, 7),
    revenue: Math.round(item.revenue / 1000000), // Convert to millions
    netIncome: Math.round(item.netIncome / 1000000),
    ebitda: Math.round(item.ebitda / 1000000),
    eps: item.eps,
  }));

  // Calculate growth rates
  const revenueGrowth = data.length >= 2 
    ? ((data[0].revenue - data[1].revenue) / data[1].revenue * 100).toFixed(1)
    : 0;
  
  const netIncomeGrowth = data.length >= 2 
    ? ((data[0].netIncome - data[1].netIncome) / data[1].netIncome * 100).toFixed(1)
    : 0;

  const profitMargin = data[0] 
    ? ((data[0].netIncome / data[0].revenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teya-green" />
            Revenue (Quarterly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Millions ($)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip 
                formatter={(value: any) => [`$${value}M`, 'Revenue']}
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }}
              />
              <Bar dataKey="revenue" fill="#00DC82" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">YoY Growth</span>
            <span className={`font-bold ${Number(revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Number(revenueGrowth) >= 0 ? '+' : ''}{revenueGrowth}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Net Income Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Net Income (Quarterly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Millions ($)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip 
                formatter={(value: any) => [`$${value}M`, 'Net Income']}
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }}
              />
              <Bar dataKey="netIncome" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">Profit Margin</span>
            <span className="font-bold text-blue-600">{profitMargin}%</span>
          </div>
        </CardContent>
      </Card>

      {/* EBITDA Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            EBITDA (Quarterly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Millions ($)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip 
                formatter={(value: any) => [`$${value}M`, 'EBITDA']}
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }}
              />
              <Bar dataKey="ebitda" fill="#A855F7" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">EBITDA Margin</span>
            <span className="font-bold text-purple-600">
              {data[0] ? ((data[0].ebitda / data[0].revenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* EPS Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Earnings Per Share (EPS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="quarter" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'EPS ($)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip 
                formatter={(value: any) => [`$${value}`, 'EPS']}
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }}
              />
              <Line 
                type="monotone" 
                dataKey="eps" 
                stroke="#FB923C" 
                strokeWidth={2}
                dot={{ fill: '#FB923C', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">Latest EPS</span>
            <span className="font-bold text-orange-600">${data[0]?.eps?.toFixed(2) || '0.00'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}