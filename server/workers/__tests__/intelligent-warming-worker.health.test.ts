/**
 * Tests for intelligent-warming-worker health endpoint
 *
 * Prevents regression of the health server startup issue (2025-10-24)
 * where the health server was not starting because intelligentWarmingLoop()
 * blocked the event loop.
 *
 * IMPORTANT: These are integration tests that require the worker to be running.
 * Run manually against production or local worker:
 *   WORKER_HEALTH_PORT=3008 npx vitest run server/workers/__tests__/intelligent-warming-worker.health.test.ts
 *
 * To run in CI: Start worker first, then run tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const WORKER_HEALTH_PORT = parseInt(process.env.WORKER_HEALTH_PORT || '3008', 10);
const HEALTH_ENDPOINT = `http://localhost:${WORKER_HEALTH_PORT}/health`;

describe('Intelligent Warming Worker Health Endpoint', () => {
  beforeAll(() => {
    console.log(`Testing health endpoint at: ${HEALTH_ENDPOINT}`);
  });

  it('should have health server listening on correct port', async () => {
    try {
      const response = await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });
      expect(response.status).toBe(200);
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Health server not responding on port ${WORKER_HEALTH_PORT}. ` +
          'This indicates the health server failed to start. ' +
          'Common causes: (1) event loop blocked by infinite loop, ' +
          '(2) port already in use, (3) worker not running.'
        );
      }
      throw error;
    }
  });

  it('should return valid health status JSON', async () => {
    const response = await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });

    expect(response.data).toHaveProperty('status');
    expect(response.data.status).toBe('ok');
    expect(response.data).toHaveProperty('timestamp');
    expect(response.data).toHaveProperty('queue');
    expect(response.data).toHaveProperty('bandwidth');
    expect(response.data).toHaveProperty('config');
  });

  it('should include queue metrics', async () => {
    const response = await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });

    expect(response.data.queue).toHaveProperty('queueSize');
    expect(response.data.queue).toHaveProperty('completedToday');
    expect(response.data.queue).toHaveProperty('failedToday');
    expect(response.data.queue).toHaveProperty('avgPriority');

    expect(typeof response.data.queue.queueSize).toBe('number');
    expect(typeof response.data.queue.completedToday).toBe('number');
    expect(typeof response.data.queue.failedToday).toBe('number');
  });

  it('should include bandwidth metrics', async () => {
    const response = await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });

    expect(response.data.bandwidth).toHaveProperty('percentUsed');
    expect(response.data.bandwidth).toHaveProperty('allowWarming');
    expect(response.data.bandwidth).toHaveProperty('throttleRate');

    expect(typeof response.data.bandwidth.percentUsed).toBe('number');
    expect(typeof response.data.bandwidth.allowWarming).toBe('boolean');
    expect(['normal', 'reduced']).toContain(response.data.bandwidth.throttleRate);
  });

  it('should include worker config', async () => {
    const response = await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });

    expect(response.data.config).toHaveProperty('batchSize');
    expect(response.data.config).toHaveProperty('cycleInterval');
    expect(response.data.config).toHaveProperty('rateLimit');

    expect(response.data.config.batchSize).toBe(50);
    expect(response.data.config.cycleInterval).toBe(300000);
    expect(response.data.config.rateLimit).toBe(250);
  });

  it('should respond within 500ms', async () => {
    const start = Date.now();
    await axios.get(HEALTH_ENDPOINT, { timeout: 5000 });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  }, 10000);

  it('should handle concurrent health checks', async () => {
    const requests = Array(10).fill(null).map(() =>
      axios.get(HEALTH_ENDPOINT, { timeout: 5000 })
    );

    const responses = await Promise.all(requests);

    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
    });
  });

  it('should return 404 for unknown endpoints', async () => {
    try {
      await axios.get(`http://localhost:${WORKER_HEALTH_PORT}/unknown`, {
        timeout: 5000
      });
      throw new Error('Expected 404 but got 200');
    } catch (error: any) {
      if (error.response) {
        expect(error.response.status).toBe(404);
      } else {
        throw error;
      }
    }
  });
});

describe('Health Endpoint Availability (Regression Test)', () => {
  it('should start health server before warming loop blocks', async () => {
    // This test specifically prevents regression of the bug where
    // await intelligentWarmingLoop() blocked the health server from starting.
    //
    // The fix was to remove 'await' from startHealthServer() so it runs
    // concurrently with the warming loop instead of sequentially.
    //
    // If this test fails, it means the health server is not starting,
    // which indicates the startup sequence is broken again.

    try {
      const response = await axios.get(HEALTH_ENDPOINT, {
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBe('ok');
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          'REGRESSION: Health server failed to start!\n\n' +
          'Root cause (2025-10-24): intelligentWarmingLoop() blocks event loop.\n' +
          'Fix: Remove await from startHealthServer() in startup sequence.\n' +
          'Expected startup code:\n' +
          '  startHealthServer().catch(error => { ... });\n' +
          '  await intelligentWarmingLoop();\n\n' +
          'NOT:\n' +
          '  await startHealthServer();\n' +
          '  await intelligentWarmingLoop();\n'
        );
      }
      throw error;
    }
  });
});
