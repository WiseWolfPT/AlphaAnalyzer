# 🚀 CRIAR CONTA SUPABASE - GUIA PASSO-A-PASSO

## INSTRUÇÕES PARA CRIAR CONTA SUPABASE REAL

### STEP 1: Acessar Supabase
1. Ir para: https://supabase.com/dashboard
2. Fazer login com GitHub ou Google (recomendado)

### STEP 2: Criar Novo Projeto
1. Clicar em "New Project"
2. **Nome do projeto**: `alfalyzer`
3. **Database Password**: Criar password forte (anote!)
4. **Região**: Europe West (Ireland) - `eu-west-1`
5. **Plano**: Free (500MB DB + 2GB bandwidth)
6. Clicar "Create new project"

### STEP 3: Aguardar Setup (1-2 min)
- O Supabase irá configurar o banco PostgreSQL
- Aguardar até aparecer "Project is ready"

### STEP 4: Coletar Credenciais
No dashboard do projeto, ir para **Settings > API**:

**Anote estas 3 credenciais:**
```
PROJECT_URL: https://seu-projeto.supabase.co
ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE**: 
- ANON_KEY: Seguro para frontend (público)
- SERVICE_ROLE_KEY: NUNCA expor (apenas backend)

### STEP 5: Executar Script de Migration
Depois de coletar as credenciais, execute:
```bash
npm run migrate:supabase
```

### ✅ RESULTADO ESPERADO
- ✅ Banco PostgreSQL ativo
- ✅ 8 tabelas criadas com RLS
- ✅ Auth configurado
- ✅ Real-time ativo
- ✅ Pronto para uso!

---

**CUSTO**: Gratuito (Free tier Supabase)
**TEMPO**: 2-3 minutos total
**PRÓXIMO PASSO**: Executar migrations automáticas