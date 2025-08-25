/**
 * Vitest Test Setup for Alfalyzer
 * International Markets Testing Environment (USA/EU)
 */

import React from 'react';
import { config } from 'dotenv';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Make React available globally for tests
global.React = React;

// Carregar .env antes de tudo para testes
config();

// Mock environment variables for tests
Object.assign(process.env, {
  NODE_ENV: 'test',
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
});

// Mock modules that don't work well in test environment
vi.mock('lottie-react', () => ({
  default: vi.fn(() => null),
}));

// Mock Intersection Observer for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for components that use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive design tests
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

// Mock navigator for PWA tests
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn(() => Promise.resolve({})),
    ready: Promise.resolve({}),
    controller: null,
  },
});

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: vi.fn(),
  } as Response)
);

// Mock currency exchange rates for international markets testing
export const mockExchangeRates = {
  USD: { EUR: 0.92 },
  EUR: { USD: 1.08 },
};

// Mock market data for US/EU stocks
export const mockMarketData = {
  indices: {
    dow: { value: 39131.53, change: 0.52 },
    sp500: { value: 5088.80, change: 0.39 },
    nasdaq: { value: 15996.82, change: 0.17 },
  },
  stocks: {
    AAPL: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 182.52,
      change: 1.24,
      changePercent: 0.68,
      currency: 'USD',
    },
    MSFT: {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      price: 378.85,
      change: -2.15,
      changePercent: -0.56,
      currency: 'USD',
    },
    ASML: {
      symbol: 'ASML',
      name: 'ASML Holding N.V.',
      price: 689.20,
      change: 5.40,
      changePercent: 0.79,
      currency: 'EUR',
    },
  },
};

// Mock i18n for internationalization tests
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Simple mock translations
      const translations: Record<string, string> = {
        'navigation.dashboard': 'Dashboard',
        'navigation.watchlist': 'Watchlist',
        'navigation.portfolio': 'Portfolio',
        'navigation.settings': 'Configurações',
        'navigation.help': 'Ajuda',
        'actions.add': 'Adicionar',
        'actions.remove': 'Remover',
        'actions.save': 'Guardar',
        'general.mobile': 'Telemóvel',
        'currencies.usd': 'USD',
        'currencies.eur': 'EUR',
        'regions.usa': 'EUA',
        'regions.eu': 'UE',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'pt',
      changeLanguage: vi.fn(),
    },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Wouter router for navigation tests
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  useRoute: () => [false, {}],
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => 
    React.createElement('a', { href }, children),
  Switch: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ children }: { children: React.ReactNode }) => children,
}));

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

// Global error handling for tests
vi.stubGlobal('console', {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
});

// Mock WebSocket for real-time features
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
}));

// Mock crypto for any encryption/hashing needs
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid'),
    getRandomValues: vi.fn((arr) => arr),
  },
});

console.log('✅ Vitest test environment setup complete for international markets (USA/EU)');