#!/bin/bash
# Teste do comportamento REAL do worker quando ativo

echo "=== ANÁLISE COMPORTAMENTO WORKER QUANDO ATIVO ==="
echo ""

# Verificar estratégia no código
echo "📖 Lendo código atual..."
echo ""

# Check 1: ingestOnce processa quantos símbolos?
SYMBOLS_PROCESSED=$(grep -A 2 "const symbols = symbolsUniverse.slice" /Users/antoniofrancisco/Documents/teste\ 1/server/workers/transcripts-worker.ts | grep -v "^--$")
echo "1. Símbolos processados por ciclo:"
echo "   $SYMBOLS_PROCESSED"
echo ""

# Check 2: fetchLatestTranscriptForSymbol tenta quantos quarters?
QUARTERS_TRIED=$(grep -A 1 "Only try most recent" /Users/antoniofrancisco/Documents/teste\ 1/server/workers/transcripts-worker.ts)
echo "2. Quarters tentados:"
echo "   $QUARTERS_TRIED"
echo ""

# Check 3: Early exit após quantos misses?
EARLY_EXIT=$(grep "MAX_CONSECUTIVE_MISSES" /Users/antoniofrancisco/Documents/teste\ 1/server/workers/transcripts-worker.ts | head -1)
echo "3. Early exit:"
echo "   $EARLY_EXIT"
echo ""

# Check 4: PostgreSQL check existe?
PG_CHECK=$(grep -n "CHECK POSTGRESQL FIRST" /Users/antoniofrancisco/Documents/teste\ 1/server/workers/transcripts-worker.ts)
echo "4. PostgreSQL check:"
echo "   $PG_CHECK"
echo ""

echo "📊 CENÁRIO QUANDO REATIVADO:"
echo ""

# Dados reais
WITH_TRANSCRIPTS=914
WITHOUT_TRANSCRIPTS=579
TOTAL=1493

echo "Empresas COM transcripts ($WITH_TRANSCRIPTS):"
echo "  → PostgreSQL check Q1 2025: EXISTS → SKIP (0 calls)"
echo "  → Total: 0 calls"
echo ""

echo "Empresas SEM transcripts ($WITHOUT_TRANSCRIPTS):"
echo "  → PostgreSQL check Q1 2025: NOT EXISTS"
echo "  → API call Q1 2025: miss (1 call)"
echo "  → PostgreSQL check Q4 2024: NOT EXISTS"
echo "  → API call Q4 2024: miss (1 call)"
echo "  → Early exit após 2 misses consecutivos"
echo "  → Total por empresa: 2 calls"
echo "  → Total: $((WITHOUT_TRANSCRIPTS * 2)) calls"
echo ""

TOTAL_CALLS=$((WITHOUT_TRANSCRIPTS * 2))
echo "⚠️  TOTAL POR CICLO: $TOTAL_CALLS calls"
echo ""

# Projeção
CYCLES_PER_DAY=24
CYCLES_PER_MONTH=$((CYCLES_PER_DAY * 30))
MONTHLY_CALLS=$((TOTAL_CALLS * CYCLES_PER_MONTH))
MONTHLY_GB=$(echo "scale=2; $MONTHLY_CALLS * 30 / 1024 / 1024" | bc)

echo "📅 PROJEÇÃO MENSAL:"
echo "  Ciclos/mês: $CYCLES_PER_MONTH"
echo "  Calls/mês: $MONTHLY_CALLS"
echo "  Bandwidth: ${MONTHLY_GB} GB/mês"
echo ""

# Análise crítica
if (( $(echo "$MONTHLY_GB > 20" | bc -l) )); then
  echo "🚨 PROBLEMA: Excede limite FMP de 20 GB!"
  echo ""
  echo "CAUSA:"
  echo "  Empresas SEM transcripts (ETFs, europeias, pequenas) são tentadas"
  echo "  TODOS OS CICLOS porque não há cache negativo."
  echo ""
  echo "SOLUÇÕES:"
  echo "  A) Filtrar ETFs/.DE/.AS antes de processar"
  echo "  B) Implementar cache negativo (tabela 'attempted_symbols')"
  echo "  C) Usar calendar FMP PRIMEIRO para filtrar apenas earnings reais"
  echo "  D) Aceitar e aplicar hard limit + monitorar"
else
  echo "✅ Comportamento seguro dentro do limite FMP"
fi
echo ""
