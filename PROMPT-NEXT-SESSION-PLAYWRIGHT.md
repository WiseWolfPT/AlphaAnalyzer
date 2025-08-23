# 🚀 PROMPT CONTINUAÇÃO - ALFALYZER COM PLAYWRIGHT MCP

## 🎯 CONTEXTO DA SESSÃO ANTERIOR

**Projeto:** Alfalyzer - Plataforma Financeira
**URL:** https://128.140.45.28.sslip.io/
**Status:** 95% completo mas com problemas críticos
**Nova Ferramenta:** Playwright MCP instalado e pronto para usar

## ✅ O QUE FOI FEITO NA ÚLTIMA SESSÃO

1. **Análise completa do problema:**
   - Erro 429 (Too Many Requests) em loop infinito
   - Redis instalado mas não conectado
   - Supabase desconectado
   - .env.production incompleto (só 14 linhas vs 30+ necessárias)

2. **Plano de correção criado:**
   - Arquivo: `PROMPT-DEFINITIVO-ALFALYZER-ULTRATHINK.md`
   - 5 fases de execução documentadas
   - Usar APENAS FMP + Alpha Vantage (remover outros providers)

3. **Playwright MCP instalado:**
   - Comando: `claude mcp add playwright "npx @playwright/mcp@latest"`
   - Configuração salva em ~/.claude.json
   - PRONTO PARA USAR nesta sessão

## 🔧 ACESSO SSH CONFIGURADO

```bash
# Você TEM acesso direto ao servidor
ssh -F ~/.ssh/config hetzner

# Diretório do projeto
cd "/home/teste 1"
```

## 🎯 OBJETIVOS DESTA SESSÃO

### 1. TESTAR PLAYWRIGHT MCP
```javascript
// Primeiro teste - Ver estado atual do Alfalyzer
playwright.navigate("https://128.140.45.28.sslip.io/find-stocks")
playwright.snapshot() // Ver o que está na página
playwright.evaluate("console.errors") // Capturar erros
playwright.screenshot() // Tirar print automático
```

### 2. CORRIGIR .ENV.PRODUCTION
```bash
# Via SSH, criar .env.production completo com:
- Redis config (host, porta, senha: alfalyzer2025redis)
- API keys reais (FMP e Alpha Vantage)
- Supabase service role key
- CORS configuration
```

### 3. VALIDAR CORREÇÕES COM PLAYWRIGHT
```javascript
// Após correções, validar automaticamente:
- Cartões mostrando preços reais (não "Erro ao carregar")
- Sem erros 429 no console
- Searchbar funcionando
- Advanced Charts com dados reais
```

## 📋 TODO LIST PENDENTE

1. [ ] Testar Playwright com Alfalyzer
2. [ ] Configurar Redis no .env.production
3. [ ] Adicionar API keys (FMP + Alpha Vantage apenas)
4. [ ] Configurar CORS e outras variáveis
5. [ ] Reiniciar PM2 com novo ambiente
6. [ ] Verificar conexão com Supabase
7. [ ] Validar tudo funcionando com Playwright

## 🔴 PROBLEMAS A RESOLVER

### FIND STOCKS PAGE:
- **Erro:** 429 Too Many Requests em loop
- **Causa:** Redis não conectado + .env.production incompleto
- **Solução:** Completar configuração e reiniciar

### ADVANCED CHARTS:
- **Erro:** Dados não carregam
- **Causa:** APIs em modo demo
- **Solução:** Usar FMP com key real

## 💡 COMANDOS ÚTEIS PLAYWRIGHT

```javascript
// Navegar
await playwright.navigate("https://128.140.45.28.sslip.io/find-stocks");

// Capturar estado
const snapshot = await playwright.snapshot();

// Verificar erros
const errors = await playwright.evaluate(() => {
  return Array.from(document.querySelectorAll('.error')).map(e => e.textContent);
});

// Interagir
await playwright.click("button[aria-label='Search']");
await playwright.type("input[placeholder='Search stocks']", "AAPL");

// Screenshot
await playwright.screenshot("find-stocks-state.png");
```

## 🚀 COMANDO RÁPIDO PARA COMEÇAR

```bash
# 1. Testar Playwright primeiro
playwright.navigate("https://128.140.45.28.sslip.io/find-stocks")

# 2. Se houver erros, aplicar correções via SSH
ssh -F ~/.ssh/config hetzner 'cd "/home/teste 1" && nano .env.production'

# 3. Validar com Playwright que funcionou
playwright.reload()
playwright.snapshot()
```

## 📊 RESULTADO ESPERADO

Ao final desta sessão:
- ✅ Playwright capturando estado do frontend automaticamente
- ✅ Redis conectado (cache funcionando)
- ✅ Supabase conectado (database online)
- ✅ Find Stocks mostrando preços reais
- ✅ Sem erros 429
- ✅ Advanced Charts funcionando

## ⚠️ NOTAS IMPORTANTES

1. **Playwright MCP está instalado** - Usar logo no início
2. **Acesso SSH funciona** - ssh -F ~/.ssh/config hetzner
3. **Usar APENAS FMP + Alpha Vantage** - Remover outros providers
4. **Arquivo de referência:** PROMPT-DEFINITIVO-ALFALYZER-ULTRATHINK.md

---

**INSTRUÇÕES:** 
1. Começar testando o Playwright para ver estado atual
2. Aplicar correções do .env.production via SSH
3. Validar tudo funcionando com Playwright
4. Objetivo: Find Stocks e Advanced Charts 100% funcionais

**Data:** 2025-08-20
**Ferramenta Nova:** Playwright MCP disponível
**Urgência:** Sistema em produção aguardando correção