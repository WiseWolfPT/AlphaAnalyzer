// Memory Optimization Strategies for Financial Applications
// Designed for hundreds of concurrent users with limited API quotas

import { EventEmitter } from 'events';
import { DataCategory } from './advanced-cache-manager';

// Memory management interfaces
interface MemoryPool {
  allocated: number;
  available: number;
  peak: number;
  gcCount: number;
  fragmentationRatio: number;
}

interface MemoryUsagePattern {
  userId?: string;
  category: DataCategory;
  averageSize: number;
  accessFrequency: number;
  retentionTime: number;
  priority: number;
}

interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'lz4' | 'snappy';
  threshold: number; // Minimum size in bytes to compress
  level: number; // Compression level 1-9
}

interface ObjectPoolConfig {
  maxSize: number;
  preAllocate: number;
  objectFactory: () => any;
  resetFunction: (obj: any) => void;
}

// Memory optimization strategies
export enum OptimizationStrategy {
  OBJECT_POOLING = 'object_pooling',
  LAZY_LOADING = 'lazy_loading',
  COMPRESSION = 'compression',
  WEAK_REFERENCES = 'weak_references',
  BATCH_PROCESSING = 'batch_processing',
  STREAMING = 'streaming',
  PAGINATION = 'pagination'
}

export enum MemoryPressureLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface MemoryOptimizationConfig {
  maxMemoryUsage: number; // bytes
  gcThreshold: number; // percentage
  compressionConfig: CompressionConfig;
  objectPooling: boolean;
  weakReferences: boolean;
  batchSize: number;
  pressureThresholds: {
    medium: number; // percentage
    high: number;
    critical: number;
  };
  strategies: {
    [key in MemoryPressureLevel]: OptimizationStrategy[];
  };
}

const DEFAULT_OPTIMIZATION_CONFIG: MemoryOptimizationConfig = {
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  gcThreshold: 70, // Trigger GC at 70% usage
  compressionConfig: {
    enabled: true,
    algorithm: 'gzip',
    threshold: 1024, // Compress objects > 1KB
    level: 6
  },
  objectPooling: true,
  weakReferences: true,
  batchSize: 50,
  pressureThresholds: {
    medium: 60,
    high: 80,
    critical: 95
  },
  strategies: {
    [MemoryPressureLevel.LOW]: [
      OptimizationStrategy.OBJECT_POOLING,
      OptimizationStrategy.LAZY_LOADING
    ],
    [MemoryPressureLevel.MEDIUM]: [
      OptimizationStrategy.OBJECT_POOLING,
      OptimizationStrategy.COMPRESSION,
      OptimizationStrategy.BATCH_PROCESSING
    ],
    [MemoryPressureLevel.HIGH]: [
      OptimizationStrategy.COMPRESSION,
      OptimizationStrategy.WEAK_REFERENCES,
      OptimizationStrategy.STREAMING,
      OptimizationStrategy.PAGINATION
    ],
    [MemoryPressureLevel.CRITICAL]: [
      OptimizationStrategy.COMPRESSION,
      OptimizationStrategy.WEAK_REFERENCES,
      OptimizationStrategy.STREAMING,
      OptimizationStrategy.PAGINATION,
      OptimizationStrategy.BATCH_PROCESSING
    ]
  }
};

// Compression utilities
class CompressionManager {
  private static instance: CompressionManager;
  
  static getInstance(): CompressionManager {
    if (!CompressionManager.instance) {
      CompressionManager.instance = new CompressionManager();
    }
    return CompressionManager.instance;
  }

  compress(data: any, config: CompressionConfig): string | any {
    if (!config.enabled) return data;
    
    const serialized = JSON.stringify(data);
    if (serialized.length < config.threshold) return data;

    try {
      // Simplified compression - in production, use actual compression libraries
      switch (config.algorithm) {
        case 'gzip':
          return this.gzipCompress(serialized, config.level);
        case 'lz4':
          return this.lz4Compress(serialized);
        case 'snappy':
          return this.snappyCompress(serialized);
        default:
          return data;
      }
    } catch (error) {
      console.warn('Compression failed:', error);
      return data;
    }
  }

  decompress(compressedData: string, algorithm: string): any {
    try {
      let decompressed: string;
      
      switch (algorithm) {
        case 'gzip':
          decompressed = this.gzipDecompress(compressedData);
          break;
        case 'lz4':
          decompressed = this.lz4Decompress(compressedData);
          break;
        case 'snappy':
          decompressed = this.snappyDecompress(compressedData);
          break;
        default:
          return compressedData;
      }
      
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return compressedData;
    }
  }

  // Simplified compression implementations (use real libraries in production)
  private gzipCompress(data: string, level: number): string {
    // Placeholder - use pako or similar library
    return `gzip:${level}:${btoa(data)}`;
  }

  private gzipDecompress(data: string): string {
    const parts = data.split(':');
    if (parts[0] === 'gzip') {
      return atob(parts[2]);
    }
    return data;
  }

  private lz4Compress(data: string): string {
    // Placeholder - use lz4js or similar library
    return `lz4:${btoa(data)}`;
  }

  private lz4Decompress(data: string): string {
    const parts = data.split(':');
    if (parts[0] === 'lz4') {
      return atob(parts[1]);
    }
    return data;
  }

  private snappyCompress(data: string): string {
    // Placeholder - use snappy-js or similar library
    return `snappy:${btoa(data)}`;
  }

  private snappyDecompress(data: string): string {
    const parts = data.split(':');
    if (parts[0] === 'snappy') {
      return atob(parts[1]);
    }
    return data;
  }
}

// Object pooling for frequently created/destroyed objects
class ObjectPool<T> {
  private pool: T[] = [];
  private inUse = new Set<T>();
  
  constructor(private config: ObjectPoolConfig) {
    // Pre-allocate objects
    for (let i = 0; i < config.preAllocate; i++) {
      this.pool.push(config.objectFactory());
    }
  }

  acquire(): T {
    let obj = this.pool.pop();
    
    if (!obj) {
      obj = this.config.objectFactory();
    }
    
    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.config.resetFunction(obj);
      
      if (this.pool.length < this.config.maxSize) {
        this.pool.push(obj);
      }
    }
  }

  getStats(): { poolSize: number; inUse: number; total: number } {
    return {
      poolSize: this.pool.length,
      inUse: this.inUse.size,
      total: this.pool.length + this.inUse.size
    };
  }

  clear(): void {
    this.pool.length = 0;
    this.inUse.clear();
  }
}

// Weak reference manager for large objects
class WeakReferenceManager {
  private weakRefs = new Map<string, WeakRef<any>>();
  private finalizationRegistry = new FinalizationRegistry((key: string) => {
    this.weakRefs.delete(key);
  });

  set(key: string, value: any): void {
    // Clean up existing reference if present
    this.delete(key);
    
    const weakRef = new WeakRef(value);
    this.weakRefs.set(key, weakRef);
    this.finalizationRegistry.register(value, key);
  }

  get(key: string): any | null {
    const weakRef = this.weakRefs.get(key);
    if (!weakRef) return null;
    
    const value = weakRef.deref();
    if (!value) {
      this.weakRefs.delete(key);
      return null;
    }
    
    return value;
  }

  delete(key: string): boolean {
    return this.weakRefs.delete(key);
  }

  has(key: string): boolean {
    const weakRef = this.weakRefs.get(key);
    if (!weakRef) return false;
    
    const value = weakRef.deref();
    if (!value) {
      this.weakRefs.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.weakRefs.clear();
  }

  size(): number {
    return this.weakRefs.size;
  }
}

// Stream processing for large datasets
class StreamProcessor {
  static async processInBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 50
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Allow event loop to process other tasks
      await new Promise(resolve => setImmediate(resolve));
    }
    
    return results;
  }

  static async *streamProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    delay: number = 0
  ): AsyncGenerator<R, void, unknown> {
    for (const item of items) {
      yield await processor(item);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Main memory optimization manager
export class MemoryOptimizationManager extends EventEmitter {
  private memoryPool: MemoryPool = {
    allocated: 0,
    available: 0,
    peak: 0,
    gcCount: 0,
    fragmentationRatio: 0
  };

  private compressionManager = CompressionManager.getInstance();
  private objectPools = new Map<string, ObjectPool<any>>();
  private weakReferenceManager = new WeakReferenceManager();
  private usagePatterns: MemoryUsagePattern[] = [];
  
  private monitoringInterval?: NodeJS.Timeout;
  private currentPressureLevel = MemoryPressureLevel.LOW;
  private optimizationCount = 0;

  constructor(private config: MemoryOptimizationConfig = DEFAULT_OPTIMIZATION_CONFIG) {
    super();
    this.startMonitoring();
    this.setupObjectPools();
  }

  // Core optimization methods
  optimizeObject(key: string, data: any, category: DataCategory): any {
    const pressureLevel = this.getCurrentPressureLevel();
    const strategies = this.config.strategies[pressureLevel];
    
    let optimizedData = data;
    
    for (const strategy of strategies) {
      optimizedData = this.applyStrategy(strategy, key, optimizedData, category);
    }
    
    this.optimizationCount++;
    return optimizedData;
  }

  retrieveObject(key: string, compressedData: any): any {
    // Handle compressed data
    if (typeof compressedData === 'string' && compressedData.includes(':')) {
      const algorithm = compressedData.split(':')[0];
      if (['gzip', 'lz4', 'snappy'].includes(algorithm)) {
        return this.compressionManager.decompress(compressedData, algorithm);
      }
    }
    
    // Handle weak references
    if (this.weakReferenceManager.has(key)) {
      return this.weakReferenceManager.get(key);
    }
    
    return compressedData;
  }

  // Strategy implementations
  private applyStrategy(
    strategy: OptimizationStrategy,
    key: string,
    data: any,
    category: DataCategory
  ): any {
    switch (strategy) {
      case OptimizationStrategy.COMPRESSION:
        return this.compressionManager.compress(data, this.config.compressionConfig);
      
      case OptimizationStrategy.WEAK_REFERENCES:
        if (this.isLargeObject(data)) {
          this.weakReferenceManager.set(key, data);
          return { __weakRef: key };
        }
        return data;
      
      case OptimizationStrategy.OBJECT_POOLING:
        return this.optimizeWithPooling(data, category);
      
      case OptimizationStrategy.LAZY_LOADING:
        return this.createLazyProxy(data);
      
      default:
        return data;
    }
  }

  private optimizeWithPooling(data: any, category: DataCategory): any {
    const poolKey = `pool_${category}`;
    
    if (!this.objectPools.has(poolKey)) {
      return data;
    }
    
    const pool = this.objectPools.get(poolKey)!;
    const pooledObj = pool.acquire();
    
    // Copy data to pooled object
    Object.assign(pooledObj, data);
    
    return pooledObj;
  }

  private createLazyProxy(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    return new Proxy(data, {
      get(target, prop) {
        // Lazy load properties on access
        if (prop in target && typeof target[prop] === 'function') {
          return target[prop].bind(target);
        }
        return target[prop];
      }
    });
  }

  // Memory monitoring and pressure detection
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMemoryStats();
      this.detectPressureLevel();
      this.performGCIfNeeded();
    }, 5000); // Monitor every 5 seconds
  }

  private updateMemoryStats(): void {
    // Get memory usage (simplified - would use process.memoryUsage() in Node.js)
    const memoryUsage = this.getMemoryUsage();
    
    this.memoryPool.allocated = memoryUsage.used;
    this.memoryPool.available = this.config.maxMemoryUsage - memoryUsage.used;
    this.memoryPool.peak = Math.max(this.memoryPool.peak, memoryUsage.used);
    this.memoryPool.fragmentationRatio = this.calculateFragmentation();
  }

  private detectPressureLevel(): void {
    const usagePercentage = (this.memoryPool.allocated / this.config.maxMemoryUsage) * 100;
    
    let newLevel: MemoryPressureLevel;
    
    if (usagePercentage >= this.config.pressureThresholds.critical) {
      newLevel = MemoryPressureLevel.CRITICAL;
    } else if (usagePercentage >= this.config.pressureThresholds.high) {
      newLevel = MemoryPressureLevel.HIGH;
    } else if (usagePercentage >= this.config.pressureThresholds.medium) {
      newLevel = MemoryPressureLevel.MEDIUM;
    } else {
      newLevel = MemoryPressureLevel.LOW;
    }
    
    if (newLevel !== this.currentPressureLevel) {
      const oldLevel = this.currentPressureLevel;
      this.currentPressureLevel = newLevel;
      this.emit('memoryPressure:changed', { from: oldLevel, to: newLevel, usage: usagePercentage });
      
      if (newLevel === MemoryPressureLevel.CRITICAL) {
        this.performEmergencyCleanup();
      }
    }
  }

  private performGCIfNeeded(): void {
    const usagePercentage = (this.memoryPool.allocated / this.config.maxMemoryUsage) * 100;
    
    if (usagePercentage >= this.config.gcThreshold) {
      this.performGarbageCollection();
    }
  }

  private performGarbageCollection(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      this.memoryPool.gcCount++;
      this.emit('gc:performed', { count: this.memoryPool.gcCount });
    }
    
    // Clean up object pools
    for (const pool of this.objectPools.values()) {
      pool.clear();
    }
    
    // Clean up weak references
    this.cleanupWeakReferences();
  }

  private performEmergencyCleanup(): void {
    this.emit('emergency:cleanup:started');
    
    // Aggressive cleanup
    this.weakReferenceManager.clear();
    
    for (const pool of this.objectPools.values()) {
      pool.clear();
    }
    
    // Force multiple GC cycles
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
      }
    }
    
    this.emit('emergency:cleanup:completed');
  }

  private cleanupWeakReferences(): void {
    // Weak references are automatically cleaned up, but we can trigger cleanup
    const sizeBefore = this.weakReferenceManager.size();
    
    // Force a check of all weak references
    if (global.gc) {
      global.gc();
    }
    
    const sizeAfter = this.weakReferenceManager.size();
    
    if (sizeBefore !== sizeAfter) {
      this.emit('weakRefs:cleaned', { before: sizeBefore, after: sizeAfter });
    }
  }

  // Object pool management
  private setupObjectPools(): void {
    if (!this.config.objectPooling) return;
    
    // Create pools for common data types
    const dataCategories = Object.values(DataCategory);
    
    for (const category of dataCategories) {
      this.createObjectPool(category);
    }
  }

  private createObjectPool(category: DataCategory): void {
    const poolConfig: ObjectPoolConfig = {
      maxSize: 100,
      preAllocate: 10,
      objectFactory: () => this.createObjectForCategory(category),
      resetFunction: (obj) => this.resetObject(obj)
    };
    
    const pool = new ObjectPool(poolConfig);
    this.objectPools.set(`pool_${category}`, pool);
  }

  private createObjectForCategory(category: DataCategory): any {
    switch (category) {
      case DataCategory.REAL_TIME_PRICE:
        return { symbol: '', price: 0, volume: 0, timestamp: 0 };
      case DataCategory.STOCK_QUOTE:
        return { symbol: '', bid: 0, ask: 0, last: 0, volume: 0 };
      case DataCategory.FINANCIAL_DATA:
        return { symbol: '', revenue: [], netIncome: [], eps: [] };
      default:
        return {};
    }
  }

  private resetObject(obj: any): void {
    // Clear all properties
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        delete obj[key];
      }
    }
  }

  // Utility methods
  private getMemoryUsage(): { used: number; total: number } {
    // Simplified memory usage calculation
    // In a real implementation, use process.memoryUsage() for Node.js
    // or performance.memory for browsers
    return {
      used: this.memoryPool.allocated,
      total: this.config.maxMemoryUsage
    };
  }

  private calculateFragmentation(): number {
    // Simplified fragmentation calculation
    const totalAllocated = this.memoryPool.allocated;
    const estimatedWaste = totalAllocated * 0.1; // Assume 10% fragmentation
    return totalAllocated > 0 ? estimatedWaste / totalAllocated : 0;
  }

  private isLargeObject(data: any): boolean {
    const size = JSON.stringify(data).length * 2; // Rough size estimation
    return size > 10240; // 10KB threshold
  }

  getCurrentPressureLevel(): MemoryPressureLevel {
    return this.currentPressureLevel;
  }

  // Public API
  getMemoryStats(): MemoryPool & { pressureLevel: MemoryPressureLevel; optimizationCount: number } {
    return {
      ...this.memoryPool,
      pressureLevel: this.currentPressureLevel,
      optimizationCount: this.optimizationCount
    };
  }

  getObjectPoolStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, pool] of this.objectPools.entries()) {
      stats[key] = pool.getStats();
    }
    
    return stats;
  }

  getWeakReferenceStats(): { count: number } {
    return {
      count: this.weakReferenceManager.size()
    };
  }

  addUsagePattern(pattern: MemoryUsagePattern): void {
    this.usagePatterns.push(pattern);
    this.emit('usagePattern:added', pattern);
  }

  optimizeForUser(userId: string): void {
    const userPatterns = this.usagePatterns.filter(p => p.userId === userId);
    
    // Analyze user patterns and optimize accordingly
    const highPriorityCategories = userPatterns
      .filter(p => p.priority > 7)
      .map(p => p.category);
    
    // Pre-allocate pools for high-priority categories
    for (const category of highPriorityCategories) {
      if (!this.objectPools.has(`pool_${category}_${userId}`)) {
        this.createUserSpecificPool(userId, category);
      }
    }
  }

  private createUserSpecificPool(userId: string, category: DataCategory): void {
    const poolConfig: ObjectPoolConfig = {
      maxSize: 50,
      preAllocate: 5,
      objectFactory: () => this.createObjectForCategory(category),
      resetFunction: (obj) => this.resetObject(obj)
    };
    
    const pool = new ObjectPool(poolConfig);
    this.objectPools.set(`pool_${category}_${userId}`, pool);
  }

  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Clean up all pools
    for (const pool of this.objectPools.values()) {
      pool.clear();
    }
    this.objectPools.clear();
    
    // Clean up weak references
    this.weakReferenceManager.clear();
    
    this.emit('optimization:shutdown');
  }
}

// Export utilities and types
export { CompressionManager, ObjectPool, WeakReferenceManager, StreamProcessor };
export type { MemoryPool, MemoryUsagePattern, CompressionConfig, ObjectPoolConfig, MemoryOptimizationConfig };