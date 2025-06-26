import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PortfolioService, type TransactionInput, type PortfolioSummary } from '@/services/portfolio-service';
import type { Transaction, PortfolioHolding } from '@shared/schema';

interface UsePortfolioOptions {
  portfolioId: number;
  initialTransactions?: Transaction[];
}

export function usePortfolio({ portfolioId, initialTransactions = [] }: UsePortfolioOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const queryClient = useQueryClient();
  
  // Portfolio service instance
  const portfolioService = useMemo(() => new PortfolioService(), []);
  
  // Calculate holdings from transactions
  const holdings = useMemo(() => {
    return portfolioService.calculateHoldings(transactions);
  }, [transactions, portfolioService]);
  
  // Get portfolio summary with real-time data
  const { 
    data: portfolioSummary, 
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery<PortfolioSummary>({
    queryKey: ['portfolio-summary', portfolioId, holdings],
    queryFn: async () => {
      return await portfolioService.calculatePortfolioSummary(holdings);
    },
    enabled: holdings.length > 0,
    staleTime: 30 * 1000, // Refresh every 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
  
  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (!portfolioSummary || transactions.length === 0) return null;
    return portfolioService.calculatePerformanceMetrics(portfolioSummary.positions, transactions);
  }, [portfolioSummary, transactions, portfolioService]);
  
  // Diversification metrics
  const diversificationMetrics = useMemo(() => {
    if (!portfolioSummary) return null;
    return portfolioService.calculateDiversification(portfolioSummary.positions);
  }, [portfolioSummary, portfolioService]);
  
  // Add new transaction
  const addTransaction = useCallback((transaction: TransactionInput) => {
    const newTransaction: Transaction = {
      id: Date.now() + Math.random(), // Mock ID - in real app, this would come from API
      ...transaction,
      quantity: transaction.quantity.toString(),
      price: transaction.price.toString(),
      fees: transaction.fees?.toString() || '0',
      createdAt: new Date()
    };
    
    setTransactions(prev => [...prev, newTransaction]);
    
    // Invalidate portfolio summary to trigger recalculation
    queryClient.invalidateQueries({ queryKey: ['portfolio-summary', portfolioId] });
    
    return newTransaction;
  }, [portfolioId, queryClient]);
  
  // Add multiple transactions (for CSV import)
  const addTransactions = useCallback((newTransactions: TransactionInput[]) => {
    const transactionsWithIds: Transaction[] = newTransactions.map(t => ({
      id: Date.now() + Math.random(),
      ...t,
      quantity: t.quantity.toString(),
      price: t.price.toString(),
      fees: t.fees?.toString() || '0',
      createdAt: new Date()
    }));
    
    setTransactions(prev => [...prev, ...transactionsWithIds]);
    
    // Invalidate portfolio summary to trigger recalculation
    queryClient.invalidateQueries({ queryKey: ['portfolio-summary', portfolioId] });
    
    return transactionsWithIds;
  }, [portfolioId, queryClient]);
  
  // Update transaction
  const updateTransaction = useCallback((transactionId: number, updates: Partial<TransactionInput>) => {
    setTransactions(prev => prev.map(t => 
      t.id === transactionId 
        ? {
            ...t,
            ...updates,
            quantity: updates.quantity?.toString() || t.quantity,
            price: updates.price?.toString() || t.price,
            fees: updates.fees?.toString() || t.fees
          }
        : t
    ));
    
    // Invalidate portfolio summary to trigger recalculation
    queryClient.invalidateQueries({ queryKey: ['portfolio-summary', portfolioId] });
  }, [portfolioId, queryClient]);
  
  // Delete transaction
  const deleteTransaction = useCallback((transactionId: number) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
    
    // Invalidate portfolio summary to trigger recalculation
    queryClient.invalidateQueries({ queryKey: ['portfolio-summary', portfolioId] });
  }, [portfolioId, queryClient]);
  
  // Get transactions for a specific symbol
  const getSymbolTransactions = useCallback((symbol: string) => {
    return transactions.filter(t => t.stockSymbol === symbol);
  }, [transactions]);
  
  // Get portfolio statistics
  const getPortfolioStats = useCallback(() => {
    const buyTransactions = transactions.filter(t => t.type === 'buy');
    const sellTransactions = transactions.filter(t => t.type === 'sell');
    const dividendTransactions = transactions.filter(t => t.type === 'dividend');
    
    const totalBuys = buyTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.quantity) * parseFloat(t.price) + parseFloat(t.fees || '0')), 0
    );
    
    const totalSells = sellTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.quantity) * parseFloat(t.price) - parseFloat(t.fees || '0')), 0
    );
    
    const totalDividends = dividendTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.quantity) * parseFloat(t.price)), 0
    );
    
    const totalFees = transactions.reduce((sum, t) => 
      sum + parseFloat(t.fees || '0'), 0
    );
    
    return {
      totalBuys,
      totalSells,
      totalDividends,
      totalFees,
      buyCount: buyTransactions.length,
      sellCount: sellTransactions.length,
      dividendCount: dividendTransactions.length,
      totalTransactions: transactions.length
    };
  }, [transactions]);
  
  // Export to CSV
  const exportToCSV = useCallback(() => {
    const csvContent = portfolioService.generateCSVTemplate();
    const transactionData = transactions.map(t => [
      new Date(t.executedAt).toISOString().split('T')[0],
      t.stockSymbol,
      t.type,
      t.quantity,
      t.price,
      t.fees || '0',
      t.notes || ''
    ]);
    
    const csvLines = [
      'symbol,type,quantity,price,date,fees,notes',
      ...transactionData.map(row => row.join(','))
    ];
    
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${portfolioId}-transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, portfolioId, portfolioService]);
  
  return {
    // Data
    transactions,
    holdings,
    portfolioSummary: portfolioSummary || {
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
      positions: []
    },
    performanceMetrics,
    diversificationMetrics,
    
    // Loading states
    isSummaryLoading,
    summaryError,
    
    // Actions
    addTransaction,
    addTransactions,
    updateTransaction,
    deleteTransaction,
    refetchSummary,
    exportToCSV,
    
    // Utilities
    getSymbolTransactions,
    getPortfolioStats,
    
    // Service
    portfolioService
  };
}