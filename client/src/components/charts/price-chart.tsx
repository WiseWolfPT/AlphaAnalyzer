// Price Chart - Historical stock price with area chart (similar to Qualtrim's pink area chart)
import { LineChart, Line, Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface PriceChartProps {
  data: Array<{ date: string; price: number }>;
}

export function PriceChart({ data }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Price" subtitle="Historical price movement">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No price data available
        </div>
      </ChartContainer>
    );
  }

  const firstPrice = data[0]?.price || 0;
  const currentPrice = data[data.length - 1]?.price || 0;
  const totalChange = currentPrice - firstPrice;
  const totalChangePercent = firstPrice ? (totalChange / firstPrice) * 100 : 0;
  const trend = totalChange >= 0 ? 'up' : 'down';

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            Price: <span className="font-semibold text-foreground">${payload[0].value.toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Price" 
      subtitle={`${trend === 'up' ? '↗' : '↘'} ${totalChangePercent.toFixed(2)}%`}
      value={`$${currentPrice.toFixed(2)}`}
      change={`${totalChange >= 0 ? '+' : ''}${totalChangePercent.toFixed(2)}%`}
      trend={trend}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#ec4899"
            strokeWidth={2}
            fill="url(#priceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}