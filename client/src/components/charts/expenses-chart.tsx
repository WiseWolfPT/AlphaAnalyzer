// Expenses Chart - Turquoise bars with detailed expense breakdown tooltip
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface ExpensesChartProps {
  data: Array<{ quarter: string; operating: number; rd: number; sga: number; other: number }>;
}

export function ExpensesChart({ data }: ExpensesChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Expenses" subtitle="Operating expenses breakdown">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No expenses data available
        </div>
      </ChartContainer>
    );
  }

  // Calculate total expenses for each quarter
  const chartData = data.map(item => ({
    quarter: item.quarter,
    total: item.operating + item.rd + item.sga + Math.abs(item.other),
    operating: item.operating,
    rd: item.rd,
    sga: item.sga,
    other: item.other
  }));

  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const change = latestData && previousData ? latestData.total - previousData.total : 0;
  const changePercent = previousData ? (change / previousData.total) * 100 : 0;
  const trend = change >= 0 ? 'up' : 'down';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="text-cyan-600">
              CAPEX: <span className="font-semibold">${data.operating.toFixed(0)}M</span>
            </p>
            <p className="text-cyan-500">
              S&M: <span className="font-semibold">${data.sga.toFixed(0)}M</span>
            </p>
            <p className="text-cyan-400">
              R&D: <span className="font-semibold">${data.rd.toFixed(0)}M</span>
            </p>
            <p className="text-cyan-300">
              G&A: <span className="font-semibold">${Math.abs(data.other).toFixed(0)}M</span>
            </p>
            <p className="text-muted-foreground border-t pt-1">
              Total: <span className="font-semibold text-foreground">${data.total.toFixed(0)}M</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Expenses" 
      subtitle="Q1 2025"
      value={`$${latestData?.total.toFixed(0)}M`}
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
            tickFormatter={(value) => `$${value}M`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="total" 
            fill="#06b6d4" 
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}