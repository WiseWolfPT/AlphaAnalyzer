# Guia de Deploy do Backend no Koyeb

## 1. Preparação

### Variáveis de Ambiente Necessárias no Koyeb:
```
NODE_ENV=production
PORT=8000
ALPHA_VANTAGE_API_KEY=sua_chave_aqui
FINNHUB_API_KEY=sua_chave_aqui
FMP_API_KEY=sua_chave_aqui
TWELVE_DATA_API_KEY=sua_chave_aqui
POLYGON_API_KEY=sua_chave_aqui
JWT_SECRET=um_secret_seguro_aqui
```

## 2. Deploy via GitHub

### No Koyeb Dashboard:
1. Create New App
2. Choose "GitHub"
3. Repository: WiseWolfPT/AlphaAnalyzer
4. Branch: phase-0-main
5. Builder: Dockerfile
6. Dockerfile path: `Dockerfile.koyeb`
7. Port: 8000

### OU Deploy via CLI:

```bash
# Instalar Koyeb CLI
curl -fsSL https://github.com/koyeb/koyeb-cli/releases/latest/download/koyeb-cli_$(uname -s)_$(uname -m).tar.gz | tar xz
sudo mv koyeb /usr/local/bin/

# Login
koyeb login

# Deploy
koyeb app create alphaanalyzer-backend \
  --git https://github.com/WiseWolfPT/AlphaAnalyzer \
  --git-branch phase-0-main \
  --git-builder dockerfile \
  --git-dockerfile Dockerfile.koyeb \
  --ports 8000:http \
  --routes /:8000 \
  --env NODE_ENV=production \
  --env PORT=8000 \
  --instance-type free
```

## 3. Alternativa: Deploy Manual

Se o deploy via GitHub não funcionar, pode fazer upload manual:

1. Criar um arquivo ZIP com:
   - server/simple-server.ts
   - koyeb-package.json (renomear para package.json)
   - Dockerfile.koyeb (renomear para Dockerfile)
   - .env (com as variáveis)

2. No Koyeb:
   - Create New App
   - Choose "Docker"
   - Upload your archive

## 4. Verificar Deploy

Após o deploy, verificar:
- https://alphaanalyzer-wisewolfpt.koyeb.app/api/health
- https://alphaanalyzer-wisewolfpt.koyeb.app/

## 5. Atualizar Frontend

No Vercel, atualizar a variável de ambiente:
```
VITE_API_URL=https://alphaanalyzer-wisewolfpt.koyeb.app
```

## Problemas Comuns

### "Cannot find module"
- Verificar se tsx está instalado
- Usar node em vez de tsx se necessário

### CORS errors
- Adicionar o domínio do Vercel no array de origins

### API keys não funcionam
- Verificar se as variáveis estão configuradas no Koyeb
- Testar com console.log temporário