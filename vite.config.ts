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
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: true,
    },
    fs: {
      strict: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
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
