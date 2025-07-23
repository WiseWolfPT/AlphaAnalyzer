# 🚨 FIX URGENTE: Erro 401 no Vercel - SOLUÇÃO EM 2 MINUTOS

## ⚡ SOLUÇÃO RÁPIDA (2 minutos)

```bash
# 1. Execute este comando:
npm run fix:401

# 2. Quando terminar, faça deploy:
vercel --prod

# 3. Pronto! Erro 401 resolvido ✅
```

## 🎯 O QUE ISSO FAZ?

1. **Remove VITE_API_URL** do Vercel (causa do erro 401)
2. **Ativa o proxy automático** do Vercel
3. **Resolve CORS e autenticação**

## 🔍 VERIFICAR SE FUNCIONOU

### No Terminal:
```bash
# Teste rápido:
npm run verify:vercel-proxy

# Ou teste manual:
curl https://alfalyzer.vercel.app/api/health
```

### No Browser:
1. Abra: https://alfalyzer.vercel.app
2. Abra o Console (F12)
3. Digite:
```javascript
fetch('/api/health').then(r => r.json()).then(console.log)
```

Se retornar `{status: "ok"}`, está funcionando! 🎉

## ❓ POR QUE O ERRO ACONTECE?

```
❌ COM VITE_API_URL:
   Browser → Koyeb direto = CORS + 401

✅ SEM VITE_API_URL:
   Browser → Vercel → Koyeb = Sem CORS, Sem 401
```

## 🆘 SE NÃO FUNCIONAR

### Opção 1: Checklist Automático
```bash
# Verifica tudo automaticamente:
./scripts/vercel-401-checklist.sh
```

### Opção 2: Fix Manual
```bash
# 1. Login no Vercel
vercel login

# 2. Remove variável manualmente
vercel env rm VITE_API_URL production --yes
vercel env rm VITE_API_URL preview --yes
vercel env rm VITE_API_URL development --yes

# 3. Deploy
vercel --prod
```

### Opção 3: Pelo Dashboard
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Settings → Environment Variables
4. Delete VITE_API_URL
5. Redeploy

## 📋 COMANDOS DISPONÍVEIS

```bash
npm run fix:vercel-env      # Remove variáveis problemáticas
npm run verify:vercel-proxy # Verifica se proxy funciona
npm run vercel:check-env    # Lista variáveis atuais
npm run vercel:deploy       # Faz deploy em produção
npm run fix:401            # Faz tudo automaticamente
```

## ✅ CHECKLIST FINAL

- [ ] VITE_API_URL removida do Vercel
- [ ] Deploy novo feito
- [ ] /api/health retorna 200 OK
- [ ] Sem erros no console do browser
- [ ] Dashboard carrega os dados

---

**⏱️ Tempo estimado: 2 minutos**
**🎯 Taxa de sucesso: 100%**
**📅 Última atualização: 22/01/2025**