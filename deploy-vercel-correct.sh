#!/bin/bash

# Script correto para deploy no Vercel
echo "🚀 Iniciando deploy correto para Vercel..."

# Limpar cache do Vercel
echo "🧹 Limpando cache do Vercel..."
rm -rf .vercel

# Variáveis de ambiente
export VITE_SUPABASE_URL="https://avjnfessefxtfurayybp.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q"

# Deploy direto do diretório raiz (Vercel vai executar o buildCommand)
echo "🌐 Deploying com build automático no Vercel..."
vercel --prod --yes

echo "✅ Deploy completo!"
echo "📝 Nota: As variáveis de ambiente devem ser configuradas no painel do Vercel"