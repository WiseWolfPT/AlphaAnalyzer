# 🚀 DeepL Setup - Guia Rápido (5 minutos)

## ✅ O Que Foi Preparado

Sistema completo de tradução automática com:
- ✅ Glossário com 70+ termos financeiros PT-PT
- ✅ Preservação de placeholders ({{value}}, {symbol})
- ✅ Cache inteligente
- ✅ 8397 strings prontas para traduzir

## 📝 Passo 1: Obter DeepL API Key (2 min)

### 1.1 Criar Conta DeepL (Grátis)

```bash
# Abre no browser:
https://www.deepl.com/pro-api

# Clica em "Sign up for free" ou "Registar grátis"
```

### 1.2 Configuração Rápida

1. **Email** → Usa teu email
2. **Password** → Escolhe password
3. **Confirma email** → Clica no link que recebes
4. **API Key** → Copia a key que aparece no dashboard

**Importante:** Escolhe **"DeepL API Free"** (500k chars/mês grátis)

---

## 🔑 Passo 2: Configurar API Key (30 seg)

### Opção A - Variável de Ambiente (Recomendado)

```bash
# No terminal:
export DEEPL_API_KEY="cole_tua_key_aqui"

# Ou permanente (adiciona ao ~/.zshrc ou ~/.bashrc):
echo 'export DEEPL_API_KEY="tua_key"' >> ~/.zshrc
source ~/.zshrc
```

### Opção B - Ficheiro .env

```bash
# Cria/edita .env.production:
echo 'DEEPL_API_KEY=tua_key_aqui' >> .env.production
```

---

## ▶️ Passo 3: Executar Tradução (1 min)

```bash
cd /Users/antoniofrancisco/Documents/teste\ 1

# Traduzir tudo de uma vez:
npm run i18n:translate
```

**O que vai acontecer:**
```
📚 Glossário carregado: 70 termos financeiros
📦 Cache carregado: 0 traduções
🌍 Traduzindo 8397 strings para PT-PT...

🌐 Progresso: 100/8397 (1%)
🌐 Progresso: 500/8397 (6%)
🌐 Progresso: 1000/8397 (12%)
...
🌐 Progresso: 8397/8397 (100%)

✅ Traduções geradas: client/public/locales/pt/translated.json
📦 Cache guardado: 8397 entradas
```

**Tempo estimado:** ~60 segundos
**Custo:** €0 (free tier)
**Quota usada:** ~168k / 500k chars (33%)

---

## ✅ Passo 4: Verificar Resultado

```bash
# Ver traduções geradas:
head -20 client/public/locales/pt/translated.json

# Exemplo esperado:
{
  "common": {
    "Stock": "Ação",           ← Glossário aplicado ✅
    "Search {{query}}": "Pesquisar {{query}}",  ← Placeholder preservado ✅
    "Portfolio": "Carteira",   ← Termo financeiro correto ✅
    ...
  }
}
```

---

## 🔄 Manutenção Futura

### Quando Adicionas Features Novas:

```bash
# 1. Extrai novas strings (rápido):
npm run i18n:extract

# 2. Traduz APENAS as novas (cache protege antigas):
npm run i18n:translate

# 3. Deploy:
npm run deploy:full
```

**Custo:** ~€0.01 por cada 100 strings novas

---

## ⚠️ Troubleshooting

### "DEEPL_API_KEY não configurada"

```bash
# Verifica se está definida:
echo $DEEPL_API_KEY

# Se vazio, configura:
export DEEPL_API_KEY="tua_key"
```

### "Error 456: Quota exceeded"

Excedeste os 500k chars/mês. Opções:
1. Espera até próximo mês (quota renova)
2. Upgrade para DeepL Pro (€4.99/mês)
3. Troca para Gemini (grátis ilimitado)

### "Error 403: Invalid auth_key"

API key incorreta. Verifica:
1. Copiaste key completa (sem espaços)
2. Usaste a key da **DeepL API** (não DeepL Pro)

---

## 📊 Monitorar Quota

```bash
# Ver dashboard DeepL:
https://www.deepl.com/pt-PT/account/usage

# Mostra:
- Caracteres usados este mês
- Caracteres restantes
- Histórico de uso
```

---

## 🎯 Checklist Final

- [ ] Criei conta DeepL (grátis)
- [ ] Copiei API key
- [ ] Configurei `DEEPL_API_KEY`
- [ ] Executei `npm run i18n:translate`
- [ ] Verifiquei `client/public/locales/pt/translated.json`
- [ ] Termos financeiros corretos (Stock=Ação, Yield=Rendimento)
- [ ] Placeholders preservados ({{value}} intactos)

---

## 💡 Próximo Passo

Depois da primeira tradução:

```bash
# Build & Deploy:
npm run build:full
npm run deploy:full
```

**Site estará 100% em PT-PT! 🎉**

---

**Dúvidas?** Ver documentação completa em `docs/I18N_AUTO_TRANSLATION.md`
