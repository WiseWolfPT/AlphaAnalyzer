# ✅ ALFALYZER DEPLOYMENT CHECKLIST

## 🔴 PRÉ-DEPLOYMENT (LOCALMENTE)

### Segurança
- [ ] Secrets removidos do código (`grep -r "JWT_SECRET\|API_KEY" *.sh`)
- [ ] `.env.production` existe e tem todas as API keys
- [ ] `.env.production` está no `.gitignore`
- [ ] API Key configurada para endpoint público: `BEA48F7D-7DEB-4E70-8F5A-7C8E30F23ED9`

### Código
- [ ] TypeScript compila sem erros críticos (`npx tsc --noEmit`)
- [ ] Build do frontend funciona (`npm run build`)
- [ ] Redis Mock desativado em produção (✅ CORRIGIDO)
- [ ] Batch quotes endpoint usa GET com API key

### Ficheiros Criados
- [ ] `/DEPLOY-TO-HETZNER.sh` - Script all-in-one
- [ ] `/scripts/hetzner-setup/*.sh` - 5 scripts de setup
- [ ] `/scripts/smoke-test.sh` - Teste de validação
- [ ] `ecosystem.config.cjs` - Configuração PM2 atualizada

## 🟡 DEPLOYMENT (NO SERVIDOR HETZNER)

### 1. Conectar ao Servidor
```bash
ssh root@[IP_SERVIDOR]
```

### 2. Clonar Repositório
```bash
cd /home
git clone [URL_REPO] "teste 1"
cd "teste 1"
```

### 3. Copiar .env.production
```bash
# Copiar o ficheiro .env.production do teu computador para o servidor
scp .env.production root@[IP_SERVIDOR]:/home/teste\ 1/
```

### 4. Executar Script de Deployment
```bash
chmod +x DEPLOY-TO-HETZNER.sh
sudo ./DEPLOY-TO-HETZNER.sh
```

## 🟢 PÓS-DEPLOYMENT (VALIDAÇÃO)

### Testes Automáticos
- [ ] Smoke test passou (`./scripts/smoke-test.sh`)
- [ ] Health check OK (`curl https://api.alfalyzer.com/api/health`)
- [ ] Redis conectado (`redis-cli ping` responde PONG)
- [ ] PM2 sem restarts (`pm2 status` - 0 restarts)

### Segurança
- [ ] Firewall ativo (`sudo ufw status`)
- [ ] HTTPS funcionando (certificado válido)
- [ ] Redis não exposto (`nmap -p 6379 [IP]` dá filtered)
- [ ] Endpoint público protegido (sem API key dá 401)

### Performance
- [ ] TTFB < 200ms
- [ ] API response < 1s
- [ ] Memory < 500MB (`pm2 info alfalyzer`)
- [ ] CPU < 50% idle

### Monitorização
- [ ] PM2 monitoring ativo (`pm2 monit`)
- [ ] Logs sem erros (`pm2 logs --err`)
- [ ] Backups configurados (`crontab -l | grep backup`)
- [ ] UptimeRobot configurado (https://uptimerobot.com)

## 📊 CRITÉRIOS GO/NO-GO

### ✅ GO (Pode fazer deploy)
- Todos os testes automáticos passaram
- Sem erros críticos nos logs
- Performance dentro dos limites
- Segurança validada

### ❌ NO-GO (NÃO fazer deploy)
- Falha em qualquer teste de segurança
- Redis não conecta ou usa mock
- Erros TypeScript críticos
- Smoke test falha
- PM2 com múltiplos restarts

## 🚨 ROLLBACK (Se algo correr mal)

```bash
# 1. Parar aplicação
pm2 stop alfalyzer

# 2. Voltar ao commit anterior
git checkout HEAD~1

# 3. Reinstalar e reiniciar
npm install
pm2 restart alfalyzer

# 4. Verificar
./scripts/smoke-test.sh
```

## 📞 CONTACTOS EMERGÊNCIA

- **Hetzner Support**: https://console.hetzner.cloud/
- **Supabase Dashboard**: https://app.supabase.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **PM2 Docs**: https://pm2.keymetrics.io/

## 📝 NOTAS FINAIS

- **Tempo estimado**: 30-45 minutos
- **Horário ideal**: Fora do horário de pico (noite/madrugada)
- **Backup antes**: Sempre fazer backup antes do deploy
- **Monitorizar**: Ficar 1 hora a monitorizar após deploy

---

**ÚLTIMA ATUALIZAÇÃO**: 2025-08-17
**STATUS**: PRONTO PARA DEPLOYMENT ✅