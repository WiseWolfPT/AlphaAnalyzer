// Setup para testes de integração
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente para testes
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configurar timeouts globais
if (typeof global.setTimeout === 'function') {
  global.setTimeout = global.setTimeout;
}

// Mock do console para evitar poluição durante testes
const originalConsole = { ...console };

beforeAll(() => {
  // Silenciar logs durante testes (exceto erros)
  if (process.env.SILENT_TESTS === 'true') {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    // Manter console.error para debugging
  }
});

afterAll(() => {
  // Restaurar console original
  Object.assign(console, originalConsole);
});

// Helpers globais para testes
global.testHelpers = {
  // Aguardar um tempo específico
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Retry de uma função até sucesso
  retry: async (fn: () => Promise<any>, maxAttempts = 3, delay = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await global.testHelpers.wait(delay);
      }
    }
  },
  
  // Verificar se serviço está disponível
  waitForService: async (url: string, timeout = 30000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) return true;
      } catch (error) {
        // Continuar tentando
      }
      await global.testHelpers.wait(1000);
    }
    throw new Error(`Service ${url} did not become available within ${timeout}ms`);
  }
};

// Declaração de tipos para TypeScript
declare global {
  var testHelpers: {
    wait: (ms: number) => Promise<void>;
    retry: <T>(fn: () => Promise<T>, maxAttempts?: number, delay?: number) => Promise<T>;
    waitForService: (url: string, timeout?: number) => Promise<boolean>;
  };
}

export {};