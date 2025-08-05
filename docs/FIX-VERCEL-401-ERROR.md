# 🚨 FIX URGENTE: Erro 401 no Vercel

## Problema
O frontend está fazendo chamadas diretas para o Coolify (https://alfalyzer-production.coolify.app) porque a variável `VITE_API_URL` está definida no Vercel. Isso causa:
- Erro CORS 
- Erro 401 (Unauthorized)
- Frontend não consegue acessar o backend

## Solução
Remover `VITE_API_URL` do Vercel para que o frontend use o proxy `/api/*` automaticamente.

## Processo Automatizado (Recomendado)

### 1. Execute o comando de fix:
```bash
npm run fix:vercel-env
```

### 2. Verifique se funcionou:
```bash
npm run verify:vercel-proxy
```

### 3. Faça um novo deploy:
```bash
vercel --prod
```

## Processo Manual (Se necessário)

### 1. Instale Vercel CLI:
```bash
npm i -g vercel
```

### 2. Faça login:
```bash
vercel login
```

### 3. Remova as variáveis problemáticas:
```bash
# Remover de todos os ambientes
vercel env rm VITE_API_URL production --yes
vercel env rm VITE_API_URL preview --yes
vercel env rm VITE_API_URL development --yes
```

### 4. Verifique se foi removida:
```bash
vercel env ls
```

### 5. Faça novo deploy:
```bash
vercel --prod
```

## Como Verificar se Funcionou

### No Terminal:
```bash
# Teste o endpoint de health
curl https://alfalyzer.vercel.app/api/health

# Deve retornar:
# {"status":"ok","timestamp":"..."}
```

### No Browser (Console):
```javascript
// Abra o site e no console digite:
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)

// Deve mostrar o objeto de health
```

### Verificar se VITE_API_URL foi removida:
```javascript
// No console do browser:
console.log(window.VITE_API_URL || 'NÃO DEFINIDA - BOM!');
console.log(import.meta.env.VITE_API_URL || 'NÃO DEFINIDA - BOM!');
```

## Por que isso funciona?

1. **SEM `VITE_API_URL`**: O frontend usa URLs relativas (`/api/*`)
2. **Vercel Proxy**: Redireciona `/api/*` → Coolify automaticamente
3. **Sem CORS**: Mesma origem = sem problemas de CORS
4. **Sem 401**: Requisições passam pelo proxy do Vercel

## Variáveis que DEVEM existir no Vercel:

✅ Variáveis PERMITIDAS (não começam com VITE_):
- `COOLIFY_API_URL` (usada pelo Vercel, não exposta ao cliente)
- `NODE_ENV`
- Outras variáveis do servidor

❌ Variáveis PROIBIDAS (começam com VITE_):
- `VITE_API_URL` 
- `VITE_BACKEND_URL`
- `VITE_SERVER_URL`
- Qualquer `VITE_*` que aponte para o backend

## Troubleshooting

### Ainda recebendo 401?
1. Verifique se a variável foi realmente removida: `vercel env ls`
2. Aguarde 2-3 minutos para propagação
3. Limpe o cache do browser (Ctrl+Shift+R)
4. Verifique no Network tab se as requisições vão para `/api/*` e não para Coolify

### Script não funciona?
Execute manualmente:
```bash
# 1. Listar variáveis
vercel env ls

# 2. Se VITE_API_URL existir, remova:
vercel env rm VITE_API_URL production --yes
vercel env rm VITE_API_URL preview --yes
vercel env rm VITE_API_URL development --yes

# 3. Deploy
vercel --prod
```

### Como confirmar no Vercel Dashboard:
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em Settings → Environment Variables
4. Verifique se `VITE_API_URL` NÃO está listada
5. Se estiver, delete manualmente

## Checklist Final

- [ ] `VITE_API_URL` removida do Vercel
- [ ] Novo deploy realizado
- [ ] `/api/health` retorna 200 OK
- [ ] Sem erros CORS no console
- [ ] Sem erros 401 no console
- [ ] Frontend funcionando normalmente

---

**IMPORTANTE**: Este é um fix crítico. Se não funcionar, o frontend não consegue se comunicar com o backend!