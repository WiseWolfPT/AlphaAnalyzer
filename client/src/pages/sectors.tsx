/**
 * AGENT 16: GICS Sectors Page
 *
 * Displays all 11 GICS sectors with stock counts, color coding, and navigation.
 * Provides sector-based browsing for the 516 properly classified stocks.
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Building2, TrendingUp, BarChart3 } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
  stockCount: number;
  stockCountWithIV: number;
  examples: string[];
}

interface SectorsResponse {
  total: number;
  totalStocks: number;
  sectors: Sector[];
}

export default function SectorsPage() {
  const { data, isLoading, error } = useQuery<SectorsResponse>({
    queryKey: ['sectors'],
    queryFn: async () => {
      const response = await fetch('/api/sectors');
      if (!response.ok) {
        throw new Error('Failed to fetch sectors');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Sectors</CardTitle>
            <CardDescription className="text-red-600">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">GICS Sectors</h1>
        <p className="text-muted-foreground">
          Browse stocks by Global Industry Classification Standard (GICS) sectors
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sectors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
            <p className="text-xs text-muted-foreground">GICS classification standard</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalStocks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all sectors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Sector</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(data.totalStocks / data.total).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Stocks per sector</p>
          </CardContent>
        </Card>
      </div>

      {/* Sector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.sectors.map((sector) => (
          <Link key={sector.id} href={`/sectors/${sector.id}`}>
            <Card
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
              style={{
                borderLeft: `4px solid ${sector.color}`,
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{sector.icon}</span>
                    {sector.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: sector.backgroundColor,
                      color: sector.color,
                      borderColor: sector.color,
                    }}
                  >
                    {sector.stockCount}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {sector.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">
                    Examples:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sector.examples.slice(0, 3).map((example) => (
                      <Badge key={example} variant="outline" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground">
                    {sector.stockCountWithIV} stocks with intrinsic value data
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Footer Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            The Global Industry Classification Standard (GICS) is an industry taxonomy
            developed by MSCI and S&P for use by the global financial community. This
            system categorizes stocks into 11 sectors, 24 industry groups, 69 industries,
            and 158 sub-industries.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
