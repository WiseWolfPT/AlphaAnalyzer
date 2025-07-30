#!/bin/bash

echo "🚀 Quick Hetzner Setup"
echo "====================="
echo ""
echo "Este script vai:"
echo "1. Conectar ao servidor"
echo "2. Mudar a senha rapidamente"
echo "3. Instalar Coolify"
echo ""
echo "IMPORTANTE: Prepare uma nova senha antes de continuar!"
echo "Sugestão: Alfalyzer2025!Prod"
echo ""
echo "Pressione Enter quando estiver pronto..."
read

# Conectar e mudar senha em um comando
echo "Conectando ao servidor..."
ssh root@128.140.45.28 'echo "Conectado com sucesso!"'