# Plano de Migração para Vercel - AlphaAnalyzer

## 🚀 Decisão: Migrar Frontend para Vercel

Baseado na análise de especialistas em IA, vamos migrar o frontend para Vercel mantendo o backend no Koyeb.

## 📋 Checklist de Migração (30 minutos)

### 1. Criar Conta no Vercel (5 min)
- [ ] Acesse https://vercel.com
- [ ] Faça login com GitHub
- [ ] Autorize acesso aos repositórios

### 2. Importar Repositório (5 min)
- [ ] Click "Add New Project"
- [ ] Selecione `WiseWolfPT/AlphaAnalyzer`
- [ ] Escolha branch `phase-0-main`

### 3. Configurar Build Settings (5 min)
Vercel deve detectar automaticamente, mas confirme:
- **Framework Preset**: Vite
- **Build Command**: `npm run build:client`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### 4. Configurar Variáveis de Ambiente (5 min)
No painel da Vercel, adicione:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=https://alphaanalyzer-wisewolfpt.koyeb.app
```

### 5. Deploy (5 min)
- [ ] Click "Deploy"
- [ ] Aguarde o build (~3-5 minutos)
- [ ] Teste a URL fornecida pela Vercel

### 6. Configurar CORS no Backend Koyeb (5 min)
Adicione a URL da Vercel ao CORS permitido:

```javascript
// server/index.ts ou server/security/security-middleware.ts
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://alphaanalyzer.vercel.app', // Adicione sua URL Vercel
    'https://alphaanalyzer-*.vercel.app' // Preview deployments
  ],
  credentials: true
};
```

## 🎯 Benefícios Imediatos

1. **Sem mais tela preta** - Vercel gerencia SPAs automaticamente
2. **Deploy automático** - Push para GitHub = novo deploy
3. **Preview deployments** - Cada PR tem sua própria URL
4. **CDN global** - Performance melhorada automaticamente
5. **HTTPS automático** - Sem configuração adicional

## ⚠️ Pontos de Atenção

1. **CORS**: O backend precisa permitir a origem Vercel
2. **API URL**: Use variável de ambiente para a URL do Koyeb
3. **Custos**: Vercel free tier é generoso mas tem limites

## 🔄 Próximos Passos (Após Migração)

1. Configurar domínio customizado (opcional)
2. Implementar cache headers otimizados
3. Configurar analytics da Vercel
4. Implementar ISR (Incremental Static Regeneration) se aplicável

## 📊 Comparação Final

| Aspecto | Koyeb (atual) | Vercel (proposto) |
|---------|---------------|-------------------|
| Tempo para resolver | Incerto | < 30 minutos |
| Especialização SPA | Não | Sim |
| CDN Global | Não | Sim |
| Deploy automático | Sim | Sim |
| Custo | Grátis | Grátis (com limites) |
| Complexidade | Alta | Baixa |

## 🚦 Começar Agora

1. Abra https://vercel.com em nova aba
2. Siga o checklist acima
3. Em 30 minutos, seu frontend estará funcionando!

---
*Recomendação baseada em análise de O3-mini e Gemini 2.5 Pro*