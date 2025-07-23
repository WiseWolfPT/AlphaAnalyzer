#!/bin/bash

# Script de checklist para resolver erro 401 no Vercel
# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔍 CHECKLIST: Erro 401 no Vercel${NC}"
echo "========================================"
echo ""

# 1. Verificar se Vercel CLI está instalado
echo -e "${BLUE}1. Verificando Vercel CLI...${NC}"
if command -v vercel &> /dev/null; then
    echo -e "   ${GREEN}✅ Vercel CLI instalado${NC}"
    VERCEL_VERSION=$(vercel --version)
    echo -e "   ${GREEN}   Versão: $VERCEL_VERSION${NC}"
else
    echo -e "   ${RED}❌ Vercel CLI não instalado${NC}"
    echo -e "   ${YELLOW}   Execute: npm i -g vercel${NC}"
    exit 1
fi

# 2. Verificar autenticação
echo -e "\n${BLUE}2. Verificando autenticação...${NC}"
VERCEL_USER=$(vercel whoami 2>&1)
if [[ $VERCEL_USER == *"Error"* ]] || [[ $VERCEL_USER == *"not logged"* ]]; then
    echo -e "   ${RED}❌ Não autenticado no Vercel${NC}"
    echo -e "   ${YELLOW}   Execute: vercel login${NC}"
    exit 1
else
    echo -e "   ${GREEN}✅ Autenticado como: $VERCEL_USER${NC}"
fi

# 3. Verificar variáveis problemáticas
echo -e "\n${BLUE}3. Verificando variáveis de ambiente...${NC}"
VERCEL_ENV=$(vercel env ls 2>&1)

if echo "$VERCEL_ENV" | grep -q "VITE_API_URL"; then
    echo -e "   ${RED}❌ VITE_API_URL encontrada!${NC}"
    echo -e "   ${YELLOW}   Esta variável causa o erro 401${NC}"
    echo -e "   ${YELLOW}   Execute: npm run fix:vercel-env${NC}"
    PROBLEM_FOUND=true
else
    echo -e "   ${GREEN}✅ VITE_API_URL não encontrada (bom!)${NC}"
fi

if echo "$VERCEL_ENV" | grep -q "VITE_BACKEND_URL"; then
    echo -e "   ${RED}❌ VITE_BACKEND_URL encontrada!${NC}"
    echo -e "   ${YELLOW}   Esta variável também pode causar problemas${NC}"
    PROBLEM_FOUND=true
else
    echo -e "   ${GREEN}✅ VITE_BACKEND_URL não encontrada (bom!)${NC}"
fi

# 4. Verificar configuração do código
echo -e "\n${BLUE}4. Verificando configuração do código...${NC}"
MARKET_DATA_FILE="client/src/services/market-data-client.ts"
if [ -f "$MARKET_DATA_FILE" ]; then
    if grep -q "typeof window !== 'undefined' ? ''" "$MARKET_DATA_FILE"; then
        echo -e "   ${GREEN}✅ market-data-client.ts configurado corretamente${NC}"
        echo -e "   ${GREEN}   Usa URLs relativas quando VITE_API_URL não existe${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Verifique market-data-client.ts${NC}"
    fi
else
    echo -e "   ${RED}❌ Arquivo market-data-client.ts não encontrado${NC}"
fi

# 5. Verificar vercel.json
echo -e "\n${BLUE}5. Verificando vercel.json...${NC}"
if [ -f "vercel.json" ]; then
    if grep -q "rewrites" "vercel.json"; then
        echo -e "   ${GREEN}✅ vercel.json tem rewrites configurado${NC}"
        if grep -q '"/api/\*"' "vercel.json"; then
            echo -e "   ${GREEN}✅ Proxy /api/* configurado${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Proxy /api/* não encontrado${NC}"
        fi
    else
        echo -e "   ${RED}❌ vercel.json sem rewrites${NC}"
    fi
else
    echo -e "   ${RED}❌ vercel.json não encontrado${NC}"
fi

# Resumo final
echo -e "\n${CYAN}📊 RESUMO${NC}"
echo "========================================"

if [ "$PROBLEM_FOUND" = true ]; then
    echo -e "${RED}❌ PROBLEMAS ENCONTRADOS!${NC}"
    echo ""
    echo -e "${YELLOW}SOLUÇÃO RÁPIDA:${NC}"
    echo -e "1. Execute: ${GREEN}npm run fix:401${NC}"
    echo -e "2. Aguarde conclusão"
    echo -e "3. O script irá:"
    echo -e "   - Remover VITE_API_URL do Vercel"
    echo -e "   - Verificar se foi removida"
    echo -e "   - Instruir sobre o deploy"
    echo ""
    echo -e "${YELLOW}SOLUÇÃO MANUAL:${NC}"
    echo -e "1. ${GREEN}vercel env rm VITE_API_URL production --yes${NC}"
    echo -e "2. ${GREEN}vercel env rm VITE_API_URL preview --yes${NC}"
    echo -e "3. ${GREEN}vercel env rm VITE_API_URL development --yes${NC}"
    echo -e "4. ${GREEN}vercel --prod${NC}"
else
    echo -e "${GREEN}✅ TUDO CERTO!${NC}"
    echo ""
    echo -e "Configuração está correta para usar o proxy do Vercel."
    echo -e "Se ainda tiver erro 401:"
    echo -e "1. Faça um novo deploy: ${GREEN}vercel --prod${NC}"
    echo -e "2. Limpe o cache do browser"
    echo -e "3. Verifique se o backend está rodando no Koyeb"
fi

echo ""
echo -e "${CYAN}🔗 Links úteis:${NC}"
echo -e "- Dashboard Vercel: https://vercel.com/dashboard"
echo -e "- Documentação: docs/FIX-VERCEL-401-ERROR.md"
echo ""