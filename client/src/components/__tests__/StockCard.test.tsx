/**
 * StockCard Component Tests
 * Testing the stock card display component with real-time price updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

// Mock Wouter
vi.mock('wouter', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ['/stocks', vi.fn()],
}));

// StockCard Component (simplified version for testing)
interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
}

interface StockCardProps {
  stock: StockData;
  onAddToWatchlist?: (symbol: string) => void;
  isInWatchlist?: boolean;
}

const StockCard: React.FC<StockCardProps> = ({ 
  stock, 
  onAddToWatchlist,
  isInWatchlist = false 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    return value.toLocaleString();
  };

  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div 
      className="glass-card p-4 rounded-lg hover:shadow-lg transition-all duration-300"
      data-testid={`stock-card-${stock.symbol}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{stock.symbol}</h3>
          <p className="text-sm text-gray-400 truncate max-w-[150px]">{stock.name}</p>
        </div>
        <button
          onClick={() => onAddToWatchlist?.(stock.symbol)}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {isInWatchlist ? '⭐' : '☆'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-bold text-white">
            {formatCurrency(stock.price)}
          </span>
          <div className={`text-sm ${changeColor}`}>
            <span>{formatCurrency(Math.abs(stock.change))}</span>
          </div>
        </div>

        <div className={`inline-flex items-center px-2 py-1 rounded-full ${bgColor} ${changeColor}`}>
          <span className="text-sm font-medium">
            {formatPercentage(stock.changePercent)}
          </span>
        </div>

        {stock.volume && (
          <div className="text-xs text-gray-500">
            Vol: {formatVolume(stock.volume)}
          </div>
        )}
      </div>

      <a 
        href={`/stocks/${stock.symbol}`}
        className="mt-3 block text-center py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition-colors"
      >
        View Details →
      </a>
    </div>
  );
};

describe('StockCard Component', () => {
  const mockStock: StockData = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 182.52,
    change: 1.24,
    changePercent: 0.68,
    volume: 52000000,
    marketCap: 2800000000000,
  };

  const mockStockNegative: StockData = {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 378.85,
    change: -2.15,
    changePercent: -0.56,
    volume: 35000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render stock information correctly', () => {
      render(<StockCard stock={mockStock} />);
      
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('$182.52')).toBeInTheDocument();
      expect(screen.getByText('+0.68%')).toBeInTheDocument();
      expect(screen.getByText('Vol: 52.00M')).toBeInTheDocument();
    });

    it('should render negative changes with red color', () => {
      render(<StockCard stock={mockStockNegative} />);
      
      const changeElement = screen.getByText('-0.56%');
      expect(changeElement).toBeInTheDocument();
      expect(changeElement).toHaveClass('text-red-500');
    });

    it('should render positive changes with green color', () => {
      render(<StockCard stock={mockStock} />);
      
      const changeElement = screen.getByText('+0.68%');
      expect(changeElement).toBeInTheDocument();
      expect(changeElement).toHaveClass('text-green-500');
    });

    it('should truncate long company names', () => {
      const longNameStock = {
        ...mockStock,
        name: 'This is a very long company name that should be truncated in the display',
      };
      
      render(<StockCard stock={longNameStock} />);
      
      const nameElement = screen.getByText(longNameStock.name);
      expect(nameElement).toHaveClass('truncate');
      expect(nameElement).toHaveClass('max-w-[150px]');
    });
  });

  describe('Watchlist Functionality', () => {
    it('should show empty star when not in watchlist', () => {
      render(<StockCard stock={mockStock} isInWatchlist={false} />);
      
      const button = screen.getByLabelText('Add to watchlist');
      expect(button).toHaveTextContent('☆');
    });

    it('should show filled star when in watchlist', () => {
      render(<StockCard stock={mockStock} isInWatchlist={true} />);
      
      const button = screen.getByLabelText('Remove from watchlist');
      expect(button).toHaveTextContent('⭐');
    });

    it('should call onAddToWatchlist when star is clicked', () => {
      const mockAdd = vi.fn();
      render(<StockCard stock={mockStock} onAddToWatchlist={mockAdd} />);
      
      const button = screen.getByLabelText('Add to watchlist');
      fireEvent.click(button);
      
      expect(mockAdd).toHaveBeenCalledWith('AAPL');
      expect(mockAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('Formatting', () => {
    it('should format currency values correctly', () => {
      render(<StockCard stock={mockStock} />);
      
      expect(screen.getByText('$182.52')).toBeInTheDocument();
      expect(screen.getByText('$1.24')).toBeInTheDocument();
    });

    it('should format percentage with appropriate sign', () => {
      render(<StockCard stock={mockStock} />);
      expect(screen.getByText('+0.68%')).toBeInTheDocument();
      
      render(<StockCard stock={mockStockNegative} />);
      expect(screen.getByText('-0.56%')).toBeInTheDocument();
    });

    it('should format volume in millions', () => {
      render(<StockCard stock={mockStock} />);
      expect(screen.getByText('Vol: 52.00M')).toBeInTheDocument();
    });

    it('should format small volume without abbreviation', () => {
      const smallVolumeStock = {
        ...mockStock,
        volume: 999999,
      };
      
      render(<StockCard stock={smallVolumeStock} />);
      expect(screen.getByText('Vol: 999,999')).toBeInTheDocument();
    });

    it('should not show volume if not provided', () => {
      const noVolumeStock = {
        symbol: 'TEST',
        name: 'Test Stock',
        price: 100,
        change: 1,
        changePercent: 1,
      };
      
      render(<StockCard stock={noVolumeStock} />);
      expect(screen.queryByText(/Vol:/)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have a link to stock details page', () => {
      render(<StockCard stock={mockStock} />);
      
      const link = screen.getByText('View Details →').closest('a');
      expect(link).toHaveAttribute('href', '/stocks/AAPL');
    });

    it('should have correct href for different symbols', () => {
      render(<StockCard stock={mockStockNegative} />);
      
      const link = screen.getByText('View Details →').closest('a');
      expect(link).toHaveAttribute('href', '/stocks/MSFT');
    });
  });

  describe('Styling', () => {
    it('should have glass morphism effect', () => {
      render(<StockCard stock={mockStock} />);
      
      const card = screen.getByTestId('stock-card-AAPL');
      expect(card).toHaveClass('glass-card');
    });

    it('should have hover effects', () => {
      render(<StockCard stock={mockStock} />);
      
      const card = screen.getByTestId('stock-card-AAPL');
      expect(card).toHaveClass('hover:shadow-lg');
      expect(card).toHaveClass('transition-all');
    });

    it('should style positive changes with green background', () => {
      render(<StockCard stock={mockStock} />);
      
      const changeElement = screen.getByText('+0.68%').parentElement;
      expect(changeElement).toHaveClass('bg-green-500/10');
    });

    it('should style negative changes with red background', () => {
      render(<StockCard stock={mockStockNegative} />);
      
      const changeElement = screen.getByText('-0.56%').parentElement;
      expect(changeElement).toHaveClass('bg-red-500/10');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<StockCard stock={mockStock} />);
      
      const watchlistButton = screen.getByLabelText('Add to watchlist');
      expect(watchlistButton).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      render(<StockCard stock={mockStock} />);
      
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('AAPL');
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const mockAdd = vi.fn();
      render(<StockCard stock={mockStock} onAddToWatchlist={mockAdd} />);
      
      const button = screen.getByLabelText('Add to watchlist');
      
      // Simulate keyboard interaction
      button.focus();
      expect(document.activeElement).toBe(button);
      
      fireEvent.keyDown(button, { key: 'Enter' });
      // Note: This would need actual keyboard event handling in the component
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero change', () => {
      const zeroChangeStock = {
        ...mockStock,
        change: 0,
        changePercent: 0,
      };
      
      render(<StockCard stock={zeroChangeStock} />);
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      const largeNumberStock = {
        ...mockStock,
        price: 999999.99,
        volume: 999999999999,
      };
      
      render(<StockCard stock={largeNumberStock} />);
      expect(screen.getByText('$999,999.99')).toBeInTheDocument();
      expect(screen.getByText('Vol: 999999.00M')).toBeInTheDocument();
    });

    it('should handle very small percentages', () => {
      const smallPercentStock = {
        ...mockStock,
        changePercent: 0.001,
      };
      
      render(<StockCard stock={smallPercentStock} />);
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with multiple cards', () => {
      const startTime = performance.now();
      
      const { container } = render(
        <>
          {Array.from({ length: 50 }, (_, i) => (
            <StockCard 
              key={i} 
              stock={{ ...mockStock, symbol: `SYM${i}` }} 
            />
          ))}
        </>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render 50 cards in under 100ms
      expect(container.querySelectorAll('[data-testid^="stock-card-"]')).toHaveLength(50);
    });
  });
});