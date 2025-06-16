// Cash & Debt Chart - Stacked bars showing cash (green) and debt (red)
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface CashDebtChartProps {
  data: Array<{ quarter: string; cash: number; debt: number }>;
}

export function CashDebtChart({ data }: CashDebtChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Cash & Debt" subtitle="Cash vs debt levels">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No cash & debt data available
        </div>
      </ChartContainer>
    );
  }

  const latestData = data[data.length - 1];
  const netCash = latestData ? latestData.cash - latestData.debt : 0;
  const isNetPositive = netCash >= 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const cashValue = payload.find((p: any) => p.dataKey === 'cash')?.value || 0;
      const debtValue = payload.find((p: any) => p.dataKey === 'debt')?.value || 0;
      const netValue = cashValue - debtValue;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-xs text-emerald-500">
              Cash: <span className="font-semibold">${cashValue.toFixed(0)}M</span>
            </p>
            <p className="text-xs text-red-500">
              Debt: <span className="font-semibold">${debtValue.toFixed(0)}M</span>
            </p>
            <p className="text-xs text-muted-foreground border-t pt-1">
              Net: <span className={`font-semibold ${netValue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                ${netValue.toFixed(0)}M
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Cash & Debt" 
      subtitle="Q1 2025"
      value={`$${Math.abs(netCash).toFixed(0)}M`}
      change={isNetPositive ? "Net Cash" : "Net Debt"}
      trend={isNetPositive ? 'up' : 'down'}
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
            dataKey="cash" 
            stackId="cashDebt"
            fill="#22c55e" 
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="debt" 
            stackId="cashDebt"
            fill="#ef4444" 
            radius={[0, 0, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}