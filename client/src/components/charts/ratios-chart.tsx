// Ratios Chart - Blue bars showing financial ratios (P/E, ROE, etc.)
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface RatiosChartProps {
  data: Array<{ quarter: string; pe: number; roe: number; roa: number; grossMargin: number }>;
}

export function RatiosChart({ data }: RatiosChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Ratios" subtitle="Key financial ratios">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No ratios data available
        </div>
      </ChartContainer>
    );
  }

  // Transform data to show ROE as primary metric (converted to percentage)
  const chartData = data.map(item => ({
    quarter: item.quarter,
    roe: item.roe * 100, // Convert to percentage
    pe: item.pe,
    roa: item.roa * 100,
    grossMargin: item.grossMargin * 100
  }));

  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const roeChange = latestData && previousData ? latestData.roe - previousData.roe : 0;
  const trend = roeChange >= 0 ? 'up' : 'down';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="text-chartreuse-dark">
              Return on Capital Employed: <span className="font-semibold">{data.roe.toFixed(1)}%</span>
            </p>
            <p className="text-muted-foreground">
              P/E Ratio: <span className="font-semibold">{data.pe.toFixed(1)}</span>
            </p>
            <p className="text-muted-foreground">
              ROA: <span className="font-semibold">{data.roa.toFixed(1)}%</span>
            </p>
            <p className="text-muted-foreground">
              Gross Margin: <span className="font-semibold">{data.grossMargin.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Ratios" 
      subtitle="Q1 2025"
      value={`${latestData?.roe.toFixed(1)}%`}
      change={`${roeChange >= 0 ? '+' : ''}${roeChange.toFixed(1)}%`}
      trend={trend}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="quarter" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="roe" 
            fill="#D8F22D" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}