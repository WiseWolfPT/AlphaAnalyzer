# 🛡️ GUIA DE DESENVOLVIMENTO SEGURO - ALFALYZER

## 🎯 PROBLEMA E SOLUÇÃO

### PROBLEMA:
- Claude (Opus/Sonnet) não pode ver suas chaves reais
- Você precisa das chaves para desenvolver
- Chaves não podem ser expostas no Git

### SOLUÇÃO COMPLETA:

## 📋 PASSO 1: CONFIGURAR .env LOCAL

**AÇÃO IMEDIATA**: Edite seu `.env` e substitua os placeholders pelas chaves REAIS:

```bash
# APIs Financeiras - SUBSTITUA COM SUAS CHAVES REAIS
POLYGON_API_KEY=sua_chave_polygon_real_aqui
ALPHA_VANTAGE_API_KEY=sua_chave_alpha_real_aqui
TWELVE_DATA_API_KEY=sua_chave_twelve_real_aqui
FMP_API_KEY=sua_chave_fmp_real_aqui
FINNHUB_API_KEY=sua_chave_finnhub_real_aqui
```

## 📋 PASSO 2: COMPARTILHAR STATUS (NÃO CHAVES)

Após configurar, execute:
```bash
npx tsx scripts/secure-env-share.ts
```

Isso cria `.env.status.json` que pode ser compartilhado com Claude SEM expor chaves.

## 📋 PASSO 3: VALIDAR CONFIGURAÇÃO

```bash
# Testar todas as APIs
npm run test:api

# Ou testar individualmente
curl "https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-01-01?apiKey=SUA_CHAVE_AQUI"
```

## 🔐 REGRAS DE SEGURANÇA

### ✅ FAÇA:
1. **Mantenha .env no .gitignore** (já está)
2. **Use .env.example** para documentação
3. **Compartilhe apenas .env.status.json** com Claude
4. **Faça backup seguro** das chaves (1Password, etc)
5. **Use chaves de TEST** durante desenvolvimento

### ❌ NÃO FAÇA:
1. **NUNCA commite .env real**
2. **NUNCA cole chaves em arquivos .md ou .txt**
3. **NUNCA envie chaves em mensagens**
4. **NUNCA use chaves de produção em dev**

## 🤝 COMO TRABALHAR COM CLAUDE

### Para Claude ter contexto SEM ver chaves:

1. **Configure suas chaves localmente**
2. **Execute**: `npx tsx scripts/secure-env-share.ts`
3. **Compartilhe** o conteúdo de `.env.status.json`
4. Claude verá que APIs estão configuradas sem ver as chaves

### Exemplo de comunicação:
```
"Configurei todas as APIs. Aqui está o status:"
[cole conteúdo do .env.status.json]
```

## 🚀 WORKFLOW COMPLETO

```bash
# 1. Configurar chaves no .env
# 2. Validar configuração
npx tsx scripts/secure-env-share.ts

# 3. Testar APIs
npm run test:api

# 4. Se tudo OK, desenvolver
npm run dev

# 5. Antes de commitar
git status  # Certifique que .env NÃO aparece
```

## 💡 DICAS EXTRAS

1. **Stripe Keys**: Use o dashboard ou CLI (veja STRIPE_SETUP_GUIDE.md)
2. **Rotação de Chaves**: Faça mensalmente para segurança
3. **Ambientes**: Use `.env.development` e `.env.production`
4. **CI/CD**: Configure secrets no GitHub/Vercel

## ⚠️ EMERGÊNCIA

Se acidentalmente expor chaves:
1. **REVOGUE IMEDIATAMENTE** no dashboard da API
2. **Gere novas chaves**
3. **Atualize .env local**
4. **Execute git filter-branch** se necessário

---

**LEMBRE-SE**: Segurança é um processo contínuo, não um evento único!