/**
 * Cliente API Seguro
 * 
 * Este módulo demonstra como fazer chamadas seguras para APIs externas
 * através do backend, sem expor API keys no frontend.
 */

import { API_ENDPOINTS } from './env';

// Tipo para resposta de cotação normalizada
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
  _provider?: string;
}

// Cliente API seguro
export class SecureApiClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // Definir token de autenticação
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Headers padrão para requisições
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Buscar cotação de ação através do proxy seguro
   * 
   * @example
   * ```typescript
   * const quote = await apiClient.getStockQuote('AAPL');
   * console.log(`Apple: $${quote.price}`);
   * ```
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    const response = await fetch(
      `${this.baseUrl}/market-data/quote/${symbol}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch quote for ${symbol}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buscar cotação específica do Finnhub
   */
  async getFinnhubQuote(symbol: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/market-data${API_ENDPOINTS.FINNHUB.proxyUrl}/quote/${symbol}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buscar dados fundamentais através do FMP
   */
  async getFundamentals(symbol: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/market-data${API_ENDPOINTS.FMP.proxyUrl}/profile/${symbol}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Exemplo de WebSocket seguro (o backend gerencia a conexão)
   */
  subscribeToRealTimeQuotes(symbols: string[], onMessage: (data: any) => void) {
    // Em vez de conectar diretamente ao WebSocket do provider,
    // conectamos ao nosso próprio servidor que gerencia as API keys
    const ws = new WebSocket(`wss://${window.location.host}/api/ws/market-data`);

    ws.onopen = () => {
      // Enviar símbolos para subscrever
      ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: symbols,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  /**
   * Buscar dados históricos
   */
  async getHistoricalData(
    symbol: string,
    interval: '1min' | '5min' | '15min' | '1h' | '1day' = '1day',
    outputsize: number = 100
  ): Promise<any> {
    // SECURITY FIX: Validate all parameters before sending to API
    // Validate symbol
    if (!symbol || !/^[A-Z0-9\-\.]{1,10}$/.test(symbol)) {
      throw new Error('Invalid stock symbol format');
    }
    
    // Validate interval
    const validIntervals = ['1min', '5min', '15min', '1h', '1day'];
    if (!validIntervals.includes(interval)) {
      throw new Error('Invalid interval. Must be one of: ' + validIntervals.join(', '));
    }
    
    // Validate outputsize
    if (!Number.isInteger(outputsize) || outputsize < 1 || outputsize > 1000) {
      throw new Error('Invalid outputsize. Must be an integer between 1 and 1000');
    }
    
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      interval,
      outputsize: outputsize.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/market-data/historical?${params}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.statusText}`);
    }

    return response.json();
  }
}

// Instância padrão do cliente
export const secureApiClient = new SecureApiClient();

// Hook React para usar o cliente API
export function useSecureApi() {
  // Aqui você pode adicionar lógica para obter o token de auth do contexto
  // Por exemplo:
  // const { token } = useAuth();
  // useEffect(() => {
  //   if (token) {
  //     secureApiClient.setAuthToken(token);
  //   }
  // }, [token]);

  return secureApiClient;
}

/**
 * Exemplo de uso em um componente React:
 * 
 * ```tsx
 * import { useSecureApi } from '@/lib/secure-api-client';
 * 
 * function StockPrice({ symbol }: { symbol: string }) {
 *   const api = useSecureApi();
 *   const [quote, setQuote] = useState<StockQuote | null>(null);
 * 
 *   useEffect(() => {
 *     api.getStockQuote(symbol)
 *       .then(setQuote)
 *       .catch(console.error);
 *   }, [symbol]);
 * 
 *   if (!quote) return <div>Loading...</div>;
 * 
 *   return (
 *     <div>
 *       <h3>{symbol}: ${quote.price}</h3>
 *       <p>Change: {quote.change} ({quote.changePercent}%)</p>
 *     </div>
 *   );
 * }
 * ```
 */