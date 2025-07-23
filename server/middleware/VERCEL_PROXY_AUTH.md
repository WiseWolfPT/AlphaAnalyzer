# Vercel Proxy Authentication Middleware

Este middleware permite que requests vindos do proxy Vercel sejam autenticados de forma especial, possibilitando que o frontend hospedado no Vercel acesse o backend sem precisar de tokens de autenticação tradicionais.

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu `.env`:

```bash
# Habilitar autenticação do proxy Vercel
ENABLE_VERCEL_PROXY_AUTH=true

# Permitir que o proxy bypass a autenticação normal
VERCEL_PROXY_BYPASS_AUTH=true

# Secret compartilhado para segurança adicional (opcional)
VERCEL_PROXY_SECRET=sua-chave-secreta-aqui

# Deployments permitidos (separados por vírgula)
VERCEL_ALLOWED_DEPLOYMENTS=alfalyzer.vercel.app,alfalyzer-*.vercel.app

# Regiões permitidas (* para todas)
VERCEL_ALLOWED_REGIONS=*

# Debug mode
VERCEL_PROXY_DEBUG=false

# Exigir secret para autenticação
VERCEL_PROXY_REQUIRE_SECRET=false
```

## Como Usar

### 1. Importar o Middleware

```typescript
import { authMiddleware } from '../middleware/combined-auth';
```

### 2. Aplicar nas Rotas

#### Rotas Públicas com Tracking de Proxy
```typescript
router.get('/api/public-data', 
  authMiddleware.public, 
  (req, res) => {
    // Request público, mas rastreia se veio do proxy
    if (req.isVercelProxy) {
      console.log('Request do Vercel:', req.proxyMetadata);
    }
  }
);
```

#### Rotas Protegidas com Bypass para Proxy
```typescript
router.get('/api/market-data/:symbol', 
  authMiddleware.protected, 
  (req, res) => {
    // Requer autenticação, mas proxy Vercel pode fazer bypass
    const user = req.user;
    // Se user.id === 'vercel-proxy-system', é um request do proxy
  }
);
```

#### Rotas Estritamente Autenticadas
```typescript
router.post('/api/user/profile', 
  authMiddleware.strict, 
  (req, res) => {
    // Sempre requer autenticação, mesmo para proxy
  }
);
```

### 3. Verificar se Request é do Proxy

```typescript
import { authHelpers } from '../middleware/combined-auth';

router.get('/api/data', authMiddleware.protected, (req, res) => {
  if (authHelpers.isProxyUser(req)) {
    // É um request do sistema proxy
    console.log('Proxy metadata:', authHelpers.getUnifiedUser(req));
  }
  
  // Continuar processamento...
});
```

## Como o Vercel Deve Enviar Requests

### Headers Obrigatórios

O proxy Vercel deve incluir os seguintes headers:

```javascript
// No Vercel (frontend)
const response = await fetch(`${API_URL}/api/market-data/AAPL`, {
  headers: {
    'x-vercel-proxy-secret': process.env.VERCEL_PROXY_SECRET, // Se configurado
    // Outros headers são adicionados automaticamente pelo Vercel
  }
});
```

### Headers Automáticos do Vercel

O Vercel adiciona automaticamente:
- `x-vercel-id`: ID único do request
- `x-vercel-deployment-url`: URL do deployment
- `x-forwarded-for`: IP original do cliente
- `x-forwarded-proto`: Protocolo (https/http)
- `x-forwarded-host`: Host original

## Segurança

### 1. Use um Secret Compartilhado

```bash
# Backend
VERCEL_PROXY_SECRET=chave-super-secreta-123
VERCEL_PROXY_REQUIRE_SECRET=true

# Frontend (Vercel)
VERCEL_PROXY_SECRET=chave-super-secreta-123
```

### 2. Restrinja Deployments

```bash
# Apenas deployments específicos
VERCEL_ALLOWED_DEPLOYMENTS=producao.vercel.app

# Ou use wildcards
VERCEL_ALLOWED_DEPLOYMENTS=alfalyzer-*.vercel.app
```

### 3. Restrinja Regiões (se necessário)

```bash
# Apenas algumas regiões
VERCEL_ALLOWED_REGIONS=us-east-1,eu-west-1
```

## Logs e Debug

### Habilitar Debug Mode

```bash
VERCEL_PROXY_DEBUG=true
```

### Logs Disponíveis

```
🔐 Vercel proxy authentication successful
⚠️ Invalid Vercel proxy secret
✅ Vercel proxy bypass enabled
📊 Proxy Audit: {"timestamp":"2025-01-23T...","deployment":"..."}
```

## Rate Limiting

O middleware inclui rate limiting específico para proxy:

```typescript
import { vercelProxy } from '../middleware/vercel-proxy-auth';

// 1000 requests por minuto por deployment
router.use(vercelProxy.rateLimit(60000, 1000));
```

## Troubleshooting

### Request não reconhecido como proxy

1. Verifique se `ENABLE_VERCEL_PROXY_AUTH=true`
2. Confirme que os headers Vercel estão presentes
3. Ative debug mode para ver logs detalhados

### Erro 403: INVALID_PROXY_SIGNATURE

1. Verifique se o secret está correto em ambos os lados
2. Confirme que o header `x-vercel-proxy-secret` está sendo enviado

### Erro 403: DEPLOYMENT_NOT_ALLOWED

1. Adicione o deployment à lista permitida
2. Use `*` para permitir todos os deployments

### Erro 429: RATE_LIMIT_EXCEEDED

1. Aumente o limite de rate
2. Implemente cache no frontend
3. Use requisições em batch quando possível

## Exemplo Completo

```typescript
// server/routes/market-data.ts
import { Router } from 'express';
import { authMiddleware, authHelpers } from '../middleware/combined-auth';

const router = Router();

// Rota que permite acesso via proxy Vercel
router.get('/quote/:symbol', 
  authMiddleware.protected, // Permite bypass para proxy
  async (req, res) => {
    try {
      const { symbol } = req.params;
      const user = authHelpers.getUnifiedUser(req);
      
      // Log especial para requests do proxy
      if (authHelpers.isProxyUser(req)) {
        console.log(`Proxy request for ${symbol} from deployment:`, 
          user?.metadata?.proxyInfo?.deployment
        );
      }
      
      // Buscar dados do mercado...
      const data = await getMarketData(symbol);
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  }
);

export default router;
```