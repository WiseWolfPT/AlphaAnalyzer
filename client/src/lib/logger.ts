// Logger system for frontend with structured logging

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  colorize: boolean;
  includeStackTrace: boolean;
}

class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private sessionId: string;
  private correlationCounter = 0;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableRemote: false,
      colorize: true,
      includeStackTrace: true,
      ...config,
    };
    
    this.sessionId = this.generateSessionId();
    
    // Periodically flush logs to remote
    if (this.config.enableRemote) {
      setInterval(() => this.flushToRemote(), 5000);
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCorrelationId(): string {
    return `${this.sessionId}-${++this.correlationCounter}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, levelName, message, context } = entry;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${levelName}] ${message}${contextStr}`;
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
      case LogLevel.INFO: return '\x1b[32m';  // Green
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      default: return '\x1b[0m';
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context,
      correlationId: context?.correlationId,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      userId: context?.userId,
    };

    if (level === LogLevel.ERROR && this.config.includeStackTrace) {
      entry.stack = new Error().stack;
    }

    this.buffer.push(entry);

    if (this.config.enableConsole) {
      const formatted = this.formatMessage(entry);
      const color = this.config.colorize ? this.getColor(level) : '';
      const reset = this.config.colorize ? '\x1b[0m' : '';
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`${color}${formatted}${reset}`, context);
          break;
        case LogLevel.INFO:
          console.info(`${color}${formatted}${reset}`, context);
          break;
        case LogLevel.WARN:
          console.warn(`${color}${formatted}${reset}`, context);
          break;
        case LogLevel.ERROR:
          console.error(`${color}${formatted}${reset}`, context);
          if (entry.stack) console.error(entry.stack);
          break;
      }
    }

    // Immediately send errors to remote
    if (level === LogLevel.ERROR && this.config.enableRemote) {
      this.flushToRemote();
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  // HTTP request/response logging
  logRequest(method: string, url: string, data?: any, headers?: Record<string, string>): string {
    const correlationId = this.generateCorrelationId();
    this.debug(`🚀 ${method} ${url}`, {
      type: 'http-request',
      method,
      url,
      data,
      headers: this.sanitizeHeaders(headers),
      correlationId,
    });
    return correlationId;
  }

  logResponse(
    correlationId: string,
    status: number,
    url: string,
    data?: any,
    duration?: number
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    const emoji = status >= 400 ? '❌' : '✅';
    
    this.log(level, `${emoji} ${status} ${url} (${duration}ms)`, {
      type: 'http-response',
      status,
      url,
      data,
      duration,
      correlationId,
    });
  }

  // Performance logging
  logPerformance(metric: string, value: number, context?: Record<string, any>): void {
    this.debug(`⚡ Performance: ${metric}`, {
      type: 'performance',
      metric,
      value,
      unit: 'ms',
      ...context,
    });
  }

  // Auth logging
  logAuth(event: string, success: boolean, context?: Record<string, any>): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const emoji = success ? '🔓' : '🔒';
    
    this.log(level, `${emoji} Auth: ${event}`, {
      type: 'auth',
      event,
      success,
      ...context,
    });
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;
    
    const sensitive = ['authorization', 'cookie', 'x-api-key'];
    const sanitized: Record<string, string> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  private async flushToRemote(): Promise<void> {
    if (!this.config.remoteEndpoint || this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });
    } catch (error) {
      // Re-add logs to buffer on failure
      this.buffer.unshift(...logs);
      console.error('Failed to send logs to remote:', error);
    }
  }

  // Get logs for display
  getLogs(filter?: { level?: LogLevel; type?: string }): LogEntry[] {
    let logs = [...this.buffer];
    
    if (filter?.level !== undefined) {
      logs = logs.filter(log => log.level >= filter.level);
    }
    
    if (filter?.type) {
      logs = logs.filter(log => log.context?.type === filter.type);
    }
    
    return logs;
  }

  clearLogs(): void {
    this.buffer = [];
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  enableRemoteLogging(endpoint: string): void {
    this.config.enableRemote = true;
    this.config.remoteEndpoint = endpoint;
  }

  disableRemoteLogging(): void {
    this.config.enableRemote = false;
  }
}

// Create singleton instance
const logger = new Logger({
  level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableRemote: !import.meta.env.DEV,
  remoteEndpoint: '/api/logs',
  colorize: true,
  includeStackTrace: import.meta.env.DEV,
});

// Export singleton
export default logger;

// Export performance monitoring helpers
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.logPerformance(name, duration);
      });
    } else {
      const duration = performance.now() - start;
      logger.logPerformance(name, duration);
      return result;
    }
  } catch (error) {
    const duration = performance.now() - start;
    logger.logPerformance(name, duration, { error: true });
    throw error;
  }
}

// Export debug mode toggle
export function setDebugMode(enabled: boolean): void {
  logger.setLevel(enabled ? LogLevel.DEBUG : LogLevel.INFO);
  localStorage.setItem('debug-mode', enabled.toString());
}

export function isDebugMode(): boolean {
  return localStorage.getItem('debug-mode') === 'true';
}

// Initialize debug mode from localStorage
if (isDebugMode()) {
  logger.setLevel(LogLevel.DEBUG);
}