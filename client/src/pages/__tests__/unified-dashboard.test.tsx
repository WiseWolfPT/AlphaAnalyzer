/**
 * ALFALYZER - UNIFIED DASHBOARD TESTS
 * Testes unitários para o dashboard unificado
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import UnifiedDashboard from '../unified-dashboard';
import { AuthProvider } from '@/contexts/simple-auth-offline';
import '@testing-library/jest-dom';

// Mock das dependências
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/services/real-data-integration', () => ({
  realDataService: {
    searchStocks: vi.fn().mockResolvedValue([]),
    getQuote: vi.fn().mockResolvedValue(null),
    getPopularStocks: vi.fn().mockResolvedValue([]),
    getMarketIndices: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/hooks/use-enhanced-stocks', () => ({
  useStocks: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useMarketIndices: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useApiQuota: vi.fn(() => ({
    data: { used: 0, limit: 100 },
    isLoading: false,
  })),
  useWarmCache: vi.fn(),
}));

// Configuração do QueryClient para testes
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

// Wrapper para renderização com providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('UnifiedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Renderização Básica', () => {
    it('deve renderizar o dashboard sem erros', () => {
      renderWithProviders(<UnifiedDashboard />);
      
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });

    it('deve mostrar o banner beta quando ativo', () => {
      renderWithProviders(<UnifiedDashboard />);
      
      const betaBanner = screen.queryByTestId('beta-banner');
      expect(betaBanner).toBeInTheDocument();
    });

    it('deve renderizar a barra de busca quando feature está ativa', () => {
      renderWithProviders(
        <UnifiedDashboard 
          features={['search']} 
        />
      );
      
      expect(screen.getByPlaceholderText(/search stocks/i)).toBeInTheDocument();
    });
  });

  describe('Variantes do Dashboard', () => {
    it('deve renderizar variante básica corretamente', () => {
      renderWithProviders(
        <UnifiedDashboard variant="basic" />
      );
      
      // Verificar elementos específicos da variante básica
      expect(screen.getByText(/popular stocks/i)).toBeInTheDocument();
    });

    it('deve renderizar variante enhanced com cards modulares', () => {
      renderWithProviders(
        <UnifiedDashboard 
          variant="enhanced"
          features={['topGainers', 'topLosers']} 
        />
      );
      
      expect(screen.getByTestId('top-gainers-card')).toBeInTheDocument();
      expect(screen.getByTestId('top-losers-card')).toBeInTheDocument();
    });

    it('deve renderizar variante modular com layout customizado', () => {
      renderWithProviders(
        <UnifiedDashboard 
          variant="modular"
          features={['portfolio', 'watchlistAlerts', 'news']} 
        />
      );
      
      expect(screen.getByTestId('portfolio-performance-card')).toBeInTheDocument();
      expect(screen.getByTestId('watchlist-alerts-card')).toBeInTheDocument();
      expect(screen.getByTestId('news-highlights-card')).toBeInTheDocument();
    });
  });

  describe('Integração com Dados Reais', () => {
    it('deve buscar dados reais quando useRealData é true', async () => {
      const mockRealDataService = await import('@/services/real-data-integration');
      const getPopularStocksSpy = vi.spyOn(mockRealDataService.realDataService, 'getPopularStocks');

      renderWithProviders(
        <UnifiedDashboard useRealData={true} />
      );
      
      await waitFor(() => {
        expect(getPopularStocksSpy).toHaveBeenCalled();
      });
    });

    it('deve usar dados mock quando useRealData é false', () => {
      renderWithProviders(
        <UnifiedDashboard useRealData={false} />
      );
      
      // Verificar que mostra dados mock
      expect(screen.getByText(/apple inc/i)).toBeInTheDocument();
      expect(screen.getByText(/microsoft corporation/i)).toBeInTheDocument();
    });

    it('deve mostrar estado de carregamento enquanto busca dados', () => {
      const useStocksMock = vi.fn(() => ({
        data: null,
        isLoading: true,
        error: null,
      }));
      
      vi.mocked(require('@/hooks/use-enhanced-stocks').useStocks).mockImplementation(useStocksMock);

      renderWithProviders(
        <UnifiedDashboard useRealData={true} />
      );
      
      expect(screen.getAllByTestId('stock-card-skeleton')).toHaveLength(15);
    });
  });

  describe('Interações do Usuário', () => {
    it('deve atualizar dados ao clicar no botão refresh', async () => {
      const refetchMock = vi.fn();
      vi.mocked(require('@/hooks/use-enhanced-stocks').useStocks).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: refetchMock,
      });

      renderWithProviders(
        <UnifiedDashboard features={['refresh']} />
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);
      
      expect(refetchMock).toHaveBeenCalled();
    });

    it('deve abrir modal de detalhes ao clicar em stock card', async () => {
      renderWithProviders(
        <UnifiedDashboard features={['quickInfo']} />
      );
      
      const stockCard = screen.getByText(/aapl/i).closest('[data-testid="stock-card"]');
      if (stockCard) {
        fireEvent.click(stockCard);
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('quick-info-modal')).toBeInTheDocument();
      });
    });

    it('deve filtrar stocks por setor quando tab é selecionada', async () => {
      renderWithProviders(
        <UnifiedDashboard features={['sectors']} />
      );
      
      const techTab = screen.getByRole('tab', { name: /technology/i });
      fireEvent.click(techTab);
      
      await waitFor(() => {
        const visibleCards = screen.getAllByTestId('stock-card');
        visibleCards.forEach(card => {
          expect(card).toHaveTextContent(/technology/i);
        });
      });
    });
  });

  describe('Estados de Erro', () => {
    it('deve mostrar mensagem de erro quando API falha', async () => {
      vi.mocked(require('@/hooks/use-enhanced-stocks').useStocks).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch stocks'),
      });

      renderWithProviders(
        <UnifiedDashboard useRealData={true} />
      );
      
      expect(screen.getByText(/failed to load stocks/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('deve mostrar estado offline quando sem conexão', () => {
      // Simular offline
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      renderWithProviders(
        <UnifiedDashboard />
      );
      
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });
  });

  describe('Features Específicas', () => {
    it('deve mostrar quota de API quando feature está ativa', () => {
      vi.mocked(require('@/hooks/use-enhanced-stocks').useApiQuota).mockReturnValue({
        data: { used: 75, limit: 100 },
        isLoading: false,
      });

      renderWithProviders(
        <UnifiedDashboard features={['apiQuota']} />
      );
      
      expect(screen.getByText(/api quota/i)).toBeInTheDocument();
      expect(screen.getByText(/75\/100/)).toBeInTheDocument();
    });

    it('deve mostrar índices de mercado quando feature está ativa', () => {
      vi.mocked(require('@/hooks/use-enhanced-stocks').useMarketIndices).mockReturnValue({
        data: [
          { symbol: 'SPY', price: 450.25, change: 1.2 },
          { symbol: 'DIA', price: 350.75, change: -0.5 },
        ],
        isLoading: false,
        error: null,
      });

      renderWithProviders(
        <UnifiedDashboard features={['marketIndices']} />
      );
      
      expect(screen.getByText(/market indices/i)).toBeInTheDocument();
      expect(screen.getByText(/spy/i)).toBeInTheDocument();
      expect(screen.getByText(/dia/i)).toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter estrutura de headings correta', () => {
      renderWithProviders(
        <UnifiedDashboard title="My Dashboard" />
      );
      
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('My Dashboard');
    });

    it('deve ter labels apropriados para controles interativos', () => {
      renderWithProviders(
        <UnifiedDashboard features={['search', 'refresh']} />
      );
      
      const searchInput = screen.getByLabelText(/search stocks/i);
      expect(searchInput).toBeInTheDocument();
      
      const refreshButton = screen.getByRole('button', { name: /refresh data/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('deve suportar navegação por teclado', () => {
      renderWithProviders(
        <UnifiedDashboard features={['sectors']} />
      );
      
      const firstTab = screen.getAllByRole('tab')[0];
      firstTab.focus();
      
      // Simular navegação com setas
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      
      const activeTab = document.activeElement;
      expect(activeTab).toHaveAttribute('role', 'tab');
    });
  });
});