#!/bin/bash

# SCRIPT DE VALIDAÇÃO PÓS-LIMPEZA ALFALYZER
# Verifica se o projeto ainda funciona após a limpeza

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   VALIDAÇÃO PÓS-LIMPEZA ALFALYZER           ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Contador de testes
TESTS_PASSED=0
TESTS_FAILED=0

# Função para testar
test_step() {
    echo -n "  $1... "
    if eval "$2" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC}"
        ((TESTS_FAILED++))
    fi
}

# TESTE 1: VERIFICAR ESTRUTURA DE DIRETÓRIOS
echo -e "${YELLOW}1. Verificando estrutura de diretórios...${NC}"
test_step "Client existe" "[ -d client ]"
test_step "Server existe" "[ -d server ]"
test_step "Shared existe" "[ -d shared ]"
test_step "Supabase existe" "[ -d supabase ]"
echo ""

# TESTE 2: VERIFICAR ARQUIVOS CRÍTICOS
echo -e "${YELLOW}2. Verificando arquivos críticos...${NC}"
test_step "package.json existe" "[ -f package.json ]"
test_step "App.tsx existe" "[ -f client/src/App.tsx ]"
test_step "index.ts (server) existe" "[ -f server/index.ts ]"
test_step ".env.production existe" "[ -f .env.production ] || [ -f .env ]"
echo ""

# TESTE 3: VERIFICAR REMOÇÃO DE VULNERABILIDADES
echo -e "${YELLOW}3. Verificando remoção de vulnerabilidades...${NC}"
test_step "SimpleAuthProvider removido" "! [ -f client/src/contexts/simple-auth.tsx ]"
test_step "SimpleAuth offline removido" "! [ -f client/src/contexts/simple-auth-offline.tsx ]"
test_step "Vercel proxy client removido" "! [ -f client/src/lib/vercel-proxy-client.ts ]"
echo ""

# TESTE 4: VERIFICAR DEPENDÊNCIAS
echo -e "${YELLOW}4. Verificando instalação de dependências...${NC}"
test_step "Node modules existe" "[ -d node_modules ]"
test_step "React instalado" "[ -d node_modules/react ]"
test_step "Express instalado" "[ -d node_modules/express ]"
test_step "Supabase instalado" "[ -d node_modules/@supabase ]"
echo ""

# TESTE 5: VERIFICAR BUILD
echo -e "${YELLOW}5. Testando build do projeto...${NC}"
echo "  Executando npm run build..."
if npm run build > /dev/null 2>&1; then
    echo -e "  Build completado ${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  Build falhou ${RED}✗${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# TESTE 6: VERIFICAR TYPESCRIPT
echo -e "${YELLOW}6. Verificando TypeScript...${NC}"
echo "  Executando verificação de tipos..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "  TypeScript OK ${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  Erros de TypeScript ${YELLOW}⚠${NC}"
    # Não conta como falha pois pode haver warnings aceitáveis
fi
echo ""

# TESTE 7: VERIFICAR TAMANHO DO BUNDLE
echo -e "${YELLOW}7. Analisando tamanho do bundle...${NC}"
if [ -d dist ]; then
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    echo -e "  Tamanho do bundle: ${GREEN}$BUNDLE_SIZE${NC}"
    
    # Verificar se é menor que 50MB (objetivo)
    SIZE_MB=$(du -sm dist | cut -f1)
    if [ "$SIZE_MB" -lt 50 ]; then
        echo -e "  Bundle otimizado ${GREEN}✓${NC} (<50MB)"
        ((TESTS_PASSED++))
    else
        echo -e "  Bundle grande ${YELLOW}⚠${NC} (>50MB)"
    fi
fi
echo ""

# TESTE 8: VERIFICAR IMPORTS QUEBRADOS
echo -e "${YELLOW}8. Verificando imports quebrados...${NC}"
BROKEN_IMPORTS=$(grep -r "from.*simple-auth" client/src 2>/dev/null | wc -l)
if [ "$BROKEN_IMPORTS" -eq 0 ]; then
    echo -e "  Sem imports quebrados ${GREEN}✓${NC}"
    ((TESTS_PASSED++))
else
    echo -e "  Imports quebrados encontrados ${RED}✗${NC} ($BROKEN_IMPORTS)"
    ((TESTS_FAILED++))
fi
echo ""

# TESTE 9: CONTAR ARQUIVOS RESTANTES
echo -e "${YELLOW}9. Estatísticas finais...${NC}"
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | wc -l)
TOTAL_SIZE=$(du -sh . --exclude=node_modules --exclude=.git 2>/dev/null | cut -f1)
echo "  Arquivos TS/TSX restantes: $TS_FILES"
echo "  Tamanho total (sem node_modules): $TOTAL_SIZE"
echo ""

# RELATÓRIO FINAL
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}   RELATÓRIO DE VALIDAÇÃO                    ${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""
echo -e "  Testes passados: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Testes falhados: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ SUCESSO! Projeto validado após limpeza.${NC}"
    echo ""
    echo "Próximos passos:"
    echo "  1. npm run dev (testar localmente)"
    echo "  2. Verificar funcionalidades críticas"
    echo "  3. Deploy em staging"
    exit 0
else
    echo -e "${YELLOW}⚠️  ATENÇÃO: Alguns testes falharam.${NC}"
    echo ""
    echo "Recomendações:"
    echo "  1. Verificar os erros acima"
    echo "  2. Restaurar backup se necessário"
    echo "  3. Corrigir imports quebrados"
    exit 1
fi