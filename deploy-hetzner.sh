#!/bin/bash

# Script de Deploy Simplificado para Servidor Hetzner
# Alfalyzer Production Deployment

set -e  # Exit on error

echo "🚀 Deploy Alfalyzer para Produção"
echo "=================================="

# Configurações
SERVER_IP="128.140.45.28"
SERVER_USER="root"
SERVER_ALIAS="hetzner"  # Use SSH config alias
REMOTE_DIR="/home/teste 1"
LOCAL_BUILD_DIR="client/dist/public"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Verificando build local...${NC}"
if [ ! -d "$LOCAL_BUILD_DIR" ]; then
    echo -e "${RED}❌ Build não encontrado! Execute 'npm run build' primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build encontrado${NC}"

echo -e "${YELLOW}🔄 Fazendo backup remoto...${NC}"
ssh ${SERVER_ALIAS} << 'EOF'
    cd "/home/teste 1"
    if [ -d "dist/public" ]; then
        rm -rf dist.backup
        cp -r dist dist.backup
        echo "✅ Backup criado: dist.backup"
    fi
EOF

echo -e "${YELLOW}📤 Enviando arquivos para o servidor...${NC}"
# Criar arquivo tar para transfer mais rápido
tar -czf dist.tar.gz -C client/dist/public .
scp dist.tar.gz ${SERVER_ALIAS}:"${REMOTE_DIR}/"
rm dist.tar.gz

echo -e "${YELLOW}📂 Extraindo arquivos no servidor...${NC}"
ssh ${SERVER_ALIAS} << 'EOF'
    cd "/home/teste 1"
    rm -rf dist/public
    mkdir -p dist/public
    tar -xzf dist.tar.gz -C dist/public
    rm dist.tar.gz
    
    # Garantir que index.html existe
    if [ ! -f "dist/public/index.html" ]; then
        echo "⚠️  AVISO: index.html não encontrado!"
    else
        echo "✅ index.html presente"
    fi
    
    # Listar arquivos principais
    echo "📁 Arquivos principais:"
    ls -la dist/public/ | head -10
EOF

echo -e "${YELLOW}🔄 Reiniciando aplicação com PM2...${NC}"
ssh ${SERVER_ALIAS} << 'EOF'
    cd "/home/teste 1"
    pm2 restart alfalyzer --update-env
    sleep 3
    pm2 status alfalyzer
EOF

echo -e "${YELLOW}🏥 Verificando saúde da aplicação...${NC}"
sleep 5  # Aguardar inicialização

# Testar endpoints
echo "Testando HTTPS..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://128.140.45.28.sslip.io/ || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Site respondendo corretamente (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  Site retornou HTTP $HTTP_STATUS${NC}"
fi

# Testar API
echo "Testando API..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://128.140.45.28.sslip.io/api/health || echo "000")

if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API respondendo corretamente${NC}"
else
    echo -e "${YELLOW}⚠️  API retornou HTTP $API_STATUS${NC}"
fi

echo -e "${GREEN}🎉 Deploy concluído!${NC}"
echo ""
echo "📋 Resumo:"
echo "  🌐 URL: https://128.140.45.28.sslip.io/"
echo "  🔧 API: https://128.140.45.28.sslip.io/api/health"
echo ""
echo "💡 Comandos úteis:"
echo "  SSH: ssh root@${SERVER_IP}"
echo "  Logs: ssh root@${SERVER_IP} 'pm2 logs alfalyzer --lines 50'"
echo "  Status: ssh root@${SERVER_IP} 'pm2 status'"
echo ""
echo "🔄 Para reverter (se necessário):"
echo "  ssh root@${SERVER_IP} 'cd /home/teste\\ 1 && rm -rf dist && mv dist.backup dist && pm2 restart alfalyzer'"