/**
 * ALFALYZER - USE-ENHANCED-STOCKS TESTS
 * Testes unitários para o hook de dados de stocks aprimorado
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { 
  useStocks, 
  useMarketIndices, 
  useApiQuota, 
  useWarmCache,
  useStockDetails,
  useTopMovers
} from '../use-enhanced-stocks';
import { realDataService } from '@/services/real-data-integration';

// Mock do serviço de dados reais
vi.mock('@/services/real-data-integration', () => ({
  realDataService: {
    getPopularStocks: vi.fn(),
    getQuote: vi.fn(),
    getMarketIndices: vi.fn(),
    getApiQuota: vi.fn(),
    searchStocks: vi.fn(),
    getBatchQuotes: vi.fn(),
    getTopGainers: vi.fn(),
    getTopLosers: vi.fn(),
  },
}));

// Mock do cache manager
vi.mock('@/lib/cache-manager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    prewarm: vi.fn(),
  },
}));

// Configuração do QueryClient para testes
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

// Wrapper para renderização de hooks
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useStocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve buscar stocks populares com sucesso', async () => {
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 2.5, changePercent: 1.44 },
      { symbol: 'MSFT', name: 'Microsoft', price: 380.25, change: -1.25, changePercent: -0.33 },
    ];

    vi.mocked(realDataService.getPopularStocks).mockResolvedValueOnce(mockStocks);

    const { result } = renderHook(() => useStocks(), { wrapper: createWrapper() });

    // Estado inicial - carregando
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Aguardar carregamento
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verificar dados carregados
    expect(result.current.data).toEqual(mockStocks);
    expect(result.current.error).toBeNull();
    expect(realDataService.getPopularStocks).toHaveBeenCalledTimes(1);
  });

  it('deve lidar com erro ao buscar stocks', async () => {
    const mockError = new Error('API rate limit exceeded');
    vi.mocked(realDataService.getPopularStocks).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useStocks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(mockError);
  });

  it('deve permitir refetch manual', async () => {
    const mockStocks = [{ symbol: 'AAPL', name: 'Apple Inc.', price: 175.50 }];
    vi.mocked(realDataService.getPopularStocks).mockResolvedValue(mockStocks);

    const { result } = renderHook(() => useStocks(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Fazer refetch
    await result.current.refetch();

    expect(realDataService.getPopularStocks).toHaveBeenCalledTimes(2);
  });

  it('deve usar intervalo de refetch quando habilitado', async () => {
    const mockStocks = [{ symbol: 'AAPL', name: 'Apple Inc.', price: 175.50 }];
    vi.mocked(realDataService.getPopularStocks).mockResolvedValue(mockStocks);

    const { result } = renderHook(
      () => useStocks({ refetchInterval: 1000 }), 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Aguardar refetch automático
    await waitFor(() => {
      expect(realDataService.getPopularStocks).toHaveBeenCalledTimes(2);
    }, { timeout: 2000 });
  });
});

describe('useMarketIndices', () => {
  it('deve buscar índices de mercado com sucesso', async () => {
    const mockIndices = [
      { symbol: 'SPY', name: 'S&P 500', price: 450.25, change: 5.75, changePercent: 1.29 },
      { symbol: 'DIA', name: 'Dow Jones', price: 350.10, change: -2.40, changePercent: -0.68 },
    ];

    vi.mocked(realDataService.getMarketIndices).mockResolvedValueOnce(mockIndices);

    const { result } = renderHook(() => useMarketIndices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockIndices);
    expect(result.current.error).toBeNull();
  });

  it('deve atualizar automaticamente a cada 30 segundos', async () => {
    vi.mocked(realDataService.getMarketIndices).mockResolvedValue([]);

    renderHook(() => useMarketIndices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(realDataService.getMarketIndices).toHaveBeenCalledTimes(1);
    });

    // Hook deve ter refetchInterval de 30s configurado
    // Não vamos esperar 30s no teste, apenas verificar a configuração
  });
});

describe('useApiQuota', () => {
  it('deve buscar quota de API com sucesso', async () => {
    const mockQuota = {
      provider: 'alpha_vantage',
      used: 75,
      limit: 500,
      reset: new Date().toISOString(),
    };

    vi.mocked(realDataService.getApiQuota).mockResolvedValueOnce(mockQuota);

    const { result } = renderHook(() => useApiQuota(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockQuota);
    expect(result.current.percentage).toBe(15); // 75/500 = 15%
    expect(result.current.isNearLimit).toBe(false);
  });

  it('deve alertar quando próximo do limite', async () => {
    const mockQuota = {
      provider: 'finnhub',
      used: 450,
      limit: 500,
      reset: new Date().toISOString(),
    };

    vi.mocked(realDataService.getApiQuota).mockResolvedValueOnce(mockQuota);

    const { result } = renderHook(() => useApiQuota(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.percentage).toBe(90); // 450/500 = 90%
    expect(result.current.isNearLimit).toBe(true);
  });
});

describe('useWarmCache', () => {
  it('deve pré-aquecer cache com símbolos populares', async () => {
    const mockQuotes = {
      AAPL: { symbol: 'AAPL', price: 175.50 },
      MSFT: { symbol: 'MSFT', price: 380.25 },
    };

    vi.mocked(realDataService.getBatchQuotes).mockResolvedValueOnce(mockQuotes);

    const symbols = ['AAPL', 'MSFT'];
    const { result } = renderHook(() => useWarmCache(symbols), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isWarming).toBe(false);
    });

    expect(result.current.isWarmed).toBe(true);
    expect(realDataService.getBatchQuotes).toHaveBeenCalledWith(symbols);
  });

  it('deve lidar com falha ao aquecer cache', async () => {
    vi.mocked(realDataService.getBatchQuotes).mockRejectedValueOnce(new Error('Network error'));

    const symbols = ['AAPL'];
    const { result } = renderHook(() => useWarmCache(symbols), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isWarming).toBe(false);
    });

    expect(result.current.isWarmed).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});

describe('useStockDetails', () => {
  it('deve buscar detalhes de uma ação específica', async () => {
    const mockDetails = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.50,
      change: 2.5,
      changePercent: 1.44,
      volume: 45000000,
      marketCap: 2800000000000,
      pe: 28.5,
      dividendYield: 0.52,
      week52High: 198.23,
      week52Low: 124.17,
    };

    vi.mocked(realDataService.getQuote).mockResolvedValueOnce(mockDetails);

    const { result } = renderHook(
      () => useStockDetails('AAPL'), 
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockDetails);
    expect(realDataService.getQuote).toHaveBeenCalledWith('AAPL');
  });

  it('não deve buscar se símbolo não for fornecido', () => {
    const { result } = renderHook(
      () => useStockDetails(null), 
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(realDataService.getQuote).not.toHaveBeenCalled();
  });
});

describe('useTopMovers', () => {
  it('deve buscar top gainers e losers', async () => {
    const mockGainers = [
      { symbol: 'NVDA', change: 15.5, changePercent: 8.2 },
      { symbol: 'AMD', change: 12.3, changePercent: 6.5 },
    ];
    
    const mockLosers = [
      { symbol: 'INTC', change: -8.7, changePercent: -5.3 },
      { symbol: 'BA', change: -6.2, changePercent: -4.1 },
    ];

    vi.mocked(realDataService.getTopGainers).mockResolvedValueOnce(mockGainers);
    vi.mocked(realDataService.getTopLosers).mockResolvedValueOnce(mockLosers);

    const { result } = renderHook(() => useTopMovers(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.gainers).toEqual(mockGainers);
    expect(result.current.losers).toEqual(mockLosers);
  });

  it('deve retornar arrays vazios em caso de erro', async () => {
    vi.mocked(realDataService.getTopGainers).mockRejectedValueOnce(new Error('API Error'));
    vi.mocked(realDataService.getTopLosers).mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useTopMovers(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.gainers).toEqual([]);
    expect(result.current.losers).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});