/**
 * Sector Utilities for Alfalyzer
 * Helper functions for sector-related operations
 */

import { Sector, SECTOR_COLORS, SECTOR_INFO } from '../../../shared/types/sectors';
import { getStockSector } from '../data/sectors';

/**
 * Get sector color with fallback
 */
export function getSectorColor(sector: Sector, variant: 'primary' | 'background' | 'text' = 'primary'): string {
  return SECTOR_COLORS[sector]?.[variant] || '#6B7280';
}

/**
 * Get stock color based on its sector
 */
export function getStockColor(symbol: string): string {
  const sector = getStockSector(symbol);
  return getSectorColor(sector, 'primary');
}

/**
 * Generate CSS variables for sector colors
 */
export function generateSectorCSSVariables(): Record<string, string> {
  const variables: Record<string, string> = {};
  
  Object.entries(SECTOR_COLORS).forEach(([sector, colors]) => {
    const sectorKey = sector.toLowerCase().replace(/\s+/g, '-');
    variables[`--sector-${sectorKey}-primary`] = colors.primary;
    variables[`--sector-${sectorKey}-background`] = colors.background;
    variables[`--sector-${sectorKey}-text`] = colors.text;
  });
  
  return variables;
}

/**
 * Get contrast color (white or black) based on background
 */
export function getContrastColor(backgroundColor: string): string {
  // Remove # if present
  const color = backgroundColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Generate gradient from sector color
 */
export function getSectorGradient(sector: Sector, direction: string = 'to right'): string {
  const primaryColor = getSectorColor(sector, 'primary');
  const lightColor = lightenColor(primaryColor, 20);
  
  return `linear-gradient(${direction}, ${lightColor}, ${primaryColor})`;
}

/**
 * Lighten or darken a color
 */
export function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

/**
 * Get sector statistics for visualization
 */
export function getSectorDistribution(stocks: string[]): Array<{
  sector: Sector;
  count: number;
  percentage: number;
  color: string;
  info: typeof SECTOR_INFO[Sector];
}> {
  const sectorCounts: Record<Sector, number> = {} as Record<Sector, number>;
  
  // Count stocks by sector
  stocks.forEach(symbol => {
    const sector = getStockSector(symbol);
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  });
  
  const total = stocks.length;
  
  return Object.entries(sectorCounts).map(([sector, count]) => ({
    sector: sector as Sector,
    count,
    percentage: (count / total) * 100,
    color: getSectorColor(sector as Sector),
    info: SECTOR_INFO[sector as Sector]
  })).sort((a, b) => b.count - a.count);
}

/**
 * Generate chart colors for sectors
 */
export function getSectorChartColors(sectors: Sector[]): string[] {
  return sectors.map(sector => getSectorColor(sector, 'primary'));
}

/**
 * Get sector theme for UI components
 */
export function getSectorTheme(sector: Sector) {
  const colors = SECTOR_COLORS[sector];
  const info = SECTOR_INFO[sector];
  
  return {
    primary: colors.primary,
    background: colors.background,
    text: colors.text,
    gradient: getSectorGradient(sector),
    contrast: getContrastColor(colors.primary),
    lighter: lightenColor(colors.primary, 30),
    darker: lightenColor(colors.primary, -30),
    icon: info.icon,
    name: info.name,
    description: info.description
  };
}

/**
 * Sector performance color mapping
 */
export function getPerformanceColor(change: number): string {
  if (change > 5) return '#10B981'; // Strong positive (green)
  if (change > 0) return '#84CC16'; // Positive (light green)
  if (change === 0) return '#6B7280'; // Neutral (gray)
  if (change > -5) return '#F59E0B'; // Negative (orange)
  return '#EF4444'; // Strong negative (red)
}

/**
 * Format sector name for display
 */
export function formatSectorName(sector: Sector, short: boolean = false): string {
  if (short) {
    const shortNames: Record<Sector, string> = {
      [Sector.COMMUNICATION_SERVICES]: 'Comm Services',
      [Sector.CONSUMER_DISCRETIONARY]: 'Cons Discret',
      [Sector.CONSUMER_STAPLES]: 'Cons Staples',
      [Sector.ENERGY]: 'Energy',
      [Sector.FINANCIALS]: 'Financials',
      [Sector.HEALTHCARE]: 'Healthcare',
      [Sector.INDUSTRIALS]: 'Industrials',
      [Sector.INFORMATION_TECHNOLOGY]: 'Tech',
      [Sector.MATERIALS]: 'Materials',
      [Sector.REAL_ESTATE]: 'Real Estate',
      [Sector.UTILITIES]: 'Utilities',
      [Sector.OTHER]: 'Other'
    };
    return shortNames[sector] || sector;
  }
  
  return sector;
}

/**
 * Get sector icon with fallback
 */
export function getSectorIcon(sector: Sector): string {
  return SECTOR_INFO[sector]?.icon || '📊';
}

/**
 * Validate sector enum
 */
export function isValidSector(value: string): value is Sector {
  return Object.values(Sector).includes(value as Sector);
}

/**
 * Get random sector for testing
 */
export function getRandomSector(): Sector {
  const sectors = Object.values(Sector);
  return sectors[Math.floor(Math.random() * sectors.length)];
}

/**
 * Sort sectors by preference (most common/important first)
 */
export function sortSectorsByImportance(sectors: Sector[]): Sector[] {
  const importance: Record<Sector, number> = {
    [Sector.INFORMATION_TECHNOLOGY]: 1,
    [Sector.FINANCIALS]: 2,
    [Sector.HEALTHCARE]: 3,
    [Sector.CONSUMER_DISCRETIONARY]: 4,
    [Sector.COMMUNICATION_SERVICES]: 5,
    [Sector.INDUSTRIALS]: 6,
    [Sector.CONSUMER_STAPLES]: 7,
    [Sector.ENERGY]: 8,
    [Sector.MATERIALS]: 9,
    [Sector.UTILITIES]: 10,
    [Sector.REAL_ESTATE]: 11,
    [Sector.OTHER]: 12
  };
  
  return [...sectors].sort((a, b) => 
    (importance[a] || 999) - (importance[b] || 999)
  );
}