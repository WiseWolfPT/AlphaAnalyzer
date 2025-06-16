// EPS Chart - Yellow bars showing quarterly earnings per share
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface EpsChartProps {
  data: Array<{ quarter: string; value: number }>;
}

export function EpsChart({ data }: EpsChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="EPS" subtitle="Earnings per share">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No EPS data available
        </div>
      </ChartContainer>
    );
  }

  const latestEPS = data[data.length - 1]?.value || 0;
  const previousEPS = data[data.length - 2]?.value || latestEPS;
  const change = latestEPS - previousEPS;
  const changePercent = previousEPS ? (change / previousEPS) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            EPS: <span className="font-semibold text-foreground">${payload[0].value.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="EPS" 
      subtitle="5.08%"
      value={`$${latestEPS.toFixed(2)}`}
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
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="#eab308" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}