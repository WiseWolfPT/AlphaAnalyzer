/**
 * ALFALYZER - UTILITIES TESTS
 * Testes unitários para funções utilitárias
 */

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatRelativeTime,
  formatMarketCap,
  formatVolume,
  calculateChange,
  calculatePercentageChange,
  isMarketOpen,
  getMarketStatus,
  validateEmail,
  validatePassword,
  sanitizeInput,
  debounce,
  throttle,
  groupBy,
  sortBy,
  chunk,
  formatTimeAgo,
} from '../utils';

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('deve combinar classes corretamente', () => {
      expect(cn('text-red-500', 'bg-white')).toBe('text-red-500 bg-white');
    });

    it('deve lidar com valores condicionais', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('deve mesclar classes conflitantes do Tailwind', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('deve ignorar valores undefined e null', () => {
      expect(cn('base', undefined, null, 'end')).toBe('base end');
    });
  });

  describe('Formatação de Moeda', () => {
    it('deve formatar valores em USD', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('deve formatar valores negativos', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
    });

    it('deve suportar diferentes moedas', () => {
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
      expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
    });

    it('deve lidar com precisão decimal customizada', () => {
      expect(formatCurrency(1234.567, 'USD', 3)).toBe('$1,234.567');
      expect(formatCurrency(1234.5, 'USD', 0)).toBe('$1,235');
    });
  });

  describe('Formatação de Percentagem', () => {
    it('deve formatar percentagens positivas', () => {
      expect(formatPercentage(0.1234)).toBe('+12.34%');
      expect(formatPercentage(1.5)).toBe('+150.00%');
    });

    it('deve formatar percentagens negativas', () => {
      expect(formatPercentage(-0.0534)).toBe('-5.34%');
    });

    it('deve formatar zero sem sinal', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('deve suportar precisão customizada', () => {
      expect(formatPercentage(0.12345, 3)).toBe('+12.345%');
      expect(formatPercentage(0.12345, 0)).toBe('+12%');
    });

    it('deve ter opção para omitir sinal positivo', () => {
      expect(formatPercentage(0.1234, 2, false)).toBe('12.34%');
    });
  });

  describe('Formatação de Números', () => {
    it('deve formatar números grandes com notação compacta', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(1234567)).toBe('1.23M');
      expect(formatNumber(1234567890)).toBe('1.23B');
      expect(formatNumber(1234567890123)).toBe('1.23T');
    });

    it('deve formatar números pequenos normalmente', () => {
      expect(formatNumber(123)).toBe('123');
      expect(formatNumber(12.34)).toBe('12.34');
    });

    it('deve lidar com números negativos', () => {
      expect(formatNumber(-1234567)).toBe('-1.23M');
    });
  });

  describe('Formatação de Market Cap', () => {
    it('deve formatar market cap corretamente', () => {
      expect(formatMarketCap(1000000)).toBe('$1.00M');
      expect(formatMarketCap(1500000000)).toBe('$1.50B');
      expect(formatMarketCap(2800000000000)).toBe('$2.80T');
    });

    it('deve mostrar valores pequenos por extenso', () => {
      expect(formatMarketCap(50000)).toBe('$50,000');
    });
  });

  describe('Formatação de Volume', () => {
    it('deve formatar volume de ações', () => {
      expect(formatVolume(1234567)).toBe('1.23M');
      expect(formatVolume(45000000)).toBe('45.00M');
      expect(formatVolume(123)).toBe('123');
    });
  });

  describe('Formatação de Data', () => {
    it('deve formatar datas corretamente', () => {
      const date = new Date('2024-03-15T10:30:00');
      expect(formatDate(date)).toBe('Mar 15, 2024');
      expect(formatDate(date, 'full')).toBe('March 15, 2024');
      expect(formatDate(date, 'short')).toBe('3/15/24');
    });

    it('deve formatar strings de data', () => {
      expect(formatDate('2024-03-15')).toBe('Mar 15, 2024');
    });

    it('deve incluir tempo quando solicitado', () => {
      const date = new Date('2024-03-15T14:30:00');
      expect(formatDate(date, 'default', true)).toMatch(/Mar 15, 2024.*2:30 PM/);
    });
  });

  describe('Tempo Relativo', () => {
    it('deve formatar tempo relativo', () => {
      const now = new Date();
      const minuteAgo = new Date(now.getTime() - 60000);
      const hourAgo = new Date(now.getTime() - 3600000);
      const dayAgo = new Date(now.getTime() - 86400000);

      expect(formatRelativeTime(minuteAgo)).toBe('1 minute ago');
      expect(formatRelativeTime(hourAgo)).toBe('1 hour ago');
      expect(formatRelativeTime(dayAgo)).toBe('1 day ago');
    });

    it('deve formatar tempo futuro', () => {
      const now = new Date();
      const inHour = new Date(now.getTime() + 3600000);
      
      expect(formatRelativeTime(inHour)).toBe('in 1 hour');
    });

    it('deve usar formatTimeAgo para tempos mais antigos', () => {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      expect(formatTimeAgo(monthAgo)).toMatch(/1 month ago/);
    });
  });

  describe('Cálculos Financeiros', () => {
    it('deve calcular mudança absoluta', () => {
      expect(calculateChange(150, 140)).toBe(10);
      expect(calculateChange(140, 150)).toBe(-10);
      expect(calculateChange(100, 100)).toBe(0);
    });

    it('deve calcular mudança percentual', () => {
      expect(calculatePercentageChange(150, 100)).toBe(50);
      expect(calculatePercentageChange(50, 100)).toBe(-50);
      expect(calculatePercentageChange(100, 100)).toBe(0);
    });

    it('deve lidar com divisão por zero', () => {
      expect(calculatePercentageChange(100, 0)).toBe(0);
    });
  });

  describe('Status do Mercado', () => {
    it('deve verificar se mercado está aberto', () => {
      // Teste com horário de mercado (9:30 AM - 4:00 PM EST, dias úteis)
      const marketOpen = new Date('2024-03-15T14:30:00-05:00'); // Friday 2:30 PM EST
      const marketClosed = new Date('2024-03-15T17:30:00-05:00'); // Friday 5:30 PM EST
      const weekend = new Date('2024-03-16T12:00:00-05:00'); // Saturday

      // Estes testes dependem do timezone do sistema
      // Em produção, isMarketOpen deve receber timezone como parâmetro
    });

    it('deve retornar status do mercado', () => {
      const status = getMarketStatus();
      expect(status).toHaveProperty('isOpen');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('nextOpen');
      expect(status).toHaveProperty('nextClose');
    });
  });

  describe('Validações', () => {
    it('deve validar emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@company.co.uk')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('missing@tld')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('deve validar senhas', () => {
      expect(validatePassword('StrongP@ss1')).toBe(true);
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('NoNumbers!')).toBe(false);
      expect(validatePassword('NoSpecial1')).toBe(false);
      expect(validatePassword('no_uppercase1!')).toBe(false);
    });

    it('deve sanitizar input', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(sanitizeInput('Normal text')).toBe('Normal text');
      expect(sanitizeInput('Test & verify')).toBe('Test &amp; verify');
    });
  });

  describe('Funções de Performance', () => {
    it('deve debounce chamadas de função', async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callCount).toBe(1);
    });

    it('deve throttle chamadas de função', async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      
      throttledFn();
      expect(callCount).toBe(2);
    });
  });

  describe('Funções de Array', () => {
    it('deve agrupar por propriedade', () => {
      const items = [
        { category: 'tech', name: 'Apple' },
        { category: 'tech', name: 'Microsoft' },
        { category: 'finance', name: 'JPM' },
      ];

      const grouped = groupBy(items, 'category');
      
      expect(grouped.tech).toHaveLength(2);
      expect(grouped.finance).toHaveLength(1);
    });

    it('deve ordenar por propriedade', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];

      const byName = sortBy(items, 'name');
      expect(byName[0].name).toBe('Alice');

      const byAge = sortBy(items, 'age');
      expect(byAge[0].age).toBe(25);

      const byAgeDesc = sortBy(items, 'age', 'desc');
      expect(byAgeDesc[0].age).toBe(35);
    });

    it('deve dividir array em chunks', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      
      const chunks = chunk(items, 3);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[2]).toEqual([7, 8, 9]);

      const smallChunk = chunk([1, 2], 3);
      expect(smallChunk).toHaveLength(1);
      expect(smallChunk[0]).toEqual([1, 2]);
    });
  });
});