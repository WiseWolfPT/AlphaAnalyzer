# 🚨 PLANO DE RECUPERAÇÃO - CHAVES API CRÍTICO

## SITUAÇÃO ATUAL

✅ **BOA NOTÍCIA**: O arquivo `.env` NÃO está sendo rastreado pelo git (está corretamente no .gitignore)
✅ **BOA NOTÍCIA**: As chaves de Supabase ainda estão intactas no arquivo
❌ **PROBLEMA**: As chaves das APIs externas foram substituídas por placeholders:
   - POLYGON_API_KEY
   - ALPHA_VANTAGE_API_KEY
   - TWELVE_DATA_API_KEY
   - FMP_API_KEY
   - FINNHUB_API_KEY
   - STRIPE keys

## AÇÕES IMEDIATAS NECESSÁRIAS

### 1. RECUPERAR CHAVES ANTIGAS (Se Possível)

Verifique se você tem backup das chaves em:
- Backup local do projeto
- Email de confirmação das APIs
- Dashboard das APIs
- Arquivo de notas pessoais

### 2. GERAR NOVAS CHAVES (Recomendado)

Por segurança, é melhor gerar NOVAS chaves:

#### Polygon.io
1. Acesse: https://polygon.io/dashboard/api-keys
2. Revogue a chave antiga (se existir)
3. Gere uma nova chave
4. Copie e substitua em `.env`: `POLYGON_API_KEY=sua_nova_chave_aqui`

#### Alpha Vantage
1. Acesse: https://www.alphavantage.co/support/#api-key
2. Solicite nova chave (grátis)
3. Copie e substitua em `.env`: `ALPHA_VANTAGE_API_KEY=sua_nova_chave_aqui`

#### Twelve Data
1. Acesse: https://twelvedata.com/account/api-keys
2. Revogue a chave antiga
3. Gere nova chave
4. Copie e substitua em `.env`: `TWELVE_DATA_API_KEY=sua_nova_chave_aqui`

#### Financial Modeling Prep (FMP)
1. Acesse: https://site.financialmodelingprep.com/developer/docs
2. Faça login e vá para dashboard
3. Gere nova API key
4. Copie e substitua em `.env`: `FMP_API_KEY=sua_nova_chave_aqui`

#### Finnhub
1. Acesse: https://finnhub.io/dashboard
2. Revogue a chave antiga
3. Gere nova chave
4. Copie e substitua em `.env`: `FINNHUB_API_KEY=sua_nova_chave_aqui`

#### Stripe (Se estiver usando)
1. Acesse: https://dashboard.stripe.com/apikeys
2. Revogue as chaves antigas
3. Gere novas chaves (test e live)
4. Atualize no `.env`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_aqui
   STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
   STRIPE_WEBHOOK_SECRET=whsec_sua_chave_aqui
   ```

### 3. ATUALIZAR O ARQUIVO .env

Após obter as novas chaves, atualize o arquivo `.env` mantendo este formato:

```bash
# Environment
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/alfalyzer

# Supabase (MANTER AS EXISTENTES - estão funcionando)
SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMzMDQzNSwiZXhwIjoyMDY3OTA2NDM1fQ.NblNWyjz09cGRo6VBMY5zMscfDMX7v7yWXVMHgOwlq8

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key-minimum-32-chars-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-chars-long

# API Keys - SUBSTITUIR COM SUAS CHAVES REAIS
POLYGON_API_KEY=COLE_SUA_CHAVE_POLYGON_AQUI
ALPHA_VANTAGE_API_KEY=COLE_SUA_CHAVE_ALPHA_VANTAGE_AQUI
TWELVE_DATA_API_KEY=COLE_SUA_CHAVE_TWELVE_DATA_AQUI
FMP_API_KEY=COLE_SUA_CHAVE_FMP_AQUI
FINNHUB_API_KEY=COLE_SUA_CHAVE_FINNHUB_AQUI

# Stripe Payment Processing
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_COLE_SUA_CHAVE_STRIPE_AQUI
STRIPE_SECRET_KEY=sk_test_COLE_SUA_CHAVE_STRIPE_SECRET_AQUI
STRIPE_WEBHOOK_SECRET=whsec_COLE_SEU_WEBHOOK_SECRET_AQUI
```

### 4. VERIFICAR FUNCIONAMENTO

Após atualizar as chaves:

```bash
# Reiniciar o servidor
npm run dev

# Testar se as APIs estão funcionando
# Verificar no console do navegador por erros 401/403
```

### 5. SEGURANÇA FUTURA

Para evitar este problema no futuro:

1. **NUNCA** commitar o arquivo `.env`
2. **SEMPRE** manter backup seguro das chaves
3. **USAR** um gerenciador de senhas para guardar as chaves
4. **CRIAR** um `.env.example` com placeholders (já existe)
5. **DOCUMENTAR** onde cada chave pode ser obtida

## CHECKLIST DE RECUPERAÇÃO

- [ ] Verificar backups locais para chaves antigas
- [ ] Gerar nova chave Polygon.io
- [ ] Gerar nova chave Alpha Vantage
- [ ] Gerar nova chave Twelve Data
- [ ] Gerar nova chave FMP
- [ ] Gerar nova chave Finnhub
- [ ] Gerar novas chaves Stripe (se necessário)
- [ ] Atualizar arquivo `.env` com novas chaves
- [ ] Testar aplicação com `npm run dev`
- [ ] Verificar logs para confirmar APIs funcionando
- [ ] Fazer backup seguro das novas chaves

## IMPORTANTE

⚠️ **NUNCA compartilhe o arquivo `.env` real com ninguém**
⚠️ **NUNCA commite o arquivo `.env` no git**
⚠️ **SEMPRE use variáveis de ambiente em produção**

Se precisar de ajuda com alguma API específica, posso fornecer instruções mais detalhadas.