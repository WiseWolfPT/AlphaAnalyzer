# Lottie Animation Patterns - Código Padrão

## 🎯 Padrões Corretos de Implementação

### 1. Import Patterns (Padrões de Importação)

#### Para arquivos .lottie (Moderno - Recomendado)
```typescript
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
```

#### Para arquivos .json (Tradicional)
```typescript
import { Player } from '@lottiefiles/react-lottie-player';
```

#### Import com asset local
```typescript
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heroAnimation from '../assets/hero-animation.lottie';
```

### 2. Component Usage Patterns (Padrões de Uso)

#### DotLottieReact - Padrão Atual Funcionando
```typescript
<DotLottieReact
  src="/hero-animation-v2.lottie"
  loop
  autoplay
  style={{ 
    height: 'clamp(300px, 50vw, 600px)', 
    width: 'clamp(300px, 50vw, 600px)',
    maxWidth: '100%',
    maxHeight: '100%'
  }}
/>
```

#### Player - Para arquivos JSON
```typescript
<Player
  autoplay
  loop
  src="/animation.json"
  style={{ height: '400px', width: '400px' }}
/>
```

#### Com Motion (Framer Motion)
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.8, delay: 1.2 }}
  className="flex justify-center items-center"
>
  <DotLottieReact
    src="/hero-animation-v2.lottie"
    loop
    autoplay
    style={{ 
      height: 'clamp(400px, 50vw, 600px)', 
      width: 'clamp(400px, 50vw, 600px)'
    }}
  />
</motion.div>
```

### 3. Vite Configuration Patterns

#### vite.config.ts
```typescript
export default defineConfig({
  // ... other config
  assetsInclude: ["**/*.lottie"], // Necessário para arquivos .lottie
})
```

### 4. TypeScript Declarations

#### types/lottie.d.ts
```typescript
declare module "*.lottie" {
  const src: string;
  export default src;
}
```

### 5. Error Boundaries

#### Wrapper com Error Boundary
```typescript
<ErrorBoundary fallback={<div>Animation failed to load</div>}>
  <DotLottieReact
    src="/hero-animation-v2.lottie"
    loop
    autoplay
  />
</ErrorBoundary>
```

### 6. Performance Optimizations

#### Lazy Loading Pattern
```typescript
const LazyLottie = React.lazy(() => 
  import('@lottiefiles/dotlottie-react').then(module => ({
    default: module.DotLottieReact
  }))
);

// Usage
<React.Suspense fallback={<div>Loading animation...</div>}>
  <LazyLottie src="/animation.lottie" />
</React.Suspense>
```

### 7. Common Issues & Solutions

#### ❌ Erro Comum
```typescript
// ERRADO: Importa Player mas usa DotLottieReact
import { Player } from '@lottiefiles/react-lottie-player';

// Depois no componente:
<DotLottieReact src="/animation.lottie" />  // Erro!
```

#### ✅ Correção
```typescript
// CORRETO: Import correto
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Componente:
<DotLottieReact src="/animation.lottie" />  // Funciona!
```

### 8. Deployment Patterns

#### Para GitHub Pages/Netlify/Vercel
```typescript
// Usar paths absolutos a partir de public/
<DotLottieReact src="/animations/hero.lottie" />

// OU import direto (mais confiável)
import animationData from './animation.json';
<Player animationData={animationData} />
```

### 9. File Structure

```
client/
├── public/
│   ├── hero-animation-v2.lottie  ✅ Usado atualmente
│   └── animations/
│       ├── loading.lottie
│       └── success.lottie
├── src/
│   ├── assets/
│   │   ├── hero-animation.lottie  ✅ Para imports
│   │   └── hero-animation.json
│   └── types/
│       └── lottie.d.ts
```

### 10. Dependencies Required

```json
{
  "dependencies": {
    "@lottiefiles/dotlottie-react": "^0.14.1",  // Para .lottie
    "@lottiefiles/react-lottie-player": "^3.6.0" // Para .json
  }
}
```

## 🔧 Troubleshooting Checklist

1. ✅ Import correto do componente
2. ✅ Arquivo de animação existe em public/
3. ✅ Vite config inclui .lottie files
4. ✅ TypeScript declarations para .lottie
5. ✅ Não há conflitos entre Player e DotLottieReact
6. ✅ Error boundary não está mascarando erros

## 📝 Histórico de Mudanças

- **Working Version**: Commit `96fc5db5` - Implementação correta
- **Broken Version**: Commit `a4a0c363` - Integração APIs removeu import
- **Fixed Version**: Atual - Import restaurado

---

**Última atualização**: 2025-06-22  
**Status**: ✅ Funcionando  
**Padrão testado**: Produção GitHub/Netlify/Vercel