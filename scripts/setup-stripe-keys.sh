#!/bin/bash

# SETUP STRIPE KEYS - Script Automático
# =====================================

echo "🔐 CONFIGURANDO STRIPE KEYS AUTOMATICAMENTE"
echo "=========================================="
echo ""

# Verificar se está logado
if ! stripe config --list > /dev/null 2>&1; then
    echo "❌ Você precisa fazer login primeiro:"
    echo "   Execute: stripe login"
    exit 1
fi

echo "✅ Stripe CLI conectado"
echo ""

# Obter chaves de teste
echo "📋 Obtendo chaves de teste..."
echo ""

# Buscar API keys
STRIPE_OUTPUT=$(stripe config --list 2>/dev/null)

# Extrair publishable key
PK=$(echo "$STRIPE_OUTPUT" | grep -E "test_mode_publishable_key" | awk '{print $3}')
SK=$(echo "$STRIPE_OUTPUT" | grep -E "test_mode_secret_key" | awk '{print $3}')

if [ -z "$PK" ] || [ -z "$SK" ]; then
    echo "❌ Não foi possível obter as chaves do Stripe"
    echo "📝 Tente manualmente:"
    echo "   1. Acesse: https://dashboard.stripe.com/test/apikeys"
    echo "   2. Copie as chaves"
    exit 1
fi

echo "✅ Chaves obtidas com sucesso!"
echo ""

# Gerar webhook secret
echo "🔄 Gerando webhook secret..."
echo "   Execute em outro terminal:"
echo "   stripe listen --forward-to localhost:3001/api/webhooks/stripe"
echo ""
echo "📝 Copie o webhook signing secret que aparecerá"
echo ""

# Mostrar formato para .env
echo "📋 ADICIONE AO SEU .env:"
echo "========================"
echo ""
echo "# Stripe Payment Processing"
echo "VITE_STRIPE_PUBLISHABLE_KEY=$PK"
echo "STRIPE_SECRET_KEY=$SK"
echo "STRIPE_WEBHOOK_SECRET=whsec_SEU_WEBHOOK_SECRET_AQUI"
echo ""
echo "✅ Script concluído!"
echo "⚠️  Não esqueça de adicionar o webhook secret manualmente"