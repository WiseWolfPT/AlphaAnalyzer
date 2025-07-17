# Guia de Deploy do Alfalyzer

Este guia explica como fazer o deploy completo do Alfalyzer com frontend no Vercel e backend no Railway.

## 🚀 Arquitetura de Deploy

- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway (Node.js + Express)
- **Database**: Supabase (PostgreSQL)
- **Arquivos**: Supabase Storage

## 📋 Pré-requisitos

1. Conta no [Vercel](https://vercel.com)
2. Conta no [Railway](https://railway.app)
3. Conta no [Supabase](https://supabase.com)
4. Git instalado
5. Node.js 18+

## 🔧 Passo 1: Configurar Supabase

1. Crie um novo projeto no Supabase
2. Anote as credenciais:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Execute as migrations do banco:
```bash
# No dashboard do Supabase, vá em SQL Editor e execute os arquivos em ordem:
# migrations/*.sql
```

## 🚂 Passo 2: Deploy do Backend no Railway

1. **Faça login no Railway**:
```bash
# Instale o CLI do Railway (opcional)
npm install -g @railway/cli
railway login
```

2. **Crie um novo projeto no Railway**:
   - Vá para [railway.app/new](https://railway.app/new)
   - Escolha "Deploy from GitHub repo"
   - Conecte seu repositório

3. **Configure as variáveis de ambiente no Railway**:
```env
# Básicas
NODE_ENV=production
PORT=${{PORT}}

# Supabase
SUPABASE_URL=sua-url-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-aqui
SUPABASE_ANON_KEY=sua-chave-aqui

# APIs Financeiras
ALPHA_VANTAGE_API_KEY=sua-chave-aqui
TWELVE_DATA_API_KEY=sua-chave-aqui
FINNHUB_API_KEY=sua-chave-aqui
FMP_API_KEY=sua-chave-aqui
POLYGON_API_KEY=sua-chave-aqui

# Stripe (se usando)
STRIPE_SECRET_KEY=sua-chave-aqui
STRIPE_WEBHOOK_SECRET=sua-chave-aqui

# JWT
JWT_ACCESS_SECRET=gere-uma-chave-segura-32-chars
JWT_REFRESH_SECRET=gere-outra-chave-segura-32-chars
```

4. **Configure o comando de start**:
   - O Railway vai usar automaticamente o `railway.json` que criamos
   - Ou configure manualmente: `npm run backend:prod`

5. **Deploy**:
   - O Railway fará deploy automaticamente quando você fizer push
   - Anote a URL do backend (ex: `https://alfalyzer-backend.up.railway.app`)

## 🎨 Passo 3: Deploy do Frontend no Vercel

1. **Atualize o vercel.json com a URL do backend**:
```bash
# Edite vercel.json e mude VITE_API_URL
"VITE_API_URL": "https://alfalyzer-backend.up.railway.app"
```

2. **Build local**:
```bash
npm run build
```

3. **Deploy no Vercel**:
```bash
cd client/dist/public
vercel --prod
```

4. **Configure o domínio personalizado** (opcional):
   - No dashboard do Vercel, vá em Settings → Domains
   - Adicione seu domínio

## 🔍 Passo 4: Verificar o Deploy

1. **Teste o backend**:
```bash
curl https://alfalyzer-backend.up.railway.app/api/health
```

2. **Teste o frontend**:
   - Acesse a URL do Vercel
   - Verifique o console do navegador
   - Teste login e funcionalidades

## 🛠️ Troubleshooting

### Frontend mostra tela preta
- Verifique se VITE_API_URL está correto no Vercel
- Confira os logs do console do navegador
- Verifique se o backend está rodando

### Erros de CORS
- Adicione a URL do Vercel nas variáveis do Railway:
```env
CORS_ORIGIN=https://alfalyzer.vercel.app
ALLOWED_ORIGINS=https://alfalyzer.vercel.app
```

### Erros de API
- Verifique se todas as API keys estão configuradas
- Confira os logs do Railway
- Teste as APIs individualmente

## 📊 Monitoramento

1. **Railway**: Veja logs em tempo real no dashboard
2. **Vercel**: Analytics e logs no dashboard
3. **Supabase**: Monitore queries e performance

## 🔄 Atualizações

### Frontend
```bash
git push origin main
# Vercel faz deploy automático
```

### Backend
```bash
git push origin main
# Railway faz deploy automático
```

## 💰 Custos Estimados

- **Vercel**: Free tier (100GB bandwidth/mês)
- **Railway**: $5/mês (500 horas)
- **Supabase**: Free tier (500MB database, 1GB storage)
- **Total**: ~$5/mês para começar

## 🎯 Próximos Passos

1. Configure SSL/HTTPS (automático em ambas plataformas)
2. Configure backup automático do Supabase
3. Configure monitoring (Sentry, LogRocket)
4. Configure CI/CD com GitHub Actions

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no Railway e Vercel
2. Confirme que todas as variáveis estão configuradas
3. Teste cada serviço individualmente