# 🚀 Guia Completo de Deploy - Alfalyzer (Vercel + Railway + Supabase)

## 🔍 Problemas Identificados e Soluções

Após análise com múltiplos modelos de IA (Gemini 2.5 Pro e O3-mini), identificamos os seguintes problemas:

1. **Credenciais hardcoded no vercel.json** (risco de segurança crítico)
2. **Falta de configuração de proxy/rewrite** para o backend no Railway
3. **VITE_API_URL incorreta** (aponta para `/api` sem proxy configurado)
4. **Possíveis problemas de CORS** entre Vercel e Railway
5. **Configuração redundante** de variáveis em "env" e "build.env"

---

## 📋 PARTE 1: Configuração do Frontend (Vercel)

### 1.1 Atualizar vercel.json (JÁ FEITO ✓)
O arquivo foi atualizado para:
- Remover credenciais hardcoded
- Adicionar rewrites para proxy do backend
- Manter configuração de cache para assets

### 1.2 Variáveis de Ambiente no Vercel

Acesse o dashboard do Vercel → Settings → Environment Variables e adicione:

#### Variáveis do Supabase (OBRIGATÓRIAS)
```
VITE_SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
VITE_SUPABASE_ANON_KEY=[sua chave anon do Supabase]
```

#### URL da API Backend
```
VITE_API_URL=/api
```
*Nota: Mantemos `/api` porque configuramos o proxy no vercel.json*

#### Chaves das APIs Financeiras (se usar no frontend)
```
VITE_ALPHA_VANTAGE_API_KEY=[sua chave]
VITE_TWELVE_DATA_API_KEY=[sua chave]
VITE_FMP_API_KEY=[sua chave]
VITE_FINNHUB_API_KEY=[sua chave]
VITE_POLYGON_API_KEY=[sua chave]
```

#### Stripe (se habilitado)
```
VITE_STRIPE_PUBLISHABLE_KEY=[sua chave pública]
```

#### Features Flags
```
VITE_ENABLE_REAL_TIME=true
VITE_ENABLE_PAYMENTS=false
VITE_ENABLE_AI_FEATURES=true
```

### 1.3 Atualizar URL do Backend no vercel.json
Após ter a URL do Railway, edite vercel.json linha 8:
```json
"destination": "https://[SUA-URL-RAILWAY].up.railway.app/api/:path*"
```

### ⚠️ IMPORTANTE - VERCEL
1. **NÃO coloque credenciais no vercel.json** - use sempre Environment Variables
2. **Use o prefixo VITE_** para variáveis que o frontend precisa acessar
3. **Configure para todos os ambientes**: Production, Preview, Development
4. **Atualize a URL do backend** no vercel.json quando tiver a URL real do Railway

---

## 📋 PARTE 2: Configuração do Backend (Railway)

### 2.1 Variáveis de Ambiente no Railway

#### Configuração Básica
```env
NODE_ENV=production
PORT=${{PORT}}
```

#### URLs do Frontend (CRÍTICO para CORS)
```env
FRONTEND_ORIGIN=https://alfalyzer.vercel.app
CORS_ORIGIN=https://alfalyzer.vercel.app
ALLOWED_ORIGINS=https://alfalyzer.vercel.app,https://*.vercel.app
```

#### Supabase (Backend)
```env
SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[sua service role key - NÃO a anon key]
SUPABASE_ANON_KEY=[sua anon key]
```

#### APIs Financeiras
```env
ALPHA_VANTAGE_API_KEY=[sua chave]
TWELVE_DATA_API_KEY=[sua chave]
FINNHUB_API_KEY=[sua chave]
FMP_API_KEY=[sua chave]
POLYGON_API_KEY=[sua chave]
```

#### Segurança JWT
```env
JWT_ACCESS_SECRET=[gere uma string aleatória de 32+ caracteres]
JWT_REFRESH_SECRET=[gere outra string aleatória de 32+ caracteres]
```

#### Stripe (se usar)
```env
STRIPE_SECRET_KEY=[sua secret key]
STRIPE_WEBHOOK_SECRET=[seu webhook secret]
```

### 2.2 Comando de Start

No Railway, configure:
- **Start Command**: `npm run backend:prod`
- **Build Command**: `npm install`

### 2.3 Verificações Importantes

1. **Obtenha a URL do Railway** após o deploy (ex: `https://alfalyzer-backend.up.railway.app`)
2. **Atualize o vercel.json** com esta URL no campo `destination` dos rewrites
3. **Teste o health check**: `curl https://sua-url.up.railway.app/api/health`

---

## 📋 PARTE 3: Configuração do Supabase

### 3.1 Verificar Configurações
No Supabase dashboard:
- Authentication → URL Configuration
- Site URL: `https://alfalyzer.vercel.app`
- Redirect URLs: Adicione URLs do Vercel

### 3.2 RLS Policies
Verifique se as políticas de Row Level Security estão configuradas corretamente para permitir acesso com a anon key.

---

## 📋 PARTE 4: Deploy e Teste

### 4.1 Deploy
```bash
# 1. Commit das mudanças
git add .
git commit -m "fix: corrigir configuração de deployment Vercel"
git push

# 2. Deploy manual (se auto-deploy não estiver ativo)
vercel --prod

# 3. Testar com o script de debug
node debug-vercel-deployment.js
```

### 4.2 Script de Debug

Crie um arquivo `debug-vercel-deployment.js` com o seguinte conteúdo:

```javascript
#!/usr/bin/env node

/**
 * Script de debugging para deployment Vercel + Railway
 * Ajuda a identificar problemas comuns de configuração
 */

const https = require('https');
const { URL } = require('url');

// Configurações - ATUALIZE COM SUAS URLs
const CONFIG = {
  vercelUrl: 'https://alfalyzer.vercel.app',
  railwayUrl: 'https://alfalyzer-backend.up.railway.app',
  supabaseUrl: 'https://avjnfessefxtfurayybp.supabase.co'
};

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Testa uma URL
async function testUrl(url, description) {
  return new Promise((resolve) => {
    log(`\n🔍 Testando ${description}: ${url}`, 'blue');
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Alfalyzer-Debug/1.0'
      }
    };

    const req = https.request(options, (res) => {
      log(`   Status: ${res.statusCode}`, res.statusCode < 400 ? 'green' : 'red');
      
      if (res.headers['access-control-allow-origin']) {
        log(`   CORS: ${res.headers['access-control-allow-origin']}`, 'green');
      }
      
      resolve({ url, status: res.statusCode, headers: res.headers });
    });

    req.on('error', (error) => {
      log(`   ❌ Erro: ${error.message}`, 'red');
      resolve({ url, error: error.message });
    });

    req.setTimeout(10000, () => {
      log(`   ⏱️  Timeout após 10 segundos`, 'yellow');
      req.destroy();
      resolve({ url, error: 'Timeout' });
    });

    req.end();
  });
}

// Testa CORS
async function testCors(backendUrl, frontendUrl) {
  return new Promise((resolve) => {
    log(`\n🔍 Testando CORS de ${frontendUrl} para ${backendUrl}`, 'blue');
    
    const urlObj = new URL(backendUrl + '/api/health');
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': frontendUrl,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const req = https.request(options, (res) => {
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers']
      };

      if (corsHeaders['access-control-allow-origin']) {
        log(`   ✅ CORS configurado corretamente`, 'green');
        Object.entries(corsHeaders).forEach(([key, value]) => {
          if (value) log(`   ${key}: ${value}`, 'green');
        });
      } else {
        log(`   ❌ CORS não configurado ou bloqueado`, 'red');
      }
      
      resolve(corsHeaders);
    });

    req.on('error', (error) => {
      log(`   ❌ Erro no teste CORS: ${error.message}`, 'red');
      resolve({ error: error.message });
    });

    req.end();
  });
}

// Executa todos os testes
async function runDiagnostics() {
  log('🚀 Iniciando diagnóstico de deployment Alfalyzer\n', 'yellow');
  
  // 1. Testa Frontend (Vercel)
  await testUrl(CONFIG.vercelUrl, 'Frontend (Vercel)');
  
  // 2. Testa Backend (Railway)
  await testUrl(CONFIG.railwayUrl + '/api/health', 'Backend Health Check');
  
  // 3. Testa Supabase
  await testUrl(CONFIG.supabaseUrl + '/rest/v1/', 'Supabase REST API');
  
  // 4. Testa CORS
  await testCors(CONFIG.railwayUrl, CONFIG.vercelUrl);
  
  // 5. Testa API através do proxy Vercel
  await testUrl(CONFIG.vercelUrl + '/api/health', 'API via Vercel Proxy');
  
  log('\n📋 Checklist de Verificação:', 'yellow');
  log('[ ] Backend está rodando e acessível', 'blue');
  log('[ ] CORS está configurado para aceitar o domínio Vercel', 'blue');
  log('[ ] Proxy do Vercel está redirecionando /api/* corretamente', 'blue');
  log('[ ] Variáveis de ambiente estão configuradas em ambos os serviços', 'blue');
  log('[ ] Supabase está acessível e com RLS configurado', 'blue');
  
  log('\n✨ Diagnóstico completo!', 'green');
}

// Executa
runDiagnostics().catch(console.error);
```

---

## 🐛 PARTE 5: Troubleshooting

### Tela preta/branca após deploy
1. Abra o Console do navegador (F12)
2. Procure por erros de:
   - Failed to fetch
   - CORS blocked
   - 404 Not Found
3. Verifique se as variáveis VITE_ estão disponíveis

### Erro de CORS
1. Confirme que FRONTEND_ORIGIN está correto no Railway
2. Teste com `curl`:
   ```bash
   curl -H "Origin: https://alfalyzer.vercel.app" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -v https://sua-backend-url.up.railway.app/api/health
   ```

### API retorna 404
1. Verifique se o rewrite está correto no vercel.json
2. Confirme que o backend está rodando no Railway
3. Teste direto: `https://[railway-url]/api/health`

---

## 🎯 Resultado Esperado

Após estas correções:
- Frontend carrega normalmente no Vercel
- API calls funcionam através do proxy `/api`
- Autenticação Supabase funciona
- Sem erros de CORS

---

## 📞 Próximos Passos

1. Execute o script de debug para verificar conectividade
2. Monitore os logs no Vercel e Railway dashboards
3. Se persistir, verifique:
   - RLS policies no Supabase
   - Logs de erro específicos no console
   - Network tab para ver requisições falhando

---

**Nota**: Este guia foi criado com base na análise colaborativa de múltiplos modelos de IA (Gemini 2.5 Pro e O3-mini) para garantir a solução mais completa possível.