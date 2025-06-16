// Revenue by Segment Chart - Stacked bars with different colors for each segment
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "./chart-container";

interface RevenueSegmentChartProps {
  data: Array<{ quarter: string; segments: Record<string, number> }>;
}

export function RevenueSegmentChart({ data }: RevenueSegmentChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title="Revenue By Segment" subtitle="Revenue breakdown">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No segment data available
        </div>
      </ChartContainer>
    );
  }

  // Transform data for stacked chart
  const chartData = data.map(item => ({
    quarter: item.quarter,
    ...Object.fromEntries(
      Object.entries(item.segments).map(([key, value]) => [key, value / 1000000]) // Convert to millions
    )
  }));

  // Get all segment names for consistent coloring
  const segmentNames = Object.keys(data[0]?.segments || {});
  const segmentColors = [
    "#ef4444", // red
    "#f97316", // orange  
    "#eab308", // yellow
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
  ];

  // Calculate total for latest quarter
  const latestData = data[data.length - 1];
  const totalRevenue = latestData ? Object.values(latestData.segments).reduce((sum, val) => sum + val, 0) / 1000000 : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          <p className="text-sm text-muted-foreground mb-2">
            Total: <span className="font-semibold text-foreground">${total.toFixed(0)}M</span>
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.dataKey}: ${entry.value.toFixed(0)}M
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer 
      title="Revenue By Segment" 
      subtitle="24.30%"
      value={`$${totalRevenue.toFixed(0)}M`}
      trend="up"
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
          {segmentNames.map((segment, index) => (
            <Bar
              key={segment}
              dataKey={segment}
              stackId="segments"
              fill={segmentColors[index % segmentColors.length]}
              radius={index === segmentNames.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}