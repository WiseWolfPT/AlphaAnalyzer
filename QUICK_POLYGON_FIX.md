# Solução Rápida para o Problema do Polygon

## Opção 1: Adicionar ALLOWED_ORIGINS no Koyeb (RECOMENDADO)

No painel do Koyeb, adicione esta variável de ambiente:

```
ALLOWED_ORIGINS=https://alfalyzerpro4-20n9vt0bo-antonios-projects-f9cd3cd0.vercel.app,https://alfalyzer.vercel.app
```

## Opção 2: Desabilitar Polygon Temporariamente

Edite o arquivo `server/services/quota/quota-limits.ts` e remova 'polygon' das listas:

```typescript
// Linha 69 - ANTES:
price: ['finnhub', 'twelveData', 'fmp', 'polygon'],

// Linha 69 - DEPOIS:
price: ['finnhub', 'twelveData', 'fmp'],

// Linha 71 - ANTES:
historical: ['twelveData', 'alphaVantage', 'fmp', 'polygon'],

// Linha 71 - DEPOIS:
historical: ['twelveData', 'alphaVantage', 'fmp'],
```

## Opção 3: Adicionar Rate Limiter para Polygon

Crie um arquivo `server/services/providers/polygon-rate-limiter.ts`:

```typescript
class PolygonRateLimiter {
  private requests = 0;
  private windowStart = Date.now();
  private readonly WINDOW_MS = 60000; // 1 minuto
  private readonly MAX_REQUESTS = 5;

  canRequest(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.windowStart > this.WINDOW_MS) {
      this.requests = 0;
      this.windowStart = now;
    }
    
    return this.requests < this.MAX_REQUESTS;
  }
  
  recordRequest(): void {
    this.requests++;
  }
}

export const polygonRateLimiter = new PolygonRateLimiter();
```

E use no `polygon.ts`:

```typescript
import { polygonRateLimiter } from './polygon-rate-limiter';

async getQuote(symbol: string): Promise<StockQuote> {
  // Check rate limit
  if (!polygonRateLimiter.canRequest()) {
    throw new Error('Polygon rate limit exceeded');
  }
  
  try {
    polygonRateLimiter.recordRequest();
    // ... resto do código
  }
}
```

## Ações Imediatas

1. **No Koyeb**: Adicione `ALLOWED_ORIGINS` com os URLs do Vercel
2. **Commit e Push**: 
   ```bash
   git add .
   git commit -m "fix: Add ALLOWED_ORIGINS for CORS and improve Polygon handling"
   git push origin phase-0-main
   ```

## Verificação

Após o deploy:
1. Teste: `https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/health`
2. Verifique logs no Koyeb - os erros 403 devem parar
3. O sistema deve usar automaticamente outras APIs quando o Polygon falhar

## Nota Importante

O sistema já tem fallback automático! Quando o Polygon falha, ele tenta:
1. Finnhub (prioridade 1)
2. Twelve Data (prioridade 2)
3. FMP (prioridade 3)

O erro do Polygon não impede o funcionamento - apenas gera logs de erro.