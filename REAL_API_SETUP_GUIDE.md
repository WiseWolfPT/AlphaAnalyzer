# GUIA DE CONFIGURAÇÃO - APIs REAIS

**TEMPO ESTIMADO**: 15-20 minutos  
**OBJETIVO**: Validar pelo menos 1 API funcionando realmente

## 🎯 PASSO 1: POLYGON.IO (RECOMENDADO)

### Por que Polygon.io?
- **Free tier generoso**: 5 chamadas/minuto
- **Dados confiáveis**: Mercado US completo
- **Fácil setup**: Registro rápido
- **Usado no MVP**: Prioridade alta

### Setup Polygon.io:

1. **Criar conta**: https://polygon.io/dashboard/api-keys
   - Email + senha
   - Confirmar email
   - **TEMPO**: 2 minutos

2. **Obter chave API**:
   - Login no dashboard
   - Copiar "API Key" (formato: `pk_xxxxxxxxx`)
   - **TEMPO**: 1 minuto

3. **Adicionar ao .env**:
   ```bash
   # Abrir arquivo .env
   # Substituir:
   POLYGON_API_KEY=your-key-here
   # Por:
   POLYGON_API_KEY=pk_SUA_CHAVE_REAL_AQUI
   ```

4. **Testar API**:
   ```bash
   npm test tests/integration/api-validation.test.ts
   ```

### ✅ SUCESSO ESPERADO:
```
✓ Polygon.io - deve buscar cotação (500ms)
✓ deve ter pelo menos uma API funcionando (502ms)
```

## 🎯 PASSO 2: SUPABASE (CRÍTICO)

### Por que Supabase?
- **Usado no projeto**: Database principal
- **Free tier**: Até 50MB + 500MB bandwidth
- **Setup rápido**: 3 minutos

### Setup Supabase:

1. **Criar projeto**: https://app.supabase.com
   - Login com GitHub (recomendado)
   - "New project"
   - Nome: `alfalyzer-dev`
   - **TEMPO**: 3 minutos

2. **Obter credenciais**:
   - Settings → API
   - Copiar `URL` e `anon public key`
   - **TEMPO**: 1 minuto

3. **Adicionar ao .env**:
   ```bash
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=sua-service-role-key-aqui
   ```

4. **Testar Supabase**:
   ```bash
   npm run supabase:test
   ```

### ✅ SUCESSO ESPERADO:
```
✓ deve conectar e fazer CRUD básico (1000ms)
✓ deve verificar autenticação (200ms)
```

## 🚨 TROUBLESHOOTING

### Polygon.io não funciona:
- Verificar chave copiada corretamente
- Aguardar 2-3 minutos após criação da conta
- Verificar rate limit (máx 5 calls/min)

### Supabase não funciona:
- Verificar URL está correto (https://...)
- Verificar chaves não têm espaços extras
- Aguardar 2-3 minutos após criação do projeto

## 💡 TODAS AS APIs DISPONÍVEIS

### 📊 APIS FINANCEIRAS (Ordem de Prioridade)

#### 1. **Polygon.io** (RECOMENDADO)
- **Free tier**: 5 calls/minute
- **Vantagem**: Melhor para mercado US
- **Signup**: https://polygon.io/dashboard/api-keys
- **Formato**: `POLYGON_API_KEY=pk_xxxxxxxxx`

#### 2. **Alpha Vantage** (BACKUP PRIMÁRIO)
- **Free tier**: 25 calls/day (500/mês)
- **Vantagem**: Dados fundamentais gratuitos
- **Signup**: https://www.alphavantage.co/support/#api-key
- **Formato**: `ALPHA_VANTAGE_API_KEY=sua-chave`

#### 3. **Finnhub** (BACKUP SECUNDÁRIO)
- **Free tier**: 60 calls/minute
- **Vantagem**: Generoso tier gratuito
- **Signup**: https://finnhub.io/register
- **Formato**: `FINNHUB_API_KEY=sua-chave`

#### 4. **Twelve Data** (DADOS HISTÓRICOS)
- **Free tier**: 800 calls/day
- **Vantagem**: Boa para dados históricos
- **Signup**: https://twelvedata.com/pricing
- **Formato**: `TWELVE_DATA_API_KEY=sua-chave`

#### 5. **FMP (Financial Modeling Prep)** (FUNDAMENTAIS)
- **Free tier**: 250 calls/day
- **Vantagem**: Dados fundamentais avançados
- **Signup**: https://site.financialmodelingprep.com/developer/docs
- **Formato**: `FMP_API_KEY=sua-chave`

### 💳 STRIPE (PAGAMENTOS)

#### Setup Stripe (OPCIONAL - para testes de pagamento):
1. **Criar conta**: https://dashboard.stripe.com/register
2. **Modo teste**: Usar chaves de teste primeiro
3. **Obter chaves**:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
   ```

### ⚡ CONFIGURAÇÃO RÁPIDA (MÍNIMA)

Para validação mínima, configure **pelo menos**:
1. **Polygon.io** (primária)
2. **Alpha Vantage** (backup)
3. **Supabase** (database)

## 🎯 PRÓXIMOS PASSOS

Após configurar **pelo menos** Polygon.io + Supabase:

1. Executar testes reais
2. Documentar resultados
3. Commit de validação
4. **ENTÃO** prosseguir para Fase 1

**IMPORTANTE**: NÃO pule esta etapa. Opus 4 identificou risco crítico real.