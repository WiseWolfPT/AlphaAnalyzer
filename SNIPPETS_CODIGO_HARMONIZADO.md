# Snippets de Código Harmonizado - Padrões Salvos

## 🎯 Filosofia: Harmonia entre Códigos

Este documento contém snippets de código testados e aprovados que devem ser seguidos para evitar conflitos entre diferentes partes do sistema.

---

## 📱 LOTTIE ANIMATIONS

### 🔧 Import Statements
```typescript
// ✅ PADRÃO CORRETO - Para arquivos .lottie
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// ✅ PADRÃO CORRETO - Para arquivos .json
import { Player } from '@lottiefiles/react-lottie-player';

// ✅ PADRÃO CORRETO - Com asset import
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import heroAnimationLottie from '../assets/hero-animation.lottie';
```

### 🎨 Component Usage
```typescript
// ✅ HERO ANIMATION - Padrão Testado
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
      height: 'clamp(300px, 50vw, 600px)', 
      width: 'clamp(300px, 50vw, 600px)',
      maxWidth: '100%',
      maxHeight: '100%'
    }}
  />
</motion.div>
```

---

## 🔗 API INTEGRATIONS

### 🛡️ Error Handling Pattern
```typescript
// ✅ PADRÃO APROVADO - Error Boundary
import { Component, ReactNode } from "react";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#0a0a0f',
          color: '#e4e7eb',
          minHeight: '100vh'
        }}>
          <div style={{ 
            backgroundColor: '#dc2626', 
            color: 'white', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h1>Application Error</h1>
            <p>Something went wrong:</p>
            <pre style={{ fontSize: '14px', marginTop: '10px' }}>
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              backgroundColor: '#60a5fa',
              color: '#0a0a0f',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 🔄 Router Pattern
```typescript
// ✅ PADRÃO APROVADO - Router com Lazy Loading
import { Switch, Route } from "wouter";
import React from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={DashboardReal} />
      <Route path="/insights" component={DashboardReal} />
      <Route path="/stock/:symbol" component={StockDetail} />
      <Route path="/portfolios" component={Portfolios} />
      <Route path="/watchlists" component={Watchlists} />
      
      {/* ✅ LAZY LOADING PATTERN */}
      <Route path="/real-time-demo" component={() => {
        const RealTimeDemo = React.lazy(() => import("@/pages/real-time-demo"));
        return (
          <React.Suspense fallback={<div>Loading...</div>}>
            <RealTimeDemo />
          </React.Suspense>
        );
      }} />
      
      <Route component={NotFound} />
    </Switch>
  );
}
```

---

## ⚙️ VITE CONFIGURATION

### 🔧 Vite Config Pattern
```typescript
// ✅ PADRÃO APROVADO - vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  // ✅ CRÍTICO: Para arquivos Lottie
  assetsInclude: ["**/*.lottie"],
  
  build: {
    outDir: "dist/public",
    sourcemap: true,
  },
  
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
```

### 📝 TypeScript Declarations
```typescript
// ✅ PADRÃO APROVADO - types/lottie.d.ts
declare module "*.lottie" {
  const src: string;
  export default src;
}

// ✅ PADRÃO APROVADO - vite-env.d.ts
/// <reference types="vite/client" />

declare module "*.lottie" {
  const src: string;
  export default src;
}
```

---

## 🎨 STYLING PATTERNS

### 🌈 Motion Animations
```typescript
// ✅ PADRÃO APROVADO - Framer Motion
import { motion } from "framer-motion";

// Configurações otimizadas
const ANIMATION_CONFIG = {
  FAST: { duration: 0.3, ease: "easeOut" },
  MEDIUM: { duration: 0.5, ease: "easeOut" },
  SLOW: { duration: 0.8, ease: "easeOut" }
} as const;

const DELAYS = {
  NONE: 0,
  FAST: 0.1,
  MEDIUM: 0.2,
  SLOW: 0.3
} as const;

// ✅ USAGE PATTERN
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={ANIMATION_CONFIG.SLOW}
  className="flex justify-center items-center"
>
  {/* Content */}
</motion.div>
```

---

## 📦 DEPENDENCIES MANAGEMENT

### 🔍 Package.json Pattern
```json
{
  "dependencies": {
    // ✅ LOTTIE LIBRARIES - Ambas necessárias
    "@lottiefiles/dotlottie-react": "^0.14.1",
    "@lottiefiles/react-lottie-player": "^3.6.0",
    
    // ✅ CORE LIBRARIES
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "framer-motion": "^11.13.1",
    "wouter": "^3.3.5",
    
    // ✅ UI LIBRARIES
    "@radix-ui/react-dialog": "^1.1.7",
    "lucide-react": "^0.453.0",
    
    // ✅ UTILITIES
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  }
}
```

---

## 🚀 DEPLOYMENT PATTERNS

### 🌐 GitHub Pages/Netlify/Vercel
```typescript
// ✅ PADRÃO APROVADO - Asset Loading
// Opção 1: Public path (simples)
<DotLottieReact src="/hero-animation-v2.lottie" />

// Opção 2: Import direto (mais confiável)
import animationData from './animation.json';
<Player animationData={animationData} />

// Opção 3: Conditional loading
const animationSrc = process.env.NODE_ENV === 'production' 
  ? '/hero-animation-v2.lottie'
  : '/hero-animation-v2.lottie';
```

---

## 🔒 SECURITY PATTERNS

### 🛡️ CSP Configuration
```typescript
// ✅ PADRÃO APROVADO - Content Security Policy
const isDevelopment = process.env.NODE_ENV === 'development';

const cspDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'", ...(isDevelopment ? ["'unsafe-eval'"] : [])],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'", "https:"],
  mediaSrc: ["'self'", "data:"],
};
```

---

## 📊 TESTING PATTERNS

### 🧪 Component Testing
```typescript
// ✅ PADRÃO APROVADO - Lottie Testing
import { render, screen } from '@testing-library/react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

test('Lottie animation renders correctly', () => {
  render(
    <DotLottieReact
      src="/test-animation.lottie"
      loop
      autoplay
      data-testid="lottie-animation"
    />
  );
  
  const animation = screen.getByTestId('lottie-animation');
  expect(animation).toBeInTheDocument();
});
```

---

## 🔄 MAINTENANCE PATTERNS

### 📋 Checklist para Novos Componentes
```typescript
// ✅ PADRÃO APROVADO - Checklist
/*
1. ✅ Import statements corretos
2. ✅ TypeScript types definidos
3. ✅ Error boundary implementado
4. ✅ Lazy loading se necessário
5. ✅ Styling responsivo
6. ✅ Accessibility attributes
7. ✅ Performance optimizations
8. ✅ Testing implementado
*/
```

---

## 📝 DOCUMENTATION PATTERNS

### 📚 Component Documentation
```typescript
/**
 * ✅ PADRÃO APROVADO - JSDoc
 * 
 * Hero Animation Component
 * 
 * @description Renders the main hero animation using DotLottieReact
 * @param {string} src - Path to the .lottie animation file
 * @param {boolean} loop - Whether the animation should loop
 * @param {boolean} autoplay - Whether the animation starts automatically
 * @param {CSSProperties} style - Custom styles for the animation
 * 
 * @example
 * <DotLottieReact
 *   src="/hero-animation-v2.lottie"
 *   loop
 *   autoplay
 *   style={{ height: '400px', width: '400px' }}
 * />
 */
```

---

**Última atualização**: 2025-06-22  
**Versão**: 1.0  
**Status**: ✅ Testado e Aprovado  
**Cobertura**: Lottie, API, Router, Vite, Styling, Deployment, Security, Testing