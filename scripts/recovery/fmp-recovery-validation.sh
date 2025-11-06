#!/bin/bash
# FMP Recovery Validation Script
# Run this after FMP rate limit resets to validate system recovery

set -e

TARGET_URL="${TARGET_URL:-https://128.140.45.28.sslip.io}"
API_KEY="${MARKET_DATA_API_KEY:-}"

echo "======================================"
echo "FMP Recovery Validation"
echo "======================================"
echo "Target: $TARGET_URL"
echo "Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Function to test FMP directly
test_fmp_direct() {
  echo "1. Testing FMP API directly..."

  if [ -z "$FMP_API_KEY" ]; then
    echo "   ⚠️  FMP_API_KEY not set, skipping direct test"
    return
  fi

  response=$(curl -s "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=$FMP_API_KEY")

  if echo "$response" | grep -q "Limit Reach"; then
    echo "   ❌ FMP STILL RATE LIMITED"
    return 1
  elif echo "$response" | jq -e '.[0].symbol' >/dev/null 2>&1; then
    echo "   ✅ FMP API responding normally"
    return 0
  else
    echo "   ⚠️  FMP returned unexpected response"
    echo "$response" | head -3
    return 1
  fi
}

# Function to test backend health
test_backend_health() {
  echo ""
  echo "2. Testing Backend Health..."

  status=$(curl -s -o /tmp/health.json -w "%{http_code}" "$TARGET_URL/api/health")

  if [ "$status" = "200" ]; then
    redis_status=$(jq -r '.redis.status' /tmp/health.json 2>/dev/null || echo "unknown")
    echo "   ✅ Backend healthy (Redis: $redis_status)"
    return 0
  else
    echo "   ❌ Backend unhealthy (HTTP $status)"
    return 1
  fi
}

# Function to test single IV endpoint
test_single_iv() {
  local ticker="$1"
  echo ""
  echo "3. Testing IV Endpoint: $ticker..."

  status=$(curl -s -o /tmp/iv-$ticker.json -w "%{http_code}" "$TARGET_URL/api/iv/$ticker")

  if [ "$status" = "502" ]; then
    echo "   ❌ 502 Bad Gateway - FMP still down"
    return 1
  elif [ "$status" = "200" ]; then
    method_count=$(jq '.methods | length' /tmp/iv-$ticker.json 2>/dev/null || echo "0")
    has_growth=$(jq -r '.methods[] | select(.method_id == "growth-dcf-8y") | .method_id' /tmp/iv-$ticker.json 2>/dev/null | wc -l | xargs)

    echo "   ✅ HTTP 200"
    echo "      Methods: $method_count"
    echo "      Has growth-dcf-8y: $has_growth"
    return 0
  else
    echo "   ⚠️  HTTP $status"
    return 1
  fi
}

# Function to test growth stock distribution
test_growth_stocks() {
  echo ""
  echo "4. Testing Growth Stocks (should have growth-dcf-8y)..."

  local pass=0
  local fail=0

  for ticker in NVDA META GOOGL; do
    status=$(curl -s -o /tmp/growth-$ticker.json -w "%{http_code}" "$TARGET_URL/api/iv/$ticker")

    if [ "$status" = "200" ]; then
      has_growth=$(jq -r '.methods[] | select(.method_id == "growth-dcf-8y") | .method_id' /tmp/growth-$ticker.json 2>/dev/null | wc -l | xargs)

      if [ "$has_growth" -gt 0 ]; then
        echo "   ✅ $ticker has growth-dcf-8y"
        ((pass++))
      else
        echo "   ❌ $ticker MISSING growth-dcf-8y"
        ((fail++))
      fi
    else
      echo "   ⚠️  $ticker HTTP $status"
      ((fail++))
    fi
  done

  echo "   Summary: $pass pass, $fail fail"
  [ $pass -ge 2 ] && return 0 || return 1
}

# Function to test banks (should NOT have growth-dcf-8y)
test_banks() {
  echo ""
  echo "5. Testing Banks (should NOT have growth-dcf-8y)..."

  local pass=0
  local fail=0

  for ticker in JPM GS; do
    status=$(curl -s -o /tmp/bank-$ticker.json -w "%{http_code}" "$TARGET_URL/api/iv/$ticker")

    if [ "$status" = "200" ]; then
      has_growth=$(jq -r '.methods[] | select(.method_id == "growth-dcf-8y") | .method_id' /tmp/bank-$ticker.json 2>/dev/null | wc -l | xargs)

      if [ "$has_growth" -eq 0 ]; then
        echo "   ✅ $ticker does NOT have growth-dcf-8y (correct)"
        ((pass++))
      else
        echo "   ❌ $ticker HAS growth-dcf-8y (incorrect for bank)"
        ((fail++))
      fi
    else
      echo "   ⚠️  $ticker HTTP $status"
      ((fail++))
    fi
  done

  echo "   Summary: $pass pass, $fail fail"
  [ $pass -ge 1 ] && return 0 || return 1
}

# Function to check bandwidth tracking
test_bandwidth_tracking() {
  echo ""
  echo "6. Testing Bandwidth Tracking..."

  status=$(curl -s -o /tmp/monitoring.json -w "%{http_code}" "$TARGET_URL/api/monitoring/warming/overview")

  if [ "$status" = "200" ]; then
    bandwidth_used=$(jq -r '.bandwidth.usedMB' /tmp/monitoring.json 2>/dev/null || echo "unknown")
    bandwidth_budget=$(jq -r '.bandwidth.dailyBudgetMB' /tmp/monitoring.json 2>/dev/null || echo "unknown")

    echo "   ✅ Monitoring endpoint accessible"
    echo "      Daily Budget: $bandwidth_budget MB"
    echo "      Used: $bandwidth_used MB"

    if [ "$bandwidth_used" = "0.00" ] || [ "$bandwidth_used" = "0" ]; then
      echo "   ⚠️  WARNING: Bandwidth showing 0 MB (tracker may be broken)"
      return 1
    else
      echo "   ✅ Bandwidth tracking appears functional"
      return 0
    fi
  else
    echo "   ⚠️  Monitoring endpoint HTTP $status"
    return 1
  fi
}

# Function to check cache status
test_cache_status() {
  echo ""
  echo "7. Testing Cache Status..."

  status=$(curl -s -o /tmp/cache.json -w "%{http_code}" "$TARGET_URL/api/cache/status")

  if [ "$status" = "200" ]; then
    hit_rate=$(jq -r '.hitRate' /tmp/cache.json 2>/dev/null || echo "unknown")
    total_keys=$(jq -r '.totalKeys' /tmp/cache.json 2>/dev/null || echo "unknown")

    echo "   ✅ Cache accessible"
    echo "      Total Keys: $total_keys"
    echo "      Hit Rate: $hit_rate"
    return 0
  else
    echo "   ⚠️  Cache status HTTP $status"
    return 1
  fi
}

# Function to measure response time
test_performance() {
  echo ""
  echo "8. Testing Performance (P95 latency)..."

  local total=0
  local count=5

  for i in $(seq 1 $count); do
    start=$(date +%s%3N)
    curl -s "$TARGET_URL/api/iv/AAPL" > /dev/null
    end=$(date +%s%3N)
    latency=$((end - start))
    total=$((total + latency))
    echo "   Request $i: ${latency}ms"
    sleep 0.5
  done

  avg=$((total / count))
  echo "   Average: ${avg}ms"

  if [ $avg -lt 500 ]; then
    echo "   ✅ Performance acceptable (<500ms target)"
    return 0
  else
    echo "   ⚠️  Performance degraded (>500ms)"
    return 1
  fi
}

# Main execution
main() {
  local tests_passed=0
  local tests_failed=0

  test_fmp_direct && ((tests_passed++)) || ((tests_failed++))
  test_backend_health && ((tests_passed++)) || ((tests_failed++))
  test_single_iv "AAPL" && ((tests_passed++)) || ((tests_failed++))
  test_growth_stocks && ((tests_passed++)) || ((tests_failed++))
  test_banks && ((tests_passed++)) || ((tests_failed++))
  test_bandwidth_tracking && ((tests_passed++)) || ((tests_failed++))
  test_cache_status && ((tests_passed++)) || ((tests_failed++))
  test_performance && ((tests_passed++)) || ((tests_failed++))

  echo ""
  echo "======================================"
  echo "RECOVERY VALIDATION SUMMARY"
  echo "======================================"
  echo "Tests Passed: $tests_passed"
  echo "Tests Failed: $tests_failed"
  echo ""

  if [ $tests_passed -ge 6 ]; then
    echo "✅ SYSTEM RECOVERED - Ready for full validation"
    echo ""
    echo "Next steps:"
    echo "  1. Enable warming workers: pm2 restart intelligent-warming-worker iv-warming-worker"
    echo "  2. Monitor bandwidth closely: watch -n 60 'curl -s $TARGET_URL/api/monitoring/warming/overview | jq .bandwidth'"
    echo "  3. Run full validation: npm run test:validation"
    return 0
  else
    echo "❌ SYSTEM NOT FULLY RECOVERED"
    echo ""
    echo "Action required:"
    echo "  1. Check PM2 logs: pm2 logs alfalyzer --lines 50"
    echo "  2. Verify FMP API key: echo \$FMP_API_KEY"
    echo "  3. Restart backend: pm2 restart alfalyzer --update-env"
    return 1
  fi
}

# Run main
main
exit_code=$?

echo ""
echo "Report saved to: /tmp/fmp-recovery-$(date +%Y%m%d-%H%M%S).txt"

exit $exit_code
