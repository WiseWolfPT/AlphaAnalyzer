# 🚀 ALFALYZER - GUIA COMPLETO DE MIGRAÇÃO SUPABASE

> **AGENTE 2: Supabase Real** - Migração de demo para produção real

## 📊 STATUS DA MIGRAÇÃO

✅ **Arquitetura Supabase 100% implementada**  
✅ **Schema PostgreSQL completo (8 tabelas)**  
✅ **RLS policies de segurança configuradas**  
✅ **Auth system com Google OAuth**  
✅ **Real-time subscriptions prontas**  
✅ **Scripts automáticos de migração**  

❌ **BLOQUEADOR**: URLs demo impedem funcionamento real

## 🎯 EXECUÇÃO RÁPIDA (5 MINUTOS)

### Opção 1: Automática (Recomendada)
```bash
# Configurar credenciais + executar migrations
npm run migrate:supabase
```

### Opção 2: Manual (Controle total)
```bash
# Passo 1: Configurar credenciais
npm run supabase:setup

# Passo 2: Executar migrations SQL
npm run supabase:migrate

# Passo 3: Migrar dados SQLite (opcional)
npm run supabase:migrate-data
```

---

## 📋 INSTRUÇÕES DETALHADAS

### STEP 1: Criar Conta Supabase (2 min)

1. **Acessar**: https://supabase.com/dashboard
2. **Login**: Com GitHub ou Google (recomendado)
3. **Criar projeto**:
   - Nome: `alfalyzer`
   - Password: Criar password forte (anote!)
   - Região: **Europe West (Ireland)** - `eu-west-1`
   - Plano: **Free** (500MB DB + 2GB bandwidth)
4. **Aguardar**: Setup do PostgreSQL (1-2 min)

### STEP 2: Coletar Credenciais

No dashboard do projeto, ir para **Settings > API**:

```
📋 Anotar estas 3 credenciais:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT_URL: https://seu-projeto.supabase.co
ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### STEP 3: Executar Scripts Automáticos

```bash
# Script interativo que coleta credenciais e atualiza .env
npm run supabase:setup
```

O script irá:
- ✅ Solicitar as 3 credenciais
- ✅ Validar formato das keys
- ✅ Fazer backup do .env atual
- ✅ Atualizar todas as variáveis Supabase
- ✅ Preservar API keys existentes

### STEP 4: Executar Migrations SQL

```bash
# Executa automaticamente todas as migrations
npm run supabase:migrate
```

O script irá:
- ✅ Testar conexão Supabase
- ✅ Executar `001_core_tables.sql` (users, watchlists, portfolios, transactions)
- ✅ Executar `002_portfolio_tables.sql` (holdings, dividends, performance)
- ✅ Executar `004_rls_policies.sql` (security policies)
- ✅ Verificar tabelas criadas
- ✅ Confirmar RLS ativo

### STEP 5: Testar Funcionamento

```bash
# Iniciar aplicação
npm run dev
```

**Testes a realizar:**
1. ✅ **Auth**: Criar conta de usuário
2. ✅ **Watchlists**: Adicionar/remover stocks
3. ✅ **Portfolios**: Criar portfolio e transactions
4. ✅ **Real-time**: Verificar updates automáticos
5. ✅ **RLS**: Confirmar data isolation

---

## 📁 SCHEMA CRIADO

### Tabelas Principais
```sql
users              -- Auth users (UUID)
watchlists          -- User watchlists 
watchlist_items     -- Stocks in watchlists
portfolios          -- Investment portfolios
transactions        -- Buy/sell transactions
holdings            -- Current positions (auto-calculated)
dividends           -- Dividend payments
portfolio_performance -- Historical snapshots
cash_transactions   -- Cash deposits/withdrawals
subscriptions       -- Stripe subscriptions
```

### RLS Policies Ativas
- ✅ **Data isolation**: Users só veem próprios dados
- ✅ **Auth integration**: Integração com Supabase Auth
- ✅ **Service role**: Backend tem acesso admin
- ✅ **Public data**: Stocks acessíveis a todos

---

## 🛠️ COMANDOS ÚTEIS

```bash
# Configuração
npm run supabase:setup              # Configurar credenciais
npm run supabase:migrate            # Executar migrations SQL
npm run supabase:migrate-data       # Migrar dados SQLite
npm run migrate:supabase            # Setup + migrate (tudo)

# Desenvolvimento  
npm run dev                         # Testar app com Supabase
npm run health                      # Check backend health
npm run status                      # Status geral

# Troubleshooting
npm run db:test                     # Testar conexão DB
npm run health:detailed             # Health check detalhado
```

---

## 🔗 LINKS ÚTEIS

### Supabase Dashboard
```
Dashboard: https://seu-projeto.supabase.co/project/default
SQL Editor: https://seu-projeto.supabase.co/project/default/sql
Auth Settings: https://seu-projeto.supabase.co/project/default/auth/settings
```

### Configurações Opcionais
- **Google OAuth**: Auth > Settings > OAuth Providers
- **Email Templates**: Auth > Settings > Email Templates  
- **Rate Limiting**: Project Settings > API

---

## 🛡️ SEGURANÇA

### Variáveis de Ambiente
```bash
# Backend only (SECURE)
SUPABASE_URL=https://projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Frontend safe (PUBLIC)
VITE_SUPABASE_URL=https://projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Importante
- ✅ **ANON_KEY**: Segura para frontend (público)
- ❌ **SERVICE_ROLE_KEY**: NUNCA expor no frontend
- ✅ **RLS**: Ativo em todas as tabelas
- ✅ **.env**: Nunca committar no Git

---

## 💰 CUSTOS

### Free Tier Supabase
- ✅ **Database**: 500MB PostgreSQL
- ✅ **Bandwidth**: 2GB/mês
- ✅ **Auth**: Unlimited users
- ✅ **Real-time**: Included
- ✅ **Edge Functions**: 500K requests/mês

### Upgrades (se necessário)
- **Pro**: $25/mês (8GB DB, 250GB bandwidth)
- **Team**: $599/mês (Unlimited)

---

## 🚨 TROUBLESHOOTING

### Problema: Connection Failed
```bash
# Verificar credenciais
npm run supabase:setup

# Testar conexão
npm run db:test
```

### Problema: RLS Block
```bash
# Verificar policies no SQL Editor:
SELECT * FROM auth.users;  -- Deve mostrar user atual
```

### Problema: Migration Failed
```bash
# Executar SQL manualmente:
# 1. Ir para SQL Editor no Supabase
# 2. Copiar conteúdo de migrations/postgres-migrations/001_core_tables.sql
# 3. Executar SQL diretamente
```

---

## ✅ RESULTADO ESPERADO

Após migração bem-sucedida:

✅ **Backend**: Conecta ao PostgreSQL real  
✅ **Auth**: Signup/login funcionando  
✅ **CRUD**: Operações de DB reais  
✅ **Real-time**: Updates automáticos  
✅ **Security**: RLS policies ativas  
✅ **Performance**: Supabase Edge Network  

**🎉 PRONTO PARA AGENTES 3, 5 e 7!**

---

## 📞 SUPORTE

### Em caso de problemas:
1. **Verificar logs**: `npm run health:detailed`
2. **Testar conexão**: `npm run db:test`  
3. **Resetar config**: Restaurar backup `.env.backup.*`
4. **SQL manual**: Usar Supabase SQL Editor

### Documentação:
- **Supabase Docs**: https://supabase.com/docs
- **Auth Guide**: https://supabase.com/docs/guides/auth
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security

---

**Criado por: AGENTE 2 - Supabase Real**  
**Status: READY FOR EXECUTION 🚀**