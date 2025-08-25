#!/bin/bash

# 🔐 Setup SSH for passwordless deployment to Hetzner
# This script configures SSH key authentication for automatic deployments

echo "🔐 Configuração de Deploy Automático para Alfalyzer"
echo "=================================================="
echo ""
echo "Este script vai configurar SSH para deploy sem senha."
echo "Você precisará digitar a senha do servidor UMA ÚLTIMA VEZ."
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "📝 Gerando nova chave SSH..."
    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "alfalyzer-deploy"
    echo "✅ Chave SSH criada!"
else
    echo "✅ Chave SSH já existe"
fi

echo ""
echo "📤 Copiando chave para o servidor..."
echo "⚠️  Você precisará digitar a senha do servidor agora:"
echo ""

# Copy SSH key to server
ssh-copy-id -i ~/.ssh/id_ed25519 root@128.140.45.28

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuração concluída com sucesso!"
    echo ""
    echo "🎉 Agora você pode fazer deploy SEM SENHA usando:"
    echo "   npm run deploy"
    echo ""
    echo "📝 Comandos disponíveis:"
    echo "   npm run deploy       - Deploy completo (build + upload + restart)"
    echo "   npm run deploy:quick - Deploy rápido usando scp"
    echo ""
else
    echo ""
    echo "❌ Erro ao configurar SSH"
    echo "Tente executar manualmente:"
    echo "ssh-copy-id root@128.140.45.28"
fi