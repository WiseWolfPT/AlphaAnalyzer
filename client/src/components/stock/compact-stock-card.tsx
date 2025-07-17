/**
 * @deprecated This component has been replaced by UnifiedStockCard.
 * Please use UnifiedStockCard with variant="compact" instead.
 * This wrapper will be removed in a future version.
 */

import { memo } from "react";
import { UnifiedStockCard } from "./unified-stock-card";
import type { StockCardProps } from "./types";

export const CompactStockCard = memo(function CompactStockCard({ 
  symbol, 
  onPerformanceClick, 
  onQuickInfoClick,
  onRemove,
  showRemove = false
}: StockCardProps) {
  // Deprecation warning
  console.warn(
    '🔄 DEPRECATED: CompactStockCard is deprecated. Please use UnifiedStockCard with variant="compact" instead. ' +
    'This component will be removed in a future version. ' +
    'Migration: <UnifiedStockCard symbol={symbol} variant="compact" showRemove={showRemove} onPerformanceClick={onPerformanceClick} onQuickInfoClick={onQuickInfoClick} onRemove={onRemove} />'
  );

  return (
    <UnifiedStockCard
      symbol={symbol}
      variant="compact"
      showRemove={showRemove}
      showActions={true}
      onPerformanceClick={onPerformanceClick}
      onQuickInfoClick={onQuickInfoClick}
      onRemove={onRemove}
    />
  );
});