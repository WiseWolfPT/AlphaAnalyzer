import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Utility function to get available port
const getPort = () => {
  return parseInt(process.env.VITE_PORT || '3000', 10);
};

// Utility function to get HMR port
const getHMRPort = () => {
  const basePort = getPort();
  return basePort + 1; // Use next port for HMR to avoid conflicts
};

export default defineConfig({
  // Set base URL for production builds
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
  
  plugins: [
    react({
      jsxRuntime: 'automatic',
      // Optimize for development
      fastRefresh: true,
      babel: {
        plugins: [
          // Add babel plugins for optimization
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    // Bundle analyzer for optimization
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // Better visualization
    }),
  ],
  server: {
    // Multiple host binding options for macOS compatibility
    host: process.env.VITE_HOST || '0.0.0.0',
    port: getPort(),
    strictPort: false, // Allow automatic port fallback
    
    // Optimized for macOS development
    cors: {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        // Add common development ports
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    
    // Enhanced HMR configuration
    hmr: {
      overlay: true,
      port: getHMRPort(),
      // Multiple host options for HMR
      host: 'localhost',
      // Optimized for macOS
      clientPort: getHMRPort(),
    },
    
    // File system configuration
    fs: {
      strict: false,
      // Allow access to parent directories
      allow: ['..'],
    },
    
    // Development server optimizations
    watch: {
      // Optimize for macOS file watching
      usePolling: false,
      interval: 100,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
    
    // Enhanced proxy configuration
    proxy: {
      // API proxy with enhanced configuration
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: false, // Disable WebSocket proxying to avoid conflicts
        timeout: 30000, // 30 second timeout
        followRedirects: true,
        rewrite: (path) => path, // Don't rewrite paths
        // Enhanced error handling
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🔴 Proxy error:', err.message);
            console.log(`🔴 Failed request: ${req.method} ${req.url}`);
            // Graceful error handling
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Proxy Error', 
                message: 'Backend server unavailable',
                timestamp: new Date().toISOString()
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`🔄 Proxy request: ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}${proxyReq.path}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`✅ Proxy response: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        }
      },
      // WebSocket proxy for real-time data
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
        // Enhanced WebSocket error handling
        configure: (proxy, _options) => {
          proxy.on('error', (err) => {
            console.log('🔴 WebSocket proxy error:', err.message);
          });
          proxy.on('open', () => {
            console.log('🟢 WebSocket proxy connection opened');
          });
          proxy.on('close', () => {
            console.log('🔴 WebSocket proxy connection closed');
          });
        }
      }
    },
    
    // Performance optimizations for development
    middlewareMode: false,
    origin: 'http://localhost:3000',
  },
  assetsInclude: ["**/*.lottie", "**/*.json"],
  
  // Enhanced optimization for development
  optimizeDeps: {
    // Force pre-bundling of these dependencies for faster dev startup
    include: [
      'lottie-react',
      'react',
      'react-dom',
      'wouter',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'chart.js',
      'react-chartjs-2',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
    // Exclude problematic dependencies
    exclude: ['@vite/client', '@vite/env'],
    // Force optimization for dependencies that might cause issues
    force: process.env.NODE_ENV === 'development',
  },
  
  // Enhanced development configuration
  define: {
    // Global constants for development
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
    // API configuration
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
    'process.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || 'ws://localhost:3001'),
  },
  
  // Enhanced CSS configuration
  css: {
    devSourcemap: true,
    // Optimize CSS processing for development
    preprocessorOptions: {
      css: {
        charset: false,
      },
    },
  },
  
  // Enhanced Esbuild configuration for development
  esbuild: {
    // Optimize for development
    target: 'es2020',
    logLevel: 'info',
    // Source map configuration for better debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // JSX configuration
    jsx: 'automatic',
    jsxDev: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      // DON'T externalize React - include it in the bundle
      external: [],
      output: {
        // Aggressive chunk splitting with micro-bundles
        manualChunks: (id) => {
          // Filter out empty chunks that only contain monitoring or streaming utilities
          if (id.includes('web-vitals') && id.includes('node_modules')) {
            return null; // Don't create separate chunk for web-vitals
          }
          if (id.includes('stream') && id.includes('node_modules') && 
              (id.includes('buffer') || id.includes('events'))) {
            return null; // Don't create separate chunk for stream utilities
          }
          // Critical vendors (tiny bundle for first paint)
          if (id.includes('node_modules/wouter') ||
              id.includes('node_modules/react/jsx-runtime')) {
            return 'critical-vendor';
          }
          
          // React ecosystem (separate from core)
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          
          // Route-specific micro-bundles
          if (id.includes('/pages/landing') || id.includes('lottie')) {
            return 'route-landing';
          }
          
          // AGGRESSIVE CHARTS SPLITTING (Previously 289KB)
          // Chart.js core - very granular splitting
          if (id.includes('chart.js/dist/chart.esm.js') ||
              id.includes('chart.js/dist/core/core.') ||
              id.includes('chart.js/dist/core/core.registry.js')) {
            return 'charts-core-registry';
          }
          
          if (id.includes('chart.js/dist/core/') ||
              id.includes('chart.js/dist/helpers/')) {
            return 'charts-core-helpers';
          }
          
          if (id.includes('chart.js/dist/scales/scale.linear.js') ||
              id.includes('chart.js/dist/scales/scale.category.js')) {
            return 'charts-scales-basic';
          }
          
          if (id.includes('chart.js/dist/scales/')) {
            return 'charts-scales-extended';
          }
          
          if (id.includes('chart.js/dist/controllers/controller.bar.js') ||
              id.includes('chart.js/dist/controllers/controller.line.js')) {
            return 'charts-controllers-basic';
          }
          
          if (id.includes('chart.js/dist/controllers/')) {
            return 'charts-controllers-extended';
          }
          
          if (id.includes('chart.js/dist/elements/element.bar.js') ||
              id.includes('chart.js/dist/elements/element.line.js') ||
              id.includes('chart.js/dist/elements/element.point.js')) {
            return 'charts-elements-basic';
          }
          
          if (id.includes('chart.js/dist/elements/')) {
            return 'charts-elements-extended';
          }
          
          if (id.includes('chart.js/dist/plugins/plugin.tooltip.js') ||
              id.includes('chart.js/dist/plugins/plugin.legend.js')) {
            return 'charts-plugins-basic';
          }
          
          if (id.includes('chart.js/dist/plugins/')) {
            return 'charts-plugins-extended';
          }
          
          if (id.includes('chart.js/auto') ||
              id.includes('chart.js/dist/chart.js')) {
            return 'charts-auto';
          }
          
          if (id.includes('chart.js')) {
            return 'charts-misc';
          }
          
          if (id.includes('react-chartjs-2/dist/') ||
              id.includes('react-chartjs-2/src/')) {
            return 'charts-react-adapter';
          }
          
          // Chart component bundles (by chart type)
          if (id.includes('/components/charts/price-chart') ||
              id.includes('/components/charts/chart-container') ||
              id.includes('/components/ui/lightweight-chart')) {
            return 'charts-components-basic';
          }
          
          if (id.includes('/components/charts/revenue-chart') ||
              id.includes('/components/charts/revenue-segment-chart') ||
              id.includes('/components/charts/ebitda-chart')) {
            return 'charts-components-financial';
          }
          
          if (id.includes('/components/charts/free-cash-flow-chart') ||
              id.includes('/components/charts/net-income-chart') ||
              id.includes('/components/charts/eps-chart')) {
            return 'charts-components-cash';
          }
          
          if (id.includes('/components/charts/cash-debt-chart') ||
              id.includes('/components/charts/dividends-chart') ||
              id.includes('/components/charts/return-capital-chart')) {
            return 'charts-components-debt';
          }
          
          if (id.includes('/components/charts/shares-chart') ||
              id.includes('/components/charts/ratios-chart') ||
              id.includes('/components/charts/valuation-chart') ||
              id.includes('/components/charts/expenses-chart')) {
            return 'charts-components-analysis';
          }
          
          if (id.includes('/components/charts/draggable-chart') ||
              id.includes('/hooks/use-chart-layout')) {
            return 'charts-components-layout';
          }
          
          // DnD Kit splitting (for charts dragging)
          if (id.includes('@dnd-kit/core/dist/') ||
              id.includes('@dnd-kit/utilities/dist/')) {
            return 'dnd-core';
          }
          
          if (id.includes('@dnd-kit/sortable/dist/')) {
            return 'dnd-sortable';
          }
          
          if (id.includes('@dnd-kit/') && !id.includes('core') && !id.includes('sortable')) {
            return 'dnd-extras';
          }
          
          // AdvancedCharts page split
          if (id.includes('/pages/AdvancedCharts')) {
            return 'route-charts-page';
          }
          
          // Other routes
          if (id.includes('/pages/portfolios') ||
              id.includes('/components/portfolio')) {
            return 'route-portfolios';
          }
          
          if (id.includes('/pages/earnings') ||
              id.includes('/components/earnings')) {
            return 'route-earnings';
          }
          
          if (id.includes('/pages/transcripts') ||
              id.includes('/components/transcripts')) {
            return 'route-transcripts';
          }
          
          if (id.includes('/pages/watchlists') ||
              id.includes('/components/watchlist')) {
            return 'route-watchlists';
          }
          
          if (id.includes('/pages/auth') ||
              id.includes('/pages/Login') ||
              id.includes('/pages/Register')) {
            return 'route-auth';
          }
          
          if (id.includes('/pages/admin') ||
              id.includes('/components/admin')) {
            return 'route-admin';
          }
          
          if (id.includes('/pages/intrinsic-value') ||
              id.includes('/components/valuation')) {
            return 'route-valuation';
          }
          
          // AGGRESSIVE VENDOR SPLITTING (Previously 237KB)
          // Radix UI - Split by component type
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-alert-dialog')) {
            return 'vendor-ui-dialogs';
          }
          
          if (id.includes('@radix-ui/react-popover') ||
              id.includes('@radix-ui/react-tooltip') ||
              id.includes('@radix-ui/react-hover-card')) {
            return 'vendor-ui-floating';
          }
          
          if (id.includes('@radix-ui/react-dropdown-menu') ||
              id.includes('@radix-ui/react-context-menu')) {
            return 'vendor-ui-menus';
          }
          
          if (id.includes('@radix-ui/react-select') ||
              id.includes('@radix-ui/react-combobox')) {
            return 'vendor-ui-inputs';
          }
          
          if (id.includes('@radix-ui/react-tabs') ||
              id.includes('@radix-ui/react-accordion') ||
              id.includes('@radix-ui/react-collapsible')) {
            return 'vendor-ui-layout';
          }
          
          if (id.includes('@radix-ui/react-toast') ||
              id.includes('@radix-ui/react-alert')) {
            return 'vendor-ui-feedback';
          }
          
          if (id.includes('@radix-ui/react-navigation-menu') ||
              id.includes('@radix-ui/react-menubar')) {
            return 'vendor-ui-navigation';
          }
          
          if (id.includes('@radix-ui/react-primitive') ||
              id.includes('@radix-ui/react-slot') ||
              id.includes('@radix-ui/react-compose-refs')) {
            return 'vendor-ui-primitives';
          }
          
          if (id.includes('@radix-ui')) {
            return 'vendor-ui-base';
          }
          
          // Forms - Split by functionality
          if (id.includes('react-hook-form/dist/index.esm') && 
              id.includes('useForm')) {
            return 'vendor-forms-core';
          }
          
          if (id.includes('react-hook-form/dist/') && 
              (id.includes('useController') || id.includes('useWatch'))) {
            return 'vendor-forms-controllers';
          }
          
          if (id.includes('react-hook-form') || 
              id.includes('@hookform/resolvers')) {
            return 'vendor-forms-extended';
          }
          
          // Validation - Split by size
          if (id.includes('zod/lib/types') ||
              id.includes('zod/lib/ZodSchema')) {
            return 'vendor-validation-core';
          }
          
          if (id.includes('zod/lib/') && 
              (id.includes('string') || id.includes('number') || id.includes('boolean'))) {
            return 'vendor-validation-primitives';
          }
          
          if (id.includes('zod')) {
            return 'vendor-validation-extended';
          }
          
          // Animation micro-bundles
          if (id.includes('lottie-react') || id.includes('lottie-web')) {
            return 'vendor-anim-lottie';
          }
          
          if (id.includes('framer-motion/dist/es/render') ||
              id.includes('framer-motion/dist/es/animation')) {
            return 'vendor-anim-framer-core';
          }
          
          if (id.includes('framer-motion/dist/es/gestures') ||
              id.includes('framer-motion/dist/es/components')) {
            return 'vendor-anim-framer-gestures';
          }
          
          if (id.includes('framer-motion')) {
            return 'vendor-anim-framer';
          }
          
          // Icon micro-bundles (split by usage)
          if (id.includes('lucide-react') && 
              (id.includes('ChevronDown') || id.includes('Menu') || id.includes('X'))) {
            return 'vendor-icons-ui';
          }
          
          if (id.includes('lucide-react') && 
              (id.includes('TrendingUp') || id.includes('Activity') || id.includes('BarChart'))) {
            return 'vendor-icons-charts';
          }
          
          if (id.includes('lucide-react') && 
              (id.includes('Home') || id.includes('Settings') || id.includes('User'))) {
            return 'vendor-icons-navigation';
          }
          
          if (id.includes('lucide-react')) {
            return 'vendor-icons-general';
          }
          
          // State management micro-bundles
          if (id.includes('@tanstack/react-query/build/lib/QueryClient') ||
              id.includes('@tanstack/react-query/build/lib/QueryCache')) {
            return 'vendor-state-core';
          }
          
          if (id.includes('@tanstack/react-query/build/lib/') && 
              (id.includes('mutations') || id.includes('hydration'))) {
            return 'vendor-state-mutations';
          }
          
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-state-query';
          }
          
          // Utility micro-bundles
          if (id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'vendor-utils-css';
          }
          
          if (id.includes('class-variance-authority')) {
            return 'vendor-utils-variants';
          }
          
          if (id.includes('date-fns/format') ||
              id.includes('date-fns/parse')) {
            return 'vendor-utils-date-format';
          }
          
          if (id.includes('date-fns/') && 
              (id.includes('add') || id.includes('sub') || id.includes('difference'))) {
            return 'vendor-utils-date-math';
          }
          
          if (id.includes('date-fns')) {
            return 'vendor-utils-date';
          }
          
          // Service micro-bundles
          if (id.includes('@supabase/supabase-js/dist/main/SupabaseClient') ||
              id.includes('@supabase/supabase-js/dist/main/SupabaseAuthClient')) {
            return 'vendor-service-supabase-core';
          }
          
          if (id.includes('@supabase/supabase-js/dist/main/') && 
              (id.includes('realtime') || id.includes('storage'))) {
            return 'vendor-service-supabase-realtime';
          }
          
          if (id.includes('@supabase/supabase-js')) {
            return 'vendor-service-supabase';
          }
          
          // Payment micro-bundles
          if (id.includes('@stripe/stripe-js')) {
            return 'vendor-payment-stripe';
          }
          
          if (id.includes('@stripe/') || id.includes('stripe')) {
            return 'vendor-payment-extended';
          }
          
          // I18n micro-bundles
          if (id.includes('i18next/dist/esm/i18next') ||
              id.includes('react-i18next/dist/es/useTranslation')) {
            return 'vendor-i18n-core';
          }
          
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n-extended';
          }
          
          // Performance libraries
          if (id.includes('react-window') || 
              id.includes('react-virtuoso')) {
            return 'vendor-perf-virtualization';
          }
          
          if (id.includes('react-resizable-panels')) {
            return 'vendor-perf-resizable';
          }
          
          // Small utilities (group by size)
          if (id.includes('node_modules') && (
            id.includes('nanoid') ||
            id.includes('eventemitter3')
          )) {
            return 'vendor-utils-tiny';
          }
          
          if (id.includes('node_modules') && (
            id.includes('axios') ||
            id.includes('idb')
          )) {
            return 'vendor-utils-medium';
          }
          
          if (id.includes('node_modules') && (
            id.includes('web-vitals')
          )) {
            return 'vendor-utils-tiny';
          }
          
          // Security libraries
          if (id.includes('node_modules') && (
            id.includes('bcryptjs') ||
            id.includes('jsonwebtoken')
          )) {
            return 'vendor-security';
          }
          
          // Development and error handling
          if (id.includes('node_modules') && (
            id.includes('react-error-boundary') ||
            id.includes('pulltorefreshjs')
          )) {
            return 'vendor-dev-support';
          }
          
          // Polyfills and compatibility
          if (id.includes('node_modules') && (
            id.includes('core-js') ||
            id.includes('regenerator-runtime')
          )) {
            return 'vendor-polyfills';
          }
          
          // Additional vendor splitting to reduce vendor-misc
          if (id.includes('node_modules') && (
            id.includes('tslib') ||
            id.includes('object-assign') ||
            id.includes('prop-types')
          )) {
            return 'vendor-utils-react';
          }
          
          if (id.includes('node_modules') && (
            id.includes('scheduler') ||
            id.includes('react-reconciler')
          )) {
            return 'vendor-react-internals';
          }
          
          if (id.includes('node_modules') && (
            id.includes('mitt') ||
            id.includes('uuid') ||
            id.includes('js-cookie')
          )) {
            return 'vendor-utils-browser';
          }
          
          if (id.includes('node_modules') && (
            id.includes('lodash') ||
            id.includes('ramda') ||
            id.includes('underscore')
          )) {
            return 'vendor-utils-functional';
          }
          
          if (id.includes('node_modules') && (
            id.includes('moment') ||
            id.includes('dayjs')
          )) {
            return 'vendor-utils-datetime';
          }
          
          if (id.includes('node_modules') && (
            id.includes('rxjs') ||
            id.includes('observable')
          )) {
            return 'vendor-utils-reactive';
          }
          
          if (id.includes('node_modules') && (
            id.includes('buffer') ||
            id.includes('process') ||
            id.includes('util')
          )) {
            return 'vendor-polyfills-node';
          }
          
          if (id.includes('node_modules') && (
            id.includes('crypto') ||
            id.includes('hash') ||
            id.includes('md5') ||
            id.includes('sha')
          )) {
            return 'vendor-utils-crypto';
          }
          
          if (id.includes('node_modules') && (
            id.includes('async') ||
            id.includes('promise') ||
            id.includes('bluebird')
          )) {
            return 'vendor-utils-async';
          }
          
          if (id.includes('node_modules') && (
            id.includes('path') ||
            id.includes('querystring') ||
            id.includes('url')
          )) {
            return 'vendor-utils-url';
          }
          
          if (id.includes('node_modules') && (
            id.includes('immutable') ||
            id.includes('immer')
          )) {
            return 'vendor-utils-immutable';
          }
          
          if (id.includes('node_modules') && (
            id.includes('validator') ||
            id.includes('escape-html') ||
            id.includes('sanitize')
          )) {
            return 'vendor-utils-validation';
          }
          
          if (id.includes('node_modules') && (
            id.includes('compression') ||
            id.includes('gzip') ||
            id.includes('deflate')
          )) {
            return 'vendor-utils-compression';
          }
          
          if (id.includes('node_modules') && (
            id.includes('stream') ||
            id.includes('events') ||
            id.includes('buffer')
          )) {
            return 'vendor-polyfills-node';
          }
          
          if (id.includes('node_modules') && (
            id.includes('debug') ||
            id.includes('console') ||
            id.includes('log')
          )) {
            return 'vendor-utils-debug';
          }
          
          if (id.includes('node_modules') && (
            id.includes('color') ||
            id.includes('chalk') ||
            id.includes('ansi')
          )) {
            return 'vendor-utils-colors';
          }
          
          if (id.includes('node_modules') && (
            id.includes('babel') ||
            id.includes('transform') ||
            id.includes('preset')
          )) {
            // Exclude build tools from production builds as they cause initialization errors
            if (process.env.NODE_ENV === 'production') {
              return null;
            }
            return 'vendor-build-tools';
          }
          
          if (id.includes('node_modules') && (
            id.includes('webpack') ||
            id.includes('rollup') ||
            id.includes('vite')
          )) {
            return 'vendor-bundlers';
          }
          
          if (id.includes('node_modules') && (
            id.includes('postcss') ||
            id.includes('autoprefixer') ||
            id.includes('csstype')
          )) {
            return 'vendor-css-tools';
          }
          
          if (id.includes('node_modules') && (
            id.includes('typescript') ||
            id.includes('ts-') ||
            id.includes('@types')
          )) {
            return 'vendor-typescript';
          }
          
          if (id.includes('node_modules') && (
            id.includes('eslint') ||
            id.includes('prettier') ||
            id.includes('lint')
          )) {
            return 'vendor-linting';
          }
          
          if (id.includes('node_modules') && (
            id.includes('test') ||
            id.includes('jest') ||
            id.includes('vitest') ||
            id.includes('spec') ||
            id.includes('@testing-library') ||
            id.includes('jsdom')
          )) {
            // Exclude testing libraries from production builds entirely
            if (process.env.NODE_ENV === 'production') {
              return null;
            }
            return 'vendor-testing';
          }
          
          // Default catch-all for remaining node_modules (should be minimal now)
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        }
      }
    },
    
    // Aggressive tree shaking configuration
    treeshake: true,
    
    // Chunk size warnings (aggressive splitting target)
    chunkSizeWarningLimit: 150,
    
    // Disable source maps in production for security and performance
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Temporarily disable minification to fix initialization errors
    minify: false,
    
    // Additional optimization settings
    target: 'es2020',
    assetsInlineLimit: 8192, // Inline assets smaller than 8kb (increased)
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Reduce imports overhead
    reportCompressedSize: false
  },
});