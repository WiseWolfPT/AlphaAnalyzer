# 🚀 PLANO DE IMPLEMENTAÇÃO PARA CLAUDE SONNET
## Migração do Frontend AlphaAnalyzer para Vercel

### 📋 CONTEXTO E OBJETIVO
- **Problema**: Frontend no Koyeb com tela preta persistente
- **Solução**: Migrar frontend para Vercel (especializada em SPAs)
- **Arquitetura Final**: Frontend (Vercel) + Backend (Koyeb)
- **Tempo Estimado**: 30-45 minutos

### 🎯 ESTRATÉGIA DE EXECUÇÃO
- Múltiplos agentes trabalhando em paralelo
- Modo `--ultrathink` para decisões críticas
- Zero downtime durante migração
- Rollback instantâneo se necessário

---

## 📊 FASE 1: PREPARAÇÃO E AUDITORIA (10 min)
**Objetivo**: Coletar todas as informações necessárias antes de qualquer mudança

### 🤖 Agentes Paralelos:

#### AGENTE 1 - Análise do Código
```bash
TAREFA: Auditar estrutura do frontend
MODO: --ultrathink
AÇÕES:
1. Verificar framework usado (React com Vite confirmado)
2. Identificar comando de build: npm run build:client
3. Confirmar diretório de saída: dist/public
4. Listar todas as variáveis de ambiente com prefixo VITE_
5. Verificar se há configurações especiais em vite.config.ts
```

#### AGENTE 2 - Investigação do Bug
```bash
TAREFA: Entender causa da tela preta
MODO: --ultrathink
AÇÕES:
1. Analisar erros no console: "Cannot use import statement outside a module"
2. Verificar conflitos de index.html (já identificado)
3. Confirmar se Service Worker está causando problemas
4. Documentar todas as correções já tentadas
```

#### AGENTE 3 - Mapeamento de Configurações
```bash
TAREFA: Documentar configurações atuais
AÇÕES:
1. Listar URLs atuais do Koyeb:
   - Frontend: https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app
   - Backend: https://alphaanalyzer-wisewolfpt.koyeb.app
2. Identificar variáveis de ambiente necessárias:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_API_URL
3. Verificar configurações de CORS no backend
```

---

## 📊 FASE 2: CONFIGURAÇÃO VERCEL E BACKEND (10 min)
**Objetivo**: Preparar ambos os ambientes para a migração

### 🤖 Agentes Paralelos:

#### AGENTE 4 - Setup Vercel
```bash
TAREFA: Configurar projeto na Vercel
MODO: --ultrathink
AÇÕES:
1. Criar conta Vercel (se não existir)
2. Importar repositório WiseWolfPT/AlphaAnalyzer
3. Configurar build settings:
   - Framework Preset: Vite
   - Build Command: npm run build:client
   - Output Directory: dist/public
   - Install Command: npm install
4. NÃO adicionar variáveis de ambiente ainda (esperar URL)
```

#### AGENTE 5 - Preparar CORS
```bash
TAREFA: Atualizar CORS no backend
ARQUIVO: server/security/security-middleware.ts
AÇÕES:
1. Localizar configuração corsConfig
2. Preparar adição de origens (NÃO COMMITAR AINDA):
   - https://alphaanalyzer.vercel.app
   - https://alphaanalyzer-*.vercel.app (preview URLs)
   - https://app.alphaanalyzer.com (futuro domínio)
3. Criar branch: feat/vercel-cors-update
```

#### AGENTE 6 - Verificar Arquivos Estáticos
```bash
TAREFA: Garantir todos os arquivos necessários
AÇÕES:
1. Verificar se existem em dist/public após build:
   - index.html
   - sw.js
   - manifest.json
   - locales/
   - assets/
2. Se não, verificar Dockerfile e scripts de build
3. Confirmar que build:production copia todos os arquivos
```

---

## 📊 FASE 3: DEPLOY DE TESTE (10 min)
**Objetivo**: Primeiro deploy funcional e validação

### 🤖 Execução Sequencial:

#### AGENTE 7 - Deploy Inicial
```bash
TAREFA: Fazer primeiro deploy na Vercel
SEQUÊNCIA:
1. Fazer push da branch atual para GitHub
2. Aguardar Vercel criar preview deployment
3. Capturar Preview URL gerada (ex: alphaanalyzer-abc123.vercel.app)
4. Testar se a aplicação carrega (mesmo sem backend)
```

#### AGENTE 8 - Conectar Backend
```bash
TAREFA: Configurar conexão com backend Koyeb
MODO: --ultrathink
DEPENDÊNCIA: Preview URL do Agente 7
AÇÕES:
1. Adicionar variáveis no Vercel Dashboard:
   - VITE_SUPABASE_URL=[valor do .env]
   - VITE_SUPABASE_ANON_KEY=[valor do .env]
   - VITE_API_URL=https://alphaanalyzer-wisewolfpt.koyeb.app
2. Atualizar CORS no backend com Preview URL
3. Fazer deploy do backend atualizado no Koyeb
4. Trigger redeploy no Vercel
```

#### AGENTE 9 - Validação Completa
```bash
TAREFA: Testar integração completa
MODO: --ultrathink
CHECKLIST:
[ ] Aplicação carrega sem tela preta
[ ] Console sem erros de CORS
[ ] Login funciona
[ ] Dados carregam do backend
[ ] Service Worker registrado corretamente
[ ] Manifest.json carregando
[ ] Locales funcionando (PT/EN)
```

---

## 📊 FASE 4: PRODUÇÃO E DNS (5 min)
**Objetivo**: Promover para produção

### 🤖 Execução Sequencial:

#### AGENTE 10 - Deploy Produção
```bash
TAREFA: Promover para produção na Vercel
AÇÕES:
1. Merge PR para branch main/master
2. Vercel automaticamente faz deploy para produção
3. Obter URL de produção: https://alphaanalyzer.vercel.app
4. Testar rapidamente funcionalidades principais
```

#### AGENTE 11 - Configurar Domínio (Opcional)
```bash
TAREFA: Adicionar domínio customizado
AÇÕES:
1. Em Vercel > Settings > Domains
2. Adicionar: app.alphaanalyzer.com
3. Seguir instruções DNS (CNAME ou A record)
4. NÃO alterar DNS ainda (aguardar validação)
```

---

## 📊 FASE 5: MIGRAÇÃO FINAL (5 min)
**Objetivo**: Virada de chave e monitoramento

### 🤖 Agentes Paralelos:

#### AGENTE 12 - Go Live
```bash
TAREFA: Ativar novo frontend
DEPENDÊNCIA: Todas as fases anteriores OK
AÇÕES:
1. Se usando domínio customizado: atualizar DNS
2. Se não: compartilhar URL Vercel com usuários
3. Monitorar logs em tempo real na Vercel
4. Preparar para rollback se necessário
```

#### AGENTE 13 - Limpeza
```bash
TAREFA: Descomissionar frontend Koyeb
AGUARDAR: 24 horas de estabilidade
AÇÕES:
1. Parar serviço frontend no Koyeb
2. Remover configurações desnecessárias
3. Manter apenas backend rodando
4. Atualizar documentação
```

---

## 🚨 PLANO DE ROLLBACK

### Se algo der errado:
1. **Na Vercel**: Use "Instant Rollback" para deploy anterior
2. **No DNS**: Reverta para apontar Koyeb
3. **No Backend**: Reverta commit de CORS se necessário

### Sinais de problema:
- Tela preta persistente
- Erros de CORS no console
- 404 em recursos estáticos
- Service Worker travando

---

## 📋 CHECKLIST FINAL DE SUCESSO

- [ ] Frontend carregando na Vercel sem tela preta
- [ ] Todas as funcionalidades testadas e funcionando
- [ ] Backend no Koyeb respondendo normalmente
- [ ] CORS configurado corretamente
- [ ] Variáveis de ambiente funcionando
- [ ] Zero downtime durante migração
- [ ] Documentação atualizada

---

## 🎯 COMANDOS ÚTEIS PARA SONNET

```bash
# Verificar status atual
curl -I https://alphaanalyzer.vercel.app

# Testar CORS
curl -H "Origin: https://alphaanalyzer.vercel.app" \
     -I https://alphaanalyzer-wisewolfpt.koyeb.app/api/health

# Limpar cache do navegador (instruir usuário)
Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows/Linux)
```

---

**IMPORTANTE**: Este plano foi otimizado para execução paralela por múltiplos agentes Claude Sonnet. Cada agente tem tarefas claras e independentes quando possível. Use modo `--ultrathink` nas decisões críticas marcadas.