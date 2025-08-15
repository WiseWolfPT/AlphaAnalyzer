#!/bin/bash

echo "🔍 DIAGNÓSTICO DO BACKEND ALFALYZER"
echo "===================================="
echo ""

BACKEND_URL="http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io"

echo "1. Testando conectividade básica..."
if ping -c 1 128.140.45.28 > /dev/null 2>&1; then
    echo "✅ Servidor acessível via ping"
else
    echo "❌ Servidor não responde ao ping"
fi

echo ""
echo "2. Testando endpoint /api/health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check OK (200)"
    echo "Response: $BODY"
elif [ "$HTTP_CODE" = "503" ]; then
    echo "❌ Service Unavailable (503) - Backend está OFFLINE!"
    echo "Response: $BODY"
else
    echo "⚠️ Unexpected response: $HTTP_CODE"
    echo "Response: $BODY"
fi

echo ""
echo "3. Testando porta 80..."
nc -zv 128.140.45.28 80 2>&1 | grep -E "(succeeded|refused|timeout)"

echo ""
echo "4. Testando endpoint /api/market-data/quotes/batch..."
QUOTES_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/market-data/quotes/batch?symbols=AAPL")
HTTP_CODE=$(echo "$QUOTES_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Market data endpoint OK (200)"
elif [ "$HTTP_CODE" = "503" ]; then
    echo "❌ Market data unavailable (503)"
else
    echo "⚠️ Market data response: $HTTP_CODE"
fi

echo ""
echo "5. Verificando proxy do Vercel..."
VERCEL_RESPONSE=$(curl -s -w "\n%{http_code}" "https://alfalyzer.vercel.app/api/health")
HTTP_CODE=$(echo "$VERCEL_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Vercel proxy funcionando (200)"
elif [ "$HTTP_CODE" = "503" ]; then
    echo "❌ Vercel proxy recebendo 503 do backend"
else
    echo "⚠️ Vercel proxy response: $HTTP_CODE"
fi

echo ""
echo "===================================="
echo "RESUMO:"
echo ""
echo "🔴 AÇÃO NECESSÁRIA:"
echo "1. Acessar Coolify e verificar status do container"
echo "2. Se parado → Start"
echo "3. Se com erro → Ver logs e corrigir"
echo "4. Verificar variáveis de ambiente (FMP_API_KEY)"
echo ""
echo "URL Coolify Backend: $BACKEND_URL"
echo "IP: 128.140.45.28"