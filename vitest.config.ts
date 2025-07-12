/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { config } from 'dotenv';

// Carregar variáveis de ambiente do .env
config();

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/test-setup.ts'],
    include: [
      'client/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/test-setup.ts',
        '**/*.d.ts',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/migrations/**',
        '**/scripts/**'
      ],
      // Coverage thresholds for quality gate
      thresholds: {
        global: {
          branches: 30,
          functions: 30,
          lines: 30,
          statements: 30
        },
        // More strict thresholds for critical modules
        './client/src/contexts/': {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        },
        './client/src/utils/': {
          branches: 40,
          functions: 40,
          lines: 40,
          statements: 40
        }
      }
    },
    // Mock configuration - use new syntax
    server: {
      deps: {
        inline: ['@testing-library/user-event']
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@server': resolve(__dirname, './server'),
      '@client': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared')
    }
  }
});