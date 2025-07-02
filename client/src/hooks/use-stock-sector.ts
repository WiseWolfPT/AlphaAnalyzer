/**
 * Stock Sector Hooks for Alfalyzer
 * Custom hooks for sector-related functionality
 */

import { useMemo } from 'react';
import { Sector, SECTOR_INFO, SECTOR_COLORS } from '../../../shared/types/sectors';
import { getStockSector, getStocksBySector, getSectorStats, isStockMapped } from '../data/sectors';

/**
 * Hook to get sector information for a stock
 */
export function useStockSector(symbol: string) {
  return useMemo(() => {
    const sector = getStockSector(symbol);
    const sectorInfo = SECTOR_INFO[sector];
    const sectorColors = SECTOR_COLORS[sector];
    const isMapped = isStockMapped(symbol);

    return {
      sector,
      sectorInfo,
      sectorColors,
      isMapped,
      name: sectorInfo.name,
      description: sectorInfo.description,
      color: sectorColors.primary,
      backgroundColor: sectorColors.background,
      textColor: sectorColors.text,
      icon: sectorInfo.icon,
      examples: sectorInfo.examples
    };
  }, [symbol]);
}

/**
 * Hook to get all stocks in a sector
 */
export function useSectorStocks(sector: Sector) {
  return useMemo(() => {
    const stocks = getStocksBySector(sector);
    const sectorInfo = SECTOR_INFO[sector];
    
    return {
      stocks,
      count: stocks.length,
      sectorInfo,
      isEmpty: stocks.length === 0
    };
  }, [sector]);
}

/**
 * Hook to get sector statistics
 */
export function useSectorStats() {
  return useMemo(() => {
    const stats = getSectorStats();
    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    const sortedSectors = Object.entries(stats)
      .map(([sector, count]) => ({
        sector: sector as Sector,
        count,
        percentage: (count / total) * 100,
        info: SECTOR_INFO[sector as Sector],
        colors: SECTOR_COLORS[sector as Sector]
      }))
      .sort((a, b) => b.count - a.count);

    return {
      stats,
      total,
      sortedSectors,
      topSector: sortedSectors[0]?.sector,
      sectorCount: Object.keys(stats).length
    };
  }, []);
}

/**
 * Hook to filter stocks by sector
 */
export function useStocksBySector(stocks: string[], targetSector?: Sector) {
  return useMemo(() => {
    if (!targetSector) {
      return {
        filteredStocks: stocks,
        sectorGroups: groupStocksBySector(stocks),
        totalStocks: stocks.length
      };
    }

    const filteredStocks = stocks.filter(symbol => getStockSector(symbol) === targetSector);
    
    return {
      filteredStocks,
      sectorGroups: { [targetSector]: filteredStocks },
      totalStocks: filteredStocks.length
    };
  }, [stocks, targetSector]);
}

/**
 * Helper function to group stocks by sector
 */
function groupStocksBySector(stocks: string[]): Record<Sector, string[]> {
  const groups: Record<Sector, string[]> = {} as Record<Sector, string[]>;
  
  stocks.forEach(symbol => {
    const sector = getStockSector(symbol);
    if (!groups[sector]) {
      groups[sector] = [];
    }
    groups[sector].push(symbol);
  });
  
  return groups;
}

/**
 * Hook for sector performance tracking
 */
export function useSectorPerformance(stocks: string[], priceData?: Record<string, { price: number; change: number }>) {
  return useMemo(() => {
    if (!priceData) {
      return {
        sectorPerformance: {},
        topPerformingSector: null,
        worstPerformingSector: null
      };
    }

    const sectorGroups = groupStocksBySector(stocks);
    const sectorPerformance: Record<Sector, {
      sector: Sector;
      avgChange: number;
      totalMarketCap: number;
      stockCount: number;
      stocks: string[];
      info: typeof SECTOR_INFO[Sector];
    }> = {} as any;

    Object.entries(sectorGroups).forEach(([sector, sectorStocks]) => {
      const validStocks = sectorStocks.filter(symbol => priceData[symbol]);
      
      if (validStocks.length === 0) return;

      const avgChange = validStocks.reduce((sum, symbol) => {
        return sum + (priceData[symbol]?.change || 0);
      }, 0) / validStocks.length;

      const totalMarketCap = validStocks.reduce((sum, symbol) => {
        return sum + (priceData[symbol]?.price || 0) * 1000000; // Mock market cap
      }, 0);

      sectorPerformance[sector as Sector] = {
        sector: sector as Sector,
        avgChange,
        totalMarketCap,
        stockCount: validStocks.length,
        stocks: validStocks,
        info: SECTOR_INFO[sector as Sector]
      };
    });

    const sectors = Object.values(sectorPerformance);
    const topPerformingSector = sectors.reduce((top, current) => 
      current.avgChange > top.avgChange ? current : top
    );
    const worstPerformingSector = sectors.reduce((worst, current) => 
      current.avgChange < worst.avgChange ? current : worst
    );

    return {
      sectorPerformance,
      topPerformingSector,
      worstPerformingSector,
      sectorsCount: sectors.length
    };
  }, [stocks, priceData]);
}

/**
 * Hook for sector color utilities
 */
export function useSectorColors() {
  return useMemo(() => {
    const getSectorColor = (sector: Sector) => SECTOR_COLORS[sector]?.primary || '#6B7280';
    const getSectorBackground = (sector: Sector) => SECTOR_COLORS[sector]?.background || '#F3F4F6';
    const getSectorTextColor = (sector: Sector) => SECTOR_COLORS[sector]?.text || '#374151';
    
    const getStockColor = (symbol: string) => {
      const sector = getStockSector(symbol);
      return getSectorColor(sector);
    };

    return {
      getSectorColor,
      getSectorBackground,
      getSectorTextColor,
      getStockColor,
      sectorColors: SECTOR_COLORS
    };
  }, []);
}

/**
 * Hook for sector validation
 */
export function useSectorValidation() {
  return useMemo(() => {
    const isValidSector = (sector: string): sector is Sector => {
      return Object.values(Sector).includes(sector as Sector);
    };

    const validateStockSector = (symbol: string) => {
      const sector = getStockSector(symbol);
      return {
        isValid: sector !== Sector.OTHER,
        sector,
        isMapped: isStockMapped(symbol)
      };
    };

    const getAllSectors = () => Object.values(Sector);
    const getSectorCount = () => Object.keys(Sector).length;

    return {
      isValidSector,
      validateStockSector,
      getAllSectors,
      getSectorCount,
      availableSectors: Object.values(Sector)
    };
  }, []);
}