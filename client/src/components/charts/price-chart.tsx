// Price Chart - Historical stock price with area chart (Chart.js implementation)
import { LightweightPriceChart, LightweightChartContainer } from "@/components/ui/lightweight-chart";

interface PriceChartProps {
  data: Array<{ date: string; price: number }>;
}

export function PriceChart({ data }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <LightweightChartContainer 
        config={{}}
        className="min-h-[300px]"
        title="Price Chart"
        subtitle="No data available"
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No price data available
        </div>
      </LightweightChartContainer>
    );
  }

  const firstPrice = data[0]?.price || 0;
  const currentPrice = data[data.length - 1]?.price || 0;
  const totalChange = currentPrice - firstPrice;
  const totalChangePercent = firstPrice ? (totalChange / firstPrice) * 100 : 0;
  const isPositive = totalChange >= 0;

  return (
    <LightweightChartContainer 
      config={{}}
      className="min-h-[300px]"
      title="Price Chart"
      subtitle={`${isPositive ? '+' : ''}${totalChangePercent.toFixed(2)}% • $${currentPrice.toFixed(2)}`}
    >
      <LightweightPriceChart 
        data={data}
        color={isPositive ? "#10b981" : "#ef4444"}
      />
    </LightweightChartContainer>
  );
}