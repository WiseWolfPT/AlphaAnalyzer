// EBITDA Chart - Blue bars showing quarterly EBITDA
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface EbitdaChartProps {
  data: Array<{ quarter: string; value: number }>;
}

export function EbitdaChart({ data }: EbitdaChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="EBITDA" subtitle="Earnings before interest, taxes, depreciation and amortization">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No EBITDA data available
        </div>
      </ChartContainer>
    );
  }

  const latestEbitda = data[data.length - 1]?.value || 0;
  const previousEbitda = data[data.length - 2]?.value || latestEbitda;
  const change = latestEbitda - previousEbitda;
  const changePercent = previousEbitda ? (change / previousEbitda) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';

  // Custom tooltip with highlighted value
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-chartreuse rounded mr-2"></span>
            EBITDA: <span className="font-semibold text-foreground">${payload[0].value.toFixed(0)}M</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="EBITDA" 
      subtitle="0.50%"
      value={`$${latestEbitda.toFixed(0)}M`}
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
            tickFormatter={(value) => `$${value}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            fill="#D8F22D" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}