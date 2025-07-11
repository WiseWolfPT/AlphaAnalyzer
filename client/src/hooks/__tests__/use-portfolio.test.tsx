import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePortfolio } from '../use-portfolio';
import { PortfolioService } from '@/services/portfolio-service';
import type { Transaction } from '@shared/schema';

// Mock the PortfolioService
vi.mock('@/services/portfolio-service', () => ({
  PortfolioService: vi.fn(() => ({
    calculateHoldings: vi.fn(),
    calculatePortfolioSummary: vi.fn(),
    calculatePerformanceMetrics: vi.fn(),
    calculateDiversification: vi.fn(),
    generateCSVTemplate: vi.fn(),
    validateTransaction: vi.fn(),
  })),
}));

// Helper function to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePortfolio', () => {
  let mockPortfolioService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPortfolioService = {
      calculateHoldings: vi.fn(),
      calculatePortfolioSummary: vi.fn(),
      calculatePerformanceMetrics: vi.fn(),
      calculateDiversification: vi.fn(),
      generateCSVTemplate: vi.fn(),
      validateTransaction: vi.fn(),
    };
    
    (PortfolioService as any).mockImplementation(() => mockPortfolioService);
  });

  describe('initialization', () => {
    it('should initialize with empty transactions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      expect(result.current.transactions).toEqual([]);
      expect(result.current.holdings).toEqual([]);
    });

    it('should initialize with provided transactions', () => {
      const initialTransactions: Transaction[] = [
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          type: 'buy',
          quantity: '10',
          price: '150.00',
          fees: '9.99',
          executedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPortfolioService.calculateHoldings.mockReturnValue([
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          quantity: '10',
          averagePrice: '150.00',
          totalCost: '1509.99',
          lastUpdated: new Date(),
        },
      ]);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1, initialTransactions }),
        { wrapper }
      );

      expect(result.current.transactions).toEqual(initialTransactions);
      expect(mockPortfolioService.calculateHoldings).toHaveBeenCalledWith(initialTransactions);
    });

    it('should create portfolio service instance', () => {
      const wrapper = createWrapper();
      renderHook(() => usePortfolio({ portfolioId: 1 }), { wrapper });

      expect(PortfolioService).toHaveBeenCalledTimes(1);
    });
  });

  describe('holdings calculation', () => {
    it('should calculate holdings when transactions change', () => {
      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      const newTransactions: Transaction[] = [
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          type: 'buy',
          quantity: '10',
          price: '150.00',
          fees: '9.99',
          executedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPortfolioService.calculateHoldings.mockReturnValue([
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          quantity: '10',
          averagePrice: '150.00',
          totalCost: '1509.99',
          lastUpdated: new Date(),
        },
      ]);

      // Add a transaction
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        fees: 9.99,
        executedAt: new Date('2024-01-01'),
      });

      rerender();

      expect(mockPortfolioService.calculateHoldings).toHaveBeenCalled();
    });

    it('should recalculate holdings when transactions are updated', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      mockPortfolioService.calculateHoldings.mockReturnValue([]);

      // Add transaction
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      // Update transaction
      const transactionId = result.current.transactions[0].id;
      result.current.updateTransaction(transactionId, { quantity: 15 });

      expect(mockPortfolioService.calculateHoldings).toHaveBeenCalledTimes(3); // Initial + add + update
    });
  });

  describe('portfolio summary', () => {
    it('should fetch portfolio summary for non-empty holdings', async () => {
      const mockSummary = {
        totalValue: 1700,
        totalCost: 1500,
        totalGainLoss: 200,
        totalGainLossPercent: 13.33,
        dayChange: 50,
        dayChangePercent: 3.03,
        positions: [
          {
            symbol: 'AAPL',
            shares: 10,
            avgPrice: 150,
            currentPrice: 170,
            value: 1700,
            gainLoss: 200,
            gainLossPercent: 13.33,
            totalCost: 1500,
          },
        ],
      };

      mockPortfolioService.calculateHoldings.mockReturnValue([
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          quantity: '10',
          averagePrice: '150.00',
          totalCost: '1500.00',
          lastUpdated: new Date(),
        },
      ]);

      mockPortfolioService.calculatePortfolioSummary.mockResolvedValue(mockSummary);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction to create holdings
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      await waitFor(() => {
        expect(result.current.isSummaryLoading).toBe(false);
      });

      expect(result.current.portfolioSummary).toEqual(mockSummary);
    });

    it('should return default summary for empty holdings', async () => {
      mockPortfolioService.calculateHoldings.mockReturnValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      expect(result.current.portfolioSummary).toEqual({
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        positions: [],
      });
    });

    it('should handle portfolio summary errors', async () => {
      mockPortfolioService.calculateHoldings.mockReturnValue([
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          quantity: '10',
          averagePrice: '150.00',
          totalCost: '1500.00',
          lastUpdated: new Date(),
        },
      ]);

      mockPortfolioService.calculatePortfolioSummary.mockRejectedValue(
        new Error('API Error')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction to trigger summary calculation
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      await waitFor(() => {
        expect(result.current.summaryError).toBeTruthy();
      });
    });
  });

  describe('performance metrics', () => {
    it('should calculate performance metrics when summary is available', async () => {
      const mockSummary = {
        totalValue: 1700,
        totalCost: 1500,
        totalGainLoss: 200,
        totalGainLossPercent: 13.33,
        dayChange: 50,
        dayChangePercent: 3.03,
        positions: [
          {
            symbol: 'AAPL',
            shares: 10,
            avgPrice: 150,
            currentPrice: 170,
            value: 1700,
            gainLoss: 200,
            gainLossPercent: 13.33,
            totalCost: 1500,
          },
        ],
      };

      const mockMetrics = {
        totalReturn: 13.33,
        annualizedReturn: 48.65,
        sharpeRatio: 1.2,
        volatility: 15.0,
        maxDrawdown: 5.0,
      };

      mockPortfolioService.calculateHoldings.mockReturnValue([
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          quantity: '10',
          averagePrice: '150.00',
          totalCost: '1500.00',
          lastUpdated: new Date(),
        },
      ]);

      mockPortfolioService.calculatePortfolioSummary.mockResolvedValue(mockSummary);
      mockPortfolioService.calculatePerformanceMetrics.mockReturnValue(mockMetrics);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      await waitFor(() => {
        expect(result.current.performanceMetrics).toEqual(mockMetrics);
      });
    });

    it('should return null for performance metrics when no summary', () => {
      mockPortfolioService.calculateHoldings.mockReturnValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      expect(result.current.performanceMetrics).toBeNull();
    });
  });

  describe('diversification metrics', () => {
    it('should calculate diversification metrics when summary is available', async () => {
      const mockSummary = {
        totalValue: 1700,
        totalCost: 1500,
        totalGainLoss: 200,
        totalGainLossPercent: 13.33,
        dayChange: 50,
        dayChangePercent: 3.03,
        positions: [
          {
            symbol: 'AAPL',
            shares: 10,
            avgPrice: 150,
            currentPrice: 170,
            value: 1700,
            gainLoss: 200,
            gainLossPercent: 13.33,
            totalCost: 1500,
          },
        ],
      };

      const mockDiversification = {
        sectorAllocation: {},
        largestPosition: 100,
        numberOfHoldings: 1,
        concentrationRisk: 'high' as const,
      };

      mockPortfolioService.calculateHoldings.mockReturnValue([
        {
          id: 1,
          portfolioId: 1,
          stockSymbol: 'AAPL',
          quantity: '10',
          averagePrice: '150.00',
          totalCost: '1500.00',
          lastUpdated: new Date(),
        },
      ]);

      mockPortfolioService.calculatePortfolioSummary.mockResolvedValue(mockSummary);
      mockPortfolioService.calculateDiversification.mockReturnValue(mockDiversification);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      await waitFor(() => {
        expect(result.current.diversificationMetrics).toEqual(mockDiversification);
      });
    });

    it('should return null for diversification metrics when no summary', () => {
      mockPortfolioService.calculateHoldings.mockReturnValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      expect(result.current.diversificationMetrics).toBeNull();
    });
  });

  describe('transaction management', () => {
    it('should add single transaction', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      const transaction = {
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy' as const,
        quantity: 10,
        price: 150.00,
        fees: 9.99,
        executedAt: new Date('2024-01-01'),
      };

      const addedTransaction = result.current.addTransaction(transaction);

      expect(result.current.transactions).toHaveLength(1);
      expect(addedTransaction).toMatchObject({
        ...transaction,
        quantity: '10',
        price: '150.00',
        fees: '9.99',
        id: expect.any(Number),
        createdAt: expect.any(Date),
      });
    });

    it('should add multiple transactions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      const transactions = [
        {
          portfolioId: 1,
          stockSymbol: 'AAPL',
          type: 'buy' as const,
          quantity: 10,
          price: 150.00,
          executedAt: new Date('2024-01-01'),
        },
        {
          portfolioId: 1,
          stockSymbol: 'MSFT',
          type: 'buy' as const,
          quantity: 5,
          price: 300.00,
          executedAt: new Date('2024-01-02'),
        },
      ];

      const addedTransactions = result.current.addTransactions(transactions);

      expect(result.current.transactions).toHaveLength(2);
      expect(addedTransactions).toHaveLength(2);
    });

    it('should update transaction', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction first
      const addedTransaction = result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      // Update the transaction
      result.current.updateTransaction(addedTransaction.id, {
        quantity: 15,
        price: 160.00,
      });

      const updatedTransaction = result.current.transactions[0];
      expect(updatedTransaction.quantity).toBe('15');
      expect(updatedTransaction.price).toBe('160.00');
    });

    it('should delete transaction', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction first
      const addedTransaction = result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      expect(result.current.transactions).toHaveLength(1);

      // Delete the transaction
      result.current.deleteTransaction(addedTransaction.id);

      expect(result.current.transactions).toHaveLength(0);
    });
  });

  describe('utility functions', () => {
    it('should get symbol transactions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add transactions for different symbols
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        executedAt: new Date('2024-01-01'),
      });

      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'MSFT',
        type: 'buy',
        quantity: 5,
        price: 300.00,
        executedAt: new Date('2024-01-02'),
      });

      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'sell',
        quantity: 2,
        price: 170.00,
        executedAt: new Date('2024-01-03'),
      });

      const appleTransactions = result.current.getSymbolTransactions('AAPL');
      expect(appleTransactions).toHaveLength(2);
      expect(appleTransactions.every(t => t.stockSymbol === 'AAPL')).toBe(true);
    });

    it('should get portfolio statistics', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add various transaction types
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        fees: 9.99,
        executedAt: new Date('2024-01-01'),
      });

      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'sell',
        quantity: 2,
        price: 170.00,
        fees: 9.99,
        executedAt: new Date('2024-01-02'),
      });

      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'dividend',
        quantity: 8,
        price: 2.50,
        executedAt: new Date('2024-01-03'),
      });

      const stats = result.current.getPortfolioStats();

      expect(stats).toEqual({
        totalBuys: 1509.99, // 10 * 150 + 9.99
        totalSells: 330.01, // 2 * 170 - 9.99
        totalDividends: 20, // 8 * 2.50
        totalFees: 19.98, // 9.99 + 9.99
        buyCount: 1,
        sellCount: 1,
        dividendCount: 1,
        totalTransactions: 3,
      });
    });
  });

  describe('CSV export', () => {
    it('should export transactions to CSV', () => {
      mockPortfolioService.generateCSVTemplate.mockReturnValue('symbol,type,quantity,price,date,fees,notes');
      
      // Mock URL.createObjectURL and related functions
      const mockUrl = 'blob:mock-url';
      const mockCreateObjectURL = vi.fn().mockReturnValue(mockUrl);
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();
      
      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL,
        },
        writable: true,
      });

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
      };
      
      const mockCreateElement = vi.fn().mockReturnValue(mockAnchor);
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => usePortfolio({ portfolioId: 1 }),
        { wrapper }
      );

      // Add a transaction
      result.current.addTransaction({
        portfolioId: 1,
        stockSymbol: 'AAPL',
        type: 'buy',
        quantity: 10,
        price: 150.00,
        fees: 9.99,
        notes: 'Test transaction',
        executedAt: new Date('2024-01-01'),
      });

      result.current.exportToCSV();

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('portfolio-1-transactions.csv');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
  });
});