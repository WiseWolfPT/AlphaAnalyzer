/**
 * FASE 2 - DIA 8: Structured Logging System
 * Advanced logging with structured data, multiple outputs, and log analysis
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

// Log level definitions
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Structured log entry interface
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  duration?: number;
  stackTrace?: string;
  correlationId?: string;
}

// Log transport interface
export interface LogTransport {
  name: string;
  level: LogLevel;
  enabled: boolean;
  write(entry: LogEntry): Promise<void>;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  enableRemote: boolean;
  fileConfig?: {
    directory: string;
    filename: string;
    maxFileSize: number; // bytes
    maxFiles: number;
    rotation: 'daily' | 'weekly' | 'size';
  };
  remoteConfig?: {
    endpoint: string;
    apiKey: string;
    batchSize: number;
    flushInterval: number; // ms
  };
  filters?: {
    excludeFields?: string[];
    maskFields?: string[];
    includeStackTrace: boolean;
  };
  performance: {
    enableMetrics: boolean;
    slowOperationThreshold: number; // ms
  };
}

// Console transport with colors
class ConsoleTransport implements LogTransport {
  name = 'console';
  level: LogLevel;
  enabled = true;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private getColorCode(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m'  // Magenta
    };
    return colors[level] || '\x1b[0m';
  }

  private formatEntry(entry: LogEntry): string {
    const colorCode = this.getColorCode(entry.level);
    const resetCode = '\x1b[0m';
    const timestamp = entry.timestamp.toISOString();
    
    let formatted = `${colorCode}[${timestamp}] ${entry.level.toUpperCase()}${resetCode} `;
    formatted += `${entry.source}: ${entry.message}`;
    
    if (entry.requestId) {
      formatted += ` [req:${entry.requestId}]`;
    }
    
    if (entry.duration !== undefined) {
      formatted += ` [${entry.duration}ms]`;
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      formatted += `\n  ${JSON.stringify(entry.metadata, null, 2)}`;
    }
    
    if (entry.stackTrace) {
      formatted += `\n  Stack: ${entry.stackTrace}`;
    }
    
    return formatted;
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) return;
    
    const formatted = this.formatEntry(entry);
    console.log(formatted);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

// File transport with rotation
class FileTransport implements LogTransport {
  name = 'file';
  level: LogLevel;
  enabled = true;
  private config: Required<LoggerConfig['fileConfig']>;
  private currentFilePath: string;
  private currentFileSize = 0;

  constructor(level: LogLevel = 'info', config: LoggerConfig['fileConfig']) {
    this.level = level;
    this.config = {
      directory: config?.directory || path.join(process.cwd(), 'logs'),
      filename: config?.filename || 'app.log',
      maxFileSize: config?.maxFileSize || 50 * 1024 * 1024, // 50MB
      maxFiles: config?.maxFiles || 10,
      rotation: config?.rotation || 'daily'
    };
    
    this.currentFilePath = this.getCurrentFilePath();
    this.ensureLogDirectory();
  }

  private getCurrentFilePath(): string {
    const now = new Date();
    let filename = this.config.filename;
    
    if (this.config.rotation === 'daily') {
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      filename = filename.replace('.log', `-${dateStr}.log`);
    } else if (this.config.rotation === 'weekly') {
      const weekNum = this.getWeekNumber(now);
      filename = filename.replace('.log', `-week${weekNum}.log`);
    }
    
    return path.join(this.config.directory, filename);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.directory, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private formatEntry(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      source: entry.source,
      message: entry.message,
      requestId: entry.requestId,
      userId: entry.userId,
      sessionId: entry.sessionId,
      metadata: entry.metadata,
      tags: entry.tags,
      duration: entry.duration,
      stackTrace: entry.stackTrace,
      correlationId: entry.correlationId
    }) + '\n';
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) return;
    
    try {
      // Check if we need to rotate the file
      await this.checkRotation();
      
      const formatted = this.formatEntry(entry);
      await fs.appendFile(this.currentFilePath, formatted, 'utf8');
      this.currentFileSize += Buffer.byteLength(formatted, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async checkRotation(): Promise<void> {
    try {
      // Check if file needs rotation based on size
      if (this.config.rotation === 'size') {
        if (this.currentFileSize >= this.config.maxFileSize) {
          await this.rotateFile();
        }
      } else {
        // Check if we need a new file based on date
        const newFilePath = this.getCurrentFilePath();
        if (newFilePath !== this.currentFilePath) {
          this.currentFilePath = newFilePath;
          this.currentFileSize = 0;
        }
      }
      
      // Clean up old files
      await this.cleanupOldFiles();
    } catch (error) {
      console.error('Failed to check log rotation:', error);
    }
  }

  private async rotateFile(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newPath = this.currentFilePath.replace('.log', `-${timestamp}.log`);
    
    try {
      await fs.rename(this.currentFilePath, newPath);
      this.currentFileSize = 0;
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.directory);
      const logFiles = files
        .filter(file => file.includes(this.config.filename.replace('.log', '')))
        .map(file => ({
          name: file,
          path: path.join(this.config.directory, file),
          stat: null as any
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch (error) {
          console.error(`Failed to stat file ${file.name}:`, error);
        }
      }

      // Sort by modification time (newest first)
      logFiles.sort((a, b) => {
        if (!a.stat || !b.stat) return 0;
        return b.stat.mtime.getTime() - a.stat.mtime.getTime();
      });

      // Remove excess files
      const filesToRemove = logFiles.slice(this.config.maxFiles);
      for (const file of filesToRemove) {
        try {
          await fs.unlink(file.path);
          console.log(`Removed old log file: ${file.name}`);
        } catch (error) {
          console.error(`Failed to remove old log file ${file.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old log files:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

// Remote transport for external logging services
class RemoteTransport implements LogTransport {
  name = 'remote';
  level: LogLevel;
  enabled = true;
  private config: Required<LoggerConfig['remoteConfig']>;
  private buffer: LogEntry[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(level: LogLevel = 'info', config: LoggerConfig['remoteConfig']) {
    this.level = level;
    this.config = {
      endpoint: config?.endpoint || '',
      apiKey: config?.apiKey || '',
      batchSize: config?.batchSize || 100,
      flushInterval: config?.flushInterval || 30000 // 30 seconds
    };

    if (this.config.endpoint) {
      this.startFlushInterval();
    } else {
      this.enabled = false;
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level) || !this.enabled) return;
    
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const batch = [...this.buffer];
    this.buffer = [];
    
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ logs: batch })
      });
      
      if (!response.ok) {
        console.error('Failed to send logs to remote service:', response.statusText);
        // Put logs back in buffer for retry
        this.buffer.unshift(...batch);
      }
    } catch (error) {
      console.error('Failed to send logs to remote service:', error);
      // Put logs back in buffer for retry
      this.buffer.unshift(...batch);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(); // Final flush
  }
}

// Main structured logger class
class StructuredLogger extends EventEmitter {
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  private performanceMetrics: Map<string, { count: number; totalTime: number; errors: number }> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    super();
    
    this.config = {
      level: config.level || 'info',
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile !== false,
      enableDatabase: config.enableDatabase || false,
      enableRemote: config.enableRemote || false,
      fileConfig: config.fileConfig,
      remoteConfig: config.remoteConfig,
      filters: {
        excludeFields: [],
        maskFields: ['password', 'token', 'apiKey', 'secret'],
        includeStackTrace: true,
        ...config.filters
      },
      performance: {
        enableMetrics: true,
        slowOperationThreshold: 1000,
        ...config.performance
      }
    };

    this.setupTransports();
  }

  private setupTransports(): void {
    // Console transport
    if (this.config.enableConsole) {
      this.transports.push(new ConsoleTransport(this.config.level));
    }

    // File transport
    if (this.config.enableFile) {
      this.transports.push(new FileTransport(this.config.level, this.config.fileConfig));
    }

    // Remote transport
    if (this.config.enableRemote && this.config.remoteConfig) {
      this.transports.push(new RemoteTransport(this.config.level, this.config.remoteConfig));
    }
  }

  /**
   * Create a child logger with context
   */
  child(context: Partial<LogEntry>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log('debug', message, metadata, context);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log('info', message, metadata, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log('warn', message, metadata, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>, context?: Partial<LogEntry>): void {
    const enhancedMetadata = { ...metadata };
    let stackTrace: string | undefined;

    if (error) {
      enhancedMetadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (this.config.filters?.includeStackTrace) {
        stackTrace = error.stack;
      }
    }

    this.log('error', message, enhancedMetadata, { ...context, stackTrace });
  }

  /**
   * Log a fatal message
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>, context?: Partial<LogEntry>): void {
    const enhancedMetadata = { ...metadata };
    let stackTrace: string | undefined;

    if (error) {
      enhancedMetadata.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (this.config.filters?.includeStackTrace) {
        stackTrace = error.stack;
      }
    }

    this.log('fatal', message, enhancedMetadata, { ...context, stackTrace });
  }

  /**
   * Log a timed operation
   */
  async time<T>(
    label: string,
    operation: () => Promise<T>,
    context?: Partial<LogEntry>
  ): Promise<T> {
    const startTime = Date.now();
    const requestId = context?.requestId || this.generateId();
    
    this.debug(`Starting operation: ${label}`, { operation: label }, { ...context, requestId });
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      this.info(`Completed operation: ${label}`, 
        { operation: label, success: true }, 
        { ...context, requestId, duration }
      );
      
      // Update performance metrics
      if (this.config.performance.enableMetrics) {
        this.updatePerformanceMetrics(label, duration, false);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.error(`Failed operation: ${label}`, 
        error as Error, 
        { operation: label, success: false }, 
        { ...context, requestId, duration }
      );
      
      // Update performance metrics
      if (this.config.performance.enableMetrics) {
        this.updatePerformanceMetrics(label, duration, true);
      }
      
      throw error;
    }
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      source: context?.source || 'app',
      requestId: context?.requestId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      metadata: this.filterMetadata(metadata || {}),
      tags: context?.tags,
      duration: context?.duration,
      stackTrace: context?.stackTrace,
      correlationId: context?.correlationId || this.generateId()
    };

    // Write to all transports
    const writePromises = this.transports.map(async transport => {
      try {
        await transport.write(entry);
      } catch (error) {
        console.error(`Failed to write to transport ${transport.name}:`, error);
      }
    });

    await Promise.all(writePromises);
    
    // Emit log event
    this.emit('log', entry);
    
    // Check for slow operations
    if (entry.duration && entry.duration > this.config.performance.slowOperationThreshold) {
      this.emit('slow_operation', entry);
    }
  }

  /**
   * Filter and mask sensitive metadata
   */
  private filterMetadata(metadata: Record<string, any>): Record<string, any> {
    const filtered = { ...metadata };
    
    // Remove excluded fields
    if (this.config.filters?.excludeFields) {
      for (const field of this.config.filters.excludeFields) {
        delete filtered[field];
      }
    }
    
    // Mask sensitive fields
    if (this.config.filters?.maskFields) {
      for (const field of this.config.filters.maskFields) {
        if (filtered[field] !== undefined) {
          filtered[field] = '[MASKED]';
        }
      }
    }
    
    return filtered;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(operation: string, duration: number, isError: boolean): void {
    const metrics = this.performanceMetrics.get(operation) || { count: 0, totalTime: 0, errors: 0 };
    
    metrics.count++;
    metrics.totalTime += duration;
    if (isError) metrics.errors++;
    
    this.performanceMetrics.set(operation, metrics);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, {
    count: number;
    totalTime: number;
    averageTime: number;
    errors: number;
    errorRate: number;
  }> {
    const result: Record<string, any> = {};
    
    for (const [operation, metrics] of this.performanceMetrics.entries()) {
      result[operation] = {
        count: metrics.count,
        totalTime: metrics.totalTime,
        averageTime: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
        errors: metrics.errors,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) * 100 : 0
      };
    }
    
    return result;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Rebuild transports
    this.transports = [];
    this.setupTransports();
    
    this.info('Logger configuration updated', { config: this.config });
  }

  /**
   * Get logger statistics
   */
  getStats(): {
    transports: Array<{ name: string; enabled: boolean }>;
    performanceMetrics: Record<string, any>;
    config: LoggerConfig;
  } {
    return {
      transports: this.transports.map(t => ({ name: t.name, enabled: t.enabled })),
      performanceMetrics: this.getPerformanceMetrics(),
      config: this.config
    };
  }

  /**
   * Destroy the logger and cleanup resources
   */
  destroy(): void {
    // Cleanup remote transports
    for (const transport of this.transports) {
      if (transport instanceof RemoteTransport) {
        transport.destroy();
      }
    }
    
    this.removeAllListeners();
    this.info('Logger destroyed');
  }
}

// Child logger for contextual logging
class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private context: Partial<LogEntry>
  ) {}

  debug(message: string, metadata?: Record<string, any>): void {
    this.parent.debug(message, metadata, this.context);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.parent.info(message, metadata, this.context);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.parent.warn(message, metadata, this.context);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.parent.error(message, error, metadata, this.context);
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.parent.fatal(message, error, metadata, this.context);
  }

  async time<T>(label: string, operation: () => Promise<T>): Promise<T> {
    return this.parent.time(label, operation, this.context);
  }

  child(additionalContext: Partial<LogEntry>): ChildLogger {
    return new ChildLogger(this.parent, { ...this.context, ...additionalContext });
  }
}

// Create and export singleton instance
export const structuredLogger = new StructuredLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  enableConsole: process.env.NODE_ENV !== 'test',
  enableFile: process.env.ENABLE_FILE_LOGGING !== 'false',
  fileConfig: {
    directory: process.env.LOG_DIRECTORY || path.join(process.cwd(), 'logs'),
    filename: 'alfalyzer.log',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '50') * 1024 * 1024,
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
    rotation: (process.env.LOG_ROTATION as 'daily' | 'weekly' | 'size') || 'daily'
  }
});

export { StructuredLogger, ChildLogger };
export { StructuredLogger as Logger }; // Alias for compatibility
export default structuredLogger;