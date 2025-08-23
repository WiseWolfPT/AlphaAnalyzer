#!/bin/bash

echo "🔧 REDIS PRODUCTION FIX - FASE 1"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar status atual do Redis
echo "📊 Verificando status atual do Redis..."
if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✓ Redis está rodando${NC}"
    systemctl status redis-server --no-pager | head -10
else
    echo -e "${RED}✗ Redis não está rodando${NC}"
    
    # 2. Instalar Redis se necessário
    echo ""
    echo "📦 Instalando Redis..."
    apt update
    apt install -y redis-server
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Redis instalado com sucesso${NC}"
    else
        echo -e "${RED}✗ Erro ao instalar Redis${NC}"
        exit 1
    fi
fi

# 3. Configurar Redis
echo ""
echo "⚙️ Configurando Redis..."

# Backup da configuração original
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup.$(date +%Y%m%d_%H%M%S)

# Gerar senha segura
REDIS_PASSWORD=$(openssl rand -base64 32)
echo ""
echo -e "${YELLOW}📝 Redis Password gerada: ${REDIS_PASSWORD}${NC}"
echo ""

# Aplicar configurações
cat > /etc/redis/redis.conf.custom << EOF
# Alfalyzer Redis Configuration
bind 127.0.0.1 ::1
port 6379
requirepass ${REDIS_PASSWORD}
maxmemory 256mb
maxmemory-policy allkeys-lru
supervised systemd
dir /var/lib/redis
logfile /var/log/redis/redis-server.log
EOF

# Mesclar com configuração existente
cat /etc/redis/redis.conf.custom >> /etc/redis/redis.conf

# 4. Reiniciar Redis
echo "🔄 Reiniciando Redis..."
systemctl restart redis-server
systemctl enable redis-server

# Verificar se está rodando
sleep 2
if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✓ Redis reiniciado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao reiniciar Redis${NC}"
    journalctl -u redis-server -n 20 --no-pager
    exit 1
fi

# 5. Testar conexão com senha
echo ""
echo "🧪 Testando conexão Redis..."
redis-cli -a "${REDIS_PASSWORD}" ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Conexão Redis OK${NC}"
else
    echo -e "${RED}✗ Erro na conexão Redis${NC}"
    exit 1
fi

# 6. Atualizar .env.production
echo ""
echo "📝 Atualizando .env.production..."

ENV_FILE="/home/teste 1/.env.production"

# Remover linhas antigas do Redis se existirem
sed -i '/^REDIS_/d' "$ENV_FILE"

# Adicionar novas configurações
cat >> "$ENV_FILE" << EOF

# Redis Configuration (Updated $(date))
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
EOF

echo -e "${GREEN}✓ .env.production atualizado${NC}"

# 7. Reiniciar PM2
echo ""
echo "🔄 Reiniciando PM2..."
cd "/home/teste 1"

# Recarregar variáveis de ambiente e reiniciar
pm2 restart alfalyzer --update-env

# 8. Verificar logs
echo ""
echo "📋 Últimas linhas do log PM2:"
pm2 logs alfalyzer --lines 10 --nostream

# 9. Testar health endpoint
echo ""
echo "🏥 Testando health endpoint..."
sleep 5

HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Health endpoint retornando 200 OK!${NC}"
    curl -s http://localhost:3001/api/health | python3 -m json.tool
else
    echo -e "${RED}✗ Health endpoint retornando: $HEALTH_RESPONSE${NC}"
    echo "Verificando logs para diagnóstico..."
    pm2 logs alfalyzer --lines 20 --nostream
fi

echo ""
echo "================================"
echo "📊 RESUMO FINAL:"
echo "================================"
echo ""
echo "Redis Status: $(systemctl is-active redis-server)"
echo "Redis Port: 6379"
echo "Redis Password: ${REDIS_PASSWORD}"
echo "Health Endpoint: http://localhost:3001/api/health (Status: $HEALTH_RESPONSE)"
echo ""
echo -e "${YELLOW}⚠️ IMPORTANTE: Guarde a senha do Redis em local seguro!${NC}"
echo ""
echo "✅ Script concluído!"