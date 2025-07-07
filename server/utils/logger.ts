import winston from 'winston';
import { Request } from 'express';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' 
      ? winston.format.json() 
      : format,
  }),
  // Error file transport
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.json(),
  }),
  // Combined file transport
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.json(),
  }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports,
  exitOnError: false,
});

// Create HTTP logger middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/http.log',
    }),
  ],
});

// HTTP logging middleware
export const httpLoggerMiddleware = (req: Request, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    httpLogger.http({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      referrer: req.get('referrer'),
      contentLength: res.get('content-length'),
    });
  });
  
  next();
};

// Structured logging helpers
export const logError = (error: Error, context?: any) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context,
  });
};

export const logWarning = (message: string, context?: any) => {
  logger.warn({
    message,
    ...context,
  });
};

export const logInfo = (message: string, context?: any) => {
  logger.info({
    message,
    ...context,
  });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug({
    message,
    ...context,
  });
};

// API call logging
export const logApiCall = (provider: string, endpoint: string, status: number, duration: number) => {
  logger.info({
    message: 'API call',
    provider,
    endpoint,
    status,
    duration: `${duration}ms`,
    type: 'api_call',
  });
};

// Database query logging
export const logDbQuery = (query: string, duration: number, error?: Error) => {
  const logData = {
    message: 'Database query',
    query: query.substring(0, 200), // Limit query length
    duration: `${duration}ms`,
    type: 'db_query',
  };
  
  if (error) {
    logger.error({ ...logData, error: error.message });
  } else {
    logger.debug(logData);
  }
};

// Security event logging
export const logSecurityEvent = (event: string, userId?: string, ip?: string, details?: any) => {
  logger.warn({
    message: 'Security event',
    event,
    userId,
    ip,
    details,
    type: 'security',
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, threshold: number) => {
  const logData = {
    message: 'Performance metric',
    operation,
    duration: `${duration}ms`,
    threshold: `${threshold}ms`,
    type: 'performance',
  };
  
  if (duration > threshold) {
    logger.warn({ ...logData, exceeded: true });
  } else {
    logger.debug(logData);
  }
};

export default logger;