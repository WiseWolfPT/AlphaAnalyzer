#!/bin/bash

# Script para executar todos os testes do sistema
# Uso: ./scripts/run-tests.sh [tipo] [opcoes]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Banner
print_color "$BLUE" "
╔════════════════════════════════════════╗
║     🧪 Alfalyzer Test Suite Runner     ║
╚════════════════════════════════════════╝
"

# Verificar tipo de teste
TEST_TYPE=${1:-all}
BACKEND_URL=${BACKEND_URL:-http://localhost:3001}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
KOYEB_URL=${KOYEB_URL:-}

# Função para verificar se os serviços estão rodando
check_services() {
    print_color "$YELLOW" "\n📋 Verificando serviços..."
    
    # Verificar backend
    if curl -s "$BACKEND_URL/api/health" > /dev/null; then
        print_color "$GREEN" "✅ Backend está rodando em $BACKEND_URL"
    else
        print_color "$RED" "❌ Backend não está respondendo em $BACKEND_URL"
        print_color "$YELLOW" "💡 Iniciando backend..."
        npm run backend &
        BACKEND_PID=$!
        sleep 5
    fi
    
    # Verificar frontend
    if curl -s "$FRONTEND_URL" > /dev/null; then
        print_color "$GREEN" "✅ Frontend está rodando em $FRONTEND_URL"
    else
        print_color "$RED" "❌ Frontend não está respondendo em $FRONTEND_URL"
        print_color "$YELLOW" "💡 Iniciando frontend..."
        npm run frontend &
        FRONTEND_PID=$!
        sleep 5
    fi
}

# Função para executar testes E2E
run_e2e_tests() {
    print_color "$BLUE" "\n🚀 Executando testes E2E..."
    
    # Opções de execução
    if [ "$2" == "--headed" ]; then
        npx playwright test tests/e2e/full-flow.spec.ts --headed
    elif [ "$2" == "--ui" ]; then
        npx playwright test tests/e2e/full-flow.spec.ts --ui
    elif [ "$2" == "--debug" ]; then
        npx playwright test tests/e2e/full-flow.spec.ts --debug
    else
        npx playwright test tests/e2e/full-flow.spec.ts
    fi
    
    # Mostrar relatório
    if [ "$3" != "--no-report" ]; then
        npx playwright show-report test-results/html
    fi
}

# Função para executar testes de performance
run_performance_tests() {
    print_color "$BLUE" "\n⚡ Executando testes de performance..."
    
    npx playwright test tests/performance/load-test.ts --reporter=list
    
    # Gerar relatório de performance
    print_color "$YELLOW" "\n📊 Relatório de performance será exibido ao final dos testes"
}

# Função para executar testes de integração/resiliência
run_integration_tests() {
    print_color "$BLUE" "\n🔧 Executando testes de integração e resiliência..."
    
    npx vitest run tests/integration/resilience.test.ts --reporter=verbose
}

# Função para abrir dashboard de monitoramento
open_monitoring() {
    print_color "$BLUE" "\n📊 Abrindo dashboard de monitoramento..."
    
    # Detectar comando para abrir no navegador
    if command -v open &> /dev/null; then
        open "tests/monitoring/dashboard.html"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "tests/monitoring/dashboard.html"
    else
        print_color "$YELLOW" "⚠️  Abra manualmente: tests/monitoring/dashboard.html"
    fi
}

# Função para executar teste específico do Koyeb
test_koyeb() {
    if [ -z "$KOYEB_URL" ]; then
        print_color "$RED" "❌ KOYEB_URL não está definida"
        print_color "$YELLOW" "💡 Use: export KOYEB_URL=https://seu-app.koyeb.app"
        exit 1
    fi
    
    print_color "$BLUE" "\n🌐 Testando deployment no Koyeb: $KOYEB_URL"
    
    # Teste de health
    print_color "$YELLOW" "📍 Testando endpoint de health..."
    if curl -s "$KOYEB_URL/api/health" | jq .; then
        print_color "$GREEN" "✅ Health endpoint OK"
    else
        print_color "$RED" "❌ Health endpoint falhou"
    fi
    
    # Teste de cold start
    print_color "$YELLOW" "\n❄️  Medindo cold start..."
    START_TIME=$(date +%s%N)
    curl -s "$KOYEB_URL/api/health" > /dev/null
    END_TIME=$(date +%s%N)
    DURATION=$((($END_TIME - $START_TIME) / 1000000))
    print_color "$BLUE" "⏱️  Cold start: ${DURATION}ms"
    
    # Teste de API
    print_color "$YELLOW" "\n📈 Testando API de market data..."
    if curl -s "$KOYEB_URL/api/market-data/quote/AAPL" | jq .; then
        print_color "$GREEN" "✅ Market data API OK"
    else
        print_color "$RED" "❌ Market data API falhou"
    fi
}

# Função para executar todos os testes
run_all_tests() {
    print_color "$BLUE" "\n🎯 Executando todos os testes..."
    
    # 1. Testes de integração
    run_integration_tests
    
    # 2. Testes E2E
    run_e2e_tests
    
    # 3. Testes de performance
    run_performance_tests
    
    print_color "$GREEN" "\n✅ Todos os testes concluídos!"
}

# Função para gerar relatório consolidado
generate_report() {
    print_color "$BLUE" "\n📄 Gerando relatório consolidado..."
    
    REPORT_DIR="test-results/consolidated-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$REPORT_DIR"
    
    # Copiar resultados
    cp -r test-results/html/* "$REPORT_DIR/" 2>/dev/null || true
    cp test-results/*.json "$REPORT_DIR/" 2>/dev/null || true
    
    print_color "$GREEN" "✅ Relatório salvo em: $REPORT_DIR"
}

# Função de cleanup
cleanup() {
    print_color "$YELLOW" "\n🧹 Limpando..."
    
    # Parar serviços iniciados pelo script
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
}

# Trap para cleanup
trap cleanup EXIT

# Menu principal
case "$TEST_TYPE" in
    "e2e")
        check_services
        run_e2e_tests "$@"
        ;;
    "performance"|"perf")
        check_services
        run_performance_tests
        ;;
    "integration"|"int")
        check_services
        run_integration_tests
        ;;
    "monitoring"|"monitor")
        check_services
        open_monitoring
        ;;
    "koyeb")
        test_koyeb
        ;;
    "all")
        check_services
        run_all_tests
        generate_report
        ;;
    "help"|"-h"|"--help")
        print_color "$BLUE" "Uso: $0 [tipo] [opcoes]"
        echo ""
        echo "Tipos de teste:"
        echo "  e2e              - Testes end-to-end com Playwright"
        echo "  performance      - Testes de carga e performance"
        echo "  integration      - Testes de integração e resiliência"
        echo "  monitoring       - Abrir dashboard de monitoramento"
        echo "  koyeb           - Testar deployment no Koyeb"
        echo "  all             - Executar todos os testes"
        echo ""
        echo "Opções para E2E:"
        echo "  --headed        - Executar com navegador visível"
        echo "  --ui            - Abrir Playwright UI"
        echo "  --debug         - Modo debug"
        echo "  --no-report     - Não abrir relatório após testes"
        echo ""
        echo "Variáveis de ambiente:"
        echo "  BACKEND_URL     - URL do backend (padrão: http://localhost:3001)"
        echo "  FRONTEND_URL    - URL do frontend (padrão: http://localhost:3000)"
        echo "  KOYEB_URL       - URL do Koyeb para testes de produção"
        ;;
    *)
        print_color "$RED" "❌ Tipo de teste inválido: $TEST_TYPE"
        print_color "$YELLOW" "💡 Use: $0 help"
        exit 1
        ;;
esac

print_color "$GREEN" "\n✨ Testes finalizados!"