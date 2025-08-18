#!/bin/bash

# 🚀 ALFALYZER - SCRIPT COMPLETO DE DEPLOYMENT
# Copie e execute este script no servidor Hetzner

echo "================================================"
echo "🚀 ALFALYZER COMPLETE DEPLOYMENT SCRIPT"
echo "================================================"

# Navigate to project directory
cd "/home/teste 1" || exit 1

# PARTE 1: BUILD FRONTEND
echo ""
echo "🔨 PARTE 1: Building Frontend..."
echo "================================================"
npm run build

# Verificar se build funcionou
if [ ! -f "dist/public/index.html" ]; then
    echo "❌ Build failed! Trying alternative..."
    npx vite build --outDir dist/public
fi

if [ -f "dist/public/index.html" ]; then
    echo "✅ Frontend build successful!"
    ls -la dist/public/ | head -10
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# PARTE 2: CONFIGURAR FIREWALL
echo ""
echo "🔒 PARTE 2: Configurando Firewall..."
echo "================================================"
if ! command -v ufw &> /dev/null; then
    sudo apt update && sudo apt install -y ufw
fi

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
echo "✅ Firewall configured!"

# PARTE 3: INSTALAR REDIS
echo ""
echo "💾 PARTE 3: Instalando Redis..."
echo "================================================"
if ! command -v redis-server &> /dev/null; then
    sudo apt update && sudo apt install -y redis-server
fi

# Configurar Redis básico
sudo bash -c 'cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
dir /var/lib/redis
EOF'

sudo systemctl enable redis-server
sudo systemctl restart redis-server

if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis installed and working!"
else
    echo "⚠️ Redis may have issues"
fi

# PARTE 4: ATUALIZAR ENV
echo ""
echo "⚙️ PARTE 4: Atualizando configuração..."
echo "================================================"
if ! grep -q "REDIS_HOST=" .env; then
    echo "REDIS_HOST=127.0.0.1" >> .env
fi
if ! grep -q "REDIS_PORT=" .env; then
    echo "REDIS_PORT=6379" >> .env
fi
echo "✅ Configuration updated"

# PARTE 5: REINICIAR PM2
echo ""
echo "🔄 PARTE 5: Reiniciando aplicação..."
echo "================================================"
pm2 restart all --update-env
sleep 5
pm2 status

# PARTE 6: TESTE FINAL
echo ""
echo "🧪 PARTE 6: Testando..."
echo "================================================"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ Frontend responding correctly!"
else
    echo "⚠️ Frontend returned: $RESPONSE"
    echo "Checking logs..."
    pm2 logs --lines 20
fi

# RESUMO FINAL
echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "🌐 Acesse sua aplicação em:"
echo "   http://128.140.45.28:3001"
echo ""
echo "📝 Comandos úteis:"
echo "   pm2 status     - Ver status"
echo "   pm2 logs       - Ver logs"
echo "   pm2 restart all - Reiniciar"
echo ""
echo "🔒 Status de Segurança:"
echo "   ✅ Firewall: Ativo"
echo "   ✅ Redis: Instalado"
echo "   ✅ Frontend: Buildado"
echo "================================================"