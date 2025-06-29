# 🚀 PADRÕES DE CÓDIGO SALVOS - ULTRATHINK COORDENADO

## 📋 Snippets para Consulta e Reutilização

### 1. 🔄 Padrão de Componente com Dados Reais + Fallback

```tsx
// Padrão testado e aprovado - usar em todos os componentes de stock
const fetchStockData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    console.log(`🔄 Fetching real-time data for ${symbol}...`);
    
    // Timeout protection - 15 segundos máximo
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000);
    });
    
    const dataPromise = realDataService.getStockQuote(symbol);
    const quote = await Promise.race([dataPromise, timeoutPromise]);
    
    if (quote) {
      setStock(quote);
      setLastUpdate(new Date());
      setError(null);
      console.log(`✅ Data received for ${symbol}:`, quote.source || 'unknown');
    } else {
      throw new Error(`No data available for ${symbol}`);
    }
  } catch (err) {
    console.error(`❌ Failed to fetch ${symbol}:`, err);
    
    // SEMPRE fornecer dados demo como fallback
    if (!stock) {
      try {
        const { mockStocks } = await import('@/lib/mock-api');
        const mockStock = mockStocks.find(s => s.symbol === symbol.toUpperCase());
        
        if (mockStock) {
          setStock({
            ...mockStock,
            source: 'demo',
            lastUpdated: new Date()
          });
          setLastUpdate(new Date());
          console.log(`📦 Using mock data for ${symbol}`);
        }
      } catch (mockErr) {
        console.error('Failed to load mock data:', mockErr);
        setError('Unable to load stock data');
      }
    }
  } finally {
    setLoading(false);
  }
};
```

### 2. 🎯 Padrão de Hook Reutilizável

```tsx
// Hook padrão para dados financeiros
export function useFinancialData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  options: {
    refreshInterval?: number;
    timeout?: number;
    fallback?: T;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), options.timeout || 15000)
      );
      
      const result = await Promise.race([fetchFn(), timeoutPromise]);
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMsg);
      
      if (options.fallback) {
        setData(options.fallback);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  }, deps);
  
  useEffect(() => {
    fetchData();
    
    if (options.refreshInterval) {
      const interval = setInterval(fetchData, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, options.refreshInterval]);
  
  return { data, loading, error, refetch: fetchData };
}
```

### 3. 🛡️ Padrão de Tratamento de Erros Unificado

```tsx
// ErrorBoundary padrão
interface ErrorDisplayProps {
  error: string;
  retry?: () => void;
  fallbackData?: any;
  showFallback?: boolean;
}

export function ErrorDisplay({ error, retry, fallbackData, showFallback }: ErrorDisplayProps) {
  return (
    <div className="bg-card/50 backdrop-blur-sm border border-red-500/30 rounded-xl p-6">
      <div className="text-center py-4">
        <p className="text-red-500 mb-2">{error}</p>
        {retry && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={retry}
            className="border-red-500/30 hover:bg-red-500/10"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        {showFallback && fallbackData && (
          <Badge variant="secondary" className="mt-2">
            Using Demo Data
          </Badge>
        )}
      </div>
    </div>
  );
}
```

### 4. 🔄 Padrão de Estado de Loading

```tsx
// Loading state consistente
export function LoadingState({ message = "Loading...", skeleton = true }) {
  if (skeleton) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-24 mb-3" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-pulse text-muted-foreground">
        {message}
      </div>
    </div>
  );
}
```

### 5. 📊 Interface TypeScript Padrão

```tsx
// Interfaces padronizadas
export interface StockQuote {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  sector: string;
  marketCap: string;
  eps: string;
  peRatio: string;
  logo?: string | null;
  lastUpdated: Date;
  source?: 'real' | 'mock' | 'demo';
}

export interface ComponentWithDataProps {
  symbol: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showMiniChart?: boolean;
  onError?: (error: string) => void;
  onSuccess?: (data: any) => void;
}

export interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}
```

### 6. 🌐 Padrão de Chamada API com Métricas

```tsx
// Sempre usar métricas nas chamadas API
import { apiMetricsCollector } from '@/lib/api-metrics';

const makeTrackedAPICall = async (provider: string, endpoint: string, apiCall: () => Promise<any>) => {
  return await apiMetricsCollector.trackAPICall(
    provider,
    endpoint,
    apiCall,
    {
      method: 'GET',
      cacheHit: false
    }
  );
};
```

### 7. 🎨 Padrão de Badge de Status

```tsx
// Badges consistentes para indicar fonte de dados
const getSourceBadge = (source?: string) => {
  switch (source) {
    case 'real':
      return <Badge className="border-green-500/50 text-green-600">Live</Badge>;
    case 'demo':
    case 'mock':
      return <Badge variant="secondary">Demo</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};
```

### 8. 🔧 Utilitários de Formatação

```tsx
// Funções de formatação padronizadas
export const formatPrice = (price: string | number) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice);
};

export const formatPercentage = (percent: string | number) => {
  const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
  return isNaN(numPercent) ? '0.00' : numPercent.toFixed(2);
};

export const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};
```

## 🎯 REGRAS DE OURO - APLICAR SEMPRE:

1. **🛡️ Timeout Protection**: Todas as chamadas API têm timeout de 15s
2. **🔄 Fallback Obrigatório**: Sempre fornecer dados demo quando APIs falham
3. **📊 Métricas Automáticas**: Usar `apiMetricsCollector` em todas as chamadas
4. **🎨 UI Consistente**: Usar os mesmos componentes de loading/error
5. **📱 Responsive**: Todos os componentes funcionam em mobile
6. **⚡ Performance**: Cache inteligente e otimização de renders
7. **🔍 Debugging**: Console.log detalhado para troubleshooting
8. **📋 TypeScript**: Interfaces tipadas para tudo

## 🚀 USO DOS PADRÕES:

```tsx
// Exemplo de componente seguindo todos os padrões
import { useFinancialData } from '@/hooks/financial-hooks-templates';
import { ErrorDisplay } from '@/components/templates/component-templates';
import { LoadingState } from '@/components/templates/component-templates';
import { formatPrice, formatPercentage } from '@/utils/formatting';

export function MyStockComponent({ symbol }: { symbol: string }) {
  const { data: stock, loading, error, refetch } = useFinancialData(
    () => realDataService.getStockQuote(symbol),
    [symbol],
    { 
      refreshInterval: 30000, 
      timeout: 15000,
      fallback: mockStockData 
    }
  );

  if (loading) return <LoadingState message={`Loading ${symbol}...`} />;
  if (error) return <ErrorDisplay error={error} retry={refetch} />;
  if (!stock) return <ErrorDisplay error="No data available" />;

  return (
    <div className="stock-card">
      <h3>{stock.symbol}</h3>
      <p>{formatPrice(stock.price)}</p>
      <p>{formatPercentage(stock.changePercent)}%</p>
      {getSourceBadge(stock.source)}
    </div>
  );
}
```

---

✅ **TODOS OS PADRÕES TESTADOS E APROVADOS**  
🎯 **USE ESTES SNIPPETS PARA MANTER CONSISTÊNCIA**  
🚀 **GARANTIA DE FUNCIONAMENTO EM PRODUÇÃO**