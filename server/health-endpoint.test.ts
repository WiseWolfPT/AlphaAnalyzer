import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';

describe('Health Endpoint Tests', () => {
  let serverProcess: ChildProcess;
  const PORT = 3002; // Use different port to avoid conflicts
  const SERVER_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    // Start server for testing
    serverProcess = spawn('npx', ['tsx', '--env-file=.env', 'server/index.ts'], {
      env: { ...process.env, PORT: PORT.toString() },
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise<void>((resolve) => {
      serverProcess.stdout?.on('data', (data) => {
        if (data.toString().includes('Ready to accept connections')) {
          resolve();
        }
      });
      // Timeout fallback
      setTimeout(resolve, 5000);
    });
  }, 10000);

  afterAll(async () => {
    // Kill server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  });

  it('should return 200 OK for /health endpoint', async () => {
    const response = await fetch(`${SERVER_URL}/health`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('environment');
  });

  it('should return 200 OK for /api/health endpoint', async () => {
    const response = await fetch(`${SERVER_URL}/api/health`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('message', 'Health check passed');
  });

  it('should NOT return 426 Upgrade Required', async () => {
    const response = await fetch(`${SERVER_URL}/health`);
    expect(response.status).not.toBe(426);
  });

  it('should handle HEAD requests properly', async () => {
    const response = await fetch(`${SERVER_URL}/health`, { method: 'HEAD' });
    expect(response.status).toBe(200);
  });
});