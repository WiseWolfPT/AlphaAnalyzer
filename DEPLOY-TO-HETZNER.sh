#!/bin/bash

# ============================================
# 🚀 ALFALYZER - DEPLOYMENT COMPLETO HETZNER
# ============================================
# Este script faz o deployment completo no servidor Hetzner
# Executa todos os passos de segurança e configuração

set -e  # Para se houver erro

echo "🚀 ALFALYZER PRODUCTION DEPLOYMENT"
echo "==================================="
echo ""

# Verificações iniciais
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor executa como root: sudo ./DEPLOY-TO-HETZNER.sh"
    exit 1
fi

# Pedir confirmação do domínio
read -p "📌 Digite o domínio da API (ex: api.alfalyzer.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ Domínio é obrigatório!"
    exit 1
fi

read -p "📧 Digite o email para SSL (ex: admin@alfalyzer.com): " EMAIL
EMAIL=${EMAIL:-"admin@alfalyzer.com"}

echo ""
echo "Configuração:"
echo "• Domínio: $DOMAIN"
echo "• Email: $EMAIL"
echo ""
read -p "Continuar? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelado"
    exit 1
fi

# ============================================
# FASE 1: SISTEMA BASE
# ============================================
echo ""
echo "📦 FASE 1: Preparando sistema..."
echo "--------------------------------"

# Atualizar sistema
apt update
apt upgrade -y

# Instalar dependências essenciais
apt install -y curl git build-essential nginx certbot python3-certbot-nginx redis-server ufw nodejs npm

# ============================================
# FASE 2: FIREWALL
# ============================================
echo ""
echo "🔒 FASE 2: Configurando Firewall..."
echo "-----------------------------------"

ufw --force disable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 22/tcp
ufw allow http
ufw allow https
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow from 127.0.0.1 to any port 3001
ufw allow from 127.0.0.1 to any port 6379
ufw --force enable
ufw status

# ============================================
# FASE 3: REDIS
# ============================================
echo ""
echo "💾 FASE 3: Configurando Redis..."
echo "--------------------------------"

# Parar Redis
systemctl stop redis-server || true

# Configurar Redis
cat > /etc/redis/redis.conf <<'EOF'
bind 127.0.0.1 ::1
protected-mode yes
port 6379
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
appendonly no
EOF

# Permissões
chown redis:redis /etc/redis/redis.conf
chmod 640 /etc/redis/redis.conf
mkdir -p /var/lib/redis
chown redis:redis /var/lib/redis
chmod 750 /var/lib/redis

# Iniciar Redis
systemctl start redis-server
systemctl enable redis-server

# Testar Redis
redis-cli ping

# ============================================
# FASE 4: NGINX + SSL
# ============================================
echo ""
echo "🔐 FASE 4: Configurando Nginx + SSL..."
echo "--------------------------------------"

# Parar Nginx
systemctl stop nginx || true

# Criar configuração Nginx
cat > /etc/nginx/sites-available/alfalyzer <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    
    # SSL será adicionado pelo Certbot
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy para Node.js
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    location /api/health {
        proxy_pass http://127.0.0.1:3001/api/health;
        access_log off;
    }

    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    access_log /var/log/nginx/alfalyzer_access.log;
    error_log /var/log/nginx/alfalyzer_error.log;
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/alfalyzer /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Iniciar Nginx
systemctl start nginx
systemctl enable nginx

# Obter certificado SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Recarregar Nginx
systemctl reload nginx

# ============================================
# FASE 5: APLICAÇÃO
# ============================================
echo ""
echo "🚀 FASE 5: Instalando aplicação..."
echo "----------------------------------"

# Ir para diretório da app
cd /home/teste\ 1 || cd /root/teste\ 1 || { echo "❌ Diretório da app não encontrado!"; exit 1; }

# Verificar .env.production
if [ ! -f .env.production ]; then
    echo "⚠️ AVISO: .env.production não encontrado!"
    echo "Cria o ficheiro .env.production com todas as API keys"
    echo "Podes copiar de .env.production.example"
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build do frontend
echo "🔨 Building frontend..."
npm run build

# Instalar PM2 globalmente
npm install -g pm2

# Configurar PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Iniciar aplicação
echo "▶️ Iniciando aplicação..."
pm2 stop all || true
pm2 delete all || true
pm2 start ecosystem.config.cjs --env production

# Salvar configuração PM2
pm2 save

# Configurar auto-start
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# ============================================
# FASE 6: BACKUPS
# ============================================
echo ""
echo "💾 FASE 6: Configurando backups..."
echo "----------------------------------"

# Criar diretório de backups
mkdir -p /root/backups

# Criar script de backup
cat > /root/backup.sh <<'EOF'
#!/bin/bash
TIMESTAMP=$(date +"%F-%H%M")
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup Redis
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Backup env
cp /home/teste\ 1/.env.production $BACKUP_DIR/env_$TIMESTAMP.env 2>/dev/null || \
cp /root/teste\ 1/.env.production $BACKUP_DIR/env_$TIMESTAMP.env 2>/dev/null

# Limpar backups antigos (manter 7 dias)
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
find $BACKUP_DIR -name "*.env" -mtime +7 -delete

echo "✅ Backup completo: $(date)"
EOF

chmod +x /root/backup.sh

# Adicionar ao crontab
(crontab -l 2>/dev/null | grep -v "/root/backup.sh"; echo "0 3 * * * /root/backup.sh >> /root/backups/cron.log 2>&1") | crontab -

# Executar backup inicial
/root/backup.sh

# ============================================
# FASE 7: TESTE FINAL
# ============================================
echo ""
echo "🧪 FASE 7: Testando sistema..."
echo "------------------------------"

# Esperar aplicação iniciar
sleep 10

# Status dos serviços
echo "📊 Status dos serviços:"
systemctl is-active nginx && echo "✅ Nginx: OK" || echo "❌ Nginx: FALHOU"
systemctl is-active redis-server && echo "✅ Redis: OK" || echo "❌ Redis: FALHOU"
pm2 status

# Teste de conectividade
echo ""
echo "🔍 Testando endpoints:"

# Health check
if curl -s -f https://$DOMAIN/api/health > /dev/null; then
    echo "✅ Health check: OK"
else
    echo "❌ Health check: FALHOU"
fi

# Redis
if redis-cli ping | grep -q PONG; then
    echo "✅ Redis: OK"
else
    echo "❌ Redis: FALHOU"
fi

# ============================================
# FINALIZAÇÃO
# ============================================
echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETO!"
echo "============================================"
echo ""
echo "📋 INFORMAÇÕES IMPORTANTES:"
echo "• API URL: https://$DOMAIN"
echo "• PM2 Dashboard: pm2 monit"
echo "• Logs: pm2 logs alfalyzer"
echo "• Restart: pm2 restart alfalyzer"
echo "• Status: pm2 status"
echo ""
echo "🔒 SEGURANÇA:"
echo "• Firewall: ✅ Ativo"
echo "• HTTPS: ✅ Configurado"
echo "• Redis: ✅ Protegido (localhost only)"
echo "• Backups: ✅ Diários às 3AM"
echo ""
echo "⚠️ PRÓXIMOS PASSOS:"
echo "1. Configura UptimeRobot em https://uptimerobot.com"
echo "2. Testa o frontend em https://alfalyzer.com"
echo "3. Monitoriza logs: pm2 logs --lines 100"
echo ""
echo "🚀 Sistema pronto para produção!"