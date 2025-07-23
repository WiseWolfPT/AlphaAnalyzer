#!/bin/bash

# Script para instalar dependências necessárias para os testes 401

echo "📦 Instalando dependências para testes 401..."
echo "========================================="

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Instala dependências de desenvolvimento necessárias
echo -e "\n${BLUE}Instalando dependências de teste...${NC}"

# Playwright para E2E
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo -e "${YELLOW}Instalando Playwright...${NC}"
    npm install -D @playwright/test
    npx playwright install chromium
    echo -e "${GREEN}✅ Playwright instalado${NC}"
else
    echo -e "${GREEN}✅ Playwright já instalado${NC}"
fi

# Outras dependências necessárias
deps=(
    "chalk"
    "ora"
    "@vercel/sdk"
    "dotenv"
    "tsx"
)

for dep in "${deps[@]}"; do
    if ! npm list $dep > /dev/null 2>&1; then
        echo -e "${YELLOW}Instalando $dep...${NC}"
        npm install -D $dep
        echo -e "${GREEN}✅ $dep instalado${NC}"
    else
        echo -e "${GREEN}✅ $dep já instalado${NC}"
    fi
done

# Cria diretório de resultados
mkdir -p test-results

echo -e "\n${GREEN}✨ Todas as dependências instaladas!${NC}"
echo -e "\n${BLUE}Agora você pode executar:${NC}"
echo "  npm run test:401        # Executa todos os testes"
echo "  npm run test:401:ts     # Executa suite TypeScript"
echo "  npm run test:401:e2e    # Executa testes E2E"
echo "  npm run test:401:dashboard # Abre dashboard visual"