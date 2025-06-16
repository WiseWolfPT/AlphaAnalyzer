// Return of Capital Chart - Pink/Salmon bars showing return on capital metrics
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface ReturnCapitalChartProps {
  data: Array<{ quarter: string; value: number }>;
}

export function ReturnCapitalChart({ data }: ReturnCapitalChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Return Of Capital" subtitle="Return on invested capital">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No return of capital data available
        </div>
      </ChartContainer>
    );
  }

  const latestReturn = data[data.length - 1]?.value || 0;
  const previousReturn = data[data.length - 2]?.value || latestReturn;
  const change = latestReturn - previousReturn;
  const changePercent = previousReturn ? (change / previousReturn) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-rose-500 rounded mr-2"></span>
            Dividends Paid: <span className="font-semibold text-foreground">${payload[0].value.toFixed(2)}B</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Common Stock Repurchased: $25.9b
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Return Of Capital" 
      subtitle="Q1 2025"
      value={`$${latestReturn.toFixed(1)}B`}
      change={`${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`}
      trend={trend}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
            tickFormatter={(value) => `$${value}B`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="#f43f5e" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}