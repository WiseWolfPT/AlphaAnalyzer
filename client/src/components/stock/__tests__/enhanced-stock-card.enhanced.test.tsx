/**
 * Comprehensive test suite for EnhancedStockCard component
 * Covers rendering states, user interactions, accessibility, and edge cases
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedStockCard } from '../enhanced-stock-card';

// Mock dependencies
jest.mock('wouter', () => ({
  useLocation: jest.fn(() => [null, jest.fn()]),
}));

// Mock the hooks and utilities
jest.mock('@/hooks/use-enhanced-stocks', () => ({
  useStock: jest.fn(),
  useIntrinsicValue: jest.fn(),
}));

jest.mock('@/lib/stock-data-normalizer', () => ({
  useNormalizedStock: jest.fn(),
  getStockPrice: jest.fn(),
  getStockChangePercent: jest.fn(),
  getStockChange: jest.fn(),
  isStockPositive: jest.fn(),
}));

import { useStock, useIntrinsicValue } from '@/hooks/use-enhanced-stocks';
import { 
  useNormalizedStock, 
  getStockPrice, 
  getStockChangePercent, 
  getStockChange, 
  isStockPositive 
} from '@/lib/stock-data-normalizer';
import { useLocation } from 'wouter';

const mockUseStock = useStock as jest.MockedFunction<typeof useStock>;
const mockUseIntrinsicValue = useIntrinsicValue as jest.MockedFunction<typeof useIntrinsicValue>;
const mockUseNormalizedStock = useNormalizedStock as jest.MockedFunction<typeof useNormalizedStock>;
const mockGetStockPrice = getStockPrice as jest.MockedFunction<typeof getStockPrice>;
const mockGetStockChangePercent = getStockChangePercent as jest.MockedFunction<typeof getStockChangePercent>;
const mockGetStockChange = getStockChange as jest.MockedFunction<typeof getStockChange>;
const mockIsStockPositive = isStockPositive as jest.MockedFunction<typeof isStockPositive>;
const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

describe('EnhancedStockCard - Critical Component Behaviors', () => {
  const mockSetLocation = jest.fn();
  
  const mockStock = {
    id: 1,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    price: 150.25,
    previousClose: 148.50,
    change: 1.75,
    changePercent: 1.18,
    volume: 52000000,
    marketCap: '2500000000000',
    high: 151.00,
    low: 149.00,
    open: 149.50,
    week52High: 180.00,
    week52Low: 120.00,
    industry: 'Consumer Electronics',
    eps: 6.05,
    peRatio: 24.8,
    logo: 'https://example.com/logo.png',
    lastUpdated: new Date()
  };

  const mockIntrinsicValue = {
    intrinsicValue: 165.50,
    futureEPS: 12.5,
    futurePrice: 310.0,
    presentValue: 220.0,
    deltaPercent: 10.17,
    valuation: 'overvalued' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue([null, mockSetLocation]);

    // Default mock implementations
    mockUseStock.mockReturnValue({
      data: mockStock,
      isLoading: false,
      error: null
    });

    mockUseIntrinsicValue.mockReturnValue({
      data: mockIntrinsicValue,
      isLoading: false
    });

    mockUseNormalizedStock.mockReturnValue(mockStock);
    mockGetStockPrice.mockReturnValue(150.25);
    mockGetStockChangePercent.mockReturnValue(1.18);
    mockGetStockChange.mockReturnValue(1.75);
    mockIsStockPositive.mockReturnValue(true);
  });

  describe('Loading States', () => {
    it('should render loading skeleton when stock data is loading', () => {
      mockUseStock.mockReturnValue({
        data: null,
        isLoading: true,
        error: null
      });

      render(<EnhancedStockCard symbol="AAPL" />);

      // Check for skeleton elements (they should have specific classes)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
      
      // Verify no real stock data is shown
      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      expect(screen.queryByText('$150.25')).not.toBeInTheDocument();
    });

    it('should render stock data when loading is complete', () => {
      render(<EnhancedStockCard symbol="AAPL" />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should render error state when stock loading fails', () => {
      mockUseStock.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch stock data')
      });

      render(<EnhancedStockCard symbol="INVALID" />);

      expect(screen.getByText('Failed to load stock data')).toBeInTheDocument();
      expect(screen.getByText('INVALID')).toBeInTheDocument();
    });

    it('should render error state when stock normalization returns null', () => {
      mockUseNormalizedStock.mockReturnValue(null);

      render(<EnhancedStockCard symbol="AAPL" />);

      expect(screen.getByText('Failed to load stock data')).toBeInTheDocument();
    });

    it('should apply error styling to card', () => {
      mockUseStock.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error')
      });

      const { container } = render(<EnhancedStockCard symbol="ERROR" />);
      const card = container.querySelector('.border-red-200');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Data Display and Formatting', () => {
    it('should display all required stock information correctly', () => {
      render(<EnhancedStockCard symbol="AAPL" />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
    });

    it('should display price and change information', () => {
      render(<EnhancedStockCard symbol="AAPL" />);

      // The actual values displayed depend on the mock functions
      // Just verify they are called with the right stock data
      expect(mockGetStockPrice).toHaveBeenCalledWith(mockStock);
      expect(mockGetStockChange).toHaveBeenCalledWith(mockStock);
      expect(mockGetStockChangePercent).toHaveBeenCalledWith(mockStock);
    });

    it('should handle missing optional data gracefully', () => {
      const stockWithoutSector = { ...mockStock, sector: undefined };
      mockUseNormalizedStock.mockReturnValue(stockWithoutSector);

      render(<EnhancedStockCard symbol="AAPL" />);

      expect(screen.getByText('Stock')).toBeInTheDocument(); // Fallback sector
    });
  });

  describe('Visual Indicators and Styling', () => {
    it('should apply positive styling for positive stock changes', () => {
      mockIsStockPositive.mockReturnValue(true);

      render(<EnhancedStockCard symbol="AAPL" />);

      const positiveElements = document.querySelectorAll('.text-green-600');
      expect(positiveElements.length).toBeGreaterThan(0);
    });

    it('should apply negative styling for negative stock changes', () => {
      mockIsStockPositive.mockReturnValue(false);
      mockGetStockChange.mockReturnValue(-2.35);
      mockGetStockChangePercent.mockReturnValue(-1.54);

      render(<EnhancedStockCard symbol="AAPL" />);

      const negativeElements = document.querySelectorAll('.text-red-600');
      expect(negativeElements.length).toBeGreaterThan(0);
    });

    it('should display symbol logo correctly', () => {
      render(<EnhancedStockCard symbol="AAPL" />);

      expect(screen.getByText('AP')).toBeInTheDocument(); // First 2 letters of AAPL
    });
  });

  describe('User Interactions', () => {
    it('should call onQuickInfoClick when Info button is clicked', async () => {
      const mockOnQuickInfoClick = jest.fn();
      const user = userEvent.setup();

      render(
        <EnhancedStockCard 
          symbol="AAPL" 
          onQuickInfoClick={mockOnQuickInfoClick} 
        />
      );

      const infoButton = screen.getByRole('button', { 
        name: /View detailed information for AAPL/i 
      });

      await user.click(infoButton);

      expect(mockOnQuickInfoClick).toHaveBeenCalledTimes(1);
    });

    it('should navigate to charts when Charts button is clicked', async () => {
      const user = userEvent.setup();

      render(<EnhancedStockCard symbol="AAPL" />);

      const chartsButton = screen.getByRole('button', { 
        name: /View charts for AAPL/i 
      });

      await user.click(chartsButton);

      expect(mockSetLocation).toHaveBeenCalledWith('/stock/AAPL/charts');
    });

    it('should call onRemove when remove button is clicked', async () => {
      const mockOnRemove = jest.fn();
      const user = userEvent.setup();

      render(
        <EnhancedStockCard 
          symbol="AAPL" 
          onRemove={mockOnRemove}
          showRemove={true}
        />
      );

      const removeButton = screen.getByRole('button', { 
        name: /Remove AAPL from watchlist/i 
      });

      await user.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('AAPL');
    });

    it('should not show remove button when showRemove is false', () => {
      render(
        <EnhancedStockCard 
          symbol="AAPL" 
          onRemove={jest.fn()}
          showRemove={false}
        />
      );

      expect(screen.queryByRole('button', { 
        name: /Remove AAPL from watchlist/i 
      })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<EnhancedStockCard symbol="AAPL" />);

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Stock card for AAPL - Apple Inc.');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have accessible button labels', () => {
      render(<EnhancedStockCard symbol="AAPL" onRemove={jest.fn()} showRemove={true} />);

      expect(screen.getByRole('button', { 
        name: /View detailed information for AAPL/i 
      })).toBeInTheDocument();

      expect(screen.getByRole('button', { 
        name: /View charts for AAPL/i 
      })).toBeInTheDocument();

      expect(screen.getByRole('button', { 
        name: /Remove AAPL from watchlist/i 
      })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnQuickInfoClick = jest.fn();

      render(
        <EnhancedStockCard 
          symbol="AAPL" 
          onQuickInfoClick={mockOnQuickInfoClick} 
        />
      );

      const card = screen.getByRole('article');
      
      // Focus the card
      await user.tab();
      expect(card).toHaveFocus();

      // Tab to info button
      await user.tab();
      const infoButton = screen.getByRole('button', { 
        name: /View detailed information for AAPL/i 
      });
      expect(infoButton).toHaveFocus();

      // Activate with Enter
      await user.keyboard('{Enter}');
      expect(mockOnQuickInfoClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long stock names gracefully', () => {
      const longNameStock = {
        ...mockStock,
        name: 'A Very Long Company Name That Should Be Truncated Properly When Displayed in the Card Component'
      };
      mockUseNormalizedStock.mockReturnValue(longNameStock);

      render(<EnhancedStockCard symbol="LONG" />);

      const nameElement = screen.getByText(longNameStock.name);
      expect(nameElement).toHaveClass('line-clamp-1');
    });

    it('should handle zero values correctly', () => {
      mockGetStockPrice.mockReturnValue(0);
      mockGetStockChange.mockReturnValue(0);
      mockGetStockChangePercent.mockReturnValue(0);

      render(<EnhancedStockCard symbol="ZERO" />);

      expect(mockGetStockPrice).toHaveBeenCalled();
      expect(mockGetStockChange).toHaveBeenCalled();
      expect(mockGetStockChangePercent).toHaveBeenCalled();
    });

    it('should handle missing intrinsic value data', () => {
      mockUseIntrinsicValue.mockReturnValue({
        data: null,
        isLoading: false
      });

      render(<EnhancedStockCard symbol="AAPL" />);

      // Should still render the basic stock card
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    it('should handle undefined callback props gracefully', async () => {
      const user = userEvent.setup();

      render(<EnhancedStockCard symbol="AAPL" />);

      const infoButton = screen.getByRole('button', { 
        name: /View detailed information for AAPL/i 
      });

      // Should not throw when clicking without callback
      await user.click(infoButton);
      expect(mockSetLocation).not.toHaveBeenCalled();
    });

    it('should handle symbol changes during component lifecycle', () => {
      const { rerender } = render(<EnhancedStockCard symbol="AAPL" />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();

      // Change symbol
      const msftStock = { ...mockStock, symbol: 'MSFT', name: 'Microsoft Corporation' };
      mockUseNormalizedStock.mockReturnValue(msftStock);

      rerender(<EnhancedStockCard symbol="MSFT" />);

      expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
    });
  });
});