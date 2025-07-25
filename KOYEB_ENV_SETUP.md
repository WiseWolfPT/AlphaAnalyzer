# 🔧 Configuração das Variáveis de Ambiente no Koyeb

## Passos para Configurar:

1. **Acesse o painel do Koyeb**
2. **Vá para o seu serviço** (alfalyzer-backend)
3. **Clique em "Settings" → "Environment Variables"**
4. **Adicione as seguintes variáveis:**

### Variáveis Obrigatórias:

```bash
# Node Environment
NODE_ENV=production
PORT=8000

# Supabase (pegue do painel Supabase)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_KEY=sua-service-key

# APIs de Mercado (pegue de cada provedor)
ALPHA_VANTAGE_API_KEY=sua-key
FINNHUB_API_KEY=sua-key
FMP_API_KEY=sua-key
TWELVE_DATA_API_KEY=sua-key
POLYGON_API_KEY=sua-key

# Segurança
JWT_SECRET=gerar-um-secret-aleatorio
CRON_SECRET=gerar-outro-secret-aleatorio

# Frontend URL
FRONTEND_URL=https://alfalyzer.vercel.app

# Opcional - Self Ping
SELF_PING_URL=https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app
ENABLE_CRON_JOBS=true
ENABLE_KEEP_ALIVE=true
```

### Como Obter as API Keys:

1. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key
2. **Finnhub**: https://finnhub.io/register
3. **FMP**: https://site.financialmodelingprep.com/developer/docs
4. **Twelve Data**: https://twelvedata.com/account/api-keys
5. **Polygon**: https://polygon.io/dashboard/api-keys

### Como Obter as Keys do Supabase:

1. Acesse seu projeto no Supabase
2. Vá em "Settings" → "API"
3. Copie:
   - `URL`: Project URL
   - `ANON_KEY`: anon public
   - `SERVICE_KEY`: service_role (MANTENHA SECRETA!)

### Gerando Secrets Seguros:

```bash
# Para gerar JWT_SECRET e CRON_SECRET
openssl rand -base64 32
```

## Após Configurar:

1. **Salve as variáveis**
2. **O Koyeb fará redeploy automático**
3. **Aguarde ~2-3 minutos**
4. **Teste novamente a API**

## Verificação:

```bash
# Testar se está funcionando
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/health

# Testar quote com cache
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/market-data/quote/AAPL
```

Se retornar dados da cotação, está tudo funcionando! 🎉