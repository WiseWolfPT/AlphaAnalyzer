# 🚨 GUIA COMPLETO - RESOLVER ERRO 401 DEFINITIVAMENTE

## 🔴 PROBLEMA IDENTIFICADO
Frontend não funciona porque VITE_API_URL está fazendo chamadas diretas para Koyeb, causando:
- ❌ Erro 401 (Unauthorized) 
- ❌ CORS errors
- ❌ Headers de autenticação não são enviados

## ⚡ SOLUÇÃO RÁPIDA (5-10 minutos)

### 1️⃣ Remover VITE_API_URL do Vercel
```
https://vercel.com/dashboard
→ Projeto: alfalyzer
→ Settings
→ Environment Variables
```

**DELETAR COMPLETAMENTE:**
- ❌ VITE_API_URL

**MANTER APENAS:**
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

### 2️⃣ Limpar Cache e Fazer Redeploy
```
→ Deployments
→ Clicar nos 3 pontinhos
→ "Redeploy" 
→ DESMARCAR "Use existing Build Cache" ⚠️
→ "Redeploy"
```

### 3️⃣ Verificar no Browser (IMPORTANTE!)
1. Abrir janela anónima/incógnito
2. F12 → Network tab
3. Fazer login/ação que gera erro
4. Verificar Request URL:
   - ✅ CORRETO: `https://alfalyzer.vercel.app/api/...`
   - ❌ ERRADO: `https://crucial-ivonne...koyeb.app/api/...`

---

## 🔍 DIAGNÓSTICO AVANÇADO

### A. Adicionar Logs no Frontend
**Arquivo**: `client/src/services/market-data-client.ts`
```typescript
// Adicionar no início do arquivo
const API_BASE_URL = typeof window !== 'undefined' ? '' : (env.VITE_API_URL || 'https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app');
console.log('[MarketDataClient] API Base URL:', API_BASE_URL || '(relative paths)');
console.log('[MarketDataClient] Environment:', { 
  isClient: typeof window !== 'undefined',
  VITE_API_URL: import.meta.env.VITE_API_URL 
});
```

### B. Verificar Headers no Backend (Koyeb)
**Arquivo**: `server/middleware/logging.js`
```javascript
// Adicionar middleware de debug temporário
app.use('/api/*', (req, res, next) => {
  console.log('=== REQUEST DEBUG ===');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  console.log('Headers:', {
    authorization: req.headers.authorization,
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    host: req.headers.host,
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-forwarded-host': req.headers['x-forwarded-host']
  });
  console.log('===================');
  next();
});
```

### C. Verificar Configuração de CORS
**Arquivo**: `server/index.js` ou `server/app.js`
```javascript
// Configuração correta de CORS para Vercel
app.use(cors({
  origin: [
    'https://alfalyzerpro4-q0y5xznl7-antonios-projects-f9cd3cd0.vercel.app',
    'https://alfalyzer.vercel.app',
    /\.vercel\.app$/,  // Aceitar todos os subdomínios Vercel
    'http://localhost:5173', // Desenvolvimento local
  ],
  credentials: true, // CRÍTICO para enviar cookies/auth
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
}));
```

---

## 🚨 PROBLEMA CONHECIDO DO VERCEL

**AVISO**: Vercel tem um bug conhecido onde remove o header Authorization em produção!

### Solução Alternativa 1: Usar Header Customizado
**Frontend**:
```javascript
// Em vez de 'Authorization', usar header customizado
headers: {
  'X-Auth-Token': `Bearer ${token}`, // Vercel não remove este
}
```

**Backend**:
```javascript
// Aceitar ambos os headers
const token = req.headers.authorization || req.headers['x-auth-token'];
```

### Solução Alternativa 2: Middleware Vercel (se usando Next.js)
**Arquivo**: `middleware.js` na raiz
```javascript
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Só aplicar em rotas /api/*
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    
    // Preservar token se existir
    const token = request.headers.get('authorization');
    if (token) {
      requestHeaders.set('Authorization', token);
    }
    
    return NextResponse.rewrite(
      new URL(request.url.replace('vercel.app', 'koyeb.app')),
      { request: { headers: requestHeaders } }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### ✅ Após as mudanças, verificar:
- [ ] Console do browser não mostra VITE_API_URL
- [ ] Network tab mostra chamadas para vercel.app/api/*
- [ ] Não há erros CORS no console
- [ ] Backend logs mostram headers de autenticação
- [ ] Dados carregam normalmente

### ❌ Se ainda não funcionar:
1. **Verificar Logs Vercel**: Dashboard → Functions → Ver se proxy está ativo
2. **Testar Health Check**: `curl https://alfalyzer.vercel.app/api/health`
3. **Verificar Token**: Talvez esteja expirado ou inválido
4. **Forçar Rebuild**: Deletar `node_modules` e `.vercel` localmente

---

## 🔐 SEGURANÇA IMPORTANTE

### Variáveis VITE_* são PÚBLICAS!
- ✅ USAR para: URLs públicas, feature flags
- ❌ NUNCA usar para: API keys, secrets, tokens

### Para dados sensíveis no servidor:
```javascript
// SEM prefixo VITE_ = seguro no servidor
SUPABASE_SERVICE_KEY=xxx  // ✅ Só no servidor
VITE_SUPABASE_URL=xxx     // ⚠️ Exposto no cliente
```

---

## 💡 SOLUÇÃO DEFINITIVA (PRÓXIMO PASSO)

Implementar arquitetura de cache conforme `ALFALYZER_ACTION_PLAN.md`:
- Backend busca dados das APIs
- Armazena no Supabase
- Frontend só consulta cache
- Elimina problemas de CORS/Auth definitivamente

---

**TEMPO ESTIMADO**: 5-10 minutos para correção imediata
**RESULTADO ESPERADO**: Frontend funcionando sem erro 401