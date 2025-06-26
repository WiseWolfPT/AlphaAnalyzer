/**
 * Secure API Key Management System for Financial SaaS
 * 
 * Implements secure storage, rotation, and validation of API keys
 * following financial industry security standards.
 */

import crypto from 'crypto';
import { z } from 'zod';

// Environment variables schema for API keys
const ApiKeyConfigSchema = z.object({
  FINNHUB_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  FMP_API_KEY: z.string().optional(),
  IEX_API_KEY: z.string().optional(),
  API_KEY_ENCRYPTION_SECRET: z.string().min(32),
  API_KEY_ROTATION_INTERVAL_HOURS: z.string().default('24'),
});

interface APIKeyMetadata {
  provider: string;
  keyId: string;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
  isActive: boolean;
  expiresAt?: Date;
  rotationDue: Date;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

interface EncryptedAPIKey {
  encryptedKey: string;
  iv: string;
  tag: string;
  metadata: APIKeyMetadata;
}

export class SecureAPIKeyManager {
  private keyStore: Map<string, EncryptedAPIKey> = new Map();
  private encryptionKey: Buffer;
  private rotationInterval: number;

  constructor() {
    const config = this.validateConfig();
    this.encryptionKey = this.deriveEncryptionKey(config.API_KEY_ENCRYPTION_SECRET);
    this.rotationInterval = parseInt(config.API_KEY_ROTATION_INTERVAL_HOURS) * 60 * 60 * 1000;
    this.initializeKeys(config);
  }

  private validateConfig() {
    try {
      return ApiKeyConfigSchema.parse(process.env);
    } catch (error) {
      throw new Error('Invalid API key configuration. Check environment variables.');
    }
  }

  private deriveEncryptionKey(secret: string): Buffer {
    // Use PBKDF2 to derive a strong encryption key
    return crypto.pbkdf2Sync(secret, 'api-key-salt', 100000, 32, 'sha256');
  }

  /**
   * Encrypts an API key using AES-256-GCM
   */
  private encryptKey(plainKey: string): { encryptedKey: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
    cipher.setAAD(Buffer.from('api-key', 'utf8'));
    
    let encrypted = cipher.update(plainKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encryptedKey: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypts an API key using AES-256-GCM
   */
  private decryptKey(encryptedData: { encryptedKey: string; iv: string; tag: string }): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipherGCM('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAAD(Buffer.from('api-key', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Initialize API keys from environment variables
   */
  private initializeKeys(config: z.infer<typeof ApiKeyConfigSchema>) {
    const providers = [
      { name: 'finnhub', key: config.FINNHUB_API_KEY },
      { name: 'alphavantage', key: config.ALPHA_VANTAGE_API_KEY },
      { name: 'fmp', key: config.FMP_API_KEY },
      { name: 'iex', key: config.IEX_API_KEY },
    ];

    providers.forEach(provider => {
      if (provider.key) {
        this.storeKey(provider.name, provider.key);
      }
    });
  }

  /**
   * Securely store an API key
   */
  public storeKey(provider: string, plainKey: string, expiresAt?: Date): string {
    const keyId = crypto.randomUUID();
    const encryptedData = this.encryptKey(plainKey);
    
    const metadata: APIKeyMetadata = {
      provider,
      keyId,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      isActive: true,
      expiresAt,
      rotationDue: new Date(Date.now() + this.rotationInterval),
    };

    const encryptedKey: EncryptedAPIKey = {
      ...encryptedData,
      metadata,
    };

    this.keyStore.set(keyId, encryptedKey);
    return keyId;
  }

  /**
   * Retrieve and decrypt an API key
   */
  public async getKey(provider: string): Promise<string | null> {
    const keyEntry = Array.from(this.keyStore.values()).find(
      entry => entry.metadata.provider === provider && entry.metadata.isActive
    );

    if (!keyEntry) {
      return null;
    }

    // Check if key is expired
    if (keyEntry.metadata.expiresAt && keyEntry.metadata.expiresAt < new Date()) {
      await this.deactivateKey(keyEntry.metadata.keyId);
      return null;
    }

    // Update usage statistics
    keyEntry.metadata.lastUsed = new Date();
    keyEntry.metadata.usageCount++;

    // Check if rotation is due
    if (keyEntry.metadata.rotationDue < new Date()) {
      await this.scheduleKeyRotation(provider);
    }

    return this.decryptKey(keyEntry);
  }

  /**
   * Update rate limit information for a key
   */
  public updateRateLimit(provider: string, remaining: number, resetTime: Date) {
    const keyEntry = Array.from(this.keyStore.values()).find(
      entry => entry.metadata.provider === provider && entry.metadata.isActive
    );

    if (keyEntry) {
      keyEntry.metadata.rateLimitRemaining = remaining;
      keyEntry.metadata.rateLimitReset = resetTime;
    }
  }

  /**
   * Check if a provider's API key is approaching rate limits
   */
  public isRateLimitCritical(provider: string): boolean {
    const keyEntry = Array.from(this.keyStore.values()).find(
      entry => entry.metadata.provider === provider && entry.metadata.isActive
    );

    if (!keyEntry || !keyEntry.metadata.rateLimitRemaining) {
      return false;
    }

    return keyEntry.metadata.rateLimitRemaining < 10; // Critical threshold
  }

  /**
   * Deactivate an API key
   */
  public async deactivateKey(keyId: string): Promise<void> {
    const keyEntry = this.keyStore.get(keyId);
    if (keyEntry) {
      keyEntry.metadata.isActive = false;
    }
  }

  /**
   * Schedule key rotation (in production, this would trigger an automated process)
   */
  private async scheduleKeyRotation(provider: string): Promise<void> {
    console.warn(`⚠️  API key rotation due for provider: ${provider}`);
    // In production, this would:
    // 1. Notify administrators
    // 2. Generate new API key if automatic rotation is enabled
    // 3. Update external service configurations
    // 4. Deactivate old key after grace period
  }

  /**
   * Get security statistics
   */
  public getSecurityStats() {
    const activeKeys = Array.from(this.keyStore.values()).filter(k => k.metadata.isActive);
    
    return {
      totalActiveKeys: activeKeys.length,
      keysByProvider: activeKeys.reduce((acc, key) => {
        acc[key.metadata.provider] = (acc[key.metadata.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      keysNearingRotation: activeKeys.filter(
        k => k.metadata.rotationDue < new Date(Date.now() + 24 * 60 * 60 * 1000)
      ).length,
      keysNearingRateLimit: activeKeys.filter(
        k => k.metadata.rateLimitRemaining && k.metadata.rateLimitRemaining < 50
      ).length,
    };
  }

  /**
   * Validate API key format and strength
   */
  public static validateKeyStrength(key: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (key.length < 16) {
      issues.push('Key is too short (minimum 16 characters)');
    }
    
    if (!/[A-Za-z]/.test(key)) {
      issues.push('Key should contain letters');
    }
    
    if (!/[0-9]/.test(key)) {
      issues.push('Key should contain numbers');
    }
    
    if (key === key.toLowerCase() || key === key.toUpperCase()) {
      issues.push('Key should contain mixed case letters');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Clean up expired and inactive keys
   */
  public cleanup(): void {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    for (const [keyId, keyEntry] of this.keyStore) {
      if (!keyEntry.metadata.isActive && keyEntry.metadata.lastUsed < cutoffDate) {
        this.keyStore.delete(keyId);
      }
    }
  }
}

// Global instance
export const apiKeyManager = new SecureAPIKeyManager();