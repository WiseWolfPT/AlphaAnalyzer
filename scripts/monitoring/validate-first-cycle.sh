#!/bin/bash
# Validação Primeiro Ciclo Transcripts Worker
# Executa localmente no servidor ou remotamente via SSH

# Detectar contexto de execução
REMOTE_HOST="128.140.45.28"
CURRENT_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
IS_LOCAL=false

if [[ "$CURRENT_IP" == "$REMOTE_HOST" ]] || [[ "$(hostname)" == "localhost" ]] || [[ -z "$CURRENT_IP" ]]; then
  IS_LOCAL=true
  CMD_PREFIX=""
  REDIS_CMD="redis-cli -a alfalyzer2025redis"
else
  CMD_PREFIX="ssh root@$REMOTE_HOST"
  REDIS_CMD="ssh root@$REMOTE_HOST 'redis-cli -a alfalyzer2025redis'"
fi

echo "=== Validação Primeiro Ciclo Transcripts Worker ==="
echo "Modo: $(if $IS_LOCAL; then echo 'LOCAL'; else echo 'REMOTE'; fi)"
echo ""

# 1. Último bandwidth report
echo "📊 Último Bandwidth Report:"
if $IS_LOCAL; then
  pm2 logs transcripts-worker --lines 200 --nostream | grep 'Daily bandwidth reset' | tail -1
else
  $CMD_PREFIX "pm2 logs transcripts-worker --lines 200 --nostream | grep 'Daily bandwidth reset' | tail -1"
fi
echo ""

# 2. Calendar-driven cycle completion (log completo com métricas)
echo "🗓️ Último Ciclo Calendar-Driven:"
LAST_CYCLE_BLOCK=""
if $IS_LOCAL; then
  LAST_CYCLE_BLOCK=$(pm2 logs transcripts-worker --lines 200 --nostream | grep -A 10 'Calendar-driven cycle complete' | tail -15)
else
  LAST_CYCLE_BLOCK=$($CMD_PREFIX "pm2 logs transcripts-worker --lines 200 --nostream | grep -A 10 'Calendar-driven cycle complete' | tail -15")
fi
echo "$LAST_CYCLE_BLOCK"
echo ""

# 3. Extrair métricas do cycle summary (via JSON parsing multi-linha)
echo "📊 Métricas do Último Ciclo:"
if [[ -n "$LAST_CYCLE_BLOCK" ]]; then
  # Extrair valores do JSON multi-linha (pega número após ": " no campo JSON)
  EVENTS=$(echo "$LAST_CYCLE_BLOCK" | grep '"events":' | sed 's/.*"events": *\([0-9]\+\).*/\1/' || echo "N/A")
  SKIPPED=$(echo "$LAST_CYCLE_BLOCK" | grep '"skipped":' | sed 's/.*"skipped": *\([0-9]\+\).*/\1/' || echo "N/A")
  INGESTED=$(echo "$LAST_CYCLE_BLOCK" | grep '"ingested":' | sed 's/.*"ingested": *\([0-9]\+\).*/\1/' || echo "N/A")
  QUEUE_PUSHED=$(echo "$LAST_CYCLE_BLOCK" | grep '"queuePushed":' | sed 's/.*"queuePushed": *\([0-9]\+\).*/\1/' || echo "N/A")
  API_CALLS=$(echo "$LAST_CYCLE_BLOCK" | grep '"apiCalls":' | sed 's/.*"apiCalls": *\([0-9]\+\).*/\1/' || echo "N/A")

  echo "  Events: $EVENTS"
  echo "  Skipped (cache hits): $SKIPPED"
  echo "  Ingested (new): $INGESTED"
  echo "  Queue pushed (AI): $QUEUE_PUSHED"
  echo "  API calls: $API_CALLS"

  # Calcular cache hit rate
  if [[ "$EVENTS" != "N/A" ]] && [[ "$SKIPPED" != "N/A" ]] && [[ "$EVENTS" -gt 0 ]]; then
    CACHE_HIT_RATE=$(awk "BEGIN {printf \"%.1f\", ($SKIPPED/$EVENTS)*100}")
    echo "  Cache hit rate: ${CACHE_HIT_RATE}%"
  fi
else
  echo "⚠️ Nenhum ciclo encontrado nos últimos 200 logs"
fi
echo ""

# 4. AI processing
echo "🤖 AI Processing:"
if $IS_LOCAL; then
  pm2 logs transcripts-worker --lines 200 --nostream | grep 'AI processing via Redis queue' | tail -1
else
  $CMD_PREFIX "pm2 logs transcripts-worker --lines 200 --nostream | grep 'AI processing via Redis queue' | tail -1"
fi
echo ""

# 5. Redis queue length
echo "📋 Redis Queue Length:"
if $IS_LOCAL; then
  eval "$REDIS_CMD LLEN transcript_queue 2>/dev/null"
else
  eval "$REDIS_CMD LLEN transcript_queue 2>/dev/null"
fi
echo ""

# 6. Worker status
echo "⚙️ Worker Status:"
if $IS_LOCAL; then
  pm2 list | grep transcripts-worker
else
  $CMD_PREFIX "pm2 list | grep transcripts-worker"
fi
echo ""

# 7. Any errors?
echo "❌ Errors Last 100 Lines:"
if $IS_LOCAL; then
  # Ler diretamente o error log (evita TAILING/ANSI do pm2 logs)
  ERROR_LOG=$(tail -100 /home/teste\ 1/logs/transcripts-err-*.log 2>/dev/null | grep -iE 'error|exception|unhandled|failed')
else
  ERROR_LOG=$($CMD_PREFIX "tail -100 /home/teste\ 1/logs/transcripts-err-*.log 2>/dev/null | grep -iE 'error|exception|unhandled|failed'")
fi

# Contar linhas não vazias
if [ -z "$ERROR_LOG" ]; then
  ERROR_COUNT=0
else
  ERROR_COUNT=$(echo "$ERROR_LOG" | wc -l | tr -d ' ')
fi

if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "✅ No errors detected"
else
  echo "⚠️ Found $ERROR_COUNT error lines - investigate:"
  echo "$ERROR_LOG" | tail -10
fi
echo ""

# 8. Success Criteria
echo "=== Success Criteria ==="
echo "✅ Events: Should be 1-30 (calendar window: 7 days back + 2 forward)"
echo "✅ Cache hit rate: Should be >90% (most events already cached)"
echo "✅ API calls: Should be 1-25 (1 calendar + few new transcripts)"
echo "✅ Redis queue: Should be 0-20 (new transcripts for AI)"
echo "✅ Errors: Should be 0"
echo "✅ Status: Should be 'online'"
