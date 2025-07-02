export interface CacheEntry<T = any> {
  value: T;
  expires: number;
}

export interface CacheConfig {
  maxSizeInMB?: number;
  defaultTTL?: number;
}

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getMultiple<T>(keys: string[]): Promise<Record<string, T>>;
  setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<void>;
  size(): Promise<number>;
}