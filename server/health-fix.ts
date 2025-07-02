import express from 'express';
import { db } from './db';
import * as schema from '@shared/schema';

const router = express.Router();

// Simple health check that bypasses all middleware
router.get('/', async (req, res) => {
  try {
    // Check database connection
    let dbHealthy = false;
    try {
      const result = await db.select().from(schema.users).limit(0);
      dbHealthy = true;
    } catch {
      dbHealthy = false;
    }
    
    res.status(200).json({
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: dbHealthy ? 'ok' : 'failed',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'production' ? 'Health check failed' : (error as Error).message
    });
  }
});

export default router;