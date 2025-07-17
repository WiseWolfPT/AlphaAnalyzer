/**
 * @deprecated This component has been replaced by UnifiedStockCard.
 * Please use UnifiedStockCard with variant="standard" instead.
 * This wrapper will be removed in a future version.
 */

import { UnifiedStockCard } from "./unified-stock-card";
import type { Stock } from "@shared/schema";

interface StockCardProps {
  stock: Stock;
  onPerformanceClick: () => void;
  onQuickInfoClick: () => void;
  showMiniChart?: boolean;
}

export function StockCard({ stock, onPerformanceClick, onQuickInfoClick, showMiniChart = true }: StockCardProps) {
  // Deprecation warning
  console.warn(
    '🔄 DEPRECATED: StockCard is deprecated. Please use UnifiedStockCard with variant="standard" instead. ' +
    'This component will be removed in a future version. ' +
    'Migration: <UnifiedStockCard stock={stock} variant="standard" showMiniChart={showMiniChart} onPerformanceClick={onPerformanceClick} onQuickInfoClick={onQuickInfoClick} />'
  );

  return (
    <UnifiedStockCard
      stock={stock}
      variant="standard"
      showMiniChart={showMiniChart}
      showValuation={true}
      showActions={true}
      onPerformanceClick={onPerformanceClick}
      onQuickInfoClick={onQuickInfoClick}
    />
  );
}
