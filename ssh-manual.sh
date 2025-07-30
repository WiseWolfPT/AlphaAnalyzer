#!/bin/bash

echo "🔄 Tentando conexão manual ao servidor Hetzner..."
echo ""
echo "Instruções:"
echo "1. Quando pedir senha, cole: jMNTjAAddKRmAgaRVMk7"
echo "2. A senha não aparece quando cola (é normal)"
echo "3. Pressione Enter após colar"
echo ""
echo "Conectando..."

ssh -o ConnectTimeout=30 -o ServerAliveInterval=60 root@128.140.45.28