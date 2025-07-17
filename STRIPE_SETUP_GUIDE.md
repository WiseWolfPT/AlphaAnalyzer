# 🔐 GUIA SEGURO PARA CONFIGURAR STRIPE

## 🎯 OBJETIVO
Configurar Stripe de forma SEGURA sem expor chaves

## 📋 PASSOS PARA RECUPERAR/GERAR CHAVES STRIPE

### OPÇÃO 1: Via Dashboard (Recomendado)
1. Acesse: https://dashboard.stripe.com/test/apikeys
2. Copie as chaves:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`
3. Para Webhook Secret:
   - Vá em: https://dashboard.stripe.com/test/webhooks
   - Crie novo endpoint: `http://localhost:3001/api/webhooks/stripe`
   - Copie o Signing secret: `whsec_...`

### OPÇÃO 2: Via Stripe CLI
```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Listar chaves (modo test)
stripe config --list

# Gerar webhook secret local
stripe listen --forward-to localhost:3001/api/webhooks/stripe
# Copie o webhook secret mostrado
```

## 🔧 ATUALIZAR .env COM SEGURANÇA

```bash
# No seu .env local, adicione:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_SEU_KEY_AQUI
STRIPE_SECRET_KEY=sk_test_SEU_KEY_AQUI
STRIPE_WEBHOOK_SECRET=whsec_SEU_SECRET_AQUI
```

## ✅ VALIDAR CONFIGURAÇÃO

```bash
# Testar conexão Stripe
curl https://api.stripe.com/v1/charges \
  -u sk_test_SEU_KEY_AQUI: \
  -d amount=100 \
  -d currency=usd \
  -d source=tok_visa \
  -d description="Test charge"
```

## 🚨 IMPORTANTE
- Use sempre modo TEST durante desenvolvimento
- NUNCA commite chaves reais
- O .env já está no .gitignore
- Para produção, use variáveis de ambiente do servidor