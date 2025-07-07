import request from 'supertest';
import express from 'express';
import { healthRouter } from '../health';
import { db } from '../../db';

jest.mock('../../db');

describe('Health Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/api', healthRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({ result: 1 }),
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
        version: expect.any(String),
        checks: {
          database: 'healthy',
          memory: 'healthy',
          apiKeys: 'healthy',
        },
      });
    });

    it('should return unhealthy status when database check fails', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        checks: {
          database: 'unhealthy',
        },
      });
    });

    it('should warn when memory usage is high', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({ result: 1 }),
      });

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 1.5 * 1024 * 1024 * 1024, // 1.5GB
        heapTotal: 2 * 1024 * 1024 * 1024, // 2GB
        rss: 2 * 1024 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.checks.memory).toBe('warning');
      expect(response.body.memory.heapUsedMB).toBeGreaterThan(1000);

      process.memoryUsage = originalMemoryUsage;
    });

    it('should check API keys configuration', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({ result: 1 }),
      });

      // Mock missing API keys
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.ALPHA_VANTAGE_API_KEY;
      delete process.env.FINNHUB_API_KEY;

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.checks.apiKeys).toBe('warning');
      expect(response.body.apiKeys.configured).toBe(0);

      process.env = originalEnv;
    });
  });

  describe('GET /api/health/live', () => {
    it('should return simple OK response', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready when database is accessible', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue({ result: 1 }),
      });

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ready: true,
        checks: {
          database: true,
        },
      });
    });

    it('should return not ready when database fails', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        ready: false,
        checks: {
          database: false,
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const mockDb = db as jest.Mocked<typeof db>;
      mockDb.prepare = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Mock process.uptime to throw
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Uptime error');
      });

      const response = await request(app).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');

      process.uptime = originalUptime;
    });
  });
});