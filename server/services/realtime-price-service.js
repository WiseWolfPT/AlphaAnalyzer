/**
 * Real-time Price Service for Alfalyzer
 * Consegue atualizações a cada 30s usando estratégia híbrida
 */

const WebSocket = require('ws');

class RealTimePriceService {
  constructor() {
    this.finnhubWS = null;
    this.streamingSymbols = new Set();
    this.priceCache = new Map();
    this.updateCallbacks = new Map();
  }

  // Inicializar serviço
  async initialize() {
    // 1. Conectar WebSocket do Finnhub para símbolos principais
    this.connectFinnhubWebSocket();
    
    // 2. Iniciar polling para símbolos secundários
    this.startSmartPolling();
    
    console.log('✅ Real-time price service initialized');
  }

  // WebSocket para preços em tempo real
  connectFinnhubWebSocket() {
    const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
    this.finnhubWS = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`);

    this.finnhubWS.on('open', () => {
      console.log('📡 Finnhub WebSocket connected');
      
      // Subscrever aos símbolos mais populares
      const topSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA'];
      topSymbols.forEach(symbol => {
        this.subscribeToSymbol(symbol);
      });
    });

    this.finnhubWS.on('message', (data) => {
      const trades = JSON.parse(data);
      if (trades.type === 'trade') {
        trades.data.forEach(trade => {
          this.updatePrice(trade.s, {
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t,
            source: 'websocket'
          });
        });
      }
    });

    this.finnhubWS.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      // Reconectar após 5 segundos
      setTimeout(() => this.connectFinnhubWebSocket(), 5000);
    });
  }

  // Subscrever a um símbolo no WebSocket
  subscribeToSymbol(symbol) {
    if (this.finnhubWS.readyState === WebSocket.OPEN) {
      this.finnhubWS.send(JSON.stringify({
        'type': 'subscribe',
        'symbol': symbol
      }));
      this.streamingSymbols.add(symbol);
      console.log(`📊 Subscribed to ${symbol} real-time updates`);
    }
  }

  // Polling inteligente para outros símbolos
  startSmartPolling() {
    // Atualizar símbolos não-streaming a cada 30 segundos
    setInterval(async () => {
      const symbolsToUpdate = await this.getSymbolsNeedingUpdate();
      
      // Dividir em batches para respeitar rate limits
      const batches = this.chunkArray(symbolsToUpdate, 5);
      
      for (const batch of batches) {
        await this.fetchBatchPrices(batch);
        // Aguardar 1 segundo entre batches (60 calls/min do Finnhub)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }, 30000); // 30 segundos
  }

  // Buscar preços em batch
  async fetchBatchPrices(symbols) {
    try {
      // Usar Finnhub REST API para batch
      const promises = symbols.map(symbol => 
        fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`)
          .then(res => res.json())
      );

      const results = await Promise.all(promises);
      
      results.forEach((data, index) => {
        if (data.c) { // c = current price
          this.updatePrice(symbols[index], {
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            timestamp: Date.now(),
            source: 'polling'
          });
        }
      });
    } catch (error) {
      console.error('Error fetching batch prices:', error);
    }
  }

  // Atualizar preço no cache
  updatePrice(symbol, priceData) {
    this.priceCache.set(symbol, {
      ...priceData,
      lastUpdate: Date.now()
    });

    // Notificar callbacks registrados
    const callback = this.updateCallbacks.get(symbol);
    if (callback) {
      callback(priceData);
    }
  }

  // Obter preço (com fallback para APIs secundárias)
  async getPrice(symbol) {
    // 1. Verificar cache
    const cached = this.priceCache.get(symbol);
    if (cached && (Date.now() - cached.lastUpdate) < 30000) {
      return cached;
    }

    // 2. Se não está no streaming, adicionar ao polling
    if (!this.streamingSymbols.has(symbol)) {
      // Buscar imediatamente
      await this.fetchSinglePrice(symbol);
    }

    return this.priceCache.get(symbol);
  }

  // Buscar preço individual com fallback
  async fetchSinglePrice(symbol) {
    const apis = [
      { name: 'finnhub', fn: () => this.fetchFinnhubPrice(symbol) },
      { name: 'alpha', fn: () => this.fetchAlphaVantagePrice(symbol) },
      { name: 'twelve', fn: () => this.fetchTwelveDataPrice(symbol) }
    ];

    for (const api of apis) {
      try {
        const price = await api.fn();
        if (price) {
          console.log(`✅ Got ${symbol} price from ${api.name}`);
          return price;
        }
      } catch (error) {
        console.warn(`⚠️ ${api.name} failed for ${symbol}`);
      }
    }

    throw new Error(`Failed to fetch price for ${symbol}`);
  }

  // Registrar callback para atualizações
  onPriceUpdate(symbol, callback) {
    this.updateCallbacks.set(symbol, callback);
    
    // Se é símbolo importante, adicionar ao WebSocket
    if (this.isHighPrioritySymbol(symbol)) {
      this.subscribeToSymbol(symbol);
    }
  }

  // Helpers
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async getSymbolsNeedingUpdate() {
    // Implementar lógica para determinar quais símbolos precisam atualização
    // Baseado em: última visualização, símbolos no watchlist, etc.
    return ['IBM', 'NFLX', 'BA', 'DIS', 'V']; // exemplo
  }

  isHighPrioritySymbol(symbol) {
    // Top 20 mais negociadas ou no portfolio do usuário
    const highPriority = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    return highPriority.includes(symbol);
  }
}

module.exports = new RealTimePriceService();