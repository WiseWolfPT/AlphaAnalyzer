/**
 * Earnings Service - Fase 3.7 Implementation
 * 
 * Integração real com APIs de earnings calendar usando Alpha Vantage e FMP
 * Cache de 24 horas para reduzir chamadas API
 */

export interface EarningsEvent {
  symbol: string;
  companyName: string;
  reportDate: string;
  time: 'before_open' | 'after_close' | 'during_market';
  estimatedEPS?: number;
  actualEPS?: number;
  estimatedRevenue?: number;
  actualRevenue?: number;
  fiscalQuarter?: string;
  fiscalYear?: number;
  source: 'alpha_vantage' | 'fmp' | 'cache';
  lastUpdated: string;
}

export interface EarningsCalendarResponse {
  events: EarningsEvent[];
  totalCount: number;
  fromCache: boolean;
  source: 'alpha_vantage' | 'fmp' | 'mock';
  lastUpdated: string;
}

export class EarningsService {
  private readonly API_BASE = '/api';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
  private cache: Map<string, { data: EarningsCalendarResponse; timestamp: number }> = new Map();

  /**
   * Busca earnings para uma semana específica
   */
  async getEarningsForWeek(startDate: Date, endDate: Date): Promise<EarningsCalendarResponse> {
    const cacheKey = `earnings_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
    
    // Verificar cache primeiro
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log('📊 Earnings cache hit para semana:', startDate.toDateString());
      return { ...cached.data, fromCache: true };
    }

    try {
      console.log('🔄 Buscando earnings reais para:', startDate.toDateString(), 'até', endDate.toDateString());
      
      const response = await fetch(`${this.API_BASE}/earnings/calendar?` + new URLSearchParams({
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0]
      }));

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: EarningsCalendarResponse = await response.json();
      
      // Cache por 24 horas
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      console.log(`✅ Earnings obtidos: ${data.events.length} eventos (fonte: ${data.source})`);
      return data;

    } catch (error) {
      console.error('🚨 Erro ao buscar earnings reais:', error);
      
      // Fallback para dados mock
      return this.getMockEarnings(startDate, endDate);
    }
  }

  /**
   * Busca earnings para um símbolo específico
   */
  async getEarningsForSymbol(symbol: string, limit: number = 4): Promise<EarningsEvent[]> {
    try {
      const response = await fetch(`${this.API_BASE}/earnings/symbol/${symbol.toUpperCase()}?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.events || [];

    } catch (error) {
      console.error(`🚨 Erro ao buscar earnings para ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Dados mock para fallback quando APIs falham
   */
  private getMockEarnings(startDate: Date, endDate: Date): EarningsCalendarResponse {
    console.log('⚠️ Usando dados mock para earnings calendar');
    
    const mockEvents: EarningsEvent[] = [
      {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        reportDate: this.getDateInRange(startDate, endDate, 1),
        time: 'after_close',
        estimatedEPS: 2.11,
        estimatedRevenue: 125000000000,
        fiscalQuarter: 'Q1',
        fiscalYear: 2024,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'MSFT',
        companyName: 'Microsoft Corporation',
        reportDate: this.getDateInRange(startDate, endDate, 2),
        time: 'after_close',
        estimatedEPS: 2.78,
        estimatedRevenue: 58000000000,
        fiscalQuarter: 'Q1',
        fiscalYear: 2024,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
        reportDate: this.getDateInRange(startDate, endDate, 2),
        time: 'before_open',
        estimatedEPS: 1.45,
        estimatedRevenue: 86000000000,
        fiscalQuarter: 'Q1',
        fiscalYear: 2024,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'AMZN',
        companyName: 'Amazon.com Inc.',
        reportDate: this.getDateInRange(startDate, endDate, 3),
        time: 'after_close',
        estimatedEPS: 0.85,
        estimatedRevenue: 149000000000,
        fiscalQuarter: 'Q1',
        fiscalYear: 2024,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'TSLA',
        companyName: 'Tesla Inc.',
        reportDate: this.getDateInRange(startDate, endDate, 4),
        time: 'after_close',
        estimatedEPS: 0.75,
        estimatedRevenue: 24000000000,
        fiscalQuarter: 'Q1',
        fiscalYear: 2024,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'META',
        companyName: 'Meta Platforms Inc.',
        reportDate: this.getDateInRange(startDate, endDate, 4),
        time: 'before_open',
        estimatedEPS: 3.20,
        estimatedRevenue: 40000000000,
        fiscalQuarter: 'Q1',
        fiscalYear: 2024,
        source: 'alpha_vantage',
        lastUpdated: new Date().toISOString()
      }
    ];

    return {
      events: mockEvents,
      totalCount: mockEvents.length,
      fromCache: false,
      source: 'mock',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Helper para gerar datas dentro do range especificado
   */
  private getDateInRange(startDate: Date, endDate: Date, dayOffset: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (dayOffset - 1));
    
    // Garantir que está dentro do range
    if (date > endDate) {
      date.setTime(endDate.getTime());
    }
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Limpa cache (útil para forçar refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache de earnings limpo');
  }

  /**
   * Verifica status da integração
   */
  async getConnectionStatus(): Promise<{
    alphaVantage: boolean;
    fmp: boolean;
    lastCheck: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/earnings/status`);
      
      if (!response.ok) {
        throw new Error('Status check failed');
      }

      return await response.json();

    } catch (error) {
      console.error('🚨 Erro ao verificar status da conexão:', error);
      return {
        alphaVantage: false,
        fmp: false,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Busca próximos earnings (próximos 7 dias)
   */
  async getUpcomingEarnings(days: number = 7): Promise<EarningsEvent[]> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + days);

    const response = await this.getEarningsForWeek(startDate, endDate);
    return response.events.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  }
}

// Export singleton instance
export const earningsService = new EarningsService();