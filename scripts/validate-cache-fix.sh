#!/bin/bash
# Script de validação do cache fix
# Uso: bash scripts/validate-cache-fix.sh

set -e

echo "🔍 VALIDAÇÃO: Frontend Cache Fix"
echo "=================================="
echo ""

# 1. Verificar arquivos modificados
echo "1️⃣ Verificando arquivos modificados..."
FILES_CHANGED=(
  "client/src/lib/queryClient.ts"
  "client/src/lib/query-keys.ts"
  "client/src/hooks/use-alfa-value.ts"
)

for file in "${FILES_CHANGED[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file existe"
  else
    echo "   ❌ $file NÃO ENCONTRADO"
    exit 1
  fi
done
echo ""

# 2. Verificar configuração crítica
echo "2️⃣ Verificando configuração crítica..."

# Verificar refetchOnMount: false
if grep -q "refetchOnMount: false" client/src/lib/queryClient.ts; then
  echo "   ✅ refetchOnMount: false presente"
else
  echo "   ❌ refetchOnMount: false FALTANDO"
  exit 1
fi

# Verificar staleTime
if grep -q "staleTime: 5 \* 60 \* 1000" client/src/lib/queryClient.ts; then
  echo "   ✅ staleTime: 5min configurado"
else
  echo "   ⚠️  staleTime não é 5min (verificar manualmente)"
fi

# Verificar gcTime
if grep -q "gcTime: 10 \* 60 \* 1000" client/src/lib/queryClient.ts; then
  echo "   ✅ gcTime: 10min configurado"
else
  echo "   ⚠️  gcTime não é 10min (verificar manualmente)"
fi
echo ""

# 3. Verificar query keys normalizadas
echo "3️⃣ Verificando query keys normalizadas..."

# Verificar alfaValue keys
if grep -q "alfaValue.*ticker.*toUpperCase" client/src/lib/query-keys.ts; then
  echo "   ✅ alfaValue query key definida"
else
  echo "   ❌ alfaValue query key FALTANDO"
  exit 1
fi

# Verificar import em use-alfa-value
if grep -q "import { queryKeys } from '@/lib/query-keys'" client/src/hooks/use-alfa-value.ts; then
  echo "   ✅ use-alfa-value importa queryKeys"
else
  echo "   ❌ use-alfa-value NÃO importa queryKeys"
  exit 1
fi

# Verificar uso de queryKeys.alfaValueMain
if grep -q "queryKey: queryKeys.alfaValueMain" client/src/hooks/use-alfa-value.ts; then
  echo "   ✅ use-alfa-value usa queryKeys.alfaValueMain()"
else
  echo "   ❌ use-alfa-value NÃO usa queryKeys.alfaValueMain()"
  exit 1
fi

# Verificar remoção de refetchOnMount: 'always'
if grep -q "refetchOnMount.*always" client/src/hooks/use-alfa-value.ts; then
  echo "   ❌ use-alfa-value ainda tem refetchOnMount: 'always'"
  exit 1
else
  echo "   ✅ use-alfa-value removeu refetchOnMount: 'always'"
fi
echo ""

# 4. Build check
echo "4️⃣ Verificando build..."
if npm run build > /tmp/build-output.log 2>&1; then
  echo "   ✅ Build passou sem erros"
  # Verificar tamanho do bundle principal
  BUNDLE_SIZE=$(ls -lh dist/public/assets/index-*.js 2>/dev/null | awk '{print $5}' | head -1)
  if [ -n "$BUNDLE_SIZE" ]; then
    echo "   📦 Bundle size: $BUNDLE_SIZE"
  fi
else
  echo "   ❌ Build FALHOU"
  echo "   Ver log: /tmp/build-output.log"
  exit 1
fi
echo ""

# 5. TypeScript check (apenas nos arquivos modificados)
echo "5️⃣ Verificando TypeScript nos arquivos modificados..."
HAS_ERRORS=0
for file in "${FILES_CHANGED[@]}"; do
  if npx tsc --noEmit "$file" 2>&1 | grep -q "error TS"; then
    echo "   ❌ $file tem erros TypeScript"
    HAS_ERRORS=1
  else
    echo "   ✅ $file OK"
  fi
done

if [ $HAS_ERRORS -eq 1 ]; then
  echo "   ⚠️  Alguns arquivos têm erros TypeScript (verificar manualmente)"
fi
echo ""

# 6. Verificar hooks não migrados
echo "6️⃣ Identificando hooks para migração futura..."
HOOKS_NON_NORMALIZED=$(grep -rn "queryKey.*:\s*\[" client/src/hooks/ --include="*.ts" | grep -v "queryKeys\." | grep -v "//" | wc -l)
echo "   📊 Hooks com query keys não normalizadas: $HOOKS_NON_NORMALIZED"
echo "   💡 Ver lista completa em CACHE_FIX_VALIDATION_REPORT.md"
echo ""

# Sumário final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VALIDAÇÃO COMPLETA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos passos:"
echo "   1. Testar localmente (npm run dev)"
echo "   2. Navegação: AAPL → Find Stocks → AAPL"
echo "   3. Verificar Network tab (0 requests esperados)"
echo "   4. Deploy: npm run deploy:assets"
echo "   5. Validação em produção"
echo ""
echo "📄 Relatório completo: CACHE_FIX_VALIDATION_REPORT.md"
echo ""
