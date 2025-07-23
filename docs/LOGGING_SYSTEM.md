# Sistema de Logging Completo - Alfalyzer

## Visão Geral

Sistema robusto de logging implementado para debugar erros 401 e outros problemas de conectividade. O sistema inclui:

- Logger estruturado no frontend e backend
- Interceptor HTTP para todas requisições/respostas
- Dashboard de logs em tempo real
- Modo debug ativável por toggle
- Logging específico para auth/CORS/proxy
- Correlation IDs entre requests
- Performance monitoring

## Como Usar

### 1. Ativar Debug Mode

**Via Interface:**
- Pressione `Ctrl+Shift+D` (ou `Cmd+Shift+D` no Mac)
- Ou clique no ícone de bug no canto inferior esquerdo
- Ative o toggle "Debug Mode"

**Via Console:**
```javascript
// Ativar
localStorage.setItem('debug-mode', 'true');
location.reload();

// Desativar
localStorage.removeItem('debug-mode');
location.reload();
```

### 2. Visualizar Logs

**Dashboard de Logs:**
- Acesse: `/admin/logs`
- Funcionalidades:
  - Filtro por nível (error, warn, info, debug)
  - Busca por texto
  - Auto-refresh (5s)
  - Export JSON
  - Visualização de logs locais e servidor

**Console do Browser:**
- Com debug mode ativo, logs coloridos aparecem no console
- Formato: `[timestamp] [level] message {context}`

### 3. Debugar Erro 401

O sistema loga automaticamente:

```javascript
// Frontend - Todas requisições HTTP
logger.logRequest(method, url, data, headers);
logger.logResponse(correlationId, status, url, data, duration);

// Backend - Detalhes de auth
log.auth('login-attempt', success, userId, details);
log.error('401 Unauthorized - Detailed Analysis', {...});

// CORS específico
log.cors(origin, allowed, reason);
```

### 4. Usar o Logger no Código

**Frontend:**
```typescript
import logger from '@/lib/logger';

// Logs básicos
logger.debug('Debug message', { extra: 'data' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { error: err });

// Logs específicos
logger.logAuth('login', true, { userId: '123' });
logger.logPerformance('api-call', 150);

// Com correlation ID
const correlationId = logger.generateCorrelationId();
logger.debug('Starting operation', { correlationId });
```

**Backend:**
```typescript
import log from '../lib/logger';

// Logs básicos
log.debug('Debug message', { metadata });
log.info('Info message');
log.warn('Warning');
log.error('Error', { stack: err.stack });

// Logs específicos
log.auth('login', true, userId, { ip: req.ip });
log.api('finnhub', '/quote', 200, 45);
log.cors('https://app.com', true);
```

### 5. Análise de Problemas 401

**Checklist de Debug:**

1. **Verificar Headers:**
   - Authorization presente?
   - Token válido?
   - CORS headers corretos?

2. **Verificar Environment:**
   - Variáveis de ambiente carregadas?
   - Supabase configurado?
   - JWT secret presente?

3. **Verificar Fluxo:**
   - Login bem-sucedido?
   - Token armazenado?
   - Token enviado nas requests?

**Logs Específicos para 401:**
```
🚨 401 Unauthorized - Detailed Analysis
- Path, method, headers
- User/session info
- Environment config
- Error stack trace
```

## Arquitetura

### Frontend

1. **Logger (`/client/src/lib/logger.ts`)**
   - Níveis: DEBUG, INFO, WARN, ERROR
   - Buffer local + envio remoto
   - Console colorido
   - Performance tracking

2. **HTTP Interceptor (`/client/src/lib/http-interceptor.ts`)**
   - Intercepta todas fetch requests
   - Adiciona correlation IDs
   - Loga requests/responses
   - Detecta erros 401/CORS

3. **Debug Toggle (`/client/src/components/debug/debug-mode-toggle.tsx`)**
   - Ativação rápida (Ctrl+Shift+D)
   - Indicador visual
   - Link para dashboard

### Backend

1. **Winston Logger (`/server/lib/logger.ts`)**
   - Logs estruturados JSON
   - Rotação de arquivos
   - Console + arquivo
   - Métodos específicos (auth, api, cors)

2. **Middleware de Logging (`/server/middleware/auth-logging.ts`)**
   - Auth logging detalhado
   - CORS logging
   - 401 error capture
   - Proxy logging
   - Environment validation

3. **API de Logs (`/server/routes/logs.ts`)**
   - GET /api/logs - Listar logs
   - POST /api/logs - Receber logs do frontend
   - DELETE /api/logs - Limpar logs
   - GET /api/logs/stats - Estatísticas

## Performance

- Logs são bufferizados (5s) antes do envio
- Cache de logs no frontend
- Rotação automática de arquivos (5MB)
- Sanitização de dados sensíveis
- Compressão de payloads grandes

## Segurança

- Headers sensíveis são redactados ([REDACTED])
- Passwords nunca são logados
- API keys ocultas
- Logs protegidos por admin auth em produção

## Troubleshooting

**Logs não aparecem:**
- Verifique se debug mode está ativo
- Verifique console para erros
- Verifique se Winston está instalado

**Dashboard vazio:**
- Verifique se backend está rodando
- Verifique rota /api/logs
- Verifique permissões de arquivo

**Performance lenta:**
- Reduza nível de log (INFO ao invés de DEBUG)
- Desative logs locais se usando remoto
- Limpe logs antigos regularmente

## Próximos Passos

1. Integração com Sentry para produção
2. Alertas automáticos para erros críticos
3. Análise de padrões com ML
4. Dashboard de métricas em tempo real
5. Exportação para ferramentas externas