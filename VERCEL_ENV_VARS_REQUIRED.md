# Variáveis de Ambiente Necessárias no Vercel

## 🔴 OBRIGATÓRIAS (adicione AGORA no Vercel)

```bash
# Supabase (essencial para autenticação)
VITE_SUPABASE_URL=https://avjnfessefxtfurayybp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2am5mZXNzZWZ4dGZ1cmF5eWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzA0MzUsImV4cCI6MjA2NzkwNjQzNX0.Y5PnmWmemcXroIKBcycgTiUceINMOuVe34aQUcygl9Q

# Backend API
VITE_API_URL=https://alphaanalyzer-wisewolfpt.koyeb.app

# Ambiente
VITE_ENVIRONMENT=production
```

## 🟡 RECOMENDADAS (adicione depois)

```bash
# Analytics e Monitoramento
VITE_SENTRY_DSN=seu-sentry-dsn-aqui
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Versão e Debug
VITE_APP_VERSION=1.0.0
VITE_DEBUG_MODE=false
```

## 📍 Como adicionar no Vercel:

1. Vá para: https://vercel.com/wisewolfpt/alphaanalyzer/settings/environment-variables
2. Adicione cada variável acima
3. Clique em "Save"
4. **IMPORTANTE**: Faça um novo deploy para aplicar as variáveis

## ⚠️ Problemas atuais:

1. **QueryClient Error**: ✅ CORRIGIDO (aguardando deploy)
2. **Variáveis faltando**: As variáveis acima precisam ser adicionadas
3. **Debug em produção**: Componentes de debug estão sendo carregados

## 🚀 Próximos passos:

1. Adicione as variáveis OBRIGATÓRIAS no Vercel
2. Aguarde o novo deploy (commit já foi feito)
3. Teste novamente o site