import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioPerformanceCard } from '../portfolio-performance-card';
import { usePortfolio } from '../../../hooks/use-portfolio';

// Mock the hook
jest.mock('../../../hooks/use-portfolio');

// Mock recharts to avoid canvas errors in tests
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('PortfolioPerformanceCard', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  it('should render loading state', () => {
    (usePortfolio as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-skeleton')).toBeInTheDocument();
  });
  
  it('should render portfolio data correctly', async () => {
    const mockData = {
      totalValue: 150000,
      totalCost: 120000,
      totalReturn: 30000,
      totalReturnPercent: 25,
      dayChange: 1500,
      dayChangePercent: 1.0,
      holdings: [
        { symbol: 'AAPL', value: 50000, shares: 300 },
        { symbol: 'GOOGL', value: 40000, shares: 20 },
        { symbol: 'MSFT', value: 60000, shares: 200 },
      ],
      performance: [
        { date: '2024-01-01', value: 120000 },
        { date: '2024-01-15', value: 135000 },
        { date: '2024-02-01', value: 150000 },
      ],
    };
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
      expect(screen.getByText('$150,000.00')).toBeInTheDocument();
      expect(screen.getByText('+$30,000.00')).toBeInTheDocument();
      expect(screen.getByText('(+25.00%)')).toBeInTheDocument();
    });
  });
  
  it('should render error state', () => {
    (usePortfolio as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch portfolio data'),
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    expect(screen.getByText('Error loading portfolio')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch portfolio data')).toBeInTheDocument();
  });
  
  it('should handle empty portfolio', () => {
    const mockData = {
      totalValue: 0,
      totalCost: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      holdings: [],
      performance: [],
    };
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    expect(screen.getByText('No holdings yet')).toBeInTheDocument();
    expect(screen.getByText('Add stocks to start tracking your portfolio')).toBeInTheDocument();
  });
  
  it('should display negative returns correctly', () => {
    const mockData = {
      totalValue: 90000,
      totalCost: 100000,
      totalReturn: -10000,
      totalReturnPercent: -10,
      dayChange: -500,
      dayChangePercent: -0.55,
      holdings: [
        { symbol: 'AAPL', value: 90000, shares: 300 },
      ],
      performance: [
        { date: '2024-01-01', value: 100000 },
        { date: '2024-01-15', value: 95000 },
        { date: '2024-02-01', value: 90000 },
      ],
    };
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    expect(screen.getByText('-$10,000.00')).toBeInTheDocument();
    expect(screen.getByText('(-10.00%)')).toBeInTheDocument();
    expect(screen.getByText('-$10,000.00').closest('div')).toHaveClass('text-red-600');
  });
  
  it('should toggle between value and percentage view', async () => {
    const user = userEvent.setup();
    
    const mockData = {
      totalValue: 150000,
      totalCost: 120000,
      totalReturn: 30000,
      totalReturnPercent: 25,
      dayChange: 1500,
      dayChangePercent: 1.0,
      holdings: [],
      performance: [],
    };
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    // Initially shows value
    expect(screen.getByText('+$30,000.00')).toBeInTheDocument();
    
    // Click toggle button
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);
    
    // Should now show percentage
    expect(screen.getByText('+25.00%')).toBeInTheDocument();
  });
  
  it('should refresh data on pull', async () => {
    const refetch = jest.fn();
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: { totalValue: 100000 },
      isLoading: false,
      error: null,
      refetch,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);
    
    expect(refetch).toHaveBeenCalled();
  });
  
  it('should format large numbers correctly', () => {
    const mockData = {
      totalValue: 1234567.89,
      totalCost: 1000000,
      totalReturn: 234567.89,
      totalReturnPercent: 23.46,
      holdings: [],
      performance: [],
    };
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    });
    
    render(<PortfolioPerformanceCard />, { wrapper });
    
    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
    expect(screen.getByText('+$234,567.89')).toBeInTheDocument();
  });
  
  it('should handle real-time updates', async () => {
    const initialData = {
      totalValue: 100000,
      totalReturn: 0,
      totalReturnPercent: 0,
    };
    
    const updatedData = {
      totalValue: 101000,
      totalReturn: 1000,
      totalReturnPercent: 1,
    };
    
    const { rerender } = render(<PortfolioPerformanceCard />, { wrapper });
    
    (usePortfolio as jest.Mock).mockReturnValue({
      data: initialData,
      isLoading: false,
      error: null,
    });
    
    rerender(<PortfolioPerformanceCard />);
    expect(screen.getByText('$100,000.00')).toBeInTheDocument();
    
    // Simulate real-time update
    (usePortfolio as jest.Mock).mockReturnValue({
      data: updatedData,
      isLoading: false,
      error: null,
    });
    
    rerender(<PortfolioPerformanceCard />);
    
    await waitFor(() => {
      expect(screen.getByText('$101,000.00')).toBeInTheDocument();
      expect(screen.getByText('+$1,000.00')).toBeInTheDocument();
    });
  });
});