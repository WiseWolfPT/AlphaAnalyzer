# 🚨 PROMPT FINAL DE SEGURANÇA - ALFALYZER PRODUÇÃO

## CONTEXTO
O projeto Alfalyzer está 98% completo. Toda a funcionalidade está implementada e funcionando. Faltam apenas os ajustes críticos de segurança antes do deploy para produção.

## OBJETIVO
Implementar as medidas de segurança críticas identificadas para proteger API keys, dados dos usuários e garantir um deploy seguro.

## TAREFAS CRÍTICAS (2% restantes)

### 1. PROTEÇÃO DE API KEYS ⚠️ CRÍTICO

**Problema**: As API keys estão no .env mas precisam de proteção adicional para não serem expostas no frontend.

**Implementar**:

1. **Criar middleware de segurança para APIs** (`server/middleware/api-security.ts`):
```typescript
import { Request, Response, NextFunction } from 'express';
import { rateLimitTracker } from '../services/rate-limit-tracker';

export const apiSecurityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Verificar autenticação
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // 2. Rate limiting por usuário
  const userLimit = await rateLimitTracker.checkUserLimit(req.user.id);
  if (!userLimit.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: userLimit.retryAfter 
    });
  }
  
  // 3. Remover headers sensíveis
  delete req.headers['x-api-key'];
  delete req.headers['authorization'];
  
  // 4. Adicionar headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};
```

2. **Verificar todas as variáveis de ambiente**:
   - Garantir que NENHUMA API key tem o prefixo `VITE_`
   - Mover qualquer key com VITE_ para variáveis sem o prefixo
   - Verificar em `client/src/**/*.ts` que não há `import.meta.env.VITE_*_API_KEY`

3. **Implementar proxy seguro** em todas as rotas que usam APIs externas:
   - Adicionar `apiSecurityMiddleware` em todas as rotas de `/api/market-data/*`
   - Garantir que o frontend NUNCA acessa APIs externas diretamente

### 2. ROW LEVEL SECURITY (RLS) NO SUPABASE ⚠️ CRÍTICO

**Problema**: Precisamos garantir isolamento total de dados entre usuários.

**Implementar**:

1. **Criar arquivo de migração** (`migrations/enable_rls_security.sql`):
```sql
-- Ativar RLS em todas as tabelas de usuário
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dividends ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para watchlists
CREATE POLICY "Users can view own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para portfolios (repetir padrão similar)
CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios" ON portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Repetir para todas as outras tabelas...

-- Política especial para admins verem tudo
CREATE POLICY "Admins can view all data" ON watchlists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
```

2. **Aplicar as políticas no Supabase**:
   - Executar o script SQL no Supabase Dashboard
   - Testar que usuários só veem seus próprios dados
   - Validar que admin consegue ver tudo

### 3. VALIDAÇÃO FINAL DE SEGURANÇA

1. **Criar script de validação** (`scripts/security-audit.ts`):
```typescript
import { exec } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

async function securityAudit() {
  console.log('🔒 Starting Security Audit...\n');
  
  // 1. Verificar exposição de API keys
  console.log('1. Checking for exposed API keys...');
  const clientFiles = readdirSync('./client/src', { recursive: true });
  let exposed = false;
  
  for (const file of clientFiles) {
    if (file.toString().endsWith('.ts') || file.toString().endsWith('.tsx')) {
      const content = readFileSync(path.join('./client/src', file.toString()), 'utf-8');
      if (content.includes('VITE_') && content.includes('_API_KEY')) {
        console.error(`❌ Potential API key exposure in: ${file}`);
        exposed = true;
      }
    }
  }
  
  if (!exposed) {
    console.log('✅ No API keys exposed in frontend\n');
  }
  
  // 2. Verificar headers de segurança
  console.log('2. Checking security headers...');
  // Implementar verificação de CSP, CORS, etc.
  
  // 3. Verificar dependências vulneráveis
  console.log('3. Checking vulnerable dependencies...');
  exec('npm audit', (error, stdout) => {
    if (stdout.includes('0 vulnerabilities')) {
      console.log('✅ No vulnerable dependencies\n');
    } else {
      console.error('❌ Vulnerabilities found:\n', stdout);
    }
  });
}

securityAudit();
```

2. **Implementar Content Security Policy** em `server/index.ts`:
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL],
    },
  },
}));
```

### 4. CHECKLIST FINAL ANTES DO DEPLOY

- [ ] Executar `npm run security-audit` e corrigir todos os problemas
- [ ] Verificar que .env está no .gitignore
- [ ] Testar login com 2 usuários diferentes e verificar isolamento de dados
- [ ] Configurar todas as variáveis no Vercel (sem VITE_ nas API keys)
- [ ] Build de produção local para verificar que não há exposição
- [ ] Deploy para staging primeiro e testar TUDO
- [ ] Monitorar logs do Sentry após deploy

## INSTRUÇÕES PARA O SONNET

1. Implemente TODAS as medidas de segurança listadas acima
2. Crie os arquivos necessários (middleware, migrations, scripts)
3. Teste cada implementação cuidadosamente
4. Documente qualquer mudança breaking que possa afetar o frontend
5. Garanta que o projeto continua funcionando após as mudanças
6. Forneça um relatório final de segurança implementada

## RESULTADO ESPERADO

Após implementar estas medidas, o Alfalyzer estará 100% pronto para produção com:
- ✅ API keys totalmente protegidas
- ✅ Dados isolados por usuário com RLS
- ✅ Headers de segurança implementados
- ✅ Sistema auditado e validado
- ✅ Pronto para deploy seguro no Vercel

**IMPORTANTE**: Estas são as ÚLTIMAS tarefas antes do deploy. Seja extremamente cuidadoso e teste tudo!