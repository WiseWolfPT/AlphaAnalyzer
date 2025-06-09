import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";
import type { MockStock } from "@/lib/mock-api";

interface SectorPerformanceProps {
  stocks: MockStock[];
}

interface SectorData {
  sector: string;
  performance: number;
  count: number;
  avgPrice: number;
  color: string;
}

export function SectorPerformance({ stocks }: SectorPerformanceProps) {
  // Group stocks by sector and calculate performance metrics
  const sectorData: SectorData[] = Object.entries(
    stocks.reduce((acc, stock) => {
      const sector = stock.sector;
      if (!acc[sector]) {
        acc[sector] = {
          stocks: [],
          totalPerformance: 0,
          totalPrice: 0
        };
      }
      acc[sector].stocks.push(stock);
      acc[sector].totalPerformance += parseFloat(stock.changePercent);
      acc[sector].totalPrice += parseFloat(stock.price);
      return acc;
    }, {} as Record<string, { stocks: MockStock[], totalPerformance: number, totalPrice: number }>)
  ).map(([sector, data], index) => {
    const colors = [
      "#3b82f6", // blue
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ef4444", // red
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#f97316", // orange
      "#84cc16"  // lime
    ];
    
    return {
      sector,
      performance: data.totalPerformance / data.stocks.length, // Average performance
      count: data.stocks.length,
      avgPrice: data.totalPrice / data.stocks.length,
      color: colors[index % colors.length]
    };
  });

  // Sort by performance
  const sortedSectorData = [...sectorData].sort((a, b) => b.performance - a.performance);

  const bestSector = sortedSectorData[0];
  const worstSector = sortedSectorData[sortedSectorData.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sector Performance Bar Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sector Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedSectorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="sector" 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value.toFixed(2)}%`, 'Avg Performance']}
                  labelStyle={{ color: '#1F2937' }}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="performance" 
                  fill={(entry: any) => entry.performance >= 0 ? "#10b981" : "#ef4444"}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Highlights */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">Best Performer</span>
              </div>
              <div className="text-lg font-bold text-foreground">{bestSector.sector}</div>
              <div className="text-sm text-muted-foreground">+{bestSector.performance.toFixed(2)}%</div>
            </div>
            
            <div className="bg-red-500/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">Worst Performer</span>
              </div>
              <div className="text-lg font-bold text-foreground">{worstSector.sector}</div>
              <div className="text-sm text-muted-foreground">{worstSector.performance.toFixed(2)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sector Distribution Pie Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio Distribution by Sector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value} stocks`, 
                    props.payload.sector
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Stats */}
          <div className="space-y-2">
            {sortedSectorData.slice(0, 4).map((sector) => (
              <div key={sector.sector} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: sector.color }}
                  />
                  <span className="text-sm font-medium">{sector.sector}</span>
                  <Badge variant="secondary" className="text-xs">
                    {sector.count} stocks
                  </Badge>
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  sector.performance >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {sector.performance >= 0 ? '+' : ''}{sector.performance.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}