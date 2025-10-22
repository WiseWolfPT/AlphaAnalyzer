#!/bin/bash
# Simulação do comportamento real do Transcripts Worker

echo "=== SIMULAÇÃO TRANSCRIPTS WORKER ==="
echo ""

# Dados do servidor (verificados)
TOTAL_UNIVERSE=1493
WITH_TRANSCRIPTS=914
WITHOUT_TRANSCRIPTS=639

echo "📊 Dados PostgreSQL:"
echo "  - Universo total: $TOTAL_UNIVERSE empresas"
echo "  - COM transcripts: $WITH_TRANSCRIPTS empresas (61.2%)"
echo "  - SEM transcripts: $WITHOUT_TRANSCRIPTS empresas (38.8%)"
echo ""

# Configuração atual
UNIVERSE_LIMIT_PER_CYCLE=1493  # Do .env.production

echo "⚙️  Configuração atual:"
echo "  - SYMBOLS_UNIVERSE_LIMIT_PER_CYCLE: $UNIVERSE_LIMIT_PER_CYCLE"
echo "  - Símbolos processados por ciclo: $UNIVERSE_LIMIT_PER_CYCLE"
echo ""

# Simulação Cenário ATUAL (processa 1,493)
echo "📈 CENÁRIO A - Código ATUAL (processa $UNIVERSE_LIMIT_PER_CYCLE símbolos):"
echo ""

# Com transcripts: PostgreSQL check → SKIP (0 calls)
SKIP_COUNT=$WITH_TRANSCRIPTS
echo "  Empresas COM transcripts:"
echo "    - Quantidade: $WITH_TRANSCRIPTS"
echo "    - PostgreSQL check → SKIP"
echo "    - API calls: 0"
echo ""

# Sem transcripts: tenta 2 quarters (early exit)
WITHOUT_API_CALLS=$((WITHOUT_TRANSCRIPTS * 2))
echo "  Empresas SEM transcripts:"
echo "    - Quantidade: $WITHOUT_TRANSCRIPTS"
echo "    - Tenta Q1 2025 → miss (1 call)"
echo "    - Tenta Q4 2024 → miss (1 call)"
echo "    - Early exit após 2 misses"
echo "    - API calls: $WITHOUT_API_CALLS"
echo ""

TOTAL_CALLS_A=$WITHOUT_API_CALLS
BANDWIDTH_MB_A=$(echo "scale=2; $TOTAL_CALLS_A * 30 / 1024" | bc)
echo "  ⚠️  TOTAL API CALLS: $TOTAL_CALLS_A"
echo "  ⚠️  Bandwidth: ~${BANDWIDTH_MB_A} MB"
echo ""

# Simulação Cenário OTIMIZADO (limita a 914)
echo "📉 CENÁRIO B - OTIMIZADO (limita a $WITH_TRANSCRIPTS símbolos COM transcripts):"
echo ""

echo "  Processar apenas empresas COM transcripts:"
echo "    - Quantidade: $WITH_TRANSCRIPTS"
echo "    - PostgreSQL check → ~97% SKIP"
echo "    - Novos (últimos 7 dias): ~3%"
echo ""

# Estimativa realista: ~3% são novos
NEW_TRANSCRIPTS=$(echo "scale=0; $WITH_TRANSCRIPTS * 0.03 / 1" | bc)
CALENDAR_LOOKUP=1
TOTAL_CALLS_B=$((NEW_TRANSCRIPTS + CALENDAR_LOOKUP))
BANDWIDTH_MB_B=$(echo "scale=2; $TOTAL_CALLS_B * 30 / 1024" | bc)

echo "  ✅ TOTAL API CALLS: $TOTAL_CALLS_B"
echo "  ✅ Bandwidth: ~${BANDWIDTH_MB_B} MB"
echo ""

# Comparação
echo "📊 COMPARAÇÃO:"
echo ""
echo "  Cenário A (atual):    $TOTAL_CALLS_A calls / ${BANDWIDTH_MB_A} MB"
echo "  Cenário B (otimizado): $TOTAL_CALLS_B calls / ${BANDWIDTH_MB_B} MB"
echo ""

SAVED_CALLS=$((TOTAL_CALLS_A - TOTAL_CALLS_B))
SAVED_MB=$(echo "scale=2; $BANDWIDTH_MB_A - $BANDWIDTH_MB_B" | bc)
REDUCTION=$(echo "scale=1; 100 * (1 - $TOTAL_CALLS_B / $TOTAL_CALLS_A)" | bc)

echo "  💾 Economia: $SAVED_CALLS calls / ${SAVED_MB} MB (${REDUCTION}% redução)"
echo ""

# Projeção mensal (24 ciclos/dia × 30 dias)
CYCLES_PER_MONTH=$((24 * 30))
MONTHLY_A=$((TOTAL_CALLS_A * CYCLES_PER_MONTH))
MONTHLY_B=$((TOTAL_CALLS_B * CYCLES_PER_MONTH))
MONTHLY_MB_A=$(echo "scale=2; $MONTHLY_A * 30 / 1024 / 1024" | bc)
MONTHLY_MB_B=$(echo "scale=2; $MONTHLY_B * 30 / 1024 / 1024" | bc)

echo "📅 PROJEÇÃO MENSAL (720 ciclos/mês):"
echo ""
echo "  Cenário A: $MONTHLY_A calls / ${MONTHLY_MB_A} GB/mês"
echo "  Cenário B: $MONTHLY_B calls / ${MONTHLY_MB_B} GB/mês"
echo ""

# Recomendação
echo "🎯 RECOMENDAÇÃO:"
echo ""
if [ $TOTAL_CALLS_A -gt 100 ]; then
  echo "  ❌ Cenário A desperdiça $SAVED_CALLS calls/ciclo tentando empresas SEM transcripts"
  echo "  ✅ Aplicar limite de 914 em ingestOnce() (como já existe em getWhitelistSymbols())"
  echo ""
  echo "  AÇÃO NECESSÁRIA:"
  echo "    Alterar linha ~900 de transcripts-worker.ts:"
  echo "    - DE:   const symbols = symbolsUniverse.slice(0, UNIVERSE_LIMIT_PER_CYCLE);"
  echo "    - PARA: const symbols = symbolsUniverse.slice(0, Math.min(914, UNIVERSE_LIMIT_PER_CYCLE));"
else
  echo "  ✅ Comportamento atual é eficiente"
fi
echo ""
