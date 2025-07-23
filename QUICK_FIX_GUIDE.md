# 🚨 GUIA RÁPIDO - RESOLVER ERRO 401 AGORA

## PROBLEMA: Frontend não funciona porque VITE_API_URL está fazendo chamadas diretas para Koyeb

## SOLUÇÃO IMEDIATA (5 minutos):

### 1️⃣ Abrir Vercel Dashboard
```
https://vercel.com/dashboard
→ Projeto: alfalyzer
→ Settings
→ Environment Variables
```

### 2️⃣ REMOVER estas variáveis:
- ❌ VITE_API_URL (DELETAR COMPLETAMENTE)

### 3️⃣ MANTER apenas estas:
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY

### 4️⃣ Fazer Redeploy
```
→ Deployments
→ Clicar nos 3 pontinhos do último deployment
→ "Redeploy"
→ "Use existing Build Cache"
→ "Redeploy"
```

### 5️⃣ Aguardar ~2 minutos e testar

---

## SE AINDA NÃO FUNCIONAR:

### Opção A: Forçar variável vazia
No Vercel, adicionar:
```
VITE_API_URL = 
```
(deixar vazio mesmo)

### Opção B: Verificar arquivo local
```bash
cd /Users/antoniofrancisco/Documents/teste\ 1
cat client/src/services/market-data-client.ts | grep API_BASE_URL
```

Deve mostrar:
```typescript
const API_BASE_URL = typeof window !== 'undefined' ? '' : (env.VITE_API_URL || 'https://...');
```

---

## RESULTADO ESPERADO:
✅ Sem erro "Algo correu mal"
✅ Dados carregando normalmente
✅ Sem erros 401 no console
✅ Sem erros CORS

## PRÓXIMO PASSO:
Implementar arquitetura de cache conforme ALFALYZER_ACTION_PLAN.md