// Shares Outstanding Chart - Turquoise bars showing shares outstanding
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface SharesChartProps {
  data: Array<{ quarter: string; value: number }>;
}

export function SharesChart({ data }: SharesChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Shares Outstanding" subtitle="Number of shares outstanding">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No shares data available
        </div>
      </ChartContainer>
    );
  }

  const latestShares = data[data.length - 1]?.value || 0;
  const previousShares = data[data.length - 2]?.value || latestShares;
  const change = latestShares - previousShares;
  const changePercent = previousShares ? (change / previousShares) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';

  // Convert to billions for display
  const chartData = data.map(item => ({
    ...item,
    value: item.value / 1000 // Convert millions to billions for display
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-teal-500 rounded mr-2"></span>
            Shares: <span className="font-semibold text-foreground">{payload[0].value.toFixed(1)}B</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Shares Outstanding" 
      subtitle="25%"
      value={`${(latestShares / 1000).toFixed(1)}B`}
      change={`${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`}
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
            tickFormatter={(value) => `${value}B`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="#14b8a6" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}