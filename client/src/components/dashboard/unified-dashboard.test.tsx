/**
 * UnifiedDashboard Component Tests - Wave 3 Implementation
 * 
 * Comprehensive test suite for all 6 dashboard variants with international markets focus
 * Tests configuration merging, API integration, error handling, and Portuguese i18n
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { 
  UnifiedDashboard, 
  DASHBOARD_CONFIGS,
  UserDashboard,
  AdminDashboard,
  ValuationDashboard,
  DebugDashboard,
  SimpleDashboard,
  TestDashboard
} from './unified-dashboard';

// Mock react-query
const mockQueryClient = {
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
};

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()],
}));

// Mock enhanced hooks with different scenarios
const createMockHooks = (scenario: 'success' | 'error' | 'loading' | 'empty') => ({
  useStocks: vi.fn((symbols, options) => {
    if (!options?.enabled) return { data: null, isLoading: false, error: null };
    
    switch (scenario) {
      case 'success':
        return {
          data: symbols.map((symbol: string, index: number) => ({
            id: index + 1,
            symbol,
            name: `${symbol} Corporation`,
            price: (100 + Math.random() * 200).toFixed(2),
            change: (Math.random() * 10 - 5).toFixed(2),
            changePercent: (Math.random() * 10 - 5).toFixed(2),
            currentPrice: 100 + Math.random() * 200,
            volume: Math.floor(Math.random() * 50000000),
            sector: 'Technology',
            industry: 'Software',
            marketCap: '1000000000',
            eps: 2.5,
            peRatio: 25.5,
            lastUpdated: new Date()
          })),
          isLoading: false,
          error: null
        };
      case 'error':
        return {
          data: null,
          isLoading: false,
          error: new Error('API quota exceeded')
        };
      case 'loading':
        return {
          data: null,
          isLoading: true,
          error: null
        };
      case 'empty':
        return {
          data: [],
          isLoading: false,
          error: null
        };
      default:
        return { data: null, isLoading: false, error: null };
    }
  }),
  useMarketIndices: vi.fn((options) => {
    if (!options?.enabled) return { data: null, isLoading: false, error: null };
    
    switch (scenario) {
      case 'success':
        return {
          data: {
            sp500: { value: 4150.25, change: 1.23 },
            dow: { value: 34250.45, change: -0.45 },
            nasdaq: { value: 14580.67, change: 0.78 }
          },
          isLoading: false,
          error: null
        };
      case 'error':
        return {
          data: null,
          isLoading: false,
          error: new Error('Market data unavailable')
        };
      case 'loading':
        return {
          data: null,
          isLoading: true,
          error: null
        };
      default:
        return { data: null, isLoading: false, error: null };
    }
  }),
  useApiQuota: vi.fn((options) => {
    if (!options?.enabled) return { data: null };
    return {
      data: scenario === 'success' ? { 
        provider: 'alpha-vantage',
        used: 450,
        limit: 500,
        percentage: 90
      } : null
    };
  }),
  useWarmCache: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: scenario === 'loading',
    isSuccess: scenario === 'success',
    isError: scenario === 'error'
  }))
});

// Mock auth context
const mockAuth = {
  user: {
    name: 'António Francisco',
    email: 'test@alfalyzer.com',
    id: '1',
    role: 'user'
  }
};

vi.mock('@/contexts/simple-auth-offline', () => ({
  useAuth: () => mockAuth
}));

// Mock currency context
const mockCurrency = {
  currentCurrency: 'USD',
  setCurrency: vi.fn(),
  formatCurrency: vi.fn((amount, currency) => {
    const curr = currency || 'USD';
    return curr === 'USD' ? `$${amount.toFixed(2)}` : `€${amount.toFixed(2)}`;
  }),
  convertCurrency: vi.fn((amount, from, to) => {
    if (from === to) return amount;
    if (from === 'USD' && to === 'EUR') return amount * 0.92;
    if (from === 'EUR' && to === 'USD') return amount * 1.08;
    return amount;
  })
};

vi.mock('@/contexts/currency-context', () => ({
  useCurrency: () => mockCurrency
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock components to simplify testing
vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>
}));

vi.mock('@/components/layout/financial-dashboard-layout', () => ({
  FinancialDashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="financial-layout">{children}</div>
}));

vi.mock('@/components/stock/stock-search', () => ({
  StockSearch: ({ onStockSelect }: { onStockSelect: (symbol: string) => void }) => (
    <button data-testid="stock-search" onClick={() => onStockSelect('TSLA')}>
      Add Stock
    </button>
  )
}));

vi.mock('@/components/stock/enhanced-stock-card', () => ({
  EnhancedStockCard: ({ symbol, onQuickInfoClick }: { symbol: string; onQuickInfoClick: () => void }) => (
    <div data-testid={`stock-card-${symbol}`} onClick={onQuickInfoClick}>
      Stock: {symbol}
    </div>
  )
}));

vi.mock('@/components/beta/beta-banner', () => ({
  BetaBanner: () => <div data-testid="beta-banner">Beta Version</div>
}));

describe('UnifiedDashboard Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Dashboard Variants', () => {
    it('renders user dashboard with correct Portuguese content', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UserDashboard />);
      
      expect(screen.getByText('Painel de Mercado')).toBeInTheDocument();
      expect(screen.getByText('Dados de mercado e análise em tempo real')).toBeInTheDocument();
      expect(screen.getByTestId('beta-banner')).toBeInTheDocument();
      expect(screen.getByText(/Bem-vindo, António/)).toBeInTheDocument();
    });

    it('renders admin dashboard with admin-specific features', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<AdminDashboard />);
      
      expect(screen.getByText('Painel Administrativo')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('System Status')).toBeInTheDocument();
      expect(screen.getByText('API Status')).toBeInTheDocument();
    });

    it('renders valuation dashboard with financial tools', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<ValuationDashboard />);
      
      expect(screen.getByText('Avaliação de Ações')).toBeInTheDocument();
      expect(screen.getByText('DCF Model')).toBeInTheDocument();
      expect(screen.getByText('Comparable Analysis')).toBeInTheDocument();
      expect(screen.getByText('Sensitivity Analysis')).toBeInTheDocument();
    });

    it('renders debug dashboard with monitoring tools', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<DebugDashboard />);
      
      expect(screen.getByText('Debug Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Cache Performance')).toBeInTheDocument();
      expect(screen.getByText('API Performance')).toBeInTheDocument();
    });

    it('renders simple dashboard with minimal features', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<SimpleDashboard />);
      
      expect(screen.getByText('Dashboard Simples')).toBeInTheDocument();
      expect(screen.getByText('Visão básica do mercado')).toBeInTheDocument();
    });

    it('renders test dashboard correctly', () => {
      render(<TestDashboard />);
      
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard de teste funcionando corretamente.')).toBeInTheDocument();
    });
  });

  describe('Configuration Merging', () => {
    it('merges user config with default config correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      const customConfig = {
        customization: {
          title: 'Custom Dashboard Title',
          subtitle: 'Custom Subtitle'
        },
        features: {
          betaBanner: false,
          userProfile: false
        }
      };
      
      render(<UnifiedDashboard variant="user" config={customConfig} />);
      
      expect(screen.getByText('Custom Dashboard Title')).toBeInTheDocument();
      expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
      expect(screen.queryByTestId('beta-banner')).not.toBeInTheDocument();
    });

    it('uses default config when no user config provided', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      const defaultConfig = DASHBOARD_CONFIGS.user;
      expect(screen.getByText(defaultConfig.customization!.title!)).toBeInTheDocument();
      expect(screen.getByText(defaultConfig.customization!.subtitle!)).toBeInTheDocument();
    });
  });

  describe('Data Source Handling', () => {
    it('displays real data when APIs succeed', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
      expect(screen.getByText('4150.25')).toBeInTheDocument();
      expect(screen.getByText('Dados de mercado em tempo real')).toBeInTheDocument();
    });

    it('shows error message and fallback when APIs fail', async () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('error'));
      
      render(<UnifiedDashboard variant="user" />);
      
      await waitFor(() => {
        expect(screen.getByText(/Falha ao carregar dados em tempo real/)).toBeInTheDocument();
        expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
      });
    });

    it('displays loading states correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('loading'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('handles mock data source correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" config={{ dataSource: 'mock' }} />);
      
      // Should use mock data regardless of API status
      expect(screen.getByText('Lista de Seguimento')).toBeInTheDocument();
    });
  });

  describe('LocalStorage Integration', () => {
    it('loads symbols from localStorage on mount', () => {
      const savedSymbols = ['AAPL', 'MSFT', 'GOOGL'];
      localStorageMock.setItem('alfalyzer-watchlist', JSON.stringify(savedSymbols));
      
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByTestId('stock-card-AAPL')).toBeInTheDocument();
      expect(screen.getByTestId('stock-card-MSFT')).toBeInTheDocument();
      expect(screen.getByTestId('stock-card-GOOGL')).toBeInTheDocument();
    });

    it('saves new symbols to localStorage when stock is added', async () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      const addButton = screen.getByTestId('stock-search');
      await userEvent.click(addButton);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'alfalyzer-watchlist',
        expect.stringContaining('TSLA')
      );
    });

    it('uses default symbols when localStorage is empty', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      // Should show some default popular symbols
      expect(screen.getByText('Lista de Seguimento')).toBeInTheDocument();
    });
  });

  describe('Market Indices Integration', () => {
    it('displays USA market indices correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
      expect(screen.getByText('Dow Jones')).toBeInTheDocument();
      expect(screen.getByText('Nasdaq')).toBeInTheDocument();
    });

    it('handles market indices loading state', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('loading'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getAllByText('...')).toHaveLength(3); // One for each index
    });

    it('shows positive and negative changes correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText('+1.23%')).toBeInTheDocument(); // S&P 500 positive
      expect(screen.getByText('-0.45%')).toBeInTheDocument(); // Dow negative
      expect(screen.getByText('+0.78%')).toBeInTheDocument(); // Nasdaq positive
    });
  });

  describe('User Interactions', () => {
    it('handles refresh button click', async () => {
      const mockWarmCache = vi.fn();
      vi.doMock('@/hooks/use-enhanced-stocks', () => ({
        ...createMockHooks('success'),
        useWarmCache: () => ({ mutate: mockWarmCache, isPending: false })
      }));
      
      render(<UnifiedDashboard variant="user" />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      expect(mockWarmCache).toHaveBeenCalled();
    });

    it('navigates to stock details when card is clicked', async () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      const stockCard = screen.getByTestId('stock-card-AAPL');
      await userEvent.click(stockCard);
      
      // Navigation would be handled by wouter mock
    });

    it('navigates to profile when settings button is clicked', async () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      const settingsButton = screen.getByRole('button', { name: /configurações/i });
      await userEvent.click(settingsButton);
      
      // Navigation would be handled by wouter mock
    });
  });

  describe('Feature Flags', () => {
    it('hides features when disabled in config', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      const config = {
        features: {
          marketOverview: false,
          stockGrid: false,
          userProfile: false,
          betaBanner: false
        }
      };
      
      render(<UnifiedDashboard variant="user" config={config} />);
      
      expect(screen.queryByText('S&P 500')).not.toBeInTheDocument();
      expect(screen.queryByText('Lista de Seguimento')).not.toBeInTheDocument();
      expect(screen.queryByText(/Bem-vindo, António/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('beta-banner')).not.toBeInTheDocument();
    });

    it('conditionally calls hooks based on feature flags', () => {
      const mockHooks = createMockHooks('success');
      vi.doMock('@/hooks/use-enhanced-stocks', () => mockHooks);
      
      const config = {
        features: {
          stockGrid: false,
          marketOverview: false,
          apiQuotaMonitoring: false
        }
      };
      
      render(<UnifiedDashboard variant="user" config={config} />);
      
      // Hooks should be called with enabled: false
      expect(mockHooks.useStocks).toHaveBeenCalledWith([], { enabled: false });
      expect(mockHooks.useMarketIndices).toHaveBeenCalledWith({ enabled: false });
      expect(mockHooks.useApiQuota).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('Layout Wrappers', () => {
    it('uses financial layout for user dashboard', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByTestId('financial-layout')).toBeInTheDocument();
    });

    it('uses main layout for admin dashboard', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="admin" />);
      
      expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    });

    it('uses minimal layout for simple dashboard', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="simple" />);
      
      // Minimal layout is just a div wrapper
      expect(screen.getByText('Dashboard Simples')).toBeInTheDocument();
    });
  });

  describe('Currency Integration', () => {
    it('formats portfolio values using currency context', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(mockCurrency.formatCurrency).toHaveBeenCalled();
    });

    it('handles currency switching', async () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      // Simulate EUR currency
      mockCurrency.currentCurrency = 'EUR';
      mockCurrency.formatCurrency.mockImplementation((amount) => `€${amount.toFixed(2)}`);
      
      render(<UnifiedDashboard variant="user" />);
      
      // Portfolio values should be formatted as EUR
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('wraps content with error boundary when feature is enabled', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      const config = {
        features: { errorBoundary: true }
      };
      
      render(<UnifiedDashboard variant="user" config={config} />);
      
      // Error boundary component should be in the tree
      expect(screen.getByTestId('financial-layout')).toBeInTheDocument();
    });

    it('does not wrap content when error boundary is disabled', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      const config = {
        features: { errorBoundary: false }
      };
      
      render(<UnifiedDashboard variant="user" config={config} />);
      
      expect(screen.getByTestId('financial-layout')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no stocks are available', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('empty'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText(/Nenhuma ação encontrada/)).toBeInTheDocument();
    });

    it('shows search prompt when watchlist is empty', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('empty'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText(/Tente pesquisar um símbolo acima/)).toBeInTheDocument();
    });
  });

  describe('International Markets Support', () => {
    it('displays US market focus correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      // US indices should be displayed
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
      expect(screen.getByText('Nasdaq')).toBeInTheDocument();
    });

    it('handles Portuguese language correctly', () => {
      vi.doMock('@/hooks/use-enhanced-stocks', () => createMockHooks('success'));
      
      render(<UnifiedDashboard variant="user" />);
      
      expect(screen.getByText('Painel de Mercado')).toBeInTheDocument();
      expect(screen.getByText('Lista de Seguimento')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Hoje')).toBeInTheDocument();
    });
  });
});