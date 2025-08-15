#!/bin/bash

echo "🔧 CORRIGINDO PROXY DO VERCEL"
echo "=============================="
echo ""

# 1. Verificar se vercel.json está correto
echo "1. Verificando vercel.json..."
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json existe no root"
    echo "Conteúdo:"
    cat vercel.json
else
    echo "❌ vercel.json não encontrado!"
fi

echo ""
echo "2. Verificando se está no git..."
git ls-files | grep vercel.json
if [ $? -eq 0 ]; then
    echo "✅ vercel.json está no git"
else
    echo "❌ vercel.json NÃO está no git!"
    echo "Adicionando..."
    git add vercel.json
    git commit -m "fix: Add vercel.json to git"
    git push origin phase-0-main
fi

echo ""
echo "3. Forçando redeploy no Vercel..."
echo "Criando arquivo trigger..."
date > .vercel-trigger
git add .vercel-trigger
git commit -m "trigger: Force Vercel redeploy with vercel.json"
git push origin phase-0-main

echo ""
echo "=============================="
echo "✅ CORREÇÕES APLICADAS!"
echo ""
echo "Aguarde 2-3 minutos para o Vercel fazer deploy"
echo "Depois teste: https://alfalyzer.vercel.app/api/market-data/quotes/batch?symbols=AAPL"
echo ""
echo "Se ainda não funcionar, faça:"
echo "1. Acesse https://vercel.com/antonios-projects-f9cd3cd0/alfalyzer/settings"
echo "2. Vá em 'Functions' ou 'Rewrites'"
echo "3. Adicione manualmente:"
echo "   Source: /api/:path*"
echo "   Destination: http://jsg00k40sgo0k4swsoc4gcsg.128.140.45.28.sslip.io/api/:path*"