import { Request, Response } from 'express';

// Simple health check handler that returns 200 OK
export function healthCheckHandler(req: Request, res: Response) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
}