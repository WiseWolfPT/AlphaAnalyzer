#!/bin/bash
# FASE 3 Backend Endpoints Test Script
# Tests all new valuation endpoints

API_URL="${API_URL:-http://localhost:3001}"
TICKER="${TICKER:-AAPL}"

echo "============================================"
echo "FASE 3 Backend Endpoints Test"
echo "============================================"
echo "API URL: $API_URL"
echo "Ticker: $TICKER"
echo ""

# Test 1: IV Chart (default FCF)
echo "📊 Test 1: IV Chart (default FCF based_on)"
echo "GET /api/iv/$TICKER/chart"
curl -s "$API_URL/api/iv/$TICKER/chart" | jq '.methods[] | {name, category, iv, discount_pct, confidence}' || echo "❌ Failed"
echo ""

# Test 2: IV Chart (OCF based_on)
echo "📊 Test 2: IV Chart (OCF based_on)"
echo "GET /api/iv/$TICKER/chart?based_on=ocf"
curl -s "$API_URL/api/iv/$TICKER/chart?based_on=ocf" | jq '.ticker, .price, .macro_multiplier, .macro_sentiment' || echo "❌ Failed"
echo ""

# Test 3: IV Chart (NI based_on)
echo "📊 Test 3: IV Chart (NI based_on)"
echo "GET /api/iv/$TICKER/chart?based_on=ni"
curl -s "$API_URL/api/iv/$TICKER/chart?based_on=ni" | jq '.methods | length' || echo "❌ Failed"
echo ""

# Test 4: Macro Multiplier
echo "🌍 Test 4: Macro Multiplier"
echo "GET /api/macro/multiplier"
curl -s "$API_URL/api/macro/multiplier" | jq '{multiplier, sentiment, yield_slope, fed_funds_yoy_change}' || echo "❌ Failed"
echo ""

# Test 5: Count methods by category
echo "📈 Test 5: Methods Count by Category"
curl -s "$API_URL/api/iv/$TICKER/chart" | jq '.methods | group_by(.category) | map({category: .[0].category, count: length})' || echo "❌ Failed"
echo ""

echo "============================================"
echo "✅ All tests completed!"
echo "============================================"
