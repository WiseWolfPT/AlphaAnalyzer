import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

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
      '@lottiefiles/dotlottie-react', 
      '@lottiefiles/react-lottie-player',
      'react',
      'react-dom',
      'wouter',
      'react/jsx-runtime',
      '@tanstack/react-query',
      'recharts',
      'framer-motion',
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
        manualChunks: {
          // Vendor libraries
          vendor: ['react', 'react-dom'],
          
          // Charts and visualization (split into smaller chunks)
          recharts: ['recharts'],
          lottie: [
            '@lottiefiles/dotlottie-react',
            '@lottiefiles/react-lottie-player'
          ],
          animations: ['framer-motion'],
          
          // UI components
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog'
          ],
          
          // Utils and hooks
          utils: [
            '@tanstack/react-query',
            'wouter',
            'date-fns',
            'clsx',
            'tailwind-merge'
          ],
          
          // Authentication and data
          auth: [
            '@supabase/supabase-js'
          ]
        }
      }
    },
    // Chunk size warnings (reduced for better performance)
    chunkSizeWarningLimit: 500,
    
    // Disable source maps in production for security and performance
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
});
