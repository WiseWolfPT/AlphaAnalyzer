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
  plugins: [
    react({
      jsxRuntime: 'automatic',
      // Optimize for development
      fastRefresh: true,
    }),
    // Bundle analyzer for optimization
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
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
        target: 'http://localhost:3003',
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
      'recharts',
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
      output: {
        manualChunks: (id) => {
          // Core vendor libraries (keep small and essential)
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor';
          }
          
          // Charts and visualization - separate lazy chunks
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          
          // Lottie - separate lazy chunk (only loaded on landing)
          if (id.includes('lottie-react') || id.includes('lottie-web')) {
            return 'lottie';
          }
          
          // Lucide icons - separate chunk for better caching
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Radix UI components - split into smaller, focused chunks
          if (id.includes('@radix-ui/react-dialog') || 
              id.includes('@radix-ui/react-alert-dialog') ||
              id.includes('@radix-ui/react-popover') ||
              id.includes('@radix-ui/react-toast')) {
            return 'ui-overlays';
          }
          
          if (id.includes('@radix-ui/react-dropdown-menu') ||
              id.includes('@radix-ui/react-select') ||
              id.includes('@radix-ui/react-navigation-menu') ||
              id.includes('@radix-ui/react-menubar')) {
            return 'ui-navigation';
          }
          
          if (id.includes('@radix-ui/react-tabs') ||
              id.includes('@radix-ui/react-accordion') ||
              id.includes('@radix-ui/react-collapsible')) {
            return 'ui-layout';
          }
          
          if (id.includes('@radix-ui')) {
            return 'ui-base';
          }
          
          // React Query and state management
          if (id.includes('@tanstack/react-query')) {
            return 'state';
          }
          
          // Routing and navigation
          if (id.includes('wouter')) {
            return 'routing';
          }
          
          // Date and utility libraries
          if (id.includes('date-fns') || 
              id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('class-variance-authority')) {
            return 'utils';
          }
          
          // Authentication and data services
          if (id.includes('@supabase/supabase-js')) {
            return 'supabase';
          }
          
          // Form handling
          if (id.includes('react-hook-form') || 
              id.includes('@hookform/resolvers') ||
              id.includes('zod')) {
            return 'forms';
          }
          
          // Animation libraries (except lottie)
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          
          // Smaller utility libraries
          if (id.includes('node_modules') && (
            id.includes('nanoid') ||
            id.includes('eventemitter3') ||
            id.includes('axios') ||
            id.includes('idb')
          )) {
            return 'libs-small';
          }
          
          // Large utility libraries get their own chunks
          if (id.includes('node_modules') && (
            id.includes('stripe') ||
            id.includes('express') ||
            id.includes('better-sqlite3') ||
            id.includes('drizzle-orm')
          )) {
            return 'libs-heavy';
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
    
    // Chunk size warnings (reduced for better performance)
    chunkSizeWarningLimit: 300,
    
    // Disable source maps in production for security and performance
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Enhanced minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn'],
        unused: true,
        dead_code: true,
        side_effects: false
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // Additional optimization settings
    target: 'es2020',
    assetsInlineLimit: 8192, // Inline assets smaller than 8kb (increased)
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Reduce imports overhead
    reportCompressedSize: false
  },
});
