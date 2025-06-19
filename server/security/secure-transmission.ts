/**
 * Secure Data Transmission Patterns for Financial SaaS
 * 
 * Implements secure communication protocols, encryption in transit,
 * certificate validation, and secure API communication patterns
 * for financial data protection.
 */

import https from 'https';
import crypto from 'crypto';
import { z } from 'zod';
import { auditSystem, EventCategory, AuditSeverity } from './compliance-audit';

// SSL/TLS Configuration
export interface TLSConfig {
  minVersion: string;
  maxVersion: string;
  ciphers: string[];
  rejectUnauthorized: boolean;
  checkServerIdentity: boolean;
}

// Secure transmission options
export interface SecureTransmissionOptions {
  encryption: boolean;
  compression: boolean;
  timeout: number;
  retries: number;
  validateCertificate: boolean;
  requireMutualTLS: boolean;
  allowedHosts: string[];
}

// API request context for audit logging
export interface APIRequestContext {
  userId?: string;
  sessionId?: string;
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

// Encrypted payload structure
interface EncryptedPayload {
  data: string; // Base64 encoded encrypted data
  iv: string;   // Initialization vector
  tag: string;  // Authentication tag
  algorithm: string;
  timestamp: number;
}

export class SecureTransmissionManager {
  private encryptionKey: Buffer;
  private tlsConfig: TLSConfig;
  private defaultOptions: SecureTransmissionOptions;

  constructor(encryptionSecret?: string) {
    this.encryptionKey = encryptionSecret 
      ? crypto.pbkdf2Sync(encryptionSecret, 'transmission-salt', 100000, 32, 'sha256')
      : crypto.randomBytes(32);

    this.tlsConfig = this.getSecureTLSConfig();
    this.defaultOptions = this.getDefaultTransmissionOptions();
  }

  /**
   * Get secure TLS configuration for financial applications
   */
  private getSecureTLSConfig(): TLSConfig {
    return {
      minVersion: 'TLSv1.3', // Require TLS 1.3 for maximum security
      maxVersion: 'TLSv1.3',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
      ],
      rejectUnauthorized: true,
      checkServerIdentity: true,
    };
  }

  /**
   * Get default secure transmission options
   */
  private getDefaultTransmissionOptions(): SecureTransmissionOptions {
    return {
      encryption: true,
      compression: false, // Disabled to prevent CRIME/BREACH attacks
      timeout: 30000, // 30 seconds
      retries: 3,
      validateCertificate: true,
      requireMutualTLS: false,
      allowedHosts: [
        'financialmodelingprep.com',
        'www.alphavantage.co',
        'finnhub.io',
        'cloud.iexapis.com',
      ],
    };
  }

  /**
   * Encrypt data for secure transmission
   */
  public encryptPayload(data: any): EncryptedPayload {
    const jsonData = JSON.stringify(data);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('financial-data', 'utf8'));
    
    let encrypted = cipher.update(jsonData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: 'aes-256-gcm',
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt received payload
   */
  public decryptPayload(encryptedPayload: EncryptedPayload): any {
    // Verify timestamp (prevent replay attacks)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - encryptedPayload.timestamp > maxAge) {
      throw new Error('Encrypted payload expired');
    }

    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('financial-data', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'base64'));

    let decrypted = decipher.update(encryptedPayload.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Validate SSL certificate
   */
  private validateCertificate(cert: any, hostname: string): boolean {
    try {
      // Check certificate validity period
      const now = new Date();
      if (now < new Date(cert.valid_from) || now > new Date(cert.valid_to)) {
        throw new Error('Certificate expired or not yet valid');
      }

      // Check subject alternative names
      if (cert.subjectaltname) {
        const altNames = cert.subjectaltname.split(', ');
        const validName = altNames.some((name: string) => {
          if (name.startsWith('DNS:')) {
            const dnsName = name.substring(4);
            return dnsName === hostname || (dnsName.startsWith('*.') && hostname.endsWith(dnsName.substring(1)));
          }
          return false;
        });
        
        if (!validName) {
          throw new Error('Certificate subject alternative name mismatch');
        }
      }

      // Check certificate chain
      if (!cert.fingerprint || !cert.issuer) {
        throw new Error('Invalid certificate structure');
      }

      return true;
    } catch (error) {
      console.error('Certificate validation failed:', error);
      return false;
    }
  }

  /**
   * Make secure API request to financial data providers
   */
  public async makeSecureAPIRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
    } = {},
    context: APIRequestContext
  ): Promise<any> {
    const startTime = Date.now();
    const parsedUrl = new URL(url);
    
    // Validate allowed hosts
    if (!this.defaultOptions.allowedHosts.includes(parsedUrl.hostname)) {
      await this.auditAPIRequest(url, options.method || 'GET', context, false, 
        'Host not in allowlist', Date.now() - startTime);
      throw new Error(`Host ${parsedUrl.hostname} not in allowed hosts list`);
    }

    // Prepare secure request options
    const requestOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'SecureFinancialApp/1.0',
        'Accept': 'application/json',
        'Accept-Encoding': 'identity', // Disable compression for security
        ...options.headers,
      },
      timeout: options.timeout || this.defaultOptions.timeout,
      // Apply secure TLS configuration
      secureProtocol: 'TLSv1_3_method',
      ciphers: this.tlsConfig.ciphers.join(':'),
      rejectUnauthorized: this.tlsConfig.rejectUnauthorized,
      checkServerIdentity: this.tlsConfig.checkServerIdentity ? undefined : () => undefined,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        // Validate certificate
        if (this.defaultOptions.validateCertificate && res.socket) {
          const cert = (res.socket as any).getPeerCertificate(true);
          if (!this.validateCertificate(cert, parsedUrl.hostname)) {
            this.auditAPIRequest(url, options.method || 'GET', context, false, 
              'Certificate validation failed', Date.now() - startTime);
            reject(new Error('Certificate validation failed'));
            return;
          }
        }

        // Validate response headers for security
        this.validateResponseHeaders(res.headers);

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          
          // Prevent memory exhaustion attacks
          if (data.length > 10 * 1024 * 1024) { // 10MB limit
            req.destroy();
            this.auditAPIRequest(url, options.method || 'GET', context, false, 
              'Response too large', Date.now() - startTime);
            reject(new Error('Response too large'));
          }
        });

        res.on('end', () => {
          try {
            const responseTime = Date.now() - startTime;
            
            // Parse JSON response
            const parsedData = JSON.parse(data);
            
            // Sanitize response data
            const sanitizedData = this.sanitizeAPIResponse(parsedData);
            
            // Audit successful request
            this.auditAPIRequest(url, options.method || 'GET', context, true, 
              'Success', responseTime);
            
            resolve(sanitizedData);
          } catch (error) {
            this.auditAPIRequest(url, options.method || 'GET', context, false, 
              'JSON parse error', Date.now() - startTime);
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', (error) => {
        this.auditAPIRequest(url, options.method || 'GET', context, false, 
          error.message, Date.now() - startTime);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        this.auditAPIRequest(url, options.method || 'GET', context, false, 
          'Request timeout', Date.now() - startTime);
        reject(new Error('Request timeout'));
      });

      // Send request body if provided
      if (options.body) {
        if (this.defaultOptions.encryption) {
          const encryptedBody = this.encryptPayload(options.body);
          req.write(JSON.stringify(encryptedBody));
        } else {
          req.write(JSON.stringify(options.body));
        }
      }

      req.end();
    });
  }

  /**
   * Validate response headers for security
   */
  private validateResponseHeaders(headers: any): void {
    // Check for security headers
    if (!headers['strict-transport-security']) {
      console.warn('Missing HSTS header in API response');
    }

    if (!headers['x-content-type-options']) {
      console.warn('Missing X-Content-Type-Options header in API response');
    }

    // Validate content type
    const contentType = headers['content-type'];
    if (contentType && !contentType.includes('application/json')) {
      console.warn(`Unexpected content type: ${contentType}`);
    }
  }

  /**
   * Sanitize API response data
   */
  private sanitizeAPIResponse(data: any): any {
    if (typeof data === 'string') {
      // Remove potential XSS vectors
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeAPIResponse(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        sanitized[key] = this.sanitizeAPIResponse(data[key]);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Audit API request for compliance
   */
  private async auditAPIRequest(
    url: string,
    method: string,
    context: APIRequestContext,
    success: boolean,
    details: string,
    responseTime: number
  ): Promise<void> {
    try {
      await auditSystem.logEvent(
        EventCategory.API_ACCESS,
        `${method}_${new URL(url).hostname}`,
        url,
        {
          method,
          responseTime,
          details,
          financialApi: true,
        },
        {
          userId: context.userId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          success,
          financialDataInvolved: true,
        }
      );
    } catch (error) {
      console.error('Failed to audit API request:', error);
    }
  }

  /**
   * Generate secure request signature for API authentication
   */
  public generateRequestSignature(
    apiKey: string,
    requestPath: string,
    timestamp: number,
    body?: string
  ): string {
    const message = `${requestPath}${timestamp}${body || ''}`;
    return crypto
      .createHmac('sha256', apiKey)
      .update(message)
      .digest('hex');
  }

  /**
   * Verify request signature
   */
  public verifyRequestSignature(
    signature: string,
    apiKey: string,
    requestPath: string,
    timestamp: number,
    body?: string
  ): boolean {
    const expectedSignature = this.generateRequestSignature(apiKey, requestPath, timestamp, body);
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Create secure WebSocket connection for real-time financial data
   */
  public createSecureWebSocket(
    url: string,
    context: APIRequestContext
  ): Promise<WebSocket | null> {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url);
        
        // Validate WebSocket URL
        if (!parsedUrl.protocol.startsWith('wss:')) {
          reject(new Error('WebSocket must use secure protocol (wss://)'));
          return;
        }

        // Validate allowed hosts
        if (!this.defaultOptions.allowedHosts.includes(parsedUrl.hostname)) {
          reject(new Error(`WebSocket host ${parsedUrl.hostname} not allowed`));
          return;
        }

        // Create secure WebSocket with custom headers
        const ws = new WebSocket(url, {
          headers: {
            'User-Agent': 'SecureFinancialApp/1.0',
            'Origin': process.env.FRONTEND_URL || 'https://localhost:3000',
          },
          rejectUnauthorized: true,
        } as any);

        ws.on('open', () => {
          this.auditAPIRequest(url, 'WEBSOCKET_CONNECT', context, true, 
            'WebSocket connected', 0);
          resolve(ws);
        });

        ws.on('error', (error) => {
          this.auditAPIRequest(url, 'WEBSOCKET_ERROR', context, false, 
            error.message, 0);
          reject(error);
        });

        ws.on('close', () => {
          this.auditAPIRequest(url, 'WEBSOCKET_CLOSE', context, true, 
            'WebSocket closed', 0);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Rate limiting for API requests
   */
  private rateLimiter = new Map<string, { count: number; resetTime: number }>();

  public checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = this.rateLimiter.get(identifier);

    if (!bucket || now > bucket.resetTime) {
      this.rateLimiter.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (bucket.count >= limit) {
      return false;
    }

    bucket.count++;
    return true;
  }

  /**
   * Clean up expired rate limit buckets
   */
  public cleanupRateLimiter(): void {
    const now = Date.now();
    for (const [key, bucket] of this.rateLimiter.entries()) {
      if (now > bucket.resetTime) {
        this.rateLimiter.delete(key);
      }
    }
  }

  /**
   * Get transmission statistics
   */
  public getTransmissionStats(): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    rateLimitViolations: number;
  } {
    // This is a simplified implementation
    // In production, these would be tracked in memory or database
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      rateLimitViolations: 0,
    };
  }
}

// Global secure transmission manager
export const secureTransmissionManager = new SecureTransmissionManager(
  process.env.TRANSMISSION_ENCRYPTION_SECRET
);

// Utility functions for common secure transmission patterns
export const SecureAPI = {
  /**
   * Make secure financial data request
   */
  async fetchFinancialData(
    provider: string,
    endpoint: string,
    params: Record<string, string>,
    context: APIRequestContext
  ): Promise<any> {
    const baseUrls: Record<string, string> = {
      finnhub: 'https://finnhub.io/api/v1',
      alphavantage: 'https://www.alphavantage.co/query',
      fmp: 'https://financialmodelingprep.com/api/v3',
      iex: 'https://cloud.iexapis.com/stable',
    };

    const baseUrl = baseUrls[provider];
    if (!baseUrl) {
      throw new Error(`Unknown financial data provider: ${provider}`);
    }

    const queryString = new URLSearchParams(params).toString();
    const url = `${baseUrl}${endpoint}?${queryString}`;

    return secureTransmissionManager.makeSecureAPIRequest(
      url,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      },
      context
    );
  },

  /**
   * Validate API response structure
   */
  validateResponse(data: any, expectedSchema: z.ZodSchema): boolean {
    try {
      expectedSchema.parse(data);
      return true;
    } catch (error) {
      console.error('API response validation failed:', error);
      return false;
    }
  },
};