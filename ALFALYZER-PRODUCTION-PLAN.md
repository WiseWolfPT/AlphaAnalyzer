# 🚀 ALFALYZER PRODUCTION PLAN V2.0
## Plano Mestre para Transformação Production-Ready com FMP Data Real

### ⚠️ INSTRUÇÕES CRÍTICAS PARA AGENTES --ULTRATHINK

**ATENÇÃO AGENTES:** Este plano DEVE ser executado com máxima precisão usando modo `--ultrathink` para garantir qualidade production-ready.

## 🤖 REGRAS DE EXECUÇÃO PARA AGENTES

### 1. PROTOCOLO DE VALIDAÇÃO
```bash
# ANTES de qualquer alteração:
1. Verificar se arquivo/serviço existe
2. Fazer backup: git stash ou cp arquivo arquivo.bak
3. Testar comando em ambiente isolado
4. Validar dependências necessárias
5. Documentar alteração prevista
```

### 2. MODO DE ANÁLISE PROFUNDA
```bash
# Para tarefas complexas, SEMPRE usar:
--ultrathink --mode=deep --validate=true --test=true

# Questões a responder antes de agir:
- Esta mudança pode quebrar algo existente?
- Há dependências não documentadas?
- O teste local passou?
- A segurança foi verificada?
```

### 3. COORDENAÇÃO ENTRE AGENTES
```
ORDEM DE EXECUÇÃO (CRÍTICA!):
1. SECURITY-AUDITOR (Dias 1-2)
2. DEVOPS-INFRASTRUCTURE-ENGINEER (Dia 3-4) 
3. BACKEND-ARCHITECT (Dias 5-9)
4. DATA-OPTIMIZER (Dias 5, 10, 16-17)
5. FRONTEND-REACT-SPECIALIST (Dias 11-15)
6. QA-AUTOMATION-ENGINEER (Dia 10, 20)
7. DEVOPS-INFRASTRUCTURE-ENGINEER (Dias 18-21)
```

### 4. PONTOS DE SINCRONIZAÇÃO
- **FIM DO DIA:** Commit com mensagem descritiva
- **FIM DA SEMANA:** Reunião de validação (documento status)
- **ANTES DO DEPLOY:** Checklist completo obrigatório

---

## 📋 DIVISÃO DE RESPONSABILIDADES POR AGENTE

### 🔒 **SECURITY-AUDITOR**
**Responsabilidades:**
- Dias 1-2: Corrigir CORS, CSRF, API keys
- Validar todas as mudanças de outros agentes
- Criar audit log de segurança

**Checklist:**
```markdown
- [ ] CORS configurado apenas para domínios autorizados
- [ ] CSRF protection ativo
- [ ] Nenhuma API key com prefixo VITE_
- [ ] Rate limiting implementado
- [ ] Logs sem dados sensíveis
```

### 🏗️ **BACKEND-ARCHITECT**
**Responsabilidades:**
- Dias 5-9: Implementar cache 3-tier
- Ativar cron jobs existentes
- Implementar estratégia Reddit

**Checklist:**
```markdown
- [ ] Redis instalado e configurado
- [ ] Cache 3-tier funcionando
- [ ] Cron jobs ativos
- [ ] Users não triggeram API calls
- [ ] Fallback Redis→Supabase implementado
```

### ⚡ **DATA-OPTIMIZER**
**Responsabilidades:**
- Dia 5: Cleanup strategies
- Dia 10: Load testing
- Dias 16-17: Monitoring setup

**Checklist:**
```markdown
- [ ] Cleanup hourly rodando
- [ ] Database < 300MB após cleanup
- [ ] Load test 500 users passou
- [ ] Monitoring ativo
- [ ] Alertas configurados
```

### ⚛️ **FRONTEND-REACT-SPECIALIST**
**Responsabilidades:**
- Dias 11-15: Substituir mock data
- Implementar loading states
- Otimizar bundles

**Checklist:**
```markdown
- [ ] FindStocks usa dados reais
- [ ] Charts sem mock data
- [ ] Intrinsic Value com FMP data
- [ ] Bundle < 500KB
- [ ] Loading states implementados
```

### 🚀 **DEVOPS-INFRASTRUCTURE-ENGINEER**
**Responsabilidades:**
- Dia 0: Preparação inicial
- Dia 3-4: Redis setup
- Dias 18-21: Deploy e monitoring

**Checklist:**
```markdown
- [ ] Redis rodando no Hetzner
- [ ] Healthchecks.io configurado
- [ ] Playbooks documentados
- [ ] Deploy scripts prontos
- [ ] Rollback plan definido
```

---

## 📌 DEFINIÇÕES FUNDAMENTAIS

### CONCEITOS CHAVE (MEMORIZAR!)
1. **FINDSTOCKS É O DASHBOARD** - Não existe outra página "dashboard"
2. **ESTRATÉGIA REDDIT** - Users NUNCA triggeram API calls, apenas cron jobs
3. **LIMITE FMP** - 500 calls/day, usar máximo 330 (66%)
4. **SUPABASE FREE** - 500MB limite, cleanup obrigatório hourly
5. **CACHE 3-TIER** - Memory → Redis → Supabase

### CUSTOS E TIMELINE
- **Custo Total:** €3.79/mês (Hetzner) + $14.99/mês (FMP) = ~€18/mês
- **Timeline:** 4 SEMANAS (28 dias úteis)
- **Risco:** Médio-Baixo com monitoring adequado

---

## 📅 PLANO DE EXECUÇÃO DETALHADO

## 🔴 DIA 0: PREPARAÇÃO CRÍTICA

### PRÉ-FLIGHT CHECKLIST (DEVOPS-INFRASTRUCTURE-ENGINEER)
```bash
# EXECUTAR ANTES DE COMEÇAR:
echo "=== ALFALYZER PRODUCTION PREP ==="

# 1. Backup completo
git stash
git checkout -b feature/production-ready
tar -czf backup-alfalyzer-$(date +%Y%m%d-%H%M%S).tar.gz .

# 2. Verificar ambiente
echo "Checking FMP API..."
curl -s "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${FMP_API_KEY}" | jq '.[]'

echo "Checking Supabase storage..."
psql "${DATABASE_URL}" -c "SELECT pg_database_size('postgres')/1024/1024 as mb_used;"

echo "Checking if cronManager exists..."
grep -r "cronManager" server/ --include="*.ts" --include="*.js"

# 3. Documentar estado atual
cat > DEPLOYMENT-STATE.md << EOF
# Estado Atual - $(date)
- Backend URL: ${BACKEND_URL}
- Database Size: [RESULTADO]
- Cron Jobs: [EXISTE/NÃO EXISTE]
- Redis: [INSTALADO/NÃO INSTALADO]
EOF

# 4. Criar conta healthchecks.io
echo "Create account at: https://healthchecks.io (FREE)"
echo "Save UUID: _____________"
```

---

## 📅 SEMANA 1: SEGURANÇA + INFRAESTRUTURA

### DIAS 1-2: SEGURANÇA URGENTE (SECURITY-AUDITOR)

```typescript
// Task 1: CORS Fix - vercel.json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://alfalyzer.vercel.app" // NÃO usar "*"!
        }
      ]
    }
  ]
}

// Task 2: Remove VITE_ from API keys
// .env (backend only)
FMP_API_KEY=your_key_here  // SEM VITE_
FINNHUB_API_KEY=your_key_here  // SEM VITE_

// Task 3: CSRF Protection
npm install csurf
// server/index.ts
import csrf from 'csurf';
app.use(csrf({ cookie: true }));

// Task 4: Rate Limiting
npm install express-rate-limit
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);
```

### DIAS 3-4: REDIS LOCAL SETUP (DEVOPS-INFRASTRUCTURE-ENGINEER)

```bash
# SSH into Hetzner CX22
ssh root@your-hetzner-ip

# Install Redis (FREE!)
apt update && apt upgrade -y
apt install redis-server -y

# Configure Redis
cat > /etc/redis/redis.conf << 'EOF'
bind 127.0.0.1
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru
save 60 1
appendonly yes
appendfilename "redis.aof"
dir /var/lib/redis
logfile /var/log/redis/redis-server.log
EOF

# Start and enable Redis
systemctl restart redis-server
systemctl enable redis-server

# Test Redis
redis-cli ping  # Should return PONG
redis-cli INFO memory  # Check memory usage

# Install Node.js Redis client
cd /path/to/alfalyzer
npm install ioredis
```

### DIA 5: CLEANUP AGRESSIVO (DATA-OPTIMIZER)

```typescript
// server/cron/cleanup-manager.ts
import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendAlert, sendUrgentAlert } from '../lib/alerts';

// CRÍTICO: Rodar A CADA HORA para não explodir 500MB!
cron.schedule('0 * * * *', async () => {
  console.log('🧹 Starting hourly cleanup...');
  
  try {
    // Get current size
    const { data: sizeData } = await supabase.rpc('get_database_size');
    const startSize = sizeData?.[0]?.size || 0;
    
    // Delete old quotes (> 2 hours)
    const { error: quotesError, count: quotesDeleted } = await supabase
      .from('cache_quotes')
      .delete()
      .lt('updated_at', new Date(Date.now() - 2*60*60*1000).toISOString());
    
    // Delete old fundamentals (> 24 hours)
    const { error: fundError, count: fundDeleted } = await supabase
      .from('cache_fundamentals')
      .delete()
      .lt('updated_at', new Date(Date.now() - 24*60*60*1000).toISOString());
    
    // Get new size
    const { data: newSizeData } = await supabase.rpc('get_database_size');
    const endSize = newSizeData?.[0]?.size || 0;
    
    const freedMB = (startSize - endSize) / 1_000_000;
    console.log(`✅ Cleanup complete. Freed: ${freedMB}MB`);
    
    // ALERTS
    if (freedMB < 10) {
      await sendAlert('⚠️ Cleanup freed less than 10MB!');
    }
    
    if (endSize > 450_000_000) { // 450MB
      await sendUrgentAlert(`🚨 DATABASE CRITICAL: ${endSize/1_000_000}MB used!`);
      await emergencyCleanup();
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    await sendUrgentAlert('🆘 CLEANUP CRON FAILED!', error);
  }
});

// FAILSAFE: Check every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  const { data } = await supabase.rpc('get_database_size');
  const size = data?.[0]?.size || 0;
  
  if (size > 480_000_000) { // 480MB = EMERGENCY
    console.log('🆘 EMERGENCY CLEANUP TRIGGERED!');
    await emergencyCleanup();
    await sendUrgentAlert('🆘 Emergency cleanup executed!');
  }
  
  // Ping healthchecks.io
  await fetch(`https://hc-ping.com/${process.env.HEALTHCHECK_UUID}`);
});

async function emergencyCleanup() {
  // Delete EVERYTHING older than 30 minutes
  await supabase.from('cache_quotes').delete().lt('updated_at', 
    new Date(Date.now() - 30*60*1000).toISOString()
  );
  await supabase.from('cache_fundamentals').delete().lt('updated_at',
    new Date(Date.now() - 60*60*1000).toISOString()
  );
  await supabase.rpc('vacuum_tables'); // Run VACUUM
}
```

---

## 📅 SEMANA 2: BACKEND + ESTRATÉGIA REDDIT

### DIAS 6-7: ATIVAR CRON JOBS (BACKEND-ARCHITECT)

```typescript
// server/index.ts
// VERIFICAR SE EXISTE, senão CRIAR!
import { cronManager } from './services/cron/cron-manager';

// No startup do servidor
async function startServer() {
  // ... outras inicializações ...
  
  // ATIVAR CRON JOBS
  console.log('🕐 Starting cron jobs...');
  await cronManager.startAll();
  console.log('✅ Cron jobs activated');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// server/services/providers/fmp-provider.ts
export class FMPProvider {
  private readonly apiKey: string;
  private quotaPerDay = 500; // ATUALIZAR DE 250!
  private callsToday = 0;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FMP API key required!');
    }
  }
  
  async getBatchQuotes(symbols: string[]): Promise<Quote[]> {
    if (this.callsToday >= this.quotaPerDay - 50) { // Reserve 50 calls
      throw new Error('Approaching FMP daily limit!');
    }
    
    // FMP supports up to 500 symbols in one call!
    const symbolsStr = symbols.join(',');
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${this.apiKey}`;
    
    const response = await fetch(url);
    this.callsToday++;
    
    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

### DIAS 8-9: ESTRATÉGIA REDDIT COMPLETA (BACKEND-ARCHITECT)

```typescript
// server/services/reddit-strategy.ts
// REGRA DE OURO: Users NUNCA chamam APIs externas!

import { cache } from './cache/multi-tier-cache';
import { fmpProvider } from './providers/fmp-provider';
import { logger } from '../lib/logger';

export class RedditStrategy {
  private updateQueue: Set<string> = new Set();
  
  // Users SEMPRE pegam do cache
  async getQuote(symbol: string): Promise<Quote | null> {
    // 1. Try cache first (ALWAYS!)
    const cached = await cache.get(`quote:${symbol}`);
    
    // 2. If stale or missing, queue for update (DON'T CALL API!)
    if (!cached || this.isStale(cached)) {
      this.updateQueue.add(symbol);
      logger.info(`Queued ${symbol} for update`);
      
      // 3. Return stale data or placeholder
      return cached || {
        symbol,
        price: null,
        message: 'Updating... Please refresh in 1 minute',
        isStale: true,
        updatedAt: new Date().toISOString()
      };
    }
    
    return cached;
  }
  
  // Cron job processes queue (runs every minute)
  async processUpdateQueue(): Promise<void> {
    if (this.updateQueue.size === 0) return;
    
    // Process in batches of 20
    const batch = Array.from(this.updateQueue).slice(0, 20);
    
    try {
      // ONE API call for all symbols!
      const quotes = await fmpProvider.getBatchQuotes(batch);
      
      // Save to cache
      for (const quote of quotes) {
        await cache.set(
          `quote:${quote.symbol}`,
          quote,
          5 * 60 * 1000 // 5 min TTL
        );
        this.updateQueue.delete(quote.symbol);
      }
      
      logger.info(`✅ Updated ${quotes.length} quotes`);
    } catch (error) {
      logger.error('Failed to update quotes:', error);
      // Keep in queue for retry
    }
  }
  
  private isStale(data: any): boolean {
    if (!data.updatedAt) return true;
    const age = Date.now() - new Date(data.updatedAt).getTime();
    return age > 5 * 60 * 1000; // 5 minutes
  }
}

// Cron schedule
cron.schedule('* * * * *', async () => {
  await redditStrategy.processUpdateQueue();
});
```

### DIA 10: LOAD TESTING (QA-AUTOMATION-ENGINEER)

```yaml
# artillery.yml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
  processor: "./load-test-processor.js"

scenarios:
  - name: "User browsing stocks"
    weight: 70
    flow:
      - get:
          url: "/api/cache/quotes/batch"
          json:
            symbols: ["AAPL", "GOOGL", "MSFT"]
      - think: 5
      - get:
          url: "/api/cache/fundamentals/AAPL"
      - think: 10
      
  - name: "User checking portfolio"
    weight: 30
    flow:
      - get:
          url: "/api/portfolios/user123"
      - loop:
        - get:
            url: "/api/cache/quotes/{{$randomSymbol}}"
        - think: 3
        count: 5
```

```bash
# Run load test
npm install -D artillery
npx artillery run artillery.yml

# Monitor during test:
# Terminal 1: Database size
watch -n 5 'psql $DATABASE_URL -c "SELECT pg_database_size('"'"'postgres'"'"')/1024/1024 as mb;"'

# Terminal 2: Redis memory
watch -n 5 'redis-cli INFO memory | grep used_memory_human'

# Terminal 3: Server logs
pm2 logs alfalyzer --lines 100
```

---

## 📅 SEMANA 3: FRONTEND DADOS REAIS

### DIAS 11-12: FINDSTOCKS DASHBOARD (FRONTEND-REACT-SPECIALIST)

```typescript
// client/src/pages/find-stocks.tsx
// IMPORTANTE: ESTA É A PÁGINA DASHBOARD PRINCIPAL!

import { useBatchQuotes } from '@/hooks/use-market-data';
import { UnifiedStockCard } from '@/components/stock/unified-stock-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle } from 'lucide-react';

export function FindStocks() {
  // SEMPRE do cache, NUNCA API direta!
  const { data, error, isLoading } = useBatchQuotes(POPULAR_SYMBOLS, {
    endpoint: '/api/cache/quotes/batch',
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache 10 min
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Failed to fetch quotes:', error);
    }
  });
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Failed to load stocks</p>
          <p className="text-sm text-gray-600 mt-2">Please try again later</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Stock Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map(stock => (
          <div key={stock.symbol} className="relative">
            <UnifiedStockCard
              symbol={stock.symbol}
              variant="enhanced"
              data={stock}
            />
            
            {/* Stale data indicator */}
            {stock.isStale && (
              <Badge 
                variant="outline" 
                className="absolute top-2 right-2 text-xs"
              >
                <Clock className="w-3 h-3 mr-1" />
                Updating...
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### DIAS 13-14: CHARTS + INTRINSIC VALUE (FRONTEND-REACT-SPECIALIST)

```typescript
// client/src/pages/advanced-charts.tsx
// REMOVER TODO MOCK DATA!

import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AdvancedCharts({ symbol }: { symbol: string }) {
  // DELETE estas funções mock!
  // - generateQuarterlyData() 
  // - generateAnnualData()
  
  // USAR dados reais do cache
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['charts', symbol, period],
    queryFn: async () => {
      const response = await fetch(`/api/cache/historical/${symbol}/${period}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    placeholderData: previousData => previousData, // Keep old data while loading
  });
  
  // Transform FMP data to Recharts format
  const transformedData = useMemo(() => {
    if (!chartData) return [];
    
    return chartData.historical.map(item => ({
      date: formatDate(item.date),
      price: item.close,
      volume: item.volume / 1_000_000, // Millions
    }));
  }, [chartData]);
  
  if (isLoading) {
    return <ChartSkeleton />;
  }
  
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={transformedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#10b981" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// client/src/pages/intrinsic-value.tsx
export function IntrinsicValue({ symbol }: { symbol: string }) {
  // Fetch real fundamentals
  const { data: fundamentals } = useQuery({
    queryKey: ['fundamentals', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/cache/fundamentals/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch fundamentals');
      return response.json();
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
  });
  
  // Calculate DCF with real data
  const intrinsicValue = useMemo(() => {
    if (!fundamentals) return null;
    
    const fcf = fundamentals.freeCashFlow || 0;
    const shares = fundamentals.sharesOutstanding || 1;
    const growthRate = fundamentals.revenueGrowthRate || 0.05;
    const discountRate = 0.10; // 10% WACC
    
    // Simple DCF calculation
    let value = 0;
    let futureCF = fcf;
    
    // Project 5 years
    for (let i = 1; i <= 5; i++) {
      futureCF = futureCF * (1 + growthRate);
      value += futureCF / Math.pow(1 + discountRate, i);
    }
    
    // Terminal value
    const terminalValue = (futureCF * (1 + 0.03)) / (discountRate - 0.03);
    value += terminalValue / Math.pow(1 + discountRate, 5);
    
    return value / shares;
  }, [fundamentals]);
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Intrinsic Value: ${intrinsicValue?.toFixed(2)}</h2>
      {/* Rest of component */}
    </div>
  );
}
```

### DIA 15: PERFORMANCE OPTIMIZATION (FRONTEND-REACT-SPECIALIST)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'wouter'],
          'charts': ['recharts', 'd3-scale', 'd3-shape'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'utils': ['clsx', 'tailwind-merge', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
  },
});

// App.tsx - Lazy loading
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const AdvancedCharts = lazy(() => import('./pages/advanced-charts'));
const IntrinsicValue = lazy(() => import('./pages/intrinsic-value'));

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/charts/:symbol" component={AdvancedCharts} />
          <Route path="/intrinsic/:symbol" component={IntrinsicValue} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 📅 SEMANA 4: MONITORING + DEPLOY

### DIAS 16-17: MONITORING SETUP (DATA-OPTIMIZER)

```typescript
// server/monitoring/system-monitor.ts
import { logger } from '../lib/logger';
import { sendAlert, sendUrgentAlert } from '../lib/alerts';
import { redis } from '../cache/redis';
import { supabase } from '../lib/supabase';

export class SystemMonitor {
  private metrics = {
    dbSize: 0,
    apiCallsToday: 0,
    cacheHitRate: 0,
    responseTime: [],
  };
  
  // Run every 5 minutes
  async checkHealth(): Promise<void> {
    try {
      // 1. Check database size
      const { data: dbSize } = await supabase.rpc('get_database_size');
      this.metrics.dbSize = dbSize?.[0]?.size || 0;
      const dbPercentage = (this.metrics.dbSize / 500_000_000) * 100;
      
      if (dbPercentage > 90) {
        await sendUrgentAlert(`🚨 DB CRITICAL: ${dbPercentage.toFixed(1)}% used`);
        await this.emergencyCleanup();
      } else if (dbPercentage > 80) {
        await sendAlert(`⚠️ DB WARNING: ${dbPercentage.toFixed(1)}% used`);
      }
      
      // 2. Check Redis
      const redisInfo = await redis.info('memory');
      const memoryUsed = this.parseRedisMemory(redisInfo);
      if (memoryUsed > 200_000_000) { // 200MB
        await sendAlert(`⚠️ Redis memory high: ${memoryUsed / 1_000_000}MB`);
      }
      
      // 3. Check API quota
      if (this.metrics.apiCallsToday > 450) {
        await sendUrgentAlert(`📊 FMP quota critical: ${this.metrics.apiCallsToday}/500`);
        await this.throttleNonCritical();
      }
      
      // 4. Check cron jobs
      const lastCronRun = await redis.get('cron:last_run');
      if (Date.now() - parseInt(lastCronRun) > 600000) { // 10 min
        await sendUrgentAlert('⚠️ Cron jobs appear to be stopped!');
      }
      
      // 5. Ping healthchecks.io
      await fetch(`https://hc-ping.com/${process.env.HEALTHCHECK_UUID}`);
      
      // 6. Log metrics
      logger.info('System health check', this.metrics);
      
    } catch (error) {
      logger.error('Health check failed:', error);
      await sendUrgentAlert('System health check failed!', error);
    }
  }
  
  private async emergencyCleanup(): Promise<void> {
    // Delete everything > 30 minutes old
    await supabase.from('cache_quotes')
      .delete()
      .lt('updated_at', new Date(Date.now() - 30*60*1000).toISOString());
    
    await supabase.from('cache_fundamentals')
      .delete()
      .lt('updated_at', new Date(Date.now() - 60*60*1000).toISOString());
    
    await supabase.rpc('vacuum_tables');
    logger.warn('Emergency cleanup executed');
  }
  
  private async throttleNonCritical(): Promise<void> {
    // Reduce cron frequencies
    cronManager.updateSchedule('news', '0 */4 * * *'); // Every 4 hours
    cronManager.updateSchedule('fundamentals', '0 */6 * * *'); // Every 6 hours
    logger.warn('Throttled non-critical crons due to quota');
  }
}

// Initialize monitoring
const monitor = new SystemMonitor();
cron.schedule('*/5 * * * *', () => monitor.checkHealth());
```

### DIAS 18-19: EMERGENCY PROCEDURES (DEVOPS-INFRASTRUCTURE-ENGINEER)

```markdown
# EMERGENCY-PLAYBOOK.md

## 🚨 PROCEDIMENTOS DE EMERGÊNCIA ALFALYZER

### 1. DATABASE > 490MB
**Sintoma:** Alertas de database crítico
**Ação Imediata:**

```bash
# SSH no Hetzner
ssh root@hetzner-ip

# Conectar ao database
psql "${DATABASE_URL}"

# Cleanup emergencial
DELETE FROM cache_quotes WHERE updated_at < NOW() - INTERVAL '30 minutes';
DELETE FROM cache_fundamentals WHERE updated_at < NOW() - INTERVAL '12 hours';
DELETE FROM cache_historical WHERE updated_at < NOW() - INTERVAL '6 hours';

# Vacuum para liberar espaço
VACUUM FULL;

# Verificar novo tamanho
SELECT pg_database_size('postgres')/1024/1024 as mb_used;
```

### 2. REDIS DOWN
**Sintoma:** Fallback para Supabase ativo, response time alto
**Ação:**

```bash
# Verificar status
redis-cli ping

# Se não responder, restart
sudo systemctl restart redis-server

# Verificar logs
sudo journalctl -u redis-server -n 50

# Se persistir, limpar e restart
sudo rm -f /var/lib/redis/dump.rdb
sudo systemctl restart redis-server
```

### 3. CRON JOBS PARADOS
**Sintoma:** Dados não atualizando, alertas healthchecks.io
**Ação:**

```bash
# Verificar processo
ps aux | grep node | grep alfalyzer

# Restart aplicação
pm2 restart alfalyzer

# Verificar logs
pm2 logs alfalyzer --lines 100

# Se PM2 não funcionar
killall node
cd /path/to/alfalyzer
nohup node server/index.js > server.log 2>&1 &
```

### 4. API LIMIT EXCEEDED (FMP)
**Sintoma:** Erro 429, quota exceeded
**Ação:**

```javascript
// Desativar temporariamente crons não-críticos
cronManager.stop('news');
cronManager.stop('fundamentals');

// Aumentar TTL do cache
cache.setDefaultTTL('quotes', 30 * 60 * 1000); // 30 min
cache.setDefaultTTL('fundamentals', 4 * 60 * 60 * 1000); // 4 hours

// Notificar usuários
await broadcastMessage({
  type: 'warning',
  message: 'Data updates temporarily reduced due to high demand'
});
```

### 5. RESPONSE TIME > 1s
**Sintoma:** App lento, timeouts
**Ação:**

```bash
# Verificar CPU/Memory
htop

# Verificar conexões
netstat -tunp | grep :3001 | wc -l

# Se muitas conexões, ativar rate limiting mais agressivo
# server/index.ts - ajustar para max: 50

# Restart com mais workers
pm2 delete alfalyzer
pm2 start server/index.js -i 4 --name alfalyzer
```

### 6. ROLLBACK PROCEDURE
**Se deploy falhar:**

```bash
# Voltar para branch anterior
git checkout main
git pull origin main

# Rebuild
npm ci
npm run build

# Restart
pm2 restart alfalyzer

# Verificar
curl http://localhost:3001/health
```

## CONTATOS DE EMERGÊNCIA
- DevOps Lead: [TELEFONE]
- Database Admin: [TELEFONE]  
- Hetzner Support: +49 [NUMBER]
- Supabase Support: support@supabase.io
```

### DIAS 20-21: DEPLOY FINAL (DEVOPS-INFRASTRUCTURE-ENGINEER)

```bash
# DEPLOY CHECKLIST FINAL

echo "=== PRE-DEPLOY VALIDATION ==="

# 1. Run all tests
npm test
npm run test:e2e

# 2. Check database size
psql $DATABASE_URL -c "SELECT pg_database_size('postgres')/1024/1024 as mb;"
# MUST BE < 200MB

# 3. Verify Redis
redis-cli ping
redis-cli INFO memory

# 4. Check cron jobs
pm2 status
curl http://localhost:3001/api/cron/status

# 5. Verify monitoring
curl https://hc-ping.com/$HEALTHCHECK_UUID

# 6. Final backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
tar -czf alfalyzer-backup-$(date +%Y%m%d).tar.gz .

echo "=== DEPLOYING BACKEND ==="

# Deploy to Coolify
git add .
git commit -m "Production ready: FMP integration with Reddit strategy"
git push origin feature/production-ready

# In Coolify dashboard:
# 1. Create PR main <- feature/production-ready
# 2. Review changes
# 3. Merge and auto-deploy

echo "=== DEPLOYING FRONTEND ==="

# Build frontend
cd client
npm run build

# Check bundle size
du -sh dist
# MUST BE < 5MB

# Deploy to Vercel
vercel --prod

echo "=== POST-DEPLOY MONITORING ==="

# Monitor for 1 hour
watch -n 30 'curl -s http://localhost:3001/health | jq .'

# Check logs
pm2 logs alfalyzer --lines 100

# Verify frontend
curl -I https://alfalyzer.vercel.app

# Check metrics
curl http://localhost:3001/api/metrics

echo "✅ DEPLOYMENT COMPLETE!"
```

---

## 📊 VALIDAÇÃO FINAL E MÉTRICAS

### CHECKLIST DE SUCESSO
```markdown
## Backend
- [ ] Redis running with < 100MB usage
- [ ] Database < 300MB after cleanup
- [ ] All cron jobs active
- [ ] Zero API calls from user requests
- [ ] Response time < 50ms (p95)
- [ ] Cache hit rate > 95%

## Frontend  
- [ ] Bundle size < 500KB
- [ ] FindStocks shows real data
- [ ] Charts without mock data
- [ ] Intrinsic value calculated correctly
- [ ] Loading states working
- [ ] Error boundaries active

## Security
- [ ] CORS configured correctly
- [ ] No VITE_ API keys
- [ ] CSRF protection enabled
- [ ] Rate limiting active
- [ ] Logs sanitized

## Monitoring
- [ ] Healthchecks.io receiving pings
- [ ] Alerts configured (Slack/Email)
- [ ] Database size monitored
- [ ] API quota tracked
- [ ] Emergency playbook ready
```

### MÉTRICAS TARGET

| Métrica | Objetivo | Resultado |
|---------|----------|-----------|
| Response Time (p95) | <100ms | _______ |
| Cache Hit Rate | >90% | _______ |
| Database Size | <300MB | _______ |
| API Calls/Day | <330 | _______ |
| Uptime | >99.9% | _______ |
| Error Rate | <0.1% | _______ |
| Bundle Size | <500KB | _______ |
| Lighthouse Score | >90 | _______ |

---

## 🎯 CONCLUSÃO E SIGN-OFF

### CRITÉRIOS DE ACEITAÇÃO
- [ ] Todos os checklists completos
- [ ] Métricas dentro do target
- [ ] Zero bugs críticos
- [ ] Documentação atualizada
- [ ] Playbooks testados
- [ ] Monitoring funcional

### ASSINATURAS DE APROVAÇÃO
- **Security Auditor:** _________________ Data: _______
- **Backend Architect:** ________________ Data: _______
- **Frontend Specialist:** ______________ Data: _______
- **DevOps Engineer:** __________________ Data: _______
- **Product Owner:** ____________________ Data: _______

---

## 📝 NOTAS PARA AGENTES

1. **SEMPRE** fazer backup antes de mudanças
2. **NUNCA** commitar secrets ou API keys
3. **TESTAR** localmente antes de deploy
4. **DOCUMENTAR** todas as alterações
5. **COMUNICAR** problemas imediatamente
6. **VALIDAR** com checklist após cada fase

### EM CASO DE DÚVIDA
- Consultar este documento
- Pedir revisão de outro agente
- Testar em ambiente isolado
- Documentar a dúvida para futuro

---

**ESTE PLANO FOI VALIDADO E ESTÁ PRONTO PARA EXECUÇÃO COM AGENTES --ULTRATHINK**

Última atualização: $(date)
Versão: 2.0 FINAL
Status: APPROVED FOR PRODUCTION