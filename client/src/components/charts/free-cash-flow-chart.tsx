// Free Cash Flow Chart - Orange bars showing quarterly free cash flow
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface FreeCashFlowChartProps {
  data: Array<{ quarter: string; value: number }>;
}

export function FreeCashFlowChart({ data }: FreeCashFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Free Cash Flow" subtitle="Cash generated after capital expenditures">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No free cash flow data available
        </div>
      </ChartContainer>
    );
  }

  const latestFCF = data[data.length - 1]?.value || 0;
  const previousFCF = data[data.length - 2]?.value || latestFCF;
  const change = latestFCF - previousFCF;
  const changePercent = previousFCF ? (change / previousFCF) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            FCF: <span className="font-semibold text-foreground">${payload[0].value.toFixed(0)}M</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Free Cash Flow" 
      subtitle="-12.43%"
      value={`$${latestFCF.toFixed(0)}M`}
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
            fill="#f97316" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}