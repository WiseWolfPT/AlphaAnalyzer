# Sector and Logo System Usage Guide

This document provides comprehensive instructions for using the newly implemented sector and logo system in Alfalyzer.

## 📁 Files Created

### Core Type Definitions
- `/shared/types/sectors.ts` - TypeScript types and enums for sectors
- `/client/src/data/sectors.ts` - Stock-to-sector mapping for 100+ stocks
- `/client/src/data/company-logos.ts` - Company logo system with fallbacks

### React Components and Hooks
- `/client/src/components/ui/company-logo.tsx` - Company logo component
- `/client/src/hooks/use-stock-sector.ts` - Sector-related hooks
- `/client/src/hooks/use-company-logo.ts` - Logo management hooks
- `/client/src/lib/sector-utils.ts` - Sector utility functions

### Server-side Data
- `/server/data/sectors-data.ts` - Extended company profiles and sector data

## 🎯 Quick Start Examples

### 1. Using the CompanyLogo Component

```tsx
import { CompanyLogo } from '@/components/ui/company-logo';

// Basic usage
<CompanyLogo symbol="AAPL" />

// With different sizes
<CompanyLogo symbol="MSFT" size="lg" />
<CompanyLogo symbol="GOOGL" size={48} />

// With company name
<CompanyLogo symbol="TSLA" showName={true} />

// Custom styling
<CompanyLogo 
  symbol="AMZN" 
  size="md"
  className="shadow-lg"
  rounded={false}
/>
```

### 2. Using Sector Hooks

```tsx
import { useStockSector, useSectorStats } from '@/hooks/use-stock-sector';

function StockCard({ symbol }: { symbol: string }) {
  const { sector, sectorInfo, color, backgroundColor } = useStockSector(symbol);
  
  return (
    <div 
      className="p-4 rounded"
      style={{ backgroundColor }}
    >
      <h3>{symbol}</h3>
      <p style={{ color }}>{sectorInfo.name}</p>
      <span>{sectorInfo.icon}</span>
    </div>
  );
}

function SectorOverview() {
  const { sortedSectors, total } = useSectorStats();
  
  return (
    <div>
      <h2>Sector Distribution ({total} stocks)</h2>
      {sortedSectors.map(({ sector, count, percentage }) => (
        <div key={sector}>
          {sector}: {count} stocks ({percentage.toFixed(1)}%)
        </div>
      ))}
    </div>
  );
}
```

### 3. Using Logo Hooks

```tsx
import { useCompanyLogo, useCompanyLogos } from '@/hooks/use-company-logo';

function LogoExample({ symbol }: { symbol: string }) {
  const { url, isLoading, error, fallbackColor, companyName } = useCompanyLogo(symbol);
  
  if (isLoading) return <div>Loading logo...</div>;
  if (error) return <div style={{ backgroundColor: fallbackColor }}>Error</div>;
  
  return <img src={url} alt={companyName} width={32} height={32} />;
}

function BatchLogos({ symbols }: { symbols: string[] }) {
  const { logosState, isLoading, getLogoState } = useCompanyLogos(symbols);
  
  return (
    <div>
      {symbols.map(symbol => {
        const logoState = getLogoState(symbol);
        return (
          <div key={symbol}>
            {logoState.url ? (
              <img src={logoState.url} alt={symbol} width={24} height={24} />
            ) : (
              <div style={{ backgroundColor: logoState.fallbackColor }}>
                {symbol.slice(0, 2)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### 4. Using Sector Utilities

```tsx
import { 
  getSectorColor, 
  getStockColor, 
  getSectorDistribution,
  formatSectorName 
} from '@/lib/sector-utils';
import { Sector } from '@/shared/types/sectors';

function SectorChart({ stocks }: { stocks: string[] }) {
  const distribution = getSectorDistribution(stocks);
  
  return (
    <div className="flex flex-wrap gap-2">
      {distribution.map(({ sector, count, percentage, color }) => (
        <div 
          key={sector}
          className="p-2 rounded text-white text-sm"
          style={{ backgroundColor: color }}
        >
          {formatSectorName(sector, true)}: {count} ({percentage.toFixed(1)}%)
        </div>
      ))}
    </div>
  );
}

function StockList({ stocks }: { stocks: string[] }) {
  return (
    <div>
      {stocks.map(symbol => (
        <div 
          key={symbol}
          className="p-2 border-l-4"
          style={{ borderLeftColor: getStockColor(symbol) }}
        >
          {symbol}
        </div>
      ))}
    </div>
  );
}
```

## 🏗️ Integration Examples

### Enhanced Stock Card with Sector and Logo

```tsx
import { CompanyLogo } from '@/components/ui/company-logo';
import { useStockSector } from '@/hooks/use-stock-sector';
import { Card, CardContent } from '@/components/ui/card';

interface EnhancedStockCardProps {
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

export function EnhancedStockCard({ symbol, price, change, volume }: EnhancedStockCardProps) {
  const { sector, sectorInfo, color, backgroundColor } = useStockSector(symbol);
  
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <CompanyLogo symbol={symbol} size="md" showName={true} />
          <div 
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor, color }}
          >
            {sectorInfo.icon} {sectorInfo.name}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">${price.toFixed(2)}</span>
            <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}%
            </span>
          </div>
          
          <div className="text-sm text-gray-500">
            Volume: {volume.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Sector Performance Dashboard

```tsx
import { useSectorPerformance } from '@/hooks/use-stock-sector';
import { getSectorColor } from '@/lib/sector-utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SectorPerformanceDashboardProps {
  stocks: string[];
  priceData: Record<string, { price: number; change: number }>;
}

export function SectorPerformanceDashboard({ stocks, priceData }: SectorPerformanceDashboardProps) {
  const { sectorPerformance, topPerformingSector, worstPerformingSector } = 
    useSectorPerformance(stocks, priceData);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.values(sectorPerformance).map(({ sector, avgChange, stockCount, info }) => (
        <Card key={sector} className="relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 w-full h-1"
            style={{ backgroundColor: getSectorColor(sector) }}
          />
          
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>{info.icon}</span>
              {info.name}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Avg Change:</span>
                <span className={`text-sm font-medium ${avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Stocks:</span>
                <span className="text-sm font-medium">{stockCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## 🎨 Styling and Theming

### CSS Variables for Sectors

The system generates CSS variables you can use:

```css
/* Automatically generated variables */
:root {
  --sector-information-technology-primary: #8B5CF6;
  --sector-information-technology-background: #EDE9FE;
  --sector-information-technology-text: #5B21B6;
  /* ... more sector variables */
}

/* Usage in CSS */
.tech-stock {
  background-color: var(--sector-information-technology-background);
  color: var(--sector-information-technology-text);
  border-left: 4px solid var(--sector-information-technology-primary);
}
```

### Tailwind Integration

```tsx
import { cn } from '@/lib/utils';
import { getSectorColor } from '@/lib/sector-utils';

function SectorBadge({ sector }: { sector: Sector }) {
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-opacity-10 text-opacity-80"
      )}
      style={{ 
        backgroundColor: getSectorColor(sector) + '20',
        color: getSectorColor(sector)
      }}
    >
      {getSectorIcon(sector)} {formatSectorName(sector, true)}
    </span>
  );
}
```

## 📊 Data Coverage

### Supported Stocks (100+ symbols)
- **Technology**: AAPL, MSFT, NVDA, INTC, AMD, CRM, ORCL, ADBE, IBM, QCOM, TXN, AVGO, HPQ, DELL
- **Communication**: GOOGL, GOOG, META, NFLX, DIS, VZ, T, CMCSA, TMUS, CHTR, DISH, SNAP, PINS, ROKU
- **Consumer Discretionary**: AMZN, TSLA, HD, MCD, SBUX, NKE, LOW, TJX, BKNG, GM, F, ABNB, EBAY, MAR, MGM
- **Financials**: JPM, BAC, WFC, GS, MS, C, USB, PNC, BLK, AXP, V, MA, PYPL, SQ, COIN
- **Healthcare**: JNJ, PFE, UNH, ABBV, TMO, ABT, LLY, MRK, MDT, AMGN, GILD, BMY, CVS, ANTM, CI
- **And more across all 12 sectors...**

### Logo Providers
1. **Clearbit API** (Primary) - High quality logos
2. **Finnhub API** - Financial logos
3. **Yahoo Finance** - Backup option
4. **Placeholder Generator** - Fallback with company colors

## 🚀 Performance Optimizations

### Caching
- Logo URLs are cached for 24 hours
- Sector mappings are computed once and memoized
- Batch logo loading for performance

### Lazy Loading
```tsx
// Preload logos for better performance
import { preloadLogos } from '@/components/ui/company-logo';

// In your component
useEffect(() => {
  preloadLogos(['AAPL', 'MSFT', 'GOOGL', 'AMZN']);
}, []);
```

### Memoization
```tsx
// Components are memoized for performance
import { CompanyLogoMemo } from '@/components/ui/company-logo';

// Use memoized version in lists
{stocks.map(symbol => (
  <CompanyLogoMemo key={symbol} symbol={symbol} size="sm" />
))}
```

## 🔧 Advanced Usage

### Custom Logo Providers
```tsx
import { getCompanyLogo } from '@/data/company-logos';

// Use specific provider
const clearbitLogo = getCompanyLogo('AAPL', 'CLEARBIT');
const finnhubLogo = getCompanyLogo('AAPL', 'FINNHUB');
```

### Sector Filtering
```tsx
import { useStocksBySector } from '@/hooks/use-stock-sector';
import { Sector } from '@/shared/types/sectors';

function TechStocks({ allStocks }: { allStocks: string[] }) {
  const { filteredStocks } = useStocksBySector(allStocks, Sector.INFORMATION_TECHNOLOGY);
  
  return (
    <div>
      <h3>Technology Stocks ({filteredStocks.length})</h3>
      {filteredStocks.map(symbol => (
        <CompanyLogo key={symbol} symbol={symbol} showName />
      ))}
    </div>
  );
}
```

### Error Handling
```tsx
function LogoWithErrorHandling({ symbol }: { symbol: string }) {
  const handleLogoError = (failedSymbol: string) => {
    console.log(`Logo failed for ${failedSymbol}`);
    // Track analytics, show notification, etc.
  };
  
  return (
    <CompanyLogo 
      symbol={symbol}
      onError={handleLogoError}
      fallbackToText={true}
    />
  );
}
```

## 📈 Integration with Existing Components

Update your existing stock components to use the new system:

```tsx
// Before
<div className="stock-card">
  <h3>{symbol}</h3>
  <p>{price}</p>
</div>

// After
<div className="stock-card">
  <div className="flex items-center gap-3">
    <CompanyLogo symbol={symbol} size="md" />
    <div>
      <h3>{symbol}</h3>
      <div className="sector-badge">
        {useStockSector(symbol).sectorInfo.name}
      </div>
    </div>
  </div>
  <p>{price}</p>
</div>
```

This comprehensive system provides everything needed for professional sector classification and company branding throughout the Alfalyzer application.