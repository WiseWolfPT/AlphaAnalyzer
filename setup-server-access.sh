#!/bin/bash

# Script para configurar acesso do Claude ao servidor
# Execute este script NO SERVIDOR como root

echo "🔧 Configurando acesso para Claude..."
echo "======================================"

# Criar diretório de trabalho se não existir
mkdir -p /home/claude-workspace
cd /home/claude-workspace

# Criar script de identificação
cat > /home/claude-workspace/claude-access.txt << 'EOF'
CLAUDE_ACCESS_ENABLED=true
SERVER_IP=128.140.45.28
PROJECT_PATH=/home/teste 1
TIMESTAMP=$(date)
EOF

# Criar link simbólico para o projeto
ln -sf "/home/teste 1" /home/claude-workspace/alfalyzer

# Criar script helper para comandos
cat > /home/claude-workspace/run.sh << 'EOF'
#!/bin/bash
# Helper script para Claude executar comandos

cd "/home/teste 1"

case "$1" in
    status)
        echo "📊 Status do Sistema:"
        echo "===================="
        pm2 status
        echo ""
        echo "🔍 Últimos logs:"
        pm2 logs alfalyzer --lines 10 --nostream
        ;;
    
    deploy-frontend)
        echo "📦 Deploying frontend..."
        if [ -d "/tmp/claude-deploy/dist" ]; then
            rm -rf dist.backup
            cp -r dist dist.backup 2>/dev/null || true
            rm -rf dist/public
            cp -r /tmp/claude-deploy/dist/public dist/
            echo "✅ Frontend deployed"
            pm2 restart alfalyzer
        else
            echo "❌ No build found in /tmp/claude-deploy"
        fi
        ;;
    
    restart)
        echo "🔄 Restarting services..."
        pm2 restart alfalyzer
        ;;
    
    logs)
        pm2 logs alfalyzer --lines ${2:-50}
        ;;
    
    *)
        echo "Usage: $0 {status|deploy-frontend|restart|logs}"
        ;;
esac
EOF

chmod +x /home/claude-workspace/run.sh

# Criar diretório temporário para uploads
mkdir -p /tmp/claude-deploy

# Dar permissões
chmod 755 /home/claude-workspace
chmod 644 /home/claude-workspace/claude-access.txt

echo "✅ Configuração concluída!"
echo ""
echo "📋 Informações de acesso:"
echo "  Workspace: /home/claude-workspace"
echo "  Projeto: /home/teste 1"
echo "  Helper: /home/claude-workspace/run.sh"
echo ""
echo "🔐 Para o Claude ter acesso, execute também:"
echo "  echo 'claude ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers.d/claude"
echo "  chmod 440 /etc/sudoers.d/claude"