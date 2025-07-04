#!/bin/bash

echo "🔍 VERIFICAÇÃO COMPLETA DO ALFALYZER"
echo "===================================="
echo ""

# Check Frontend
echo "1️⃣ Frontend Check:"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Frontend rodando em: http://localhost:3000"
else
    echo "   ❌ Frontend não está acessível"
fi
echo ""

# Check Backend
echo "2️⃣ Backend API Check:"
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend API rodando em: http://localhost:3001"
else
    echo "   ❌ Backend API não está acessível"
fi
echo ""

# Check Metrics API
echo "3️⃣ Metrics API Check:"
METRICS=$(curl -s http://localhost:3001/api/v2/market-data/metrics)
if echo "$METRICS" | grep -q '"success":true'; then
    echo "   ✅ Metrics API funcionando"
    FINNHUB_CALLS=$(echo "$METRICS" | grep -o '"api_calls_total_finnhub":{"count":[0-9]*' | grep -o '[0-9]*$' || echo "0")
    echo "   📊 Finnhub API calls: $FINNHUB_CALLS"
else
    echo "   ❌ Metrics API com problemas"
fi
echo ""

# Check Stock Price API
echo "4️⃣ Stock Price API Check:"
PRICE_RESPONSE=$(curl -s http://localhost:3001/api/v2/market-data/stocks/AAPL/price)
if echo "$PRICE_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ Price API funcionando"
    PROVIDER=$(echo "$PRICE_RESPONSE" | grep -o '"provider":"[^"]*' | cut -d'"' -f4)
    echo "   🏢 Provider usado: $PROVIDER"
else
    echo "   ❌ Price API com problemas"
fi
echo ""

# URLs importantes
echo "📍 URLs Importantes:"
echo "   🏠 Landing Page: http://localhost:3000"
echo "   🔍 Find Stocks: http://localhost:3000/find-stocks"
echo "   📊 Dashboard: http://localhost:3000/dashboard-enhanced"
echo "   📈 Admin Metrics: http://localhost:3000/admin/metrics"
echo "   📋 Watchlists: http://localhost:3000/watchlists"
echo ""

# Status final
echo "🚀 STATUS FINAL:"
if curl -s http://localhost:3000 > /dev/null 2>&1 && curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ ALFALYZER ESTÁ 100% OPERACIONAL!"
else
    echo "   ⚠️  Alguns serviços precisam ser iniciados"
fi
echo ""
echo "===================================="