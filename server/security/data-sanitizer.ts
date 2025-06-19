/**
 * Data Sanitization and Protection for Financial SaaS
 * 
 * Implements data sanitization, PII detection/masking, and secure data handling
 * for financial applications with compliance requirements.
 */

import crypto from 'crypto';
import { z } from 'zod';

// PII Detection Patterns
const PII_PATTERNS = {
  SSN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  BANK_ACCOUNT: /\b\d{8,17}\b/g,
  TAX_ID: /\b\d{2}-?\d{7}\b/g,
};

// Financial Data Classifications
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted', // Highest security level for financial data
}

export interface SanitizationOptions {
  classification: DataClassification;
  maskPII: boolean;
  removeScripts: boolean;
  validateFinancialData: boolean;
  auditLog: boolean;
}

export interface SanitizationResult {
  sanitizedData: any;
  warnings: string[];
  piiDetected: string[];
  classification: DataClassification;
  auditTrail: AuditEvent[];
}

export interface AuditEvent {
  timestamp: Date;
  action: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class FinancialDataSanitizer {
  private encryptionKey: Buffer;
  private auditTrail: AuditEvent[] = [];

  constructor(encryptionSecret?: string) {
    this.encryptionKey = encryptionSecret 
      ? crypto.pbkdf2Sync(encryptionSecret, 'sanitizer-salt', 100000, 32, 'sha256')
      : crypto.randomBytes(32);
  }

  /**
   * Main sanitization method
   */
  public sanitize(data: any, options: Partial<SanitizationOptions> = {}): SanitizationResult {
    const opts: SanitizationOptions = {
      classification: DataClassification.INTERNAL,
      maskPII: true,
      removeScripts: true,
      validateFinancialData: true,
      auditLog: true,
      ...options,
    };

    const result: SanitizationResult = {
      sanitizedData: data,
      warnings: [],
      piiDetected: [],
      classification: opts.classification,
      auditTrail: [],
    };

    try {
      // Deep clone the data to avoid mutation
      result.sanitizedData = JSON.parse(JSON.stringify(data));

      // Apply sanitization steps
      if (opts.removeScripts) {
        result.sanitizedData = this.removeScriptTags(result.sanitizedData, result);
      }

      if (opts.maskPII) {
        result.sanitizedData = this.maskPII(result.sanitizedData, result);
      }

      if (opts.validateFinancialData) {
        this.validateFinancialData(result.sanitizedData, result);
      }

      // Apply data classification security
      this.applyClassificationSecurity(result, opts.classification);

      if (opts.auditLog) {
        this.addAuditEvent(result, 'sanitization_complete', 
          `Data sanitized with classification: ${opts.classification}`, 'low');
      }

    } catch (error) {
      result.warnings.push(`Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.addAuditEvent(result, 'sanitization_error', 
        `Error during sanitization: ${error}`, 'high');
    }

    return result;
  }

  /**
   * Remove potentially dangerous script tags and content
   */
  private removeScriptTags(data: any, result: SanitizationResult): any {
    if (typeof data === 'string') {
      const originalLength = data.length;
      
      // Remove script tags
      data = data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      // Remove event handlers
      data = data.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      
      // Remove javascript: protocols
      data = data.replace(/javascript:/gi, '');
      
      // Remove data: protocols (except images)
      data = data.replace(/data:(?!image\/)[^;]+;/gi, '');

      if (data.length !== originalLength) {
        result.warnings.push('Potentially malicious script content removed');
        this.addAuditEvent(result, 'script_removal', 
          'Malicious script content detected and removed', 'medium');
      }

      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.removeScriptTags(item, result));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        sanitized[key] = this.removeScriptTags(data[key], result);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Detect and mask PII data
   */
  private maskPII(data: any, result: SanitizationResult): any {
    if (typeof data === 'string') {
      let maskedData = data;
      
      for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
        const matches = data.match(pattern);
        if (matches) {
          result.piiDetected.push(...matches.map(match => `${type}: ${this.partialMask(match)}`));
          maskedData = maskedData.replace(pattern, (match) => this.maskString(match, type));
          
          this.addAuditEvent(result, 'pii_detected', 
            `PII detected and masked: ${type}`, 'high');
        }
      }

      return maskedData;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskPII(item, result));
    }

    if (data && typeof data === 'object') {
      const masked: any = {};
      for (const key in data) {
        // Check if the key name suggests sensitive data
        if (this.isSensitiveField(key)) {
          masked[key] = this.maskSensitiveField(data[key], key);
          result.piiDetected.push(`Sensitive field: ${key}`);
        } else {
          masked[key] = this.maskPII(data[key], result);
        }
      }
      return masked;
    }

    return data;
  }

  /**
   * Validate financial data formats and ranges
   */
  private validateFinancialData(data: any, result: SanitizationResult): void {
    if (typeof data === 'object' && data !== null) {
      // Validate financial metrics
      const financialFields = ['price', 'volume', 'marketCap', 'revenue', 'eps', 'peRatio'];
      
      for (const field of financialFields) {
        if (field in data) {
          const value = data[field];
          if (typeof value === 'number') {
            // Check for suspicious values
            if (value < 0 && !['eps', 'netIncome'].includes(field)) {
              result.warnings.push(`Negative value detected for ${field}: ${value}`);
            }
            
            // Check for unrealistic values
            if (field === 'price' && value > 1000000) {
              result.warnings.push(`Unusually high price detected: ${value}`);
            }
            
            if (field === 'peRatio' && (value < 0 || value > 1000)) {
              result.warnings.push(`Unusual P/E ratio detected: ${value}`);
            }
          }
        }
      }

      // Recursively validate nested objects
      for (const key in data) {
        if (typeof data[key] === 'object') {
          this.validateFinancialData(data[key], result);
        }
      }
    }
  }

  /**
   * Apply security measures based on data classification
   */
  private applyClassificationSecurity(result: SanitizationResult, classification: DataClassification): void {
    switch (classification) {
      case DataClassification.RESTRICTED:
        // Highest security - encrypt sensitive fields
        result.sanitizedData = this.encryptSensitiveFields(result.sanitizedData);
        this.addAuditEvent(result, 'encryption_applied', 
          'Sensitive fields encrypted for RESTRICTED classification', 'low');
        break;
        
      case DataClassification.CONFIDENTIAL:
        // Remove detailed financial ratios and insider information
        result.sanitizedData = this.removeSensitiveFinancialData(result.sanitizedData);
        break;
        
      case DataClassification.INTERNAL:
        // Standard sanitization already applied
        break;
        
      case DataClassification.PUBLIC:
        // Most permissive, but still remove PII
        break;
    }
  }

  /**
   * Check if a field name indicates sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'ssn', 'social', 'password', 'secret', 'key', 'token',
      'creditcard', 'bankaccount', 'routing', 'taxid', 'ein',
      'salary', 'income', 'compensation'
    ];
    
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive)
    );
  }

  /**
   * Mask sensitive field values
   */
  private maskSensitiveField(value: any, fieldName: string): string {
    if (typeof value === 'string') {
      if (fieldName.toLowerCase().includes('password')) {
        return '[PASSWORD_REMOVED]';
      }
      return this.maskString(value, 'SENSITIVE');
    }
    return '[REDACTED]';
  }

  /**
   * Mask a string based on its type
   */
  private maskString(str: string, type: string): string {
    switch (type) {
      case 'SSN':
        return str.replace(/\d{3}-?\d{2}-?(\d{4})/, 'XXX-XX-$1');
      case 'CREDIT_CARD':
        return str.replace(/(\d{4})[\s-]?\d{4}[\s-]?\d{4}[\s-]?(\d{4})/, '$1-XXXX-XXXX-$2');
      case 'EMAIL':
        const [username, domain] = str.split('@');
        return `${username.substring(0, 2)}***@${domain}`;
      case 'PHONE':
        return str.replace(/(\d{3})[-.]?(\d{3})[-.]?(\d{4})/, '$1-XXX-$3');
      default:
        // Generic masking
        if (str.length <= 4) return 'X'.repeat(str.length);
        const visibleChars = Math.max(1, Math.floor(str.length * 0.2));
        return str.substring(0, visibleChars) + 'X'.repeat(str.length - visibleChars * 2) + str.substring(str.length - visibleChars);
    }
  }

  /**
   * Create a partial mask for audit logging
   */
  private partialMask(str: string): string {
    if (str.length <= 4) return 'X'.repeat(str.length);
    return str.substring(0, 2) + 'X'.repeat(str.length - 4) + str.substring(str.length - 2);
  }

  /**
   * Encrypt sensitive fields for RESTRICTED data
   */
  private encryptSensitiveFields(data: any): any {
    if (typeof data === 'object' && data !== null) {
      const encrypted: any = Array.isArray(data) ? [] : {};
      
      for (const key in data) {
        if (this.isSensitiveField(key) && typeof data[key] === 'string') {
          encrypted[key] = this.encryptValue(data[key]);
        } else if (typeof data[key] === 'object') {
          encrypted[key] = this.encryptSensitiveFields(data[key]);
        } else {
          encrypted[key] = data[key];
        }
      }
      
      return encrypted;
    }
    
    return data;
  }

  /**
   * Remove sensitive financial data for CONFIDENTIAL classification
   */
  private removeSensitiveFinancialData(data: any): any {
    if (typeof data === 'object' && data !== null) {
      const filtered: any = Array.isArray(data) ? [] : {};
      
      const restrictedFields = ['insiderTrading', 'privatePlacements', 'detailedFinancials'];
      
      for (const key in data) {
        if (!restrictedFields.includes(key)) {
          if (typeof data[key] === 'object') {
            filtered[key] = this.removeSensitiveFinancialData(data[key]);
          } else {
            filtered[key] = data[key];
          }
        }
      }
      
      return filtered;
    }
    
    return data;
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  private encryptValue(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return as base64 encoded string with IV and tag
    return Buffer.from(JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    })).toString('base64');
  }

  /**
   * Add an audit event
   */
  private addAuditEvent(result: SanitizationResult, action: string, details: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const event: AuditEvent = {
      timestamp: new Date(),
      action,
      details,
      severity,
    };
    
    result.auditTrail.push(event);
    this.auditTrail.push(event);
  }

  /**
   * Get sanitization statistics
   */
  public getStatistics(): {
    totalSanitizations: number;
    piiDetections: number;
    securityViolations: number;
    recentEvents: AuditEvent[];
  } {
    const securityViolations = this.auditTrail.filter(
      event => event.severity === 'high' || event.severity === 'critical'
    ).length;

    return {
      totalSanitizations: this.auditTrail.filter(e => e.action === 'sanitization_complete').length,
      piiDetections: this.auditTrail.filter(e => e.action === 'pii_detected').length,
      securityViolations,
      recentEvents: this.auditTrail.slice(-10),
    };
  }

  /**
   * Validate financial stock symbol format
   */
  public static validateStockSymbol(symbol: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!symbol || typeof symbol !== 'string') {
      errors.push('Symbol must be a non-empty string');
      return { isValid: false, errors };
    }
    
    if (symbol.length < 1 || symbol.length > 10) {
      errors.push('Symbol must be 1-10 characters long');
    }
    
    if (!/^[A-Z]+$/.test(symbol)) {
      errors.push('Symbol must contain only uppercase letters');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize financial API response data
   */
  public static sanitizeFinancialResponse(data: any): any {
    const sanitizer = new FinancialDataSanitizer();
    const result = sanitizer.sanitize(data, {
      classification: DataClassification.CONFIDENTIAL,
      maskPII: true,
      removeScripts: true,
      validateFinancialData: true,
      auditLog: true,
    });
    
    return result.sanitizedData;
  }
}

// Global sanitizer instance
export const dataSanitizer = new FinancialDataSanitizer(process.env.DATA_ENCRYPTION_SECRET);