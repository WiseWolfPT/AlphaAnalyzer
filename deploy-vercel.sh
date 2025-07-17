#!/bin/bash

# Script para deploy no Vercel com variáveis de ambiente

echo "🚀 Iniciando deploy para Vercel..."

# Variáveis de ambiente
export VITE_SUPABASE_URL="https://avjnfessefxtfurayybp.supabase.co"
export VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q"

# Build local com variáveis
echo "📦 Building com variáveis de ambiente..."
cd client
npm run build

# Deploy dos arquivos já buildados
echo "🌐 Deploying para Vercel..."
# Stay in client directory since build output is in client/dist/public
cd dist/public
vercel --prod --yes

echo "✅ Deploy completo!"