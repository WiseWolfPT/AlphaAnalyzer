import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { performanceMonitor } from '@/lib/performance-monitor';

// Types for portfolio state
export interface PortfolioHolding {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  addedAt: string;
  updatedAt: string;
  originalCurrency: string;
  sector?: string;
  marketCap?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalInvested: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  topPerformer?: {
    symbol: string;
    name: string;
    changePercent: number;
  };
  worstPerformer?: {
    symbol: string;
    name: string;
    changePercent: number;
  };
  sectorAllocation: {
    sector: string;
    percentage: number;
    value: number;
  }[];
  holdingsCount: number;
  lastUpdated: string;
}

export interface PortfolioPerformance {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  userId: string;
  isDefault: boolean;
  currency: string;
  createdAt: string;
  updatedAt: string;
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
  performance: PortfolioPerformance[];
}

export interface PortfolioState {
  // Current portfolios
  portfolios: Portfolio[];
  currentPortfolioId: string | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isLoadingPrices: boolean;
  
  // Error states
  error: string | null;
  
  // Real-time settings
  realTimeEnabled: boolean;
  lastPriceUpdate: string | null;
  
  // Portfolio actions
  createPortfolio: (data: { name: string; description?: string; currency?: string }) => Promise<Portfolio>;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  setCurrentPortfolio: (id: string) => void;
  
  // Holdings actions
  addHolding: (portfolioId: string, holding: Omit<PortfolioHolding, 'id' | 'portfolioId' | 'totalValue' | 'totalChange' | 'totalChangePercent' | 'addedAt' | 'updatedAt'>) => Promise<void>;
  updateHolding: (portfolioId: string, holdingId: string, updates: Partial<PortfolioHolding>) => Promise<void>;
  removeHolding: (portfolioId: string, holdingId: string) => Promise<void>;
  
  // Data refresh actions
  refreshPortfolio: (id: string) => Promise<void>;
  refreshAllPortfolios: () => Promise<void>;
  updatePrices: (portfolioId: string) => Promise<void>;
  
  // Real-time actions
  toggleRealTime: () => void;
  updateRealTimePrice: (symbol: string, price: number) => void;
  
  // Computed getters
  getCurrentPortfolio: () => Portfolio | null;
  getPortfolioById: (id: string) => Portfolio | null;
  getHoldingsByPortfolio: (portfolioId: string) => PortfolioHolding[];
  getTotalPortfolioValue: () => number;
  
  // Utility actions
  setError: (error: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  clearError: () => void;
}

// Helper functions
const generateId = () => `portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const calculateHoldingValue = (holding: PortfolioHolding): PortfolioHolding => {
  const totalValue = holding.quantity * holding.currentPrice;
  const totalInvested = holding.quantity * holding.averagePrice;
  const totalChange = totalValue - totalInvested;
  const totalChangePercent = totalInvested > 0 ? (totalChange / totalInvested) * 100 : 0;
  
  return {
    ...holding,
    totalValue,
    totalChange,
    totalChangePercent,
    updatedAt: new Date().toISOString(),
  };
};

const calculatePortfolioSummary = (holdings: PortfolioHolding[]): PortfolioSummary => {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.totalValue, 0);
  const totalInvested = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.averagePrice), 0);
  const totalChange = totalValue - totalInvested;
  const totalChangePercent = totalInvested > 0 ? (totalChange / totalInvested) * 100 : 0;
  
  // Calculate daily change (would need previous day's data in real app)
  const dailyChange = holdings.reduce((sum, holding) => sum + (holding.totalChange * 0.1), 0); // Mock daily change
  const dailyChangePercent = totalValue > 0 ? (dailyChange / totalValue) * 100 : 0;
  
  // Find top and worst performers
  const performers = holdings.map(h => ({ symbol: h.symbol, name: h.name, changePercent: h.totalChangePercent }));
  const topPerformer = performers.reduce((max, curr) => curr.changePercent > max.changePercent ? curr : max, performers[0]);
  const worstPerformer = performers.reduce((min, curr) => curr.changePercent < min.changePercent ? curr : min, performers[0]);
  
  // Calculate sector allocation
  const sectorMap = new Map<string, number>();
  holdings.forEach(holding => {
    const sector = holding.sector || 'Unknown';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + holding.totalValue);
  });
  
  const sectorAllocation = Array.from(sectorMap.entries()).map(([sector, value]) => ({
    sector,
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
  }));
  
  return {
    totalValue,
    totalChange,
    totalChangePercent,
    dailyChange,
    dailyChangePercent,
    totalInvested,
    unrealizedGainLoss: totalChange,
    unrealizedGainLossPercent: totalChangePercent,
    topPerformer: holdings.length > 0 ? topPerformer : undefined,
    worstPerformer: holdings.length > 0 ? worstPerformer : undefined,
    sectorAllocation,
    holdingsCount: holdings.length,
    lastUpdated: new Date().toISOString(),
  };
};

// Create the portfolio store
export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        portfolios: [],
        currentPortfolioId: null,
        isLoading: false,
        isSaving: false,
        isLoadingPrices: false,
        error: null,
        realTimeEnabled: false,
        lastPriceUpdate: null,

        // Portfolio actions
        createPortfolio: async (data) => {
          const startTime = performance.now();
          const { setIsSaving, setError } = get();
          
          try {
            setIsSaving(true);
            setError(null);
            
            const newPortfolio: Portfolio = {
              id: generateId(),
              name: data.name,
              description: data.description,
              userId: 'current-user', // This would come from auth
              isDefault: get().portfolios.length === 0,
              currency: data.currency || 'USD',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              holdings: [],
              summary: calculatePortfolioSummary([]),
              performance: [],
            };
            
            set((state) => {
              state.portfolios.push(newPortfolio);
              if (state.currentPortfolioId === null) {
                state.currentPortfolioId = newPortfolio.id;
              }
            });
            
            // Persist to backend (would be real API call)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            performanceMonitor.trackStoreUpdate('portfolio', performance.now() - startTime);
            return newPortfolio;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create portfolio';
            setError(errorMessage);
            throw error;
          } finally {
            setIsSaving(false);
          }
        },

        updatePortfolio: async (id, updates) => {
          const startTime = performance.now();
          const { setIsSaving, setError } = get();
          
          try {
            setIsSaving(true);
            setError(null);
            
            set((state) => {
              const portfolio = state.portfolios.find(p => p.id === id);
              if (portfolio) {
                Object.assign(portfolio, updates);
                portfolio.updatedAt = new Date().toISOString();
              }
            });
            
            // Persist to backend
            await new Promise(resolve => setTimeout(resolve, 300));
            
            performanceMonitor.trackStoreUpdate('portfolio', performance.now() - startTime);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update portfolio';
            setError(errorMessage);
            throw error;
          } finally {
            setIsSaving(false);
          }
        },

        deletePortfolio: async (id) => {
          const startTime = performance.now();
          const { setIsSaving, setError } = get();
          
          try {
            setIsSaving(true);
            setError(null);
            
            set((state) => {
              state.portfolios = state.portfolios.filter(p => p.id !== id);
              if (state.currentPortfolioId === id) {
                state.currentPortfolioId = state.portfolios.length > 0 ? state.portfolios[0].id : null;
              }
            });
            
            // Persist to backend
            await new Promise(resolve => setTimeout(resolve, 300));
            
            performanceMonitor.trackStoreUpdate('portfolio', performance.now() - startTime);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete portfolio';
            setError(errorMessage);
            throw error;
          } finally {
            setIsSaving(false);
          }
        },

        setCurrentPortfolio: (id) => {
          set((state) => {
            state.currentPortfolioId = id;
          });
        },

        // Holdings actions
        addHolding: async (portfolioId, holding) => {
          const startTime = performance.now();
          const { setIsSaving, setError } = get();
          
          try {
            setIsSaving(true);
            setError(null);
            
            const newHolding: PortfolioHolding = {
              ...holding,
              id: generateId(),
              portfolioId,
              totalValue: 0,
              totalChange: 0,
              totalChangePercent: 0,
              addedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            const calculatedHolding = calculateHoldingValue(newHolding);
            
            set((state) => {
              const portfolio = state.portfolios.find(p => p.id === portfolioId);
              if (portfolio) {
                portfolio.holdings.push(calculatedHolding);
                portfolio.summary = calculatePortfolioSummary(portfolio.holdings);
                portfolio.updatedAt = new Date().toISOString();
              }
            });
            
            // Persist to backend
            await new Promise(resolve => setTimeout(resolve, 400));
            
            performanceMonitor.trackStoreUpdate('portfolio', performance.now() - startTime);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add holding';
            setError(errorMessage);
            throw error;
          } finally {
            setIsSaving(false);
          }
        },

        updateHolding: async (portfolioId, holdingId, updates) => {
          const startTime = performance.now();
          const { setIsSaving, setError } = get();
          
          try {
            setIsSaving(true);
            setError(null);
            
            set((state) => {
              const portfolio = state.portfolios.find(p => p.id === portfolioId);
              if (portfolio) {
                const holding = portfolio.holdings.find(h => h.id === holdingId);
                if (holding) {
                  Object.assign(holding, updates);
                  const updatedHolding = calculateHoldingValue(holding);
                  Object.assign(holding, updatedHolding);
                  
                  portfolio.summary = calculatePortfolioSummary(portfolio.holdings);
                  portfolio.updatedAt = new Date().toISOString();
                }
              }
            });
            
            // Persist to backend
            await new Promise(resolve => setTimeout(resolve, 300));
            
            performanceMonitor.trackStoreUpdate('portfolio', performance.now() - startTime);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update holding';
            setError(errorMessage);
            throw error;
          } finally {
            setIsSaving(false);
          }
        },

        removeHolding: async (portfolioId, holdingId) => {
          const startTime = performance.now();
          const { setIsSaving, setError } = get();
          
          try {
            setIsSaving(true);
            setError(null);
            
            set((state) => {
              const portfolio = state.portfolios.find(p => p.id === portfolioId);
              if (portfolio) {
                portfolio.holdings = portfolio.holdings.filter(h => h.id !== holdingId);
                portfolio.summary = calculatePortfolioSummary(portfolio.holdings);
                portfolio.updatedAt = new Date().toISOString();
              }
            });
            
            // Persist to backend
            await new Promise(resolve => setTimeout(resolve, 300));
            
            performanceMonitor.trackStoreUpdate('portfolio', performance.now() - startTime);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to remove holding';
            setError(errorMessage);
            throw error;
          } finally {
            setIsSaving(false);
          }
        },

        // Data refresh actions
        refreshPortfolio: async (id) => {
          const { setIsLoading, setError } = get();
          
          try {
            setIsLoading(true);
            setError(null);
            
            // Fetch fresh data from API
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update prices for all holdings in the portfolio
            await get().updatePrices(id);
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to refresh portfolio';
            setError(errorMessage);
            throw error;
          } finally {
            setIsLoading(false);
          }
        },

        refreshAllPortfolios: async () => {
          const { portfolios } = get();
          const refreshPromises = portfolios.map(p => get().refreshPortfolio(p.id));
          await Promise.all(refreshPromises);
        },

        updatePrices: async (portfolioId) => {
          const { setIsLoadingPrices, setError } = get();
          
          try {
            setIsLoadingPrices(true);
            setError(null);
            
            // Simulate price updates
            set((state) => {
              const portfolio = state.portfolios.find(p => p.id === portfolioId);
              if (portfolio) {
                portfolio.holdings.forEach(holding => {
                  // Mock price update (would be real API call)
                  const priceChange = (Math.random() - 0.5) * 0.1; // ±5% random change
                  holding.currentPrice = holding.currentPrice * (1 + priceChange);
                  
                  const updatedHolding = calculateHoldingValue(holding);
                  Object.assign(holding, updatedHolding);
                });
                
                portfolio.summary = calculatePortfolioSummary(portfolio.holdings);
                portfolio.updatedAt = new Date().toISOString();
              }
              
              state.lastPriceUpdate = new Date().toISOString();
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update prices';
            setError(errorMessage);
            throw error;
          } finally {
            setIsLoadingPrices(false);
          }
        },

        // Real-time actions
        toggleRealTime: () => {
          set((state) => {
            state.realTimeEnabled = !state.realTimeEnabled;
          });
        },

        updateRealTimePrice: (symbol, price) => {
          set((state) => {
            state.portfolios.forEach(portfolio => {
              const holding = portfolio.holdings.find(h => h.symbol === symbol);
              if (holding) {
                holding.currentPrice = price;
                const updatedHolding = calculateHoldingValue(holding);
                Object.assign(holding, updatedHolding);
                
                portfolio.summary = calculatePortfolioSummary(portfolio.holdings);
                portfolio.updatedAt = new Date().toISOString();
              }
            });
            
            state.lastPriceUpdate = new Date().toISOString();
          });
        },

        // Computed getters
        getCurrentPortfolio: () => {
          const { portfolios, currentPortfolioId } = get();
          return portfolios.find(p => p.id === currentPortfolioId) || null;
        },

        getPortfolioById: (id) => {
          const { portfolios } = get();
          return portfolios.find(p => p.id === id) || null;
        },

        getHoldingsByPortfolio: (portfolioId) => {
          const portfolio = get().getPortfolioById(portfolioId);
          return portfolio ? portfolio.holdings : [];
        },

        getTotalPortfolioValue: () => {
          const { portfolios } = get();
          return portfolios.reduce((total, portfolio) => total + portfolio.summary.totalValue, 0);
        },

        // Utility actions
        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        setIsLoading: (isLoading) => {
          set((state) => {
            state.isLoading = isLoading;
          });
        },

        setIsSaving: (isSaving) => {
          set((state) => {
            state.isSaving = isSaving;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
      })),
      {
        name: 'alfalyzer-portfolio-store',
        partialize: (state) => ({
          portfolios: state.portfolios,
          currentPortfolioId: state.currentPortfolioId,
          realTimeEnabled: state.realTimeEnabled,
        }),
      }
    ),
    {
      name: 'portfolio-store',
    }
  )
);

// Selectors for commonly used state slices
export const usePortfolios = () => usePortfolioStore((state) => state.portfolios);
export const useCurrentPortfolio = () => usePortfolioStore((state) => state.getCurrentPortfolio());
export const usePortfolioLoading = () => usePortfolioStore((state) => ({
  isLoading: state.isLoading,
  isSaving: state.isSaving,
  isLoadingPrices: state.isLoadingPrices,
}));
export const usePortfolioError = () => usePortfolioStore((state) => state.error);
export const usePortfolioRealTime = () => usePortfolioStore((state) => ({
  realTimeEnabled: state.realTimeEnabled,
  lastPriceUpdate: state.lastPriceUpdate,
  toggleRealTime: state.toggleRealTime,
}));

// Action selectors
export const usePortfolioActions = () => usePortfolioStore((state) => ({
  createPortfolio: state.createPortfolio,
  updatePortfolio: state.updatePortfolio,
  deletePortfolio: state.deletePortfolio,
  setCurrentPortfolio: state.setCurrentPortfolio,
  addHolding: state.addHolding,
  updateHolding: state.updateHolding,
  removeHolding: state.removeHolding,
  refreshPortfolio: state.refreshPortfolio,
  refreshAllPortfolios: state.refreshAllPortfolios,
  updatePrices: state.updatePrices,
  updateRealTimePrice: state.updateRealTimePrice,
  clearError: state.clearError,
}));

// Computed selectors
export const usePortfolioSummary = () => usePortfolioStore((state) => {
  const currentPortfolio = state.getCurrentPortfolio();
  return currentPortfolio ? currentPortfolio.summary : null;
});

export const usePortfolioHoldings = () => usePortfolioStore((state) => {
  const currentPortfolio = state.getCurrentPortfolio();
  return currentPortfolio ? currentPortfolio.holdings : [];
});

export const useTotalPortfolioValue = () => usePortfolioStore((state) => state.getTotalPortfolioValue());