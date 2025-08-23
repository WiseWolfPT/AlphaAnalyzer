#!/bin/bash

# Script para configurar Nginx e SSL para Alfalyzer
# Executar no servidor como root

set -e

echo "=== Configurando Nginx para Alfalyzer ==="

# 1. Criar configuração do Nginx
cat > /etc/nginx/sites-available/alfalyzer << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name alfalyzer.com www.alfalyzer.com 128.140.45.28;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/alfalyzer.access.log;
    error_log /var/log/nginx/alfalyzer.error.log;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API specific settings
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key" always;
        
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/api/health;
        access_log off;
    }
}
EOF

# 2. Remover default site se existir
rm -f /etc/nginx/sites-enabled/default

# 3. Ativar o site
ln -sf /etc/nginx/sites-available/alfalyzer /etc/nginx/sites-enabled/

# 4. Testar configuração
echo "Testando configuração do Nginx..."
nginx -t

# 5. Recarregar Nginx
echo "Recarregando Nginx..."
systemctl reload nginx

echo "=== Nginx configurado com sucesso ==="
echo ""
echo "Testando endpoints:"
echo "- http://128.140.45.28/ (via Nginx)"
echo "- http://128.140.45.28/api/health"
echo ""

# 6. Testar endpoints
echo "Teste 1: Homepage via Nginx (porta 80):"
curl -s -o /dev/null -w "%{http_code}" http://128.140.45.28/
echo ""

echo "Teste 2: Health endpoint:"
curl -s http://128.140.45.28/api/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Status: {data['status']}, Redis: {data['services']['redis']}, FMP: {data['services']['apis']['fmp']}\")"
echo ""

echo "=== Próximos passos ==="
echo "1. Configurar DNS: alfalyzer.com → 128.140.45.28"
echo "2. Depois do DNS propagado, executar:"
echo "   certbot --nginx -d alfalyzer.com -d www.alfalyzer.com"
echo ""
echo "Para testar agora sem DNS, acesse:"
echo "http://128.140.45.28/"