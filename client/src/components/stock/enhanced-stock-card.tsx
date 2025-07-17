/**
 * @deprecated This component has been replaced by UnifiedStockCard.
 * Please use UnifiedStockCard with variant="enhanced" instead.
 * This wrapper will be removed in a future version.
 */

import { memo } from "react";
import { UnifiedStockCard } from "./unified-stock-card";
import type { StockCardProps } from "./types";

export const EnhancedStockCard = memo(function EnhancedStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick,
  onRemove,
  showRemove = false
}: StockCardProps) {
  // Deprecation warning
  console.warn(
    '🔄 DEPRECATED: EnhancedStockCard is deprecated. Please use UnifiedStockCard with variant="enhanced" instead. ' +
    'This component will be removed in a future version. ' +
    'Migration: <UnifiedStockCard symbol={symbol} variant="enhanced" showRemove={showRemove} onPerformanceClick={onPerformanceClick} onQuickInfoClick={onQuickInfoClick} onRemove={onRemove} />'
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