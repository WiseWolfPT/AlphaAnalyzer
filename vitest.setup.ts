/**
 * Vitest Setup File
 * Configurações globais para todos os testes
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup após cada teste
afterEach(() => {
  cleanup();
});

// Mock do matchMedia (necessário para alguns componentes)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do scrollTo
window.scrollTo = vi.fn();

// Mock do navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
});

// Configurações do ambiente de teste
process.env.NODE_ENV = 'test';
process.env.VITE_API_BASE_URL = 'http://localhost:3001/api';

// Mock de console para reduzir ruído nos testes
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  // Ignorar warnings específicos do React que não são problemas reais
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: An invalid form control') ||
     args[0].includes('Warning: Failed prop type'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  // Ignorar warnings específicos
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: componentWillReceiveProps')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Mock de fetch global
global.fetch = vi.fn();

// Helper para resetar todos os mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Helper para criar mock de resposta de fetch
export const mockFetchResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response);
};

// Helper para criar mock de erro de fetch
export const mockFetchError = (message = 'Network error') => {
  return Promise.reject(new Error(message));
};

// Tipos úteis para testes
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

export interface MockStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Dados mock padrão
export const mockUser: MockUser = {
  id: 'test-user-123',
  email: 'test@alfalyzer.com',
  name: 'Test User',
  role: 'user',
};

export const mockAdminUser: MockUser = {
  id: 'admin-123',
  email: 'admin@alfalyzer.com',
  name: 'Admin User',
  role: 'admin',
};

export const mockStocks: MockStock[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.50,
    change: 2.34,
    changePercent: 1.35,
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 380.25,
    change: -1.25,
    changePercent: -0.33,
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 142.80,
    change: 0.85,
    changePercent: 0.60,
  },
];

// Helper para aguardar promises pendentes
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Helper para criar wrapper com providers
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};