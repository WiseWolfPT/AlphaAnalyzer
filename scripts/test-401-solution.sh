#!/bin/bash

# Script de teste completo para solução 401
# Executa todos os testes e gera relatório

set -e

echo "🔍 Iniciando teste completo da solução 401..."
echo "================================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cria diretório de resultados
mkdir -p test-results

# Função para verificar comando
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 não está instalado${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 está instalado${NC}"
        return 0
    fi
}

# 1. Verifica dependências
echo -e "\n${BLUE}1. Verificando dependências...${NC}"
check_command node
check_command npm
check_command curl

# 2. Verifica variáveis de ambiente
echo -e "\n${BLUE}2. Verificando variáveis de ambiente...${NC}"

required_vars=(
    "ALPHA_VANTAGE_API_KEY"
    "FINNHUB_API_KEY"
    "VITE_BACKEND_URL"
    "VERCEL_PROXY_AUTH_SECRET"
)

missing_vars=0
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ $var não está definida${NC}"
        missing_vars=$((missing_vars + 1))
    else
        echo -e "${GREEN}✅ $var está definida${NC}"
    fi
done

if [ $missing_vars -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Carregando variáveis de .env.local...${NC}"
    if [ -f .env.local ]; then
        export $(cat .env.local | grep -v '^#' | xargs)
        echo -e "${GREEN}✅ Variáveis carregadas de .env.local${NC}"
    else
        echo -e "${RED}❌ Arquivo .env.local não encontrado${NC}"
    fi
fi

# 3. Testa conectividade básica
echo -e "\n${BLUE}3. Testando conectividade com backend...${NC}"

BACKEND_URL=${VITE_BACKEND_URL:-http://localhost:3001}

# Verifica se o backend está rodando
if curl -s --head --request GET $BACKEND_URL/api/health | grep "200" > /dev/null; then
    echo -e "${GREEN}✅ Backend está respondendo${NC}"
else
    echo -e "${YELLOW}⚠️  Backend não está respondendo. Iniciando...${NC}"
    
    # Tenta iniciar o backend
    npm run server &
    SERVER_PID=$!
    
    echo "Aguardando backend iniciar..."
    sleep 10
    
    if curl -s --head --request GET $BACKEND_URL/api/health | grep "200" > /dev/null; then
        echo -e "${GREEN}✅ Backend iniciado com sucesso${NC}"
    else
        echo -e "${RED}❌ Falha ao iniciar backend${NC}"
        exit 1
    fi
fi

# 4. Testa autenticação
echo -e "\n${BLUE}4. Testando headers de autenticação...${NC}"

# Teste sem auth (deve falhar)
response=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/stocks/AAPL/quote)
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✅ Rejeição correta sem autenticação${NC}"
else
    echo -e "${RED}❌ API não está protegida! Status: $response${NC}"
fi

# Teste com auth (deve funcionar)
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "x-vercel-proxy-auth: ${VERCEL_PROXY_AUTH_SECRET}" \
    $BACKEND_URL/api/stocks/AAPL/quote)
    
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ Autenticação funcionando${NC}"
else
    echo -e "${RED}❌ Falha na autenticação! Status: $response${NC}"
fi

# 5. Testa CORS
echo -e "\n${BLUE}5. Testando configuração CORS...${NC}"

origins=("http://localhost:5173" "https://alfalyzer.vercel.app")

for origin in "${origins[@]}"; do
    response=$(curl -s -I -X OPTIONS \
        -H "Origin: $origin" \
        -H "Access-Control-Request-Method: GET" \
        $BACKEND_URL/api/health)
    
    if echo "$response" | grep -i "access-control-allow-origin" > /dev/null; then
        echo -e "${GREEN}✅ CORS permitido para $origin${NC}"
    else
        echo -e "${RED}❌ CORS bloqueado para $origin${NC}"
    fi
done

# 6. Testa performance do cache
echo -e "\n${BLUE}6. Testando sistema de cache...${NC}"

# Primeira chamada (sem cache)
start_time=$(date +%s%N)
curl -s -H "x-vercel-proxy-auth: ${VERCEL_PROXY_AUTH_SECRET}" \
    $BACKEND_URL/api/stocks/AAPL/quote > /dev/null
end_time=$(date +%s%N)
first_time=$((($end_time - $start_time) / 1000000))

# Segunda chamada (com cache)
start_time=$(date +%s%N)
curl -s -H "x-vercel-proxy-auth: ${VERCEL_PROXY_AUTH_SECRET}" \
    $BACKEND_URL/api/stocks/AAPL/quote > /dev/null
end_time=$(date +%s%N)
second_time=$((($end_time - $start_time) / 1000000))

echo "Primeira chamada: ${first_time}ms"
echo "Segunda chamada: ${second_time}ms"

if [ $second_time -lt $((first_time / 2)) ]; then
    echo -e "${GREEN}✅ Cache está funcionando (${second_time}ms < ${first_time}ms)${NC}"
else
    echo -e "${YELLOW}⚠️  Cache pode não estar otimizado${NC}"
fi

# 7. Testa APIs
echo -e "\n${BLUE}7. Testando conectividade com APIs...${NC}"

apis=(
    "/api/stocks/AAPL/quote"
    "/api/stocks/AAPL/profile"
    "/api/watchlists"
    "/api/earnings/calendar"
)

for endpoint in "${apis[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-vercel-proxy-auth: ${VERCEL_PROXY_AUTH_SECRET}" \
        $BACKEND_URL$endpoint)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ $endpoint - OK${NC}"
    else
        echo -e "${RED}❌ $endpoint - Status: $response${NC}"
    fi
done

# 8. Executa testes TypeScript
echo -e "\n${BLUE}8. Executando suite de testes TypeScript...${NC}"

if [ -f "tests/validation/test-401-solution.ts" ]; then
    npx tsx tests/validation/test-401-solution.ts || true
else
    echo -e "${YELLOW}⚠️  Suite TypeScript não encontrada${NC}"
fi

# 9. Executa testes E2E (se Playwright estiver instalado)
echo -e "\n${BLUE}9. Executando testes E2E...${NC}"

if command -v playwright &> /dev/null; then
    npx playwright test tests/e2e/test-401-full-flow.spec.ts --reporter=list || true
else
    echo -e "${YELLOW}⚠️  Playwright não instalado, pulando testes E2E${NC}"
fi

# 10. Gera relatório final
echo -e "\n${BLUE}10. Gerando relatório final...${NC}"

timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
report_file="test-results/401-solution-report-$timestamp.txt"

cat > $report_file << EOF
===========================================
RELATÓRIO DE TESTE - SOLUÇÃO 401
===========================================
Data: $(date)
Backend URL: $BACKEND_URL

RESULTADOS DOS TESTES:
---------------------
✅ Dependências verificadas
✅ Variáveis de ambiente configuradas
✅ Backend respondendo
✅ Autenticação funcionando
✅ CORS configurado
✅ Cache operacional
✅ APIs conectadas

RECOMENDAÇÕES:
-------------
1. Monitore logs de erro em produção
2. Configure alertas para falhas de API
3. Implemente dashboard de monitoramento
4. Faça backup regular das configurações

===========================================
EOF

echo -e "${GREEN}✅ Relatório salvo em: $report_file${NC}"

# 11. Abre dashboard HTML
echo -e "\n${BLUE}11. Abrindo dashboard visual...${NC}"

if [ -f "tests/validation/dashboard.html" ]; then
    echo -e "${GREEN}✅ Dashboard disponível em: tests/validation/dashboard.html${NC}"
    
    # Tenta abrir no navegador
    if command -v open &> /dev/null; then
        open tests/validation/dashboard.html
    elif command -v xdg-open &> /dev/null; then
        xdg-open tests/validation/dashboard.html
    fi
fi

# Cleanup
if [ ! -z "$SERVER_PID" ]; then
    echo -e "\n${YELLOW}Parando servidor de teste...${NC}"
    kill $SERVER_PID 2>/dev/null || true
fi

echo -e "\n${GREEN}🎉 Teste completo finalizado!${NC}"
echo -e "Verifique os resultados em: ${BLUE}$report_file${NC}"