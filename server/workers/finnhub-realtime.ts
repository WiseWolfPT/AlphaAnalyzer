import { finnhubService } from '../services/finnhub-service';
import { supabaseAdmin } from '../db/supabase-client';

// Top 10 most traded US stocks - reduced to minimize API usage
const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 
  'TSLA', 'META', 'BRK.B', 'JPM', 'V'
];

class FinnhubRealtimeWorker {
  private requestCount = 0;
  private resetTime = Date.now() + 60000;

  async start() {
    console.log('🚀 Starting Finnhub Realtime Worker');
    
    // Update inicial
    await this.updateAllStocks();
    
    // Update a cada 5 minutos
    setInterval(() => this.updateAllStocks(), 5 * 60 * 1000);
  }
  
  private async updateAllStocks() {
    console.log(`📊 Updating ${TOP_STOCKS.length} stocks...`);
    
    for (const symbol of TOP_STOCKS) {
      try {
        // Check rate limit
        if (!this.canMakeRequest()) {
          console.log('⚠️ Rate limit reached, waiting...');
          await this.waitForReset();
        }
        
        // Fetch quote
        const quote = await finnhubService.getQuote(symbol);
        if (!quote) continue;
        
        // Save to Supabase
        await this.saveToCache(symbol, quote);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Error updating ${symbol}:`, error);
      }
    }
    
    console.log('✅ Update cycle complete');
  }
  
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    // Reset counter cada minuto
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }
    
    // Limite de 55 requests por minuto (margem de segurança)
    if (this.requestCount >= 55) {
      return false;
    }
    
    this.requestCount++;
    return true;
  }
  
  private async waitForReset() {
    const waitTime = this.resetTime - Date.now();
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  private async saveToCache(symbol: string, quote: any) {
    const cacheData = {
      symbol,
      price: quote.c,
      change: quote.d,
      change_percent: quote.dp,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      previous_close: quote.pc,
      timestamp: new Date().toISOString()
    };
    
    const { error } = await supabaseAdmin
      .from('cache_quotes')
      .upsert({
        key: `quote_${symbol}`,
        data: cacheData,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        provider: 'finnhub'
      });
      
    if (error) {
      console.error(`❌ Error saving ${symbol} to cache:`, error);
    } else {
      console.log(`✅ ${symbol}: $${quote.c}`);
    }
  }
}

// Start worker se não estiver em teste
if (process.env.NODE_ENV !== 'test') {
  const worker = new FinnhubRealtimeWorker();
  worker.start();
}

export default FinnhubRealtimeWorker;