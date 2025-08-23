#!/bin/bash

echo "🔧 Aplicando correção definitiva de CORS/Origin..."

# Adicionar as URLs na lista allowedOrigins (depois da linha 143)
# Como já tentamos adicionar antes, vamos verificar se já existe
if grep -q "128.140.45.28.sslip.io" server/middleware/api-security.ts; then
    echo "✅ URLs já estão na lista"
else
    echo "📝 Adicionando URLs na lista allowedOrigins..."
    # Adicionar depois de 'https://alfalyzer.com'
    sed -i "/    'https:\/\/alfalyzer.com'/a\\    'https://128.140.45.28.sslip.io',\n    'http://128.140.45.28.sslip.io'," server/middleware/api-security.ts
fi

# Também garantir que a lógica permite origem undefined (para curl)
echo "🔍 Verificando lógica de origem undefined..."
grep -n "!origin" server/middleware/api-security.ts

# Reiniciar servidor
echo "🚀 Reiniciando servidor..."
pm2 restart alfalyzer --update-env

# Aguardar inicialização
echo "⏳ Aguardando servidor iniciar (10 segundos)..."
sleep 10

# Testar localmente
echo "🧪 Testando endpoint localmente..."
if curl -s 'http://localhost:3001/api/market-data/quotes/batch?symbols=AAPL' | jq '.quotes[0].symbol' 2>/dev/null | grep -q "AAPL"; then
    echo "✅ API funcionando localmente!"
else
    echo "⚠️ API não retornou dados esperados"
fi

# Verificar logs
echo "📋 Últimos logs do servidor:"
pm2 logs alfalyzer --lines 10 --nostream | grep -E "Origin|CORS|403|started"

echo "✅ Correção aplicada! Teste em: https://128.140.45.28.sslip.io/find-stocks"