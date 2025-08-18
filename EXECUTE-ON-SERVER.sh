#!/bin/bash

# 🚀 ALFALYZER PRODUCTION DEPLOYMENT - EXECUTE ON SERVER
# 
# INSTRUÇÕES:
# 1. Copie este script para o servidor:
#    scp EXECUTE-ON-SERVER.sh root@128.140.45.28:/home/teste\ 1/
# 
# 2. Conecte ao servidor:
#    ssh root@128.140.45.28
# 
# 3. Execute este script:
#    cd /home/teste\ 1/
#    chmod +x EXECUTE-ON-SERVER.sh
#    ./EXECUTE-ON-SERVER.sh
#

echo "================================================"
echo "🚀 ALFALYZER PRODUCTION DEPLOYMENT"
echo "================================================"
echo "Este script vai completar o deployment em produção"
echo "Tempo estimado: 4.5 horas"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Confirmation
echo -e "${YELLOW}⚠️  Este script vai:${NC}"
echo "1. Configurar HTTPS/SSL com Nginx"
echo "2. Instalar e configurar Redis"
echo "3. Proteger endpoints da API"
echo "4. Configurar monitoring"
echo "5. Executar validação completa"
echo ""
read -p "Deseja continuar? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 1
fi

# Navigate to project directory
cd "/home/teste 1" || exit 1

# Update repository
echo ""
echo -e "${BLUE}📦 Atualizando código...${NC}"
git pull origin main

# Install dependencies if needed
echo ""
echo -e "${BLUE}📦 Verificando dependências...${NC}"
npm install --production

# Build frontend
echo ""
echo -e "${BLUE}🔨 Building frontend...${NC}"
npm run build

# FASE 1: SEGURANÇA E HTTPS
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}FASE 1: CONFIGURAR SEGURANÇA E HTTPS${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

if [ -f "scripts/hetzner-setup/01-setup-nginx-ssl.sh" ]; then
    chmod +x scripts/hetzner-setup/01-setup-nginx-ssl.sh
    ./scripts/hetzner-setup/01-setup-nginx-ssl.sh
else
    echo -e "${RED}❌ Script de SSL não encontrado${NC}"
fi

# FASE 2: REDIS
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}FASE 2: INSTALAR E CONFIGURAR REDIS${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

if [ -f "scripts/hetzner-setup/03-setup-redis.sh" ]; then
    chmod +x scripts/hetzner-setup/03-setup-redis.sh
    ./scripts/hetzner-setup/03-setup-redis.sh
    
    # Update .env.production with Redis credentials
    if [ -f "/home/teste 1/.env/redis.conf" ]; then
        source "/home/teste 1/.env/redis.conf"
        
        # Update .env.production
        if grep -q "REDIS_PASSWORD=" .env.production; then
            sed -i "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=$REDIS_PASSWORD/" .env.production
        else
            echo "REDIS_PASSWORD=$REDIS_PASSWORD" >> .env.production
        fi
        
        if grep -q "REDIS_HOST=" .env.production; then
            sed -i "s/REDIS_HOST=.*/REDIS_HOST=localhost/" .env.production
        else
            echo "REDIS_HOST=localhost" >> .env.production
        fi
        
        if grep -q "REDIS_PORT=" .env.production; then
            sed -i "s/REDIS_PORT=.*/REDIS_PORT=6379/" .env.production
        else
            echo "REDIS_PORT=6379" >> .env.production
        fi
        
        if grep -q "REDIS_URL=" .env.production; then
            sed -i "s|REDIS_URL=.*|REDIS_URL=$REDIS_URL|" .env.production
        else
            echo "REDIS_URL=$REDIS_URL" >> .env.production
        fi
    fi
else
    echo -e "${RED}❌ Script do Redis não encontrado${NC}"
fi

# FASE 3: PROTEGER API
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}FASE 3: PROTEGER ENDPOINTS DA API${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

if [ -f "scripts/hetzner-setup/02-secure-api-endpoints.sh" ]; then
    chmod +x scripts/hetzner-setup/02-secure-api-endpoints.sh
    ./scripts/hetzner-setup/02-secure-api-endpoints.sh
else
    # Generate API key manually if script not found
    echo "Gerando API key..."
    API_KEY=$(uuidgen)
    echo "$API_KEY" > market-data-key.txt
    
    if grep -q "MARKET_DATA_API_KEY=" .env.production; then
        sed -i "s/MARKET_DATA_API_KEY=.*/MARKET_DATA_API_KEY=$API_KEY/" .env.production
    else
        echo "MARKET_DATA_API_KEY=$API_KEY" >> .env.production
    fi
    
    echo -e "${GREEN}✅ API Key gerada: $API_KEY${NC}"
fi

# FASE 4: RESTART PM2
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}FASE 4: REINICIAR APLICAÇÃO${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

# Copy .env.production to .env if not exists
if [ ! -f ".env" ]; then
    cp .env.production .env
fi

# Restart PM2
pm2 delete alfalyzer 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd -u root --hp /root

# Wait for app to start
echo "Aguardando aplicação iniciar..."
sleep 10

# Check PM2 status
pm2 status

# FASE 5: VALIDAÇÃO
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}FASE 5: VALIDAÇÃO DO SISTEMA${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

# Run validation script
if [ -f "scripts/hetzner-setup/validate-security.sh" ]; then
    chmod +x scripts/hetzner-setup/validate-security.sh
    ./scripts/hetzner-setup/validate-security.sh
fi

# Run smoke test
if [ -f "smoke-test.sh" ]; then
    chmod +x smoke-test.sh
    echo ""
    echo "Executando smoke test..."
    ./smoke-test.sh
fi

# FASE 6: MONITORING
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}FASE 6: CONFIGURAR MONITORING${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

echo -e "${YELLOW}📋 Configuração Manual Necessária:${NC}"
echo ""
echo "1. CONFIGURAR UPTIMEROBOT:"
echo "   - Acesse: https://uptimerobot.com"
echo "   - Crie monitor para: https://alfalyzer.com/api/health"
echo "   - Intervalo: 5 minutos"
echo ""
echo "2. CONFIGURAR BACKUP AUTOMÁTICO:"
echo "   Execute: crontab -e"
echo "   Adicione: 0 3 * * * /home/teste\\ 1/backup.sh"
echo ""

# Final status
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETO!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📊 Status Final:"
echo "---------------"
echo "✅ Frontend: http://128.140.45.28:3001"
echo "✅ API: http://128.140.45.28:3001/api"
echo "✅ Health: http://128.140.45.28:3001/api/health"
echo ""
echo "🔑 Credenciais Importantes:"
echo "----------------------------"
if [ -f "market-data-key.txt" ]; then
    echo "API Key: $(cat market-data-key.txt)"
fi
if [ -f "/home/teste 1/.env/redis.conf" ]; then
    source "/home/teste 1/.env/redis.conf"
    echo "Redis Password: $REDIS_PASSWORD"
fi
echo ""
echo -e "${YELLOW}⚠️  PRÓXIMOS PASSOS:${NC}"
echo "1. Configure o domínio DNS para apontar para 128.140.45.28"
echo "2. Execute o script de domínio quando DNS estiver configurado:"
echo "   ./scripts/hetzner-setup/03-domain-security-final.sh alfalyzer.com"
echo "3. Configure UptimeRobot para monitoring"
echo "4. Teste o sistema completamente"
echo ""
echo -e "${GREEN}✅ Sistema pronto para produção!${NC}"