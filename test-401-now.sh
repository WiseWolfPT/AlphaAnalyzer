#!/bin/bash

# Script rápido para testar solução 401 e abrir dashboard

echo "🚀 Testando Solução 401..."
echo "=========================="

# Executa instalação de dependências se necessário
if [ ! -d "node_modules/@playwright" ]; then
    echo "📦 Instalando dependências..."
    ./scripts/install-test-deps.sh
fi

# Executa os testes
echo -e "\n🔍 Executando testes..."
./scripts/test-401-solution.sh

# Abre o dashboard
echo -e "\n📊 Abrindo dashboard..."
if command -v open &> /dev/null; then
    open tests/validation/dashboard.html
elif command -v xdg-open &> /dev/null; then
    xdg-open tests/validation/dashboard.html
else
    echo "Dashboard disponível em: tests/validation/dashboard.html"
fi

echo -e "\n✅ Teste concluído!"