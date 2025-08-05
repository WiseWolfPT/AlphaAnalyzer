# Guia para Corrigir Erros do Polygon.io

## Problema
- Polygon API retornando erros 403 (Forbidden) e 429 (Too Many Requests)
- Apenas 2 de muitas requisições foram bem-sucedidas

## Soluções Imediatas

### 1. Adicionar ALLOWED_ORIGINS no Coolify

No painel do Coolify, adicione esta variável de ambiente:

```
ALLOWED_ORIGINS=https://alfalyzerpro4-20n9vt0bo-antonios-projects-f9cd3cd0.vercel.app,https://alfalyzer.vercel.app
```

### 2. Verificar Limites do Plano Gratuito

O plano gratuito do Polygon tem limites severos:
- **5 requisições por minuto**
- Acesso limitado a alguns endpoints
- Sem acesso a dados em tempo real

### 3. Implementar Fallback para Outras APIs

Como o Polygon está falhando, o sistema deveria automaticamente usar outras APIs. Verifique se as outras APIs estão configuradas corretamente:

- ✅ Alpha Vantage
- ✅ Finnhub  
- ✅ FMP
- ✅ Twelve Data

### 4. Solução de Código

Adicione um rate limiter específico para Polygon no arquivo `server/services/providers/polygon.ts`:

```typescript
// Rate limiter específico para Polygon (5 req/min)
const polygonRateLimiter = {
  lastReset: Date.now(),
  count: 0,
  limit: 5,
  window: 60000, // 1 minuto
  
  canMakeRequest(): boolean {
    const now = Date.now();
    if (now - this.lastReset > this.window) {
      this.count = 0;
      this.lastReset = now;
    }
    return this.count < this.limit;
  },
  
  recordRequest() {
    this.count++;
  }
};

// Antes de cada requisição:
if (!polygonRateLimiter.canMakeRequest()) {
  throw new Error('Polygon rate limit exceeded, use fallback');
}
polygonRateLimiter.recordRequest();
```

### 5. Configurar Ordem de Prioridade das APIs

No arquivo de configuração, mude a ordem para usar Polygon por último:

```typescript
const API_PRIORITY = [
  'finnhub',      // Melhor para tempo real
  'alpha_vantage', // Boa cobertura
  'twelve_data',   // Bom fallback
  'fmp',          // Dados fundamentais
  'polygon'       // Usar apenas como último recurso
];
```

## Teste Rápido

Após fazer as mudanças:

1. Reinicie o serviço no Coolify
2. Teste a API: `https://crucial-ivonne-alfalyzer-90666a9e.coolify.app/health`
3. Verifique se as outras APIs estão sendo usadas como fallback

## Alternativas

Se o Polygon continuar problemático:
1. **Remova temporariamente** o Polygon da lista de providers
2. **Use apenas as outras 4 APIs** que estão funcionando
3. **Considere upgrade** para um plano pago se precisar do Polygon

O importante é que o sistema tem fallback automático - se uma API falha, ele usa a próxima!