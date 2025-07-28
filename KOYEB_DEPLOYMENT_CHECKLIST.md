# ✅ Koyeb Deployment Checklist

## 🚀 Passos Imediatos

### 1. No Koyeb Dashboard:

#### Build Settings:
- [ ] **Build command**: `npm install`
- [ ] **Run command**: `npm start` (vai usar koyeb-server-fixed.js)

#### Environment Variables:
- [ ] Todas as API keys configuradas
- [ ] **ALLOWED_ORIGINS**: `https://alfalyzerpro4.vercel.app,https://alfalyzer.vercel.app`
- [ ] **NODE_ENV**: `production`
- [ ] **PORT**: (deixar vazio - Koyeb configura automaticamente)

#### Health Check Settings:
- [ ] **Path**: `/health`
- [ ] **Port**: (deixar vazio)
- [ ] **Protocol**: `HTTP`
- [ ] **Interval**: `30`
- [ ] **Timeout**: `5`
- [ ] **Grace period**: `30`

### 2. Fazer Redeploy:
- [ ] Clicar em "Redeploy" no Koyeb
- [ ] Aguardar o build completar
- [ ] Verificar logs para confirmar "Health check server ready"

### 3. Testar após Deploy:
```bash
# Testar health endpoint
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/health

# Testar API
curl https://crucial-ivonne-alfalyzer-90666a9e.koyeb.app/api/market-data/test
```

### 4. Verificar no Frontend:
- [ ] Abrir https://alfalyzer.vercel.app
- [ ] Verificar se os dados carregam corretamente
- [ ] Testar navegação entre páginas

## 🔄 Se Ainda Falhar:

### Opção A: Railway.app (Recomendado)
1. Ir para [railway.app](https://railway.app)
2. "Deploy from GitHub repo"
3. Selecionar o repositório
4. Railway detecta tudo automaticamente!

### Opção B: Render.com
1. Criar conta em [render.com](https://render.com)
2. New > Web Service
3. Conectar GitHub
4. Deploy automático

## 📝 Notas Importantes:
- O novo servidor responde ao health check **imediatamente**
- Usa `process.env.PORT` como Koyeb exige
- Faz self-ping para evitar sleep após 60 minutos
- Se Koyeb continuar problemático, Railway é mais simples e confiável