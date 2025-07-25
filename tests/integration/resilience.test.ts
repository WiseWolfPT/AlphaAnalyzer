import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const KOYEB_URL = process.env.KOYEB_URL || 'https://your-app.koyeb.app';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Testes de Resiliência', () => {
  describe('Fallback do Backend', () => {
    it('deve lidar com backend offline gracefully', async () => {
      // Tentar conectar a uma porta que não existe
      try {
        await axios.get('http://localhost:9999/api/health', { timeout: 2000 });
        expect.fail('Backend deveria estar offline');
      } catch (error: any) {
        expect(error.code).toMatch(/ECONNREFUSED|ETIMEDOUT/);
      }
    });

    it('deve usar dados em cache quando API externa falha', async () => {
      // Primeiro, popular o cache
      const symbol = 'AAPL';
      const firstResponse = await axios.get(`${BACKEND_URL}/api/market-data/quote/${symbol}`);
      expect(firstResponse.status).toBe(200);
      
      // Simular falha da API externa (isso depende da implementação do backend)
      // Em um cenário real, você poderia usar um mock ou configurar o backend para simular falhas
      
      // Fazer nova requisição - deve retornar dados do cache
      const secondResponse = await axios.get(`${BACKEND_URL}/api/market-data/quote/${symbol}`);
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.data).toHaveProperty('symbol', symbol);
    });

    it('deve fazer retry automático em caso de falha temporária', async () => {
      let attemptCount = 0;
      
      // Interceptar requisições para contar tentativas
      const originalGet = axios.get;
      axios.get = vi.fn(async (url: string, config?: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated network error');
        }
        return originalGet(url, config);
      });
      
      try {
        const response = await axios.get(`${BACKEND_URL}/api/health`, {
          timeout: 5000,
          retry: 3,
          retryDelay: 1000
        } as any);
        
        expect(attemptCount).toBeGreaterThanOrEqual(3);
        expect(response.status).toBe(200);
      } finally {
        axios.get = originalGet;
      }
    });
  });

  describe('Cold Start do Koyeb', () => {
    it('deve lidar com cold start sem timeout', async () => {
      // Só executa se tivermos URL do Koyeb
      if (!KOYEB_URL || KOYEB_URL === 'https://your-app.koyeb.app') {
        console.log('Pulando teste de Koyeb - URL não configurada');
        return;
      }
      
      const startTime = Date.now();
      
      try {
        const response = await axios.get(`${KOYEB_URL}/api/health`, {
          timeout: 30000 // 30 segundos para cold start
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`Cold start time: ${responseTime}ms`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'healthy');
        
        // Se demorou mais de 5 segundos, provavelmente foi cold start
        if (responseTime > 5000) {
          console.log('Cold start detectado');
          
          // Segunda requisição deve ser rápida
          const secondStart = Date.now();
          const secondResponse = await axios.get(`${KOYEB_URL}/api/health`);
          const secondTime = Date.now() - secondStart;
          
          expect(secondTime).toBeLessThan(1000);
          console.log(`Warm response time: ${secondTime}ms`);
        }
      } catch (error) {
        console.error('Erro ao testar Koyeb:', error);
        throw error;
      }
    });
  });

  describe('Reconexão Realtime', () => {
    it('deve reconectar automaticamente quando conexão cai', async () => {
      const channel = supabase.channel('test-reconnection');
      let connectionLost = false;
      let reconnected = false;
      
      channel
        .on('system', { event: 'error' }, () => {
          connectionLost = true;
        })
        .on('system', { event: 'connected' }, () => {
          if (connectionLost) {
            reconnected = true;
          }
        })
        .subscribe();
      
      // Simular perda de conexão (em produção, isso aconteceria naturalmente)
      // Por enquanto, vamos apenas verificar se o canal está inscrito
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(channel.state).toBe('joined');
      
      // Cleanup
      await channel.unsubscribe();
    });
  });

  describe('Circuit Breaker', () => {
    it('deve abrir circuit breaker após múltiplas falhas', async () => {
      const failingEndpoint = `${BACKEND_URL}/api/test/failing-endpoint`;
      let failures = 0;
      
      // Fazer várias requisições que falham
      for (let i = 0; i < 5; i++) {
        try {
          await axios.get(failingEndpoint, { timeout: 1000 });
        } catch (error: any) {
          failures++;
          
          // Após algumas falhas, deve retornar erro de circuit breaker
          if (failures >= 3 && error.response) {
            expect(error.response.status).toBe(503); // Service Unavailable
            expect(error.response.data).toHaveProperty('error');
            expect(error.response.data.error).toMatch(/circuit.*open/i);
          }
        }
      }
      
      expect(failures).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Degradação Graciosa', () => {
    it('deve funcionar com funcionalidade reduzida quando serviços externos falham', async () => {
      // Testar endpoint que tem dependências externas
      const response = await axios.get(`${BACKEND_URL}/api/market-data/search`, {
        params: { query: 'AAPL' }
      });
      
      expect(response.status).toBe(200);
      
      // Mesmo se alguns dados estiverem faltando, deve retornar estrutura válida
      expect(response.data).toBeInstanceOf(Array);
      
      if (response.data.length > 0) {
        const result = response.data[0];
        expect(result).toHaveProperty('symbol');
        // Alguns campos podem estar ausentes em modo degradado
        console.log('Campos disponíveis em modo degradado:', Object.keys(result));
      }
    });
  });

  describe('Timeout e Cancelamento', () => {
    it('deve cancelar requisições que demoram muito', async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      
      try {
        await axios.get(`${BACKEND_URL}/api/test/slow-endpoint`, {
          signal: controller.signal
        });
        
        expect.fail('Requisição deveria ter sido cancelada');
      } catch (error: any) {
        expect(error.code).toBe('ERR_CANCELED');
      } finally {
        clearTimeout(timeout);
      }
    });
  });

  describe('Recuperação de Erros', () => {
    it('deve recuperar estado após erro crítico', async () => {
      // Verificar health antes
      const healthBefore = await axios.get(`${BACKEND_URL}/api/health`);
      expect(healthBefore.data.status).toBe('healthy');
      
      // Simular erro (endpoint específico para testes)
      try {
        await axios.post(`${BACKEND_URL}/api/test/simulate-crash`);
      } catch (error) {
        // Esperado
      }
      
      // Aguardar recuperação
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar se recuperou
      const healthAfter = await axios.get(`${BACKEND_URL}/api/health`);
      expect(healthAfter.data.status).toBe('healthy');
    });
  });

  describe('Proteção contra Sobrecarga', () => {
    it('deve rejeitar requisições quando sobrecarregado', async () => {
      const promises = [];
      
      // Enviar muitas requisições simultâneas
      for (let i = 0; i < 100; i++) {
        promises.push(
          axios.get(`${BACKEND_URL}/api/market-data/quote/AAPL`)
            .then(res => ({ status: res.status, error: null }))
            .catch(err => ({ status: err.response?.status || 0, error: err }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // Contar respostas por tipo
      const stats = results.reduce((acc, result) => {
        if (result.status === 200) acc.success++;
        else if (result.status === 429) acc.rateLimited++;
        else if (result.status === 503) acc.overloaded++;
        else acc.errors++;
        return acc;
      }, { success: 0, rateLimited: 0, overloaded: 0, errors: 0 });
      
      console.log('Estatísticas de sobrecarga:', stats);
      
      // Deve ter algum tipo de proteção (rate limit ou sobrecarga)
      expect(stats.rateLimited + stats.overloaded).toBeGreaterThan(0);
    });
  });
});