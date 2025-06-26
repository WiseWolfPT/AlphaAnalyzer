# 🎨 Guia Completo de Troubleshooting - Animação Lottie

## 📋 Resumo do Problema Resolvido

### ✅ **O que foi corrigido:**
A animação Lottie no hero da landing page não aparecia, resultando numa tela branca.

### 🔍 **Problemas identificados:**

#### 1. **Vite Configuration Issue (CRÍTICO)**
```typescript
// ❌ PROBLEMA: import.meta.dirname (Node.js 20.11+)
resolve: {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
  },
},

// ✅ SOLUÇÃO: __dirname compatível
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

resolve: {
  alias: {
    "@": path.resolve(__dirname, "client", "src"),
  },
},
```

#### 2. **Server/Client Import Conflicts (CRÍTICO)**
```typescript
// ❌ PROBLEMA: Server importando código do cliente
import { MarketDataOrchestrator } from '../../client/src/services/api/market-data-orchestrator';

// ✅ SOLUÇÃO: Remover imports de cliente no servidor
// import { MarketDataOrchestrator } from '../../client/src/services/api/market-data-orchestrator';
```

#### 3. **Missing Dependencies (BLOQUEANTE)**
```bash
# ❌ PROBLEMA: Packages em falta
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'cors'

# ✅ SOLUÇÃO: Instalar dependências
npm install cors express-rate-limit helmet stripe jsonwebtoken bcryptjs redis lru-cache nanoid eventemitter3 ws
```

#### 4. **Environment Variables (BLOQUEANTE)**
```typescript
// ❌ PROBLEMA: import.meta.env undefined no servidor
TypeError: Cannot read properties of undefined (reading 'VITE_FMP_API_KEY')

// ✅ SOLUÇÃO: Configurar .env
VITE_FINNHUB_API_KEY=demo
VITE_ALPHA_VANTAGE_API_KEY=demo
VITE_FMP_API_KEY=demo
```

#### 5. **Crypto Module Browser Compatibility (BLOQUEANTE)**
```typescript
// ❌ PROBLEMA: Node.js crypto no cliente
Module "crypto" has been externalized for browser compatibility

// ✅ SOLUÇÃO: Client-side data sanitizer
import { clientDataSanitizer } from './client-data-sanitizer';
```

#### 6. **Lottie Import/Component Mismatch (FUNCIONAL)**
```typescript
// ❌ PROBLEMA: Import incorreto
import { Player } from '@lottiefiles/react-lottie-player';
// ... usa DotLottieReact (indefinido)

// ✅ SOLUÇÃO: Import correto
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heroAnimationLottie from '../assets/hero-animation.lottie';
```

---

## 🚨 Checklist de Diagnóstico Rápido

### **Passo 1: Verificar se servidor inicia**
```bash
cd "/path/to/project"
npm run dev
# Deve mostrar: "🚀 Stock Analysis App is running!"
```

### **Passo 2: Testar resposta básica**
```bash
curl -s "http://localhost:8080" | head -5
# Deve retornar HTML válido
```

### **Passo 3: Verificar console do navegador**
- Abrir DevTools (F12)
- Ir para Console
- Procurar erros de JavaScript

### **Passo 4: Verificar build**
```bash
npm run build
# Deve incluir: hero-animation-LDrYPLKi.lottie
```

---

## 🔧 Soluções por Tipo de Erro

### **🟥 ERRO: Tela Branca Completa**

#### **Diagnóstico:**
```bash
# 1. Verificar se servidor responde
curl -v "http://localhost:8080"

# 2. Verificar processos
ps aux | grep tsx | grep -v grep

# 3. Verificar porta
lsof -i :8080
```

#### **Soluções:**

**A. Server não inicia:**
```bash
# Matar processos antigos
pkill -f "tsx.*server"
lsof -ti:8080 | xargs kill -9

# Verificar dependências
npm install

# Verificar .env
cat .env
```

**B. Vite config erro:**
```typescript
// Corrigir vite.config.ts
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.lottie"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "client", "dist", "public"),
  },
});
```

**C. Server simples de emergência:**
```typescript
// server/simple-server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, '..', 'client', 'dist', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'public', 'index.html'));
});

app.listen(8080, () => console.log('🚀 Server running on http://localhost:8080'));
```

### **🟨 ERRO: Animação não aparece (app funciona)**

#### **Diagnóstico:**
```bash
# 1. Verificar arquivo de animação
ls -la client/src/assets/hero-animation.lottie

# 2. Verificar import no código
grep -n "DotLottieReact\|Player" client/src/pages/landing.tsx

# 3. Verificar console browser
# Procurar: "DotLottieReact is not defined"
```

#### **Soluções:**

**A. Import incorreto:**
```typescript
// ✅ CORRETO
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heroAnimationLottie from '../assets/hero-animation.lottie';

// Usar:
<DotLottieReact
  src={heroAnimationLottie}
  loop
  autoplay
  style={{ 
    height: 'clamp(400px, 50vw, 600px)', 
    width: 'clamp(400px, 50vw, 600px)',
    maxHeight: '600px',
    maxWidth: '600px',
    filter: 'contrast(1.1) brightness(1.05) saturate(1.1)',
    imageRendering: 'crisp-edges'
  }}
  renderer="svg"
  rendererSettings={{
    preserveAspectRatio: 'xMidYMid meet',
    clearCanvas: true,
    progressiveLoad: false,
    hideOnTransparent: true
  }}
/>
```

**B. Arquivo de animação em falta:**
```bash
# Copiar do GitHub
git show origin/main:client/src/assets/hero-animation.lottie > client/src/assets/hero-animation.lottie

# Verificar tamanho (deve ser ~38KB)
ls -lh client/src/assets/hero-animation.lottie
```

**C. TypeScript declarations:**
```typescript
// client/src/types/lottie.d.ts
declare module "*.lottie" {
  const src: string;
  export default src;
}
```

### **🟧 ERRO: Dependencies**

#### **Instalar todas as dependências necessárias:**
```bash
npm install @lottiefiles/dotlottie-react@0.14.1
npm install cors express-rate-limit helmet stripe
npm install jsonwebtoken bcryptjs redis lru-cache nanoid eventemitter3 ws
```

#### **Verificar package.json:**
```json
{
  "dependencies": {
    "@lottiefiles/dotlottie-react": "^0.14.1",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.5.1",
    "helmet": "^8.1.0"
  }
}
```

### **🟪 ERRO: Crypto Module Browser**

#### **Solução: Client Data Sanitizer**
```typescript
// Substituir imports de servidor no cliente
// ❌ import { dataSanitizer } from '../../../server/security/data-sanitizer';
// ✅ import { clientDataSanitizer } from './client-data-sanitizer';
```

---

## 📁 Estrutura de Arquivos Críticos

### **Lottie Animation Files:**
```
client/src/assets/
├── hero-animation.lottie (38KB) ← Principal
├── hero-animation.json (backup)
└── ...

client/src/types/
└── lottie.d.ts ← TypeScript declarations
```

### **Configuração Files:**
```
/
├── vite.config.ts ← Configuração principal
├── .env ← Variáveis ambiente
├── package.json ← Dependências
└── client/src/pages/landing.tsx ← Implementação
```

---

## 🎯 Implementação de Referência (GitHub Working)

### **Imports (exatos do GitHub):**
```typescript
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heroAnimationLottie from '../assets/hero-animation.lottie';
```

### **Component Usage (exato do GitHub):**
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.8, delay: 1.2 }}
  className="flex justify-center items-center"
>
  <DotLottieReact
    src={heroAnimationLottie}
    loop
    autoplay
    style={{ 
      height: 'clamp(400px, 50vw, 600px)', 
      width: 'clamp(400px, 50vw, 600px)',
      maxHeight: '600px',
      maxWidth: '600px',
      filter: 'contrast(1.1) brightness(1.05) saturate(1.1)',
      imageRendering: 'crisp-edges'
    }}
    renderer="svg"
    rendererSettings={{
      preserveAspectRatio: 'xMidYMid meet',
      clearCanvas: true,
      progressiveLoad: false,
      hideOnTransparent: true
    }}
  />
</motion.div>
```

---

## 🚀 Comandos de Emergência

### **Reset Completo:**
```bash
# 1. Matar todos os processos
pkill -f "tsx.*server"
lsof -ti:8080 | xargs kill -9

# 2. Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# 3. Rebuild
npm run build

# 4. Servidor simples
npx tsx server/simple-server.ts
```

### **Verificação Rápida:**
```bash
# Build deve incluir a animação
npm run build | grep -i lottie

# Servidor deve responder
curl -s "http://localhost:8080" | head -5

# Arquivo de animação deve existir
ls -lh client/src/assets/hero-animation.lottie
```

### **Rollback para Versão Funcionando:**
```bash
# Copiar implementação exata do GitHub
git show origin/main:client/src/pages/landing.tsx > temp_landing.tsx
git show origin/main:client/src/assets/hero-animation.lottie > client/src/assets/hero-animation.lottie

# Aplicar se necessário
cp temp_landing.tsx client/src/pages/landing.tsx
```

---

## 📊 Logs de Troubleshooting

### **Sucesso Indicators:**
```bash
✓ 3342 modules transformed
✓ hero-animation-LDrYPLKi.lottie (38KB)
🚀 Server running on http://localhost:8080
```

### **Error Patterns:**
```bash
❌ "import.meta.dirname" → Vite config issue
❌ "DotLottieReact is not defined" → Import issue  
❌ "Cannot find package" → Dependencies issue
❌ "crypto externalized" → Browser compatibility issue
❌ "EADDRINUSE" → Port conflict
❌ "Connection refused" → Server not running
```

---

## 🎯 Prevenção de Problemas Futuros

### **1. Sempre verificar antes de mudanças:**
```bash
# Test da animação antes de modificar
curl -s "http://localhost:8080" | grep -i lottie
```

### **2. Backup dos arquivos críticos:**
```bash
# Backup automático
cp client/src/pages/landing.tsx client/src/pages/landing.tsx.backup
cp client/src/assets/hero-animation.lottie client/src/assets/hero-animation.lottie.backup
```

### **3. Testes regulares:**
```bash
# Script de teste
npm run build && echo "✅ Build OK" || echo "❌ Build FAIL"
curl -s "http://localhost:8080" >/dev/null && echo "✅ Server OK" || echo "❌ Server FAIL"
```

---

**Última atualização**: 2025-06-22  
**Status**: ✅ Funcionando  
**Versão testada**: Node.js 22.12.0, Vite 5.4.19  
**Animação**: hero-animation.lottie (38KB) funcionando perfeitamente