/**
 * Sector and Logo System Demo Component
 * Demonstrates all features of the new sector and logo system
 */

import React from 'react';
import { CompanyLogo, LogoGrid } from '../ui/company-logo';
import { useStockSector, useSectorStats } from '../../hooks/use-stock-sector';
import { useCompanyLogo } from '../../hooks/use-company-logo';
import { getSectorColor, formatSectorName, getSectorDistribution } from '../../lib/sector-utils';
import { Sector } from '../../../shared/types/sectors';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

const DEMO_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'V',
  'WMT', 'PG', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'NFLX', 'CRM'
];

export function SectorLogoDemo() {
  const { sortedSectors, total } = useSectorStats();
  const sectorDistribution = getSectorDistribution(DEMO_STOCKS);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Sector & Logo System Demo</h1>
        <p className="text-gray-600">
          Comprehensive demonstration of Alfalyzer's sector classification and company logo system
        </p>
      </div>

      {/* Company Logos Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Individual Logos (Different Sizes)</h4>
            <div className="flex items-center gap-4">
              <CompanyLogo symbol="AAPL" size="sm" />
              <CompanyLogo symbol="MSFT" size="md" />
              <CompanyLogo symbol="GOOGL" size="lg" />
              <CompanyLogo symbol="AMZN" size="xl" />
              <CompanyLogo symbol="TSLA" size={80} />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Logos with Company Names</h4>
            <div className="space-y-2">
              <CompanyLogo symbol="AAPL" size="md" showName />
              <CompanyLogo symbol="MSFT" size="md" showName />
              <CompanyLogo symbol="GOOGL" size="md" showName />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Logo Grid</h4>
            <LogoGrid symbols={DEMO_STOCKS} size="md" maxItems={10} />
          </div>
        </CardContent>
      </Card>

      {/* Sector Classification Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Classification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_STOCKS.slice(0, 9).map(symbol => (
              <StockSectorCard key={symbol} symbol={symbol} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Overall Distribution ({total} mapped stocks)</h4>
              <div className="space-y-2">
                {sortedSectors.slice(0, 8).map(({ sector, count, percentage, colors }) => (
                  <div key={sector} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: colors.primary }}
                      />
                      <span className="text-sm">{formatSectorName(sector, true)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Demo Portfolio Distribution</h4>
              <div className="space-y-2">
                {sectorDistribution.map(({ sector, count, percentage, color, info }) => (
                  <div key={sector} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span className="text-sm">{formatSectorName(sector, true)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Features Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Logo Loading States</h4>
            <LogoLoadingDemo />
          </div>

          <div>
            <h4 className="font-semibold mb-2">Sector Color Themes</h4>
            <SectorColorDemo />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual stock sector card component
function StockSectorCard({ symbol }: { symbol: string }) {
  const { sector, sectorInfo, color, backgroundColor, textColor } = useStockSector(symbol);

  return (
    <div 
      className="p-3 rounded-lg border"
      style={{ backgroundColor: backgroundColor + '40' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <CompanyLogo symbol={symbol} size="sm" />
        <div>
          <div className="font-semibold text-sm">{symbol}</div>
          <div className="text-xs text-gray-500">Stock Symbol</div>
        </div>
      </div>
      
      <Badge 
        variant="secondary"
        className="text-xs"
        style={{ 
          backgroundColor: color + '20',
          color: color,
          border: `1px solid ${color}40`
        }}
      >
        {sectorInfo.icon} {formatSectorName(sector, true)}
      </Badge>
    </div>
  );
}

// Logo loading demo component
function LogoLoadingDemo() {
  const { url, isLoading, error, companyName } = useCompanyLogo('AAPL', { priority: 'quality' });

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
      <div className="flex flex-col items-center gap-1">
        {isLoading ? (
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
        ) : error ? (
          <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-xs text-red-600">
            ❌
          </div>
        ) : (
          <img src={url || ''} alt={companyName} className="w-8 h-8 rounded" />
        )}
        <span className="text-xs">AAPL</span>
      </div>
      
      <div className="text-sm">
        <div>Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Loaded'}</div>
        <div className="text-gray-500">Quality Priority Mode</div>
      </div>
    </div>
  );
}

// Sector color theme demo
function SectorColorDemo() {
  const sectors = [
    Sector.INFORMATION_TECHNOLOGY,
    Sector.FINANCIALS,
    Sector.HEALTHCARE,
    Sector.CONSUMER_DISCRETIONARY,
    Sector.COMMUNICATION_SERVICES
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {sectors.map(sector => (
        <div 
          key={sector}
          className="p-3 rounded text-white text-sm font-medium text-center"
          style={{ backgroundColor: getSectorColor(sector) }}
        >
          {formatSectorName(sector, true)}
        </div>
      ))}
    </div>
  );
}

export default SectorLogoDemo;