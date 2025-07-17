/**
 * @deprecated This component has been replaced by UnifiedStockCard.
 * Please use UnifiedStockCard with variant="enhanced" and showValuation={true} instead.
 * This wrapper will be removed in a future version.
 */

import { memo } from "react";
import { UnifiedStockCard } from "./unified-stock-card";
import type { StockCardProps } from "./types";

export const EnhancedStockCardWithValuation = memo(function EnhancedStockCardWithValuation({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick,
  onRemove,
  showRemove = false
}: StockCardProps) {
  // Deprecation warning
  console.warn(
    '🔄 DEPRECATED: EnhancedStockCardWithValuation is deprecated. Please use UnifiedStockCard with variant="enhanced" and showValuation={true} instead. ' +
    'This component will be removed in a future version. ' +
    'Migration: <UnifiedStockCard symbol={symbol} variant="enhanced" showValuation={true} showRemove={showRemove} onPerformanceClick={onPerformanceClick} onQuickInfoClick={onQuickInfoClick} onRemove={onRemove} />'
  );

  return (
    <UnifiedStockCard
      symbol={symbol}
      variant="enhanced"
      showMiniChart={true}
      showValuation={true}
      showRemove={showRemove}
      showActions={true}
      onPerformanceClick={onPerformanceClick}
      onQuickInfoClick={onQuickInfoClick}
      onRemove={onRemove}
    />
  );
});