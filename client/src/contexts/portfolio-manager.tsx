import React, { createContext, useContext, useState, useEffect } from 'react';

export type TransactionType = 'buy' | 'sell' | 'dividend';

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string;
  notes?: string;
}

export interface Holding {
  symbol: string;
  shares: number;
  avgPrice: number;
  totalCost: number;
  transactions: Transaction[];
}

export interface Portfolio {
  id: string;
  name: string;
  createdAt: string;
  holdings: Record<string, Holding>;
  transactions: Transaction[];
}

interface PortfolioContextType {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  activePortfolio: Portfolio | null;
  createPortfolio: (name: string) => string;
  deletePortfolio: (id: string) => void;
  setActivePortfolio: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'portfolioId'>) => void;
  deleteTransaction: (transactionId: string) => void;
  getPortfolioStats: (portfolioId: string) => {
    totalCost: number;
    currentValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    totalDividends: number;
  } | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(() => {
    const saved = localStorage.getItem('alfalyzer-portfolios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(() => {
    const saved = localStorage.getItem('alfalyzer-active-portfolio');
    return saved || null;
  });

  // Save to localStorage whenever portfolios change
  useEffect(() => {
    localStorage.setItem('alfalyzer-portfolios', JSON.stringify(portfolios));
  }, [portfolios]);

  useEffect(() => {
    if (activePortfolioId) {
      localStorage.setItem('alfalyzer-active-portfolio', activePortfolioId);
    } else {
      localStorage.removeItem('alfalyzer-active-portfolio');
    }
  }, [activePortfolioId]);

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || null;

  const createPortfolio = (name: string): string => {
    const id = `portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newPortfolio: Portfolio = {
      id,
      name,
      createdAt: new Date().toISOString(),
      holdings: {},
      transactions: []
    };
    setPortfolios(prev => [...prev, newPortfolio]);
    setActivePortfolioId(id);
    return id;
  };

  const deletePortfolio = (id: string) => {
    setPortfolios(prev => prev.filter(p => p.id !== id));
    if (activePortfolioId === id) {
      setActivePortfolioId(portfolios.length > 1 ? portfolios[0].id : null);
    }
  };

  const setActivePortfolio = (id: string) => {
    if (portfolios.find(p => p.id === id)) {
      setActivePortfolioId(id);
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'portfolioId'>) => {
    if (!activePortfolioId) return;

    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullTransaction: Transaction = {
      ...transaction,
      id: transactionId,
      portfolioId: activePortfolioId
    };

    setPortfolios(prev => prev.map(portfolio => {
      if (portfolio.id !== activePortfolioId) return portfolio;

      const updatedTransactions = [...portfolio.transactions, fullTransaction];
      const updatedHoldings = { ...portfolio.holdings };

      // Update holdings based on transaction type
      const symbol = transaction.symbol;
      const currentHolding = updatedHoldings[symbol] || {
        symbol,
        shares: 0,
        avgPrice: 0,
        totalCost: 0,
        transactions: []
      };

      if (transaction.type === 'buy') {
        const newTotalCost = currentHolding.totalCost + (transaction.shares * transaction.price);
        const newTotalShares = currentHolding.shares + transaction.shares;
        updatedHoldings[symbol] = {
          ...currentHolding,
          shares: newTotalShares,
          avgPrice: newTotalShares > 0 ? newTotalCost / newTotalShares : 0,
          totalCost: newTotalCost,
          transactions: [...currentHolding.transactions, fullTransaction]
        };
      } else if (transaction.type === 'sell') {
        const newShares = Math.max(0, currentHolding.shares - transaction.shares);
        const soldValue = transaction.shares * currentHolding.avgPrice;
        const newTotalCost = Math.max(0, currentHolding.totalCost - soldValue);
        
        if (newShares === 0) {
          delete updatedHoldings[symbol];
        } else {
          updatedHoldings[symbol] = {
            ...currentHolding,
            shares: newShares,
            totalCost: newTotalCost,
            avgPrice: newShares > 0 ? newTotalCost / newShares : 0,
            transactions: [...currentHolding.transactions, fullTransaction]
          };
        }
      } else if (transaction.type === 'dividend') {
        // Dividends don't affect shares or cost basis
        updatedHoldings[symbol] = {
          ...currentHolding,
          transactions: [...currentHolding.transactions, fullTransaction]
        };
      }

      return {
        ...portfolio,
        transactions: updatedTransactions,
        holdings: updatedHoldings
      };
    }));
  };

  const deleteTransaction = (transactionId: string) => {
    setPortfolios(prev => prev.map(portfolio => {
      const transaction = portfolio.transactions.find(t => t.id === transactionId);
      if (!transaction) return portfolio;

      // Rebuild holdings from remaining transactions
      const remainingTransactions = portfolio.transactions.filter(t => t.id !== transactionId);
      const newHoldings: Record<string, Holding> = {};

      remainingTransactions.forEach(txn => {
        const symbol = txn.symbol;
        if (!newHoldings[symbol]) {
          newHoldings[symbol] = {
            symbol,
            shares: 0,
            avgPrice: 0,
            totalCost: 0,
            transactions: []
          };
        }

        if (txn.type === 'buy') {
          const holding = newHoldings[symbol];
          const newTotalCost = holding.totalCost + (txn.shares * txn.price);
          const newTotalShares = holding.shares + txn.shares;
          newHoldings[symbol] = {
            ...holding,
            shares: newTotalShares,
            avgPrice: newTotalShares > 0 ? newTotalCost / newTotalShares : 0,
            totalCost: newTotalCost,
            transactions: [...holding.transactions, txn]
          };
        } else if (txn.type === 'sell') {
          const holding = newHoldings[symbol];
          const newShares = Math.max(0, holding.shares - txn.shares);
          const soldValue = txn.shares * holding.avgPrice;
          const newTotalCost = Math.max(0, holding.totalCost - soldValue);
          
          if (newShares > 0) {
            newHoldings[symbol] = {
              ...holding,
              shares: newShares,
              totalCost: newTotalCost,
              avgPrice: newShares > 0 ? newTotalCost / newShares : 0,
              transactions: [...holding.transactions, txn]
            };
          }
        } else if (txn.type === 'dividend') {
          newHoldings[symbol].transactions.push(txn);
        }
      });

      return {
        ...portfolio,
        transactions: remainingTransactions,
        holdings: newHoldings
      };
    }));
  };

  const getPortfolioStats = (portfolioId: string) => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (!portfolio) return null;

    let totalCost = 0;
    let totalDividends = 0;

    Object.values(portfolio.holdings).forEach(holding => {
      totalCost += holding.totalCost;
    });

    portfolio.transactions.forEach(txn => {
      if (txn.type === 'dividend') {
        totalDividends += txn.shares * txn.price; // For dividends, shares = amount per share
      }
    });

    // Note: currentValue needs to be calculated with real-time prices
    // This is a placeholder - actual implementation would fetch current prices
    const currentValue = totalCost * 1.1; // Placeholder: 10% gain
    const totalGainLoss = currentValue - totalCost + totalDividends;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalCost,
      currentValue,
      totalGainLoss,
      totalGainLossPercent,
      totalDividends
    };
  };

  return (
    <PortfolioContext.Provider value={{
      portfolios,
      activePortfolioId,
      activePortfolio,
      createPortfolio,
      deletePortfolio,
      setActivePortfolio,
      addTransaction,
      deleteTransaction,
      getPortfolioStats
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioManager() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioManager must be used within a PortfolioProvider');
  }
  return context;
}