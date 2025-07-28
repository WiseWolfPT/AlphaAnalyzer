// Backend logger using Winston with structured logging
import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const customFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'errors.log'),
      level: 'error',
      format: winston.format.json(),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add specific logging methods
export const log = {
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  
  // HTTP logging
  http: (req: Request, res: Response, duration: number) => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      correlationId: req.headers['x-correlation-id'],
    };
    
    const level = res.statusCode >= 400 ? 'error' : 'info';
    logger[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
  },
  
  // Auth logging
  auth: (event: string, success: boolean, userId?: string, details?: any) => {
    const meta = {
      event,
      success,
      userId,
      ...details,
    };
    
    const level = success ? 'info' : 'warn';
    logger[level](`Auth: ${event}`, meta);
  },
  
  // API logging
  api: (provider: string, endpoint: string, status: number, duration: number) => {
    const meta = {
      provider,
      endpoint,
      status,
      duration: `${duration}ms`,
    };
    
    const level = status >= 400 ? 'error' : 'debug';
    logger[level](`API: ${provider} ${endpoint}`, meta);
  },
  
  // CORS logging
  cors: (origin: string, allowed: boolean, reason?: string) => {
    const meta = {
      origin,
      allowed,
      reason,
    };
    
    const level = allowed ? 'debug' : 'warn';
    logger[level](`CORS: ${origin}`, meta);
  },
  
  // Performance logging
  performance: (metric: string, value: number, context?: any) => {
    logger.debug(`Performance: ${metric}`, {
      metric,
      value,
      unit: 'ms',
      ...context,
    });
  },
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const correlationId = req.headers['x-correlation-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add correlation ID to request
  req.headers['x-correlation-id'] = correlationId as string;
  
  // Log request
  log.debug(`⬆️  ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    headers: sanitizeHeaders(req.headers),
    body: req.method !== 'GET' ? req.body : undefined,
    correlationId,
  });
  
  // Store request info in res.locals for centralized handler
  if (!res.locals) res.locals = {};
  res.locals.requestInfo = {
    startTime,
    correlationId
  };
  
  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log response
    log.http(req, res, duration);
    
    if (res.statusCode === 401) {
      log.error('🚨 401 Unauthorized', {
        url: req.originalUrl,
        method: req.method,
        headers: sanitizeHeaders(req.headers),
        correlationId,
      });
    }
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error('🚨 Unhandled Error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    correlationId: req.headers['x-correlation-id'],
  });
  
  next(err);
};

// Sanitize sensitive headers
function sanitizeHeaders(headers: any): any {
  const sensitive = ['authorization', 'cookie', 'x-api-key'];
  const sanitized = { ...headers };
  
  sensitive.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Get logs for API endpoint
export function getLogs(filter?: { level?: string; limit?: number }): any[] {
  const logFile = path.join(logsDir, 'combined.log');
  
  if (!fs.existsSync(logFile)) {
    return [];
  }
  
  const logs = fs.readFileSync(logFile, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  
  // Apply filters
  let filtered = logs;
  
  if (filter?.level) {
    filtered = filtered.filter(log => log.level === filter.level);
  }
  
  if (filter?.limit) {
    filtered = filtered.slice(-filter.limit);
  }
  
  return filtered.reverse();
}

// Clear logs
export function clearLogs(): void {
  const files = ['combined.log', 'errors.log'];
  
  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '');
    }
  });
}

// Export both as 'log' and 'logger' for compatibility
export { log as logger };
export default log;