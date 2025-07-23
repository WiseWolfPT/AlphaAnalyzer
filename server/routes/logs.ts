// API routes for log management
import { Router, Request, Response } from 'express';
import { getLogs, clearLogs, log } from '../lib/logger';

const router = Router();

// Get logs with optional filters
router.get('/', (req: Request, res: Response) => {
  try {
    const { level, limit = 100 } = req.query;
    
    const logs = getLogs({
      level: level as string,
      limit: parseInt(limit as string),
    });
    
    res.json({ logs, count: logs.length });
  } catch (error) {
    log.error('Failed to retrieve logs', { error });
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// Receive logs from frontend
router.post('/', (req: Request, res: Response) => {
  try {
    const { logs: clientLogs } = req.body;
    
    if (!Array.isArray(clientLogs)) {
      return res.status(400).json({ error: 'Invalid log format' });
    }
    
    // Process each client log
    clientLogs.forEach((clientLog: any) => {
      const { level, message, context, timestamp } = clientLog;
      
      // Map client log levels to Winston levels
      const logLevel = level?.toLowerCase() || 'info';
      
      // Add client context
      const meta = {
        ...context,
        source: 'client',
        clientTimestamp: timestamp,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      };
      
      // Log using appropriate level
      if (log[logLevel as keyof typeof log]) {
        (log[logLevel as keyof typeof log] as any)(`[Client] ${message}`, meta);
      } else {
        log.info(`[Client] ${message}`, meta);
      }
    });
    
    res.json({ success: true, received: clientLogs.length });
  } catch (error) {
    log.error('Failed to process client logs', { error });
    res.status(500).json({ error: 'Failed to process logs' });
  }
});

// Clear logs (admin only)
router.delete('/', (req: Request, res: Response) => {
  try {
    // TODO: Add admin authentication check
    clearLogs();
    log.info('Logs cleared by admin');
    res.json({ success: true });
  } catch (error) {
    log.error('Failed to clear logs', { error });
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// Get log statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const allLogs = getLogs({ limit: 1000 });
    
    const stats = {
      total: allLogs.length,
      byLevel: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      recentErrors: [] as any[],
      apiCalls: {} as Record<string, number>,
    };
    
    // Calculate statistics
    allLogs.forEach(logEntry => {
      // Count by level
      stats.byLevel[logEntry.level] = (stats.byLevel[logEntry.level] || 0) + 1;
      
      // Count by source
      const source = logEntry.metadata?.source || 'server';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
      
      // Collect recent errors
      if (logEntry.level === 'error' && stats.recentErrors.length < 10) {
        stats.recentErrors.push({
          timestamp: logEntry.timestamp,
          message: logEntry.message,
          url: logEntry.metadata?.url,
        });
      }
      
      // Count API calls
      if (logEntry.metadata?.provider) {
        const provider = logEntry.metadata.provider;
        stats.apiCalls[provider] = (stats.apiCalls[provider] || 0) + 1;
      }
    });
    
    res.json(stats);
  } catch (error) {
    log.error('Failed to calculate log statistics', { error });
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

export default router;