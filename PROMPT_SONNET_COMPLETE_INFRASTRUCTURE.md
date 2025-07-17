# 🚀 PROMPT PARA SONNET - COMPLETAR INFRAESTRUTURA ALFALYZER

**De**: Claude Opus 4  
**Para**: Claude Sonnet  
**Data**: 14/07/2025  
**Prioridade**: CRÍTICA - Bloqueia lançamento em produção

## 📋 CONTEXTO

Fiz uma auditoria completa do projeto Alfalyzer e identifiquei que, apesar do excelente trabalho em UI/UX e features, a **infraestrutura de dados está incompleta**. Isto impede o lançamento em produção para 200+ usuários como planeado.

**Lê a secção "AUDITORIA COMPLETA OPUS 4" no plan2.md (linhas 1028-1173)** para entender todos os detalhes.

## 🎯 OBJETIVO

Completar a infraestrutura de dados para tornar o Alfalyzer production-ready com capacidade para 200+ usuários simultâneos.

## 📌 TAREFAS PRIORITÁRIAS

### 1. 🔴 MIGRAÇÃO COMPLETA PARA SUPABASE (Prioridade Máxima)

#### 1.1 Criar Script de Migração
```typescript
// scripts/migrate-to-supabase.ts
// Deve:
// - Conectar ao SQLite local
// - Conectar ao Supabase
// - Migrar TODOS os dados existentes
// - Preservar relações e integridade
// - Fazer backup antes de migrar
// - Log detalhado do processo
```

#### 1.2 Configurar Supabase como Padrão
```typescript
// server/config/database.ts
// MUDAR DE:
const dbType = process.env.USE_SUPABASE === 'true' ? 'supabase' : 'sqlite';

// PARA:
const dbType = process.env.USE_SQLITE === 'true' ? 'sqlite' : 'supabase';
// Supabase deve ser o PADRÃO!
```

#### 1.3 Implementar Row Level Security (RLS)
```sql
-- Para TODAS as tabelas no Supabase:
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Criar policies apropriadas
CREATE POLICY "Users can only see own data" ON portfolios
  FOR ALL USING (auth.uid() = user_id);
```

#### 1.4 Atualizar .env.example
```bash
# Database (SUPABASE É O PADRÃO!)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_service_key_here
# USE_SQLITE=true # Descomente APENAS para desenvolvimento local
```

### 2. 🔴 ELIMINAR TODO MOCK DATA

#### 2.1 Auditar e Corrigir Services
- [ ] `server/services/invisible-fallback-service.ts` - remover modo demo
- [ ] `server/services/market-data-client.ts` - sempre usar APIs reais
- [ ] `server/services/financial-data-client.ts` - sem fallback para mock
- [ ] Todos os endpoints devem retornar erro em vez de mock quando API falha

#### 2.2 Implementar Error Handling Adequado
```typescript
// Em vez de:
if (!data) return mockData;

// Fazer:
if (!data) {
  throw new ApiError('No data available', 503);
}
```

### 3. 🔴 BACKGROUND JOBS REAIS

#### Opção A: Supabase Edge Functions (Recomendado)
```typescript
// supabase/functions/update-prices/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Cron job que roda a cada 15 minutos
  const supabase = createClient(...)
  
  // Buscar preços de todas as APIs
  // Atualizar banco de dados
  // Retornar status
})
```

#### Opção B: Railway.app Workers
- Criar projeto separado para workers
- Node.js com node-cron real
- Conectar ao mesmo Supabase

### 4. 🟡 STAGING ENVIRONMENT COMPLETO

#### 4.1 Criar Projeto Supabase Staging
- Novo projeto no Supabase dashboard
- Nome: `alfalyzer-staging`
- Mesma estrutura de tabelas
- Dados de teste/seed

#### 4.2 Configurar Variáveis por Ambiente
```typescript
// config/environments.ts
export const config = {
  production: {
    supabaseUrl: process.env.SUPABASE_URL_PROD,
    supabaseKey: process.env.SUPABASE_KEY_PROD,
  },
  staging: {
    supabaseUrl: process.env.SUPABASE_URL_STAGING,
    supabaseKey: process.env.SUPABASE_KEY_STAGING,
  }
}
```

## 📝 DOCUMENTAÇÃO OBRIGATÓRIA

### Atualizar plan2.md à medida que implementas:

1. **Criar nova secção**: "## 🔧 INFRAESTRUTURA COMPLETION SPRINT"
2. **Para cada tarefa completada**:
   - Marcar checkbox ✅
   - Adicionar data e hora
   - Descrever o que foi feito
   - Incluir snippets de código relevantes
   - Documentar problemas encontrados e soluções

### Exemplo de documentação:
```markdown
### ✅ 1.1 Script de Migração Criado
**Completado**: 15/07/2025 10:30  
**Arquivo**: `scripts/migrate-to-supabase.ts`  
**Descrição**: Script completo que migra todos os dados de SQLite para Supabase

**Implementação**:
\```typescript
// Conexão dual para migração
const sqlite = new Database('./data/alfalyzer.db');
const supabase = createClient(url, serviceKey);

// Migração com transações
await supabase.rpc('begin_transaction');
try {
  await migrateStocks();
  await migratePortfolios();
  await migrateUsers();
  await supabase.rpc('commit_transaction');
} catch (error) {
  await supabase.rpc('rollback_transaction');
}
\```

**Problemas**: Tive que ajustar tipos de data de TEXT para TIMESTAMP
**Solução**: Converter datas durante migração
```

## 🎯 CRITÉRIOS DE SUCESSO

1. **100% dos dados em Supabase** (verificar com query count)
2. **ZERO chamadas retornando mock data** (testar todos endpoints)
3. **Background jobs rodando autonomamente** (verificar logs 24h)
4. **Staging completamente isolado** (testar deploy)
5. **Load test com 200 users passou** (usar k6 ou artillery)

## ⏰ TIMELINE SUGERIDO

- **Dia 1-2**: Migração Supabase + RLS
- **Dia 3**: Eliminar mock data
- **Dia 4**: Background jobs
- **Dia 5**: Staging + testes
- **Dia 6**: Load testing + fixes

## 🚨 AVISOS IMPORTANTES

1. **FAZER BACKUP** antes de qualquer migração
2. **TESTAR EM STAGING** antes de aplicar em produção
3. **NÃO APAGAR SQLite** até confirmar migração 100% bem-sucedida
4. **DOCUMENTAR TUDO** no plan2.md

## 💬 COMUNICAÇÃO

Se tiveres dúvidas ou encontrares bloqueios:
1. Documenta o problema no plan2.md
2. Sugere alternativas
3. Prossegue com a próxima tarefa enquanto aguardas feedback

## 🎉 RESULTADO ESPERADO

Após completar estas tarefas, o Alfalyzer estará:
- ✅ 100% cloud-native com Supabase
- ✅ Sem dependências locais
- ✅ Pronto para 200+ usuários simultâneos
- ✅ Com dados reais em tempo real
- ✅ Background jobs confiáveis 24/7
- ✅ Production-ready!

---

**BOA SORTE! O teu trabalho até agora foi excelente. Estas são apenas as peças finais para tornar o Alfalyzer num produto verdadeiramente production-ready.**