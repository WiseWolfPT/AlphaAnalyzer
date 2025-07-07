import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnhancedStockCard } from '../enhanced-stock-card';
import * as router from 'wouter';
import type { ReactNode } from 'react';

// Mock wouter
jest.mock('wouter', () => ({
  useLocation: jest.fn(() => ['/', jest.fn()]),
}));

// Mock dos hooks customizados
jest.mock('@/hooks/use-real-time-price', () => ({
  useRealTimePrice: jest.fn(() => ({
    data: {
      price: 150.25,
      change: 2.50,
      changePercent: 1.69,
      volume: 1000000,
      high: 152.00,
      low: 148.00,
    },
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/hooks/use-stock-fundamentals', () => ({
  useStockFundamentals: jest.fn(() => ({
    data: {
      marketCap: 2500000000000,
      pe: 25.5,
      eps: 5.89,
      dividend: 0.96,
      dividendYield: 0.64,
      beta: 1.2,
    },
    isLoading: false,
  })),
}));

describe('EnhancedStockCard', () => {
  let queryClient: QueryClient;
  const mockNavigate = jest.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
    (router.useLocation as jest.Mock).mockReturnValue(['/', mockNavigate]);
  });

  const defaultProps = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    onRemove: jest.fn(),
  };

  it('should render stock information correctly', () => {
    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
    expect(screen.getByText('+$2.50')).toBeInTheDocument();
    expect(screen.getByText('+1.69%')).toBeInTheDocument();
  });

  it('should show positive change with green color', () => {
    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    const changeElement = screen.getByText('+1.69%');
    expect(changeElement).toHaveClass('text-green-600');
  });

  it('should show negative change with red color', () => {
    const { useRealTimePrice } = require('@/hooks/use-real-time-price');
    useRealTimePrice.mockReturnValue({
      data: {
        price: 145.00,
        change: -5.00,
        changePercent: -3.33,
      },
      isLoading: false,
    });

    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    const changeElement = screen.getByText('-3.33%');
    expect(changeElement).toHaveClass('text-red-600');
  });

  it('should display loading skeleton when data is loading', () => {
    const { useRealTimePrice } = require('@/hooks/use-real-time-price');
    useRealTimePrice.mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    expect(screen.getByTestId('stock-card-skeleton')).toBeInTheDocument();
  });

  it('should navigate to stock details on click', () => {
    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    const card = screen.getByRole('article');
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/stock/AAPL/charts');
  });

  it('should call onRemove when remove button is clicked', () => {
    const onRemove = jest.fn();
    render(<EnhancedStockCard {...defaultProps} onRemove={onRemove} />, { wrapper });

    const removeButton = screen.getByLabelText('Remove from watchlist');
    fireEvent.click(removeButton);

    expect(onRemove).toHaveBeenCalledWith('AAPL');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not show remove button when onRemove is not provided', () => {
    render(<EnhancedStockCard symbol="AAPL" name="Apple Inc." />, { wrapper });

    expect(screen.queryByLabelText('Remove from watchlist')).not.toBeInTheDocument();
  });

  it('should display market cap in human readable format', () => {
    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    expect(screen.getByText('Market Cap')).toBeInTheDocument();
    expect(screen.getByText('$2.50T')).toBeInTheDocument();
  });

  it('should display fundamentals data', () => {
    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    expect(screen.getByText('P/E')).toBeInTheDocument();
    expect(screen.getByText('25.50')).toBeInTheDocument();
    
    expect(screen.getByText('EPS')).toBeInTheDocument();
    expect(screen.getByText('$5.89')).toBeInTheDocument();
    
    expect(screen.getByText('Div Yield')).toBeInTheDocument();
    expect(screen.getByText('0.64%')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', () => {
    const { useRealTimePrice } = require('@/hooks/use-real-time-price');
    useRealTimePrice.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error'),
    });

    render(<EnhancedStockCard {...defaultProps} />, { wrapper });

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  it('should update in real-time when enableRealTime is true', async () => {
    const { useRealTimePrice } = require('@/hooks/use-real-time-price');
    const mockUseRealTimePrice = jest.fn()
      .mockReturnValueOnce({
        data: { price: 150.00, change: 2.00, changePercent: 1.35 },
        isLoading: false,
      })
      .mockReturnValueOnce({
        data: { price: 151.00, change: 3.00, changePercent: 2.03 },
        isLoading: false,
      });

    useRealTimePrice.mockImplementation(mockUseRealTimePrice);

    const { rerender } = render(
      <EnhancedStockCard {...defaultProps} enableRealTime />,
      { wrapper }
    );

    expect(screen.getByText('$150.00')).toBeInTheDocument();

    // Simulate real-time update
    rerender(<EnhancedStockCard {...defaultProps} enableRealTime />);

    await waitFor(() => {
      expect(screen.getByText('$151.00')).toBeInTheDocument();
    });
  });
});