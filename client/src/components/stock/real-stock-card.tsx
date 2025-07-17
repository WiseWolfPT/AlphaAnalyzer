/**
 * @deprecated This component has been replaced by UnifiedStockCard.
 * Please use UnifiedStockCard with variant="enhanced" and useRealData={true} instead.
 * This wrapper will be removed in a future version.
 */

import { memo } from "react";
import { UnifiedStockCard } from "./unified-stock-card";

interface RealStockCardProps {
  symbol: string;
  onPerformanceClick?: () => void;
  onQuickInfoClick?: () => void;
  showMiniChart?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const RealStockCard = memo(function RealStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick, 
  showMiniChart = true,
  autoRefresh = true,
  refreshInterval = 30000
}: RealStockCardProps) {
  // Deprecation warning
  console.warn(
    '🔄 DEPRECATED: RealStockCard is deprecated. Please use UnifiedStockCard with variant="enhanced" and useRealData={true} instead. ' +
    'This component will be removed in a future version. ' +
    'Migration: <UnifiedStockCard symbol={symbol} variant="enhanced" useRealData={true} showMiniChart={showMiniChart} autoRefresh={autoRefresh} refreshInterval={refreshInterval} onPerformanceClick={onPerformanceClick} onQuickInfoClick={onQuickInfoClick} />'
  );

  return (
    <UnifiedStockCard
      symbol={symbol}
      variant="enhanced"
      useRealData={true}
      showMiniChart={showMiniChart}
      showValuation={true}
      showActions={true}
      autoRefresh={autoRefresh}
      refreshInterval={refreshInterval}
      onPerformanceClick={onPerformanceClick}
      onQuickInfoClick={onQuickInfoClick}
    />
  );
});