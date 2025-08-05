/**
 * Logger configuration
 * Controls logging verbosity across the application
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Get log level from environment or default to INFO
const getLogLevel = (): LogLevel => {
  const level = process.env.LOG_LEVEL?.toUpperCase();
  switch (level) {
    case 'ERROR': return LogLevel.ERROR;
    case 'WARN': return LogLevel.WARN;
    case 'INFO': return LogLevel.INFO;
    case 'DEBUG': return LogLevel.DEBUG;
    case 'TRACE': return LogLevel.TRACE;
    default: 
      // Default to WARN in production, INFO in development
      return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.INFO;
  }
};

export const loggerConfig = {
  level: getLogLevel(),
  
  // Check if a log level should be displayed
  shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  },
  
  // Convenience methods
  shouldLogError(): boolean { return this.shouldLog(LogLevel.ERROR); },
  shouldLogWarn(): boolean { return this.shouldLog(LogLevel.WARN); },
  shouldLogInfo(): boolean { return this.shouldLog(LogLevel.INFO); },
  shouldLogDebug(): boolean { return this.shouldLog(LogLevel.DEBUG); },
  shouldLogTrace(): boolean { return this.shouldLog(LogLevel.TRACE); }
};

// Logger wrapper functions
export const logger = {
  error(...args: any[]) {
    if (loggerConfig.shouldLogError()) {
      console.error(...args);
    }
  },
  
  warn(...args: any[]) {
    if (loggerConfig.shouldLogWarn()) {
      console.warn(...args);
    }
  },
  
  info(...args: any[]) {
    if (loggerConfig.shouldLogInfo()) {
      console.log(...args);
    }
  },
  
  debug(...args: any[]) {
    if (loggerConfig.shouldLogDebug()) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  trace(...args: any[]) {
    if (loggerConfig.shouldLogTrace()) {
      console.log('[TRACE]', ...args);
    }
  }
};