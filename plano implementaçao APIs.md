🚀 PLANO COMPLETO - DEPLOY DIRETO EM PRODUÇÃO                                                                                              │
     │                                                                                                                                            │
     │ 🎯 OBJETIVO                                                                                                                                │
     │                                                                                                                                            │
     │ Implementar dados reais de stocks no Alfalyzer usando Finnhub free tier, seguindo o padrão Reddit: "Server calls APIs → Database → Users". │
     │                                                                                                                                            │
     │ 📊 STACK CONFIRMADA                                                                                                                        │
     │                                                                                                                                            │
     │ - Frontend: Vercel (já deployed)                                                                                                           │
     │ - Backend: Hetzner/Coolify (já deployed)                                                                                                   │
     │ - Database: Supabase (tabela cache_quotes existe)                                                                                          │
     │ - API: Finnhub (key no .env)                                                                                                               │
     │                                                                                                                                            │
     │ 🔧 IMPLEMENTAÇÃO PASSO A PASSO                                                                                                             │
     │                                                                                                                                            │
     │ PASSO 1: Criar Worker Finnhub (15 min)                                                                                                     │
     │                                                                                                                                            │
     │ Ficheiro: server/workers/finnhub-realtime.ts                                                                                               │
     │ import { finnhubService } from '../services/finnhub-service';                                                                              │
     │ import { supabaseAdmin } from '../db/supabase-client';                                                                                     │
     │                                                                                                                                            │
     │ // Top 50 US stocks por volume                                                                                                             │
     │ const TOP_STOCKS = [                                                                                                                       │
     │   'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'BRK.B',                                                                        │
     │   'V', 'JNJ', 'WMT', 'JPM', 'PG', 'MA', 'UNH', 'DIS', 'HD', 'PYPL',                                                                        │
     │   'BAC', 'NFLX', 'ADBE', 'CRM', 'XOM', 'CMCSA', 'VZ', 'PFE', 'TMO',                                                                        │
     │   'COST', 'ABT', 'PEP', 'ABBV', 'NKE', 'CVX', 'ACN', 'AVGO', 'MCD',                                                                        │
     │   'WFC', 'QCOM', 'TXN', 'MDT', 'BMY', 'NEE', 'UNP', 'DHR', 'LIN',                                                                          │
     │   'LOW', 'ORCL', 'PM', 'HON', 'UPS'                                                                                                        │
     │ ];                                                                                                                                         │
     │                                                                                                                                            │
     │ class FinnhubRealtimeWorker {                                                                                                              │
     │   private requestCount = 0;                                                                                                                │
     │   private resetTime = Date.now() + 60000;                                                                                                  │
     │                                                                                                                                            │
     │   async start() {                                                                                                                          │
     │     console.log('🚀 Starting Finnhub Realtime Worker');                                                                                    │
     │                                                                                                                                            │
     │     // Update inicial                                                                                                                      │
     │     await this.updateAllStocks();                                                                                                          │
     │                                                                                                                                            │
     │     // Update a cada 5 minutos                                                                                                             │
     │     setInterval(() => this.updateAllStocks(), 5 * 60 * 1000);                                                                              │
     │   }                                                                                                                                        │
     │                                                                                                                                            │
     │   private async updateAllStocks() {                                                                                                        │
     │     console.log(`📊 Updating ${TOP_STOCKS.length} stocks...`);                                                                             │
     │                                                                                                                                            │
     │     for (const symbol of TOP_STOCKS) {                                                                                                     │
     │       try {                                                                                                                                │
     │         // Check rate limit                                                                                                                │
     │         if (!this.canMakeRequest()) {                                                                                                      │
     │           console.log('⚠️ Rate limit reached, waiting...');                                                                                │
     │           await this.waitForReset();                                                                                                       │
     │         }                                                                                                                                  │
     │                                                                                                                                            │
     │         // Fetch quote                                                                                                                     │
     │         const quote = await finnhubService.getQuote(symbol);                                                                               │
     │         if (!quote) continue;                                                                                                              │
     │                                                                                                                                            │
     │         // Save to Supabase                                                                                                                │
     │         await this.saveToCache(symbol, quote);                                                                                             │
     │                                                                                                                                            │
     │         // Small delay between requests                                                                                                    │
     │         await new Promise(resolve => setTimeout(resolve, 200));                                                                            │
     │                                                                                                                                            │
     │       } catch (error) {                                                                                                                    │
     │         console.error(`❌ Error updating ${symbol}:`, error);                                                                               │
     │       }                                                                                                                                    │
     │     }                                                                                                                                      │
     │                                                                                                                                            │
     │     console.log('✅ Update cycle complete');                                                                                                │
     │   }                                                                                                                                        │
     │                                                                                                                                            │
     │   private canMakeRequest(): boolean {                                                                                                      │
     │     const now = Date.now();                                                                                                                │
     │                                                                                                                                            │
     │     // Reset counter cada minuto                                                                                                           │
     │     if (now > this.resetTime) {                                                                                                            │
     │       this.requestCount = 0;                                                                                                               │
     │       this.resetTime = now + 60000;                                                                                                        │
     │     }                                                                                                                                      │
     │                                                                                                                                            │
     │     // Limite de 55 requests por minuto (margem de segurança)                                                                              │
     │     if (this.requestCount >= 55) {                                                                                                         │
     │       return false;                                                                                                                        │
     │     }                                                                                                                                      │
     │                                                                                                                                            │
     │     this.requestCount++;                                                                                                                   │
     │     return true;                                                                                                                           │
     │   }                                                                                                                                        │
     │                                                                                                                                            │
     │   private async waitForReset() {                                                                                                           │
     │     const waitTime = this.resetTime - Date.now();                                                                                          │
     │     if (waitTime > 0) {                                                                                                                    │
     │       await new Promise(resolve => setTimeout(resolve, waitTime));                                                                         │
     │     }                                                                                                                                      │
     │   }                                                                                                                                        │
     │                                                                                                                                            │
     │   private async saveToCache(symbol: string, quote: any) {                                                                                  │
     │     const cacheData = {                                                                                                                    │
     │       symbol,                                                                                                                              │
     │       price: quote.c,                                                                                                                      │
     │       change: quote.d,                                                                                                                     │
     │       change_percent: quote.dp,                                                                                                            │
     │       high: quote.h,                                                                                                                       │
     │       low: quote.l,                                                                                                                        │
     │       open: quote.o,                                                                                                                       │
     │       previous_close: quote.pc,                                                                                                            │
     │       timestamp: new Date().toISOString()                                                                                                  │
     │     };                                                                                                                                     │
     │                                                                                                                                            │
     │     const { error } = await supabaseAdmin                                                                                                  │
     │       .from('cache_quotes')                                                                                                                │
     │       .upsert({                                                                                                                            │
     │         key: `quote_${symbol}`,                                                                                                            │
     │         data: cacheData,                                                                                                                   │
     │         expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),                                                                    │
     │         provider: 'finnhub'                                                                                                                │
     │       });                                                                                                                                  │
     │                                                                                                                                            │
     │     if (error) {                                                                                                                           │
     │       console.error(`❌ Error saving ${symbol} to cache:`, error);                                                                          │
     │     } else {                                                                                                                               │
     │       console.log(`✅ ${symbol}: $${quote.c}`);                                                                                             │
     │     }                                                                                                                                      │
     │   }                                                                                                                                        │
     │ }                                                                                                                                          │
     │                                                                                                                                            │
     │ // Start worker se não estiver em teste                                                                                                    │
     │ if (process.env.NODE_ENV !== 'test') {                                                                                                     │
     │   const worker = new FinnhubRealtimeWorker();                                                                                              │
     │   worker.start();                                                                                                                          │
     │ }                                                                                                                                          │
     │                                                                                                                                            │
     │ export default FinnhubRealtimeWorker;                                                                                                      │
     │                                                                                                                                            │
     │ PASSO 2: Integrar Worker no Backend (5 min)                                                                                                │
     │                                                                                                                                            │
     │ Modificar: server/index.ts                                                                                                                 │
     │ // Adicionar no início do ficheiro, após imports                                                                                           │
     │ import './workers/finnhub-realtime';                                                                                                       │
     │                                                                                                                                            │
     │ // Adicionar endpoint para verificar status                                                                                                │
     │ app.get('/api/worker/status', (req, res) => {                                                                                              │
     │   res.json({                                                                                                                               │
     │     status: 'running',                                                                                                                     │
     │     worker: 'finnhub-realtime',                                                                                                            │
     │     timestamp: new Date().toISOString()                                                                                                    │
     │   });                                                                                                                                      │
     │ });                                                                                                                                        │
     │                                                                                                                                            │
     │ PASSO 3: Otimizar Frontend Hook (10 min)                                                                                                   │
     │                                                                                                                                            │
     │ Modificar: client/src/hooks/use-realtime-quotes.ts                                                                                         │
     │ // Adicionar filtro para subscrever apenas símbolos necessários                                                                            │
     │ const channel = supabase                                                                                                                   │
     │   .channel('quotes-updates')                                                                                                               │
     │   .on(                                                                                                                                     │
     │     'postgres_changes',                                                                                                                    │
     │     {                                                                                                                                      │
     │       event: '*', // INSERT e UPDATE                                                                                                       │
     │       schema: 'public',                                                                                                                    │
     │       table: 'cache_quotes',                                                                                                               │
     │       filter: symbols.length > 0                                                                                                           │
     │         ? `key=in.(${symbols.map(s => `quote_${s}`).join(',')})`                                                                           │
     │         : undefined                                                                                                                        │
     │     },                                                                                                                                     │
     │     (payload) => {                                                                                                                         │
     │       if (payload.new && payload.new.data) {                                                                                               │
     │         const data = payload.new.data as any;                                                                                              │
     │         const quote: RealtimeQuote = {                                                                                                     │
     │           symbol: data.symbol,                                                                                                             │
     │           price: data.price,                                                                                                               │
     │           change: data.change,                                                                                                             │
     │           change_percent: data.change_percent,                                                                                             │
     │           volume: data.volume || 0,                                                                                                        │
     │           timestamp: data.timestamp                                                                                                        │
     │         };                                                                                                                                 │
     │                                                                                                                                            │
     │         setQuotes(prev => ({                                                                                                               │
     │           ...prev,                                                                                                                         │
     │           [quote.symbol]: quote                                                                                                            │
     │         }));                                                                                                                               │
     │                                                                                                                                            │
     │         onUpdate?.(quote);                                                                                                                 │
     │       }                                                                                                                                    │
     │     }                                                                                                                                      │
     │   )                                                                                                                                        │
     │                                                                                                                                            │
     │ PASSO 4: Criar Endpoint para Quotes (10 min)                                                                                               │
     │                                                                                                                                            │
     │ Modificar: server/routes/market-data.ts                                                                                                    │
     │ // Adicionar novo endpoint simplificado                                                                                                    │
     │ router.get('/quotes/batch', async (req, res) => {                                                                                          │
     │   try {                                                                                                                                    │
     │     const symbols = req.query.symbols?.toString().split(',') || [];                                                                        │
     │                                                                                                                                            │
     │     if (symbols.length === 0) {                                                                                                            │
     │       return res.json([]);                                                                                                                 │
     │     }                                                                                                                                      │
     │                                                                                                                                            │
     │     // Buscar do cache                                                                                                                     │
     │     const keys = symbols.map(s => `quote_${s}`);                                                                                           │
     │     const { data, error } = await supabaseAdmin                                                                                            │
     │       .from('cache_quotes')                                                                                                                │
     │       .select('*')                                                                                                                         │
     │       .in('key', keys)                                                                                                                     │
     │       .gte('expires_at', new Date().toISOString());                                                                                        │
     │                                                                                                                                            │
     │     if (error) throw error;                                                                                                                │
     │                                                                                                                                            │
     │     // Transformar resposta                                                                                                                │
     │     const quotes = data?.map(item => ({                                                                                                    │
     │       symbol: item.data.symbol,                                                                                                            │
     │       price: item.data.price,                                                                                                              │
     │       change: item.data.change,                                                                                                            │
     │       change_percent: item.data.change_percent,                                                                                            │
     │       high: item.data.high,                                                                                                                │
     │       low: item.data.low,                                                                                                                  │
     │       open: item.data.open,                                                                                                                │
     │       previous_close: item.data.previous_close,                                                                                            │
     │       timestamp: item.data.timestamp                                                                                                       │
     │     })) || [];                                                                                                                             │
     │                                                                                                                                            │
     │     res.json(quotes);                                                                                                                      │
     │   } catch (error) {                                                                                                                        │
     │     console.error('Error fetching quotes:', error);                                                                                        │
     │     res.status(500).json({ error: 'Failed to fetch quotes' });                                                                             │
     │   }                                                                                                                                        │
     │ });                                                                                                                                        │
     │                                                                                                                                            │
     │ PASSO 5: Deploy via Git/Coolify (5 min)                                                                                                    │
     │                                                                                                                                            │
     │ # Comandos a executar                                                                                                                      │
     │ git add .                                                                                                                                  │
     │ git commit -m "feat: Add Finnhub realtime worker for live stock prices"                                                                    │
     │ git push origin main                                                                                                                       │
     │                                                                                                                                            │
     │ # Coolify faz deploy automático ao detetar push                                                                                            │
     │                                                                                                                                            │
     │ PASSO 6: Verificar no Frontend (2 min)                                                                                                     │
     │                                                                                                                                            │
     │ 1. Abrir https://alfalyzer.vercel.app                                                                                                      │
     │ 2. Ir para Dashboard                                                                                                                       │
     │ 3. Verificar se preços aparecem                                                                                                            │
     │ 4. Confirmar updates a cada 5 min                                                                                                          │
     │                                                                                                                                            │
     │ 📊 MONITORIZAÇÃO                                                                                                                           │
     │                                                                                                                                            │
     │ Endpoint de Status: GET /api/worker/status                                                                                                 │
     │                                                                                                                                            │
     │ Logs no Coolify:                                                                                                                           │
     │ - Ver output do worker                                                                                                                     │
     │ - Confirmar "✅ AAPL: $195.50" etc.                                                                                                         │
     │                                                                                                                                            │
     │ Supabase Dashboard:                                                                                                                        │
     │ - Verificar tabela cache_quotes                                                                                                            │
     │ - Confirmar inserções/updates                                                                                                              │
     │                                                                                                                                            │
     │ 🚨 TROUBLESHOOTING                                                                                                                         │
     │                                                                                                                                            │
     │ Se não aparecer dados:                                                                                                                     │
     │ 1. Verificar logs no Coolify                                                                                                               │
     │ 2. Confirmar FINNHUB_API_KEY no .env                                                                                                       │
     │ 3. Verificar tabela cache_quotes no Supabase                                                                                               │
     │                                                                                                                                            │
     │ Se rate limit:                                                                                                                             │
     │ - Worker já tem proteção (55 req/min)                                                                                                      │
     │ - Aguarda próximo minuto automaticamente                                                                                                   │
     │                                                                                                                                            │
     │ ✅ RESULTADO ESPERADO                                                                                                                       │
     │                                                                                                                                            │
     │ - 50 stocks principais com preços reais                                                                                                    │
     │ - Updates automáticos a cada 5 minutos                                                                                                     │
     │ - Zero chamadas diretas dos users à API                                                                                                    │
     │ - Funciona para 190 users simultâneos                                                                                                      │
     │ - Custo: €0 (apenas Hetzner existente)                                                                                                     │
     │                                                                                                                                            │
     │ 🎯 PRÓXIMOS PASSOS (APÓS CONFIRMAR FUNCIONAMENTO)                                                                                          │
     │                                                                                                                                            │
     │ 1. Adicionar mais 150 stocks (total 200)                                                                                                   │
     │ 2. Implementar WebSocket Finnhub (real-time)                                                                                               │
     │ 3. Adicionar after-hours com Alpha Vantage                                                                                                 │
     │ 4. Dashboard de monitorização                                                                                                              │
     │                                                                                                                                            │
     │ PRONTO PARA IMPLEMENTAR? Este plano está completo e otimizado para deploy imediato!  