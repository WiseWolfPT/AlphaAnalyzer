#!/bin/bash

# 🚀 Ship to Production - Git + Deploy
# Faz commit no Git E deploy para produção

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Ship to Production - Alfalyzer${NC}"
echo "===================================="
echo ""

# 1. Check Git status
echo -e "${YELLOW}📊 Verificando mudanças...${NC}"
git status --short

# 2. Ask for commit message
echo ""
echo -e "${YELLOW}💬 Mensagem do commit:${NC}"
read -p "> " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="chore: update and deploy to production"
fi

# 3. Git operations
echo ""
echo -e "${YELLOW}📝 Salvando no Git...${NC}"
git add .
git commit -m "$commit_msg" || echo "Nada para commitar"
git push origin phase-0-main || echo "Push falhou (talvez já esteja atualizado)"

# 4. Build
echo ""
echo -e "${YELLOW}🔨 Building...${NC}"
npm run build

# 5. Deploy
echo ""
echo -e "${YELLOW}🚀 Deploying to Hetzner...${NC}"
rsync -avz --delete dist/ root@128.140.45.28:"/home/teste 1/dist/"
ssh root@128.140.45.28 "cd '/home/teste 1' && pm2 restart alfalyzer"

# 6. Verify
echo ""
echo -e "${YELLOW}✅ Verificando...${NC}"
sleep 3
response=$(curl -s -o /dev/null -w "%{http_code}" https://128.140.45.28.sslip.io/)

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Deploy completo e site funcionando!${NC}"
    echo ""
    echo "📝 Git: Commit '$commit_msg' enviado"
    echo "🌐 Site: https://128.140.45.28.sslip.io/"
    echo ""
    echo -e "${GREEN}🎉 SUCESSO TOTAL!${NC}"
else
    echo -e "${RED}⚠️  Site retornou código: $response${NC}"
fi

echo "===================================="