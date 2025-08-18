# 🚀 INSTRUÇÕES DE DEPLOYMENT - ALFALYZER NO HETZNER

## 📍 SITUAÇÃO ATUAL

O backend está funcional mas o **frontend não está a abrir** porque os ficheiros não foram buildados no servidor.

## ✅ SOLUÇÃO IMEDIATA

### Opção A: Build no Servidor (Recomendado)

1. **Conecte ao servidor:**
```bash
ssh root@128.140.45.28
cd "/home/teste 1"
```

2. **Execute o script de deployment:**
```bash
# Fazer build e deploy do frontend
./deploy-frontend-hetzner.sh

# Depois corrigir todos os problemas de segurança
./fix-production-issues.sh
```

### Opção B: Copiar Build Local

Se o build no servidor falhar, copie os ficheiros locais:

```bash
# Do seu computador local
cd "/Users/antoniofrancisco/Documents/teste 1"

# Copiar a pasta dist/public para o servidor
scp -r dist/public root@128.140.45.28:"/home/teste 1/dist/"

# Conectar ao servidor e reiniciar
ssh root@128.140.45.28
cd "/home/teste 1"
pm2 restart all
```

## 📋 CHECKLIST DE VERIFICAÇÃO

Após executar os scripts, verifique:

### 1. Frontend Funcionando
```bash
# No servidor
curl http://localhost:3001/ | head -20
# Deve mostrar HTML com <!DOCTYPE html>
```

### 2. Teste no Browser
Abra: http://128.140.45.28:3001
- Deve aparecer a landing page do Alfalyzer

### 3. Verificar Logs
```bash
pm2 logs --lines 50
# Não deve ter erros críticos
```

### 4. Verificar Firewall
```bash
sudo ufw status
# Deve mostrar: Status: active
```

### 5. Verificar Redis
```bash
redis-cli ping
# Deve responder: PONG
```

## 🔧 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: "Cannot find dist/public"
**Solução:**
```bash
npm run build
# ou
npx vite build --outDir dist/public
```

### Problema: "PM2 not found"
**Solução:**
```bash
npm install -g pm2
```

### Problema: "Permission denied"
**Solução:**
```bash
chmod +x deploy-frontend-hetzner.sh
chmod +x fix-production-issues.sh
```

### Problema: Frontend retorna 404
**Solução:**
```bash
# Verificar se os ficheiros existem
ls -la dist/public/
# Deve ter index.html e pasta assets/

# Se não existir, fazer build
npm run build
pm2 restart all
```

## 📊 STATUS APÓS DEPLOYMENT

### ✅ O que estará funcionando:
- Frontend acessível em http://128.140.45.28:3001
- Backend API em /api/health
- PM2 gerindo o processo
- Firewall UFW protegendo o servidor
- Redis real instalado e configurado
- Backups automáticos configurados

### ⚠️ O que ainda precisa ser feito manualmente:
1. **Configurar Nginx + HTTPS** (instruções no script)
2. **Configurar domínio personalizado**
3. **Setup monitoring externo (UptimeRobot)**
4. **Corrigir TypeScript errors** (não crítico)

## 🌐 ACESSO FINAL

Após completar todos os passos:

- **Frontend**: http://128.140.45.28:3001
- **API Health**: http://128.140.45.28:3001/api/health
- **Alternativo**: http://128-140-45-28.nip.io:3001

## 📝 COMANDOS ÚTEIS

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs --lines 100

# Reiniciar
pm2 restart all

# Ver uso de memória
pm2 monit

# Testar Redis
redis-cli ping

# Ver firewall
sudo ufw status verbose

# Fazer backup manual
/home/user/backup-alfalyzer.sh
```

## 🚨 EM CASO DE EMERGÊNCIA

Se algo correr mal:

```bash
# Rollback rápido
pm2 stop all
git checkout HEAD~1
npm install
npm run build
pm2 start ecosystem.config.cjs

# Ver erros
pm2 logs --err --lines 200

# Reiniciar tudo
pm2 delete all
pm2 start ecosystem.config.cjs
```

## ✅ CONCLUSÃO

Execute os scripts na ordem:
1. `deploy-frontend-hetzner.sh` - Build e deploy do frontend
2. `fix-production-issues.sh` - Corrige segurança e Redis

Após isso, o sistema estará 95% operacional e seguro!