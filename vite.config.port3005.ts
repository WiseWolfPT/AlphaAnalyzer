import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3005,
    strictPort: false, // Allow fallback to next available port
    hmr: {
      overlay: true,
      port: 3005
    },
    fs: {
      strict: false
    },
    proxy: {
      // API proxy with enhanced configuration
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
        timeout: 30000, // 30 second timeout
        followRedirects: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🔴 Proxy error [Port 3005]:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`🔄 Proxy request [Port 3005]: ${req.method} ${req.url} -> ${proxyReq.path}`);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`✅ Proxy response [Port 3005]: ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
        }
      },
      // WebSocket proxy for real-time data
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true
      }
    }
  },
  assetsInclude: ["**/*.lottie", "**/*.json"],
  optimizeDeps: {
    include: [
      '@lottiefiles/dotlottie-react', 
      '@lottiefiles/react-lottie-player',
      'react',
      'react-dom',
      'wouter'
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public-3005"),
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