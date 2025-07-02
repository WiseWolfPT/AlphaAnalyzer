/**
 * Shared Types for Stock Components
 * 
 * This file contains common types and interfaces used across stock-related components
 * to ensure consistency and reduce duplication.
 */

/**
 * Standard props interface for stock card components
 */
export interface StockCardProps {
  /** Stock symbol (e.g., 'AAPL', 'MSFT') */
  symbol: string;
  /** Callback for performance analysis action */
  onPerformanceClick?: () => void;
  /** Callback for quick info modal action */
  onQuickInfoClick?: () => void;
  /** Callback for removing stock from watchlist/portfolio */
  onRemove?: () => void;
  /** Whether to show the remove button */
  showRemove?: boolean;
}

/**
 * Enhanced stock card props with additional valuation features
 */
export interface EnhancedStockCardProps extends StockCardProps {
  /** Whether to show valuation analysis */
  showValuation?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Compact stock card props for smaller card layouts
 */
export interface CompactStockCardProps extends StockCardProps {
  /** Custom CSS class name */
  className?: string;
}

/**
 * Stock list component props
 */
export interface StockListProps {
  /** Array of stock symbols to display */
  symbols: string[];
  /** Whether to show valuation information */
  showValuation?: boolean;
  /** Whether stocks can be removed from the list */
  allowRemove?: boolean;
  /** Callback when a stock is removed */
  onStockRemove?: (symbol: string) => void;
  /** Callback when a stock is clicked for details */
  onStockClick?: (symbol: string) => void;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Stock search component props
 */
export interface StockSearchProps {
  /** Callback when a stock is selected */
  onStockSelect: (symbol: string) => void;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Whether to show recent searches */
  showRecentSearches?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Stock performance modal props
 */
export interface StockPerformanceModalProps {
  /** Stock symbol */
  symbol: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Quick info modal props
 */
export interface QuickInfoModalProps {
  /** Stock symbol */
  symbol: string;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}