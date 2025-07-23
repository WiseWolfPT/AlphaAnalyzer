// Tests for Vercel Auth Header Workaround
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isVercelProduction, getAuthHeaderConfig, createAuthHeaders } from '@/lib/auth-headers';

describe('Auth Headers - Vercel Workaround', () => {
  beforeEach(() => {
    // Reset window.location for each test
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true,
    });
    
    // Reset import.meta.env
    vi.stubGlobal('import.meta.env', { PROD: false, MODE: 'development' });
  });

  describe('isVercelProduction', () => {
    it('should return false for localhost', () => {
      window.location.hostname = 'localhost';
      expect(isVercelProduction()).toBe(false);
    });

    it('should return false for 127.0.0.1', () => {
      window.location.hostname = '127.0.0.1';
      expect(isVercelProduction()).toBe(false);
    });

    it('should return true for vercel.app domain', () => {
      window.location.hostname = 'myapp.vercel.app';
      expect(isVercelProduction()).toBe(true);
    });

    it('should return true for any .vercel.app subdomain', () => {
      window.location.hostname = 'preview-123.vercel.app';
      expect(isVercelProduction()).toBe(true);
    });

    it('should return true when PROD env is true', () => {
      vi.stubGlobal('import.meta.env', { PROD: true, MODE: 'production' });
      window.location.hostname = 'localhost';
      expect(isVercelProduction()).toBe(true);
    });

    it('should return true for custom domains (not localhost)', () => {
      window.location.hostname = 'alfalyzer.com';
      expect(isVercelProduction()).toBe(true);
    });
  });

  describe('getAuthHeaderConfig', () => {
    it('should use Authorization header in development', () => {
      window.location.hostname = 'localhost';
      const config = getAuthHeaderConfig();
      
      expect(config.isVercelProduction).toBe(false);
      expect(config.headerName).toBe('Authorization');
      expect(config.environment).toBe('Development');
    });

    it('should use X-Auth-Token header in Vercel production', () => {
      window.location.hostname = 'myapp.vercel.app';
      const config = getAuthHeaderConfig();
      
      expect(config.isVercelProduction).toBe(true);
      expect(config.headerName).toBe('X-Auth-Token');
      expect(config.environment).toBe('Production (Vercel)');
    });
  });

  describe('createAuthHeaders', () => {
    it('should create headers without token', () => {
      const headers = createAuthHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['X-Auth-Token']).toBeUndefined();
    });

    it('should add Authorization header in development', () => {
      window.location.hostname = 'localhost';
      const headers = createAuthHeaders('test-token-123');
      
      expect(headers['Authorization']).toBe('Bearer test-token-123');
      expect(headers['X-Auth-Token']).toBeUndefined();
    });

    it('should add X-Auth-Token header in Vercel production', () => {
      window.location.hostname = 'myapp.vercel.app';
      const headers = createAuthHeaders('test-token-123');
      
      expect(headers['X-Auth-Token']).toBe('Bearer test-token-123');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should merge additional headers', () => {
      const headers = createAuthHeaders('token', {
        'X-Custom-Header': 'custom-value',
        'Accept': 'application/json',
      });
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Accept']).toBe('application/json');
    });

    it('should handle null token', () => {
      const headers = createAuthHeaders(null);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['X-Auth-Token']).toBeUndefined();
    });
  });
});