/**
 * Financial Compliance and Audit Logging System
 * 
 * Implements comprehensive audit trails, compliance monitoring,
 * and regulatory reporting for financial SaaS applications.
 * 
 * Supports: SOX, PCI-DSS, GDPR, SOC 2, and general financial regulations
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

// Compliance frameworks supported
export enum ComplianceFramework {
  SOX = 'sox', // Sarbanes-Oxley Act
  PCI_DSS = 'pci-dss', // Payment Card Industry Data Security Standard
  GDPR = 'gdpr', // General Data Protection Regulation
  SOC2 = 'soc2', // Service Organization Control 2
  FINRA = 'finra', // Financial Industry Regulatory Authority
  SEC = 'sec', // Securities and Exchange Commission
}

// Event severity levels
export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Event categories
export enum EventCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM_ACCESS = 'system_access',
  SECURITY_VIOLATION = 'security_violation',
  FINANCIAL_TRANSACTION = 'financial_transaction',
  API_ACCESS = 'api_access',
  CONFIGURATION_CHANGE = 'configuration_change',
}

// Audit event interface
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress: string;
  userAgent: string;
  category: EventCategory;
  action: string;
  resource: string;
  details: Record<string, any>;
  severity: AuditSeverity;
  success: boolean;
  complianceFrameworks: ComplianceFramework[];
  dataClassification?: string;
  piiInvolved: boolean;
  financialDataInvolved: boolean;
  hash: string; // Integrity hash
}

// Compliance rule interface
interface ComplianceRule {
  framework: ComplianceFramework;
  ruleId: string;
  description: string;
  category: EventCategory;
  severity: AuditSeverity;
  retentionDays: number;
  alertThreshold?: number;
  requiresEncryption: boolean;
}

// Audit log entry for file storage
interface AuditLogEntry {
  events: AuditEvent[];
  metadata: {
    batchId: string;
    timestamp: Date;
    eventCount: number;
    integrityHash: string;
  };
}

export class ComplianceAuditSystem {
  private logPath: string;
  private encryptionKey: Buffer;
  private complianceRules: ComplianceRule[];
  private alertCallbacks: Map<ComplianceFramework, (event: AuditEvent) => void> = new Map();

  constructor(logPath: string = './audit-logs', encryptionSecret?: string) {
    this.logPath = logPath;
    this.encryptionKey = encryptionSecret 
      ? crypto.pbkdf2Sync(encryptionSecret, 'audit-salt', 100000, 32, 'sha256')
      : crypto.randomBytes(32);
    
    this.complianceRules = this.initializeComplianceRules();
    this.ensureLogDirectory();
  }

  /**
   * Initialize compliance rules for different frameworks
   */
  private initializeComplianceRules(): ComplianceRule[] {
    return [
      // SOX Compliance Rules
      {
        framework: ComplianceFramework.SOX,
        ruleId: 'SOX-404',
        description: 'Financial data access and modifications',
        category: EventCategory.FINANCIAL_TRANSACTION,
        severity: AuditSeverity.HIGH,
        retentionDays: 2555, // 7 years
        requiresEncryption: true,
      },
      {
        framework: ComplianceFramework.SOX,
        ruleId: 'SOX-302',
        description: 'System access and authentication',
        category: EventCategory.AUTHENTICATION,
        severity: AuditSeverity.MEDIUM,
        retentionDays: 2555,
        requiresEncryption: true,
      },

      // PCI-DSS Compliance Rules
      {
        framework: ComplianceFramework.PCI_DSS,
        ruleId: 'PCI-10.2',
        description: 'Access to cardholder data',
        category: EventCategory.DATA_ACCESS,
        severity: AuditSeverity.HIGH,
        retentionDays: 365,
        alertThreshold: 5,
        requiresEncryption: true,
      },
      {
        framework: ComplianceFramework.PCI_DSS,
        ruleId: 'PCI-10.3',
        description: 'Access to audit logs',
        category: EventCategory.SYSTEM_ACCESS,
        severity: AuditSeverity.CRITICAL,
        retentionDays: 365,
        alertThreshold: 1,
        requiresEncryption: true,
      },

      // GDPR Compliance Rules
      {
        framework: ComplianceFramework.GDPR,
        ruleId: 'GDPR-32',
        description: 'Processing of personal data',
        category: EventCategory.DATA_ACCESS,
        severity: AuditSeverity.MEDIUM,
        retentionDays: 1095, // 3 years
        requiresEncryption: true,
      },
      {
        framework: ComplianceFramework.GDPR,
        ruleId: 'GDPR-33',
        description: 'Personal data breach notification',
        category: EventCategory.SECURITY_VIOLATION,
        severity: AuditSeverity.CRITICAL,
        retentionDays: 1095,
        alertThreshold: 1,
        requiresEncryption: true,
      },

      // SOC 2 Compliance Rules
      {
        framework: ComplianceFramework.SOC2,
        ruleId: 'CC6.1',
        description: 'Logical access controls',
        category: EventCategory.AUTHORIZATION,
        severity: AuditSeverity.MEDIUM,
        retentionDays: 1095,
        requiresEncryption: true,
      },
      {
        framework: ComplianceFramework.SOC2,
        ruleId: 'CC6.7',
        description: 'Data transmission and disposal',
        category: EventCategory.DATA_MODIFICATION,
        severity: AuditSeverity.HIGH,
        retentionDays: 1095,
        requiresEncryption: true,
      },

      // FINRA Compliance Rules
      {
        framework: ComplianceFramework.FINRA,
        ruleId: 'FINRA-4511',
        description: 'Books and records requirements',
        category: EventCategory.FINANCIAL_TRANSACTION,
        severity: AuditSeverity.HIGH,
        retentionDays: 1095,
        requiresEncryption: true,
      },

      // SEC Compliance Rules
      {
        framework: ComplianceFramework.SEC,
        ruleId: 'SEC-17a-4',
        description: 'Records preservation requirements',
        category: EventCategory.DATA_ACCESS,
        severity: AuditSeverity.HIGH,
        retentionDays: 2190, // 6 years
        requiresEncryption: true,
      },
    ];
  }

  /**
   * Log an audit event
   */
  public async logEvent(
    category: EventCategory,
    action: string,
    resource: string,
    details: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
      ipAddress: string;
      userAgent: string;
      success?: boolean;
      severity?: AuditSeverity;
      piiInvolved?: boolean;
      financialDataInvolved?: boolean;
    }
  ): Promise<void> {
    // Determine applicable compliance frameworks
    const frameworks = this.determineComplianceFrameworks(category, details);
    
    // Determine severity if not provided
    const severity = context.severity || this.determineSeverity(category, frameworks);

    // Create audit event
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      category,
      action,
      resource,
      details: this.sanitizeDetails(details),
      severity,
      success: context.success !== false,
      complianceFrameworks: frameworks,
      piiInvolved: context.piiInvolved || false,
      financialDataInvolved: context.financialDataInvolved || false,
      hash: '', // Will be calculated below
    };

    // Calculate integrity hash
    event.hash = this.calculateEventHash(event);

    // Store the event
    await this.storeEvent(event);

    // Check for compliance alerts
    await this.checkComplianceAlerts(event);

    // Log to console for immediate monitoring
    console.log(`🔒 Audit Event: ${event.category} - ${event.action} - ${event.severity}`);
  }

  /**
   * Determine which compliance frameworks apply to an event
   */
  private determineComplianceFrameworks(category: EventCategory, details: Record<string, any>): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [];

    // Always include SOC 2 for security events
    if ([EventCategory.AUTHENTICATION, EventCategory.AUTHORIZATION, EventCategory.SYSTEM_ACCESS].includes(category)) {
      frameworks.push(ComplianceFramework.SOC2);
    }

    // Financial data events trigger SOX and SEC
    if (category === EventCategory.FINANCIAL_TRANSACTION || details.stockSymbol || details.financialData) {
      frameworks.push(ComplianceFramework.SOX, ComplianceFramework.SEC, ComplianceFramework.FINRA);
    }

    // PII events trigger GDPR and potentially PCI-DSS
    if (details.pii || details.personalData) {
      frameworks.push(ComplianceFramework.GDPR);
      
      if (details.paymentData || details.creditCard) {
        frameworks.push(ComplianceFramework.PCI_DSS);
      }
    }

    // API access events
    if (category === EventCategory.API_ACCESS) {
      frameworks.push(ComplianceFramework.SOC2);
      
      if (details.financialApi) {
        frameworks.push(ComplianceFramework.SOX, ComplianceFramework.SEC);
      }
    }

    // Security violations trigger all frameworks
    if (category === EventCategory.SECURITY_VIOLATION) {
      frameworks.push(...Object.values(ComplianceFramework));
    }

    return frameworks;
  }

  /**
   * Determine event severity based on category and frameworks
   */
  private determineSeverity(category: EventCategory, frameworks: ComplianceFramework[]): AuditSeverity {
    // Critical events
    if (category === EventCategory.SECURITY_VIOLATION) {
      return AuditSeverity.CRITICAL;
    }

    // High severity events
    if ([EventCategory.FINANCIAL_TRANSACTION, EventCategory.DATA_MODIFICATION].includes(category)) {
      return AuditSeverity.HIGH;
    }

    // Medium severity for data access and authentication
    if ([EventCategory.DATA_ACCESS, EventCategory.AUTHENTICATION].includes(category)) {
      return AuditSeverity.MEDIUM;
    }

    return AuditSeverity.LOW;
  }

  /**
   * Sanitize event details to remove sensitive information
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'ssn', 'creditCard'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate long strings
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...[TRUNCATED]';
      }
    }

    return sanitized;
  }

  /**
   * Calculate integrity hash for an event
   */
  private calculateEventHash(event: Omit<AuditEvent, 'hash'>): string {
    const hashInput = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      category: event.category,
      action: event.action,
      resource: event.resource,
      success: event.success,
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Store audit event to encrypted log file
   */
  private async storeEvent(event: AuditEvent): Promise<void> {
    const date = event.timestamp.toISOString().split('T')[0];
    const logFileName = `audit-${date}.log`;
    const logFilePath = path.join(this.logPath, logFileName);

    try {
      // Check if encryption is required for any applicable compliance framework
      const requiresEncryption = event.complianceFrameworks.some(framework =>
        this.complianceRules.find(rule => rule.framework === framework)?.requiresEncryption
      );

      const logEntry = JSON.stringify(event) + '\n';
      const finalEntry = requiresEncryption ? this.encryptLogEntry(logEntry) : logEntry;

      await fs.appendFile(logFilePath, finalEntry, 'utf8');
    } catch (error) {
      console.error('Failed to store audit event:', error);
      // In production, this should trigger an alert
    }
  }

  /**
   * Encrypt log entry for sensitive compliance data
   */
  private encryptLogEntry(entry: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(entry, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      timestamp: new Date().toISOString(),
    }) + '\n';
  }

  /**
   * Check for compliance alerts based on rules
   */
  private async checkComplianceAlerts(event: AuditEvent): Promise<void> {
    for (const framework of event.complianceFrameworks) {
      const rules = this.complianceRules.filter(rule => rule.framework === framework);
      
      for (const rule of rules) {
        if (rule.alertThreshold && event.severity === AuditSeverity.CRITICAL) {
          await this.triggerComplianceAlert(framework, rule, event);
        }
      }
    }
  }

  /**
   * Trigger compliance alert
   */
  private async triggerComplianceAlert(
    framework: ComplianceFramework,
    rule: ComplianceRule,
    event: AuditEvent
  ): Promise<void> {
    console.warn(`🚨 COMPLIANCE ALERT: ${framework} - ${rule.ruleId}`);
    console.warn(`Event: ${event.category} - ${event.action}`);
    console.warn(`Details: ${JSON.stringify(event.details)}`);

    // Call registered alert callback
    const callback = this.alertCallbacks.get(framework);
    if (callback) {
      callback(event);
    }

    // In production, this would:
    // 1. Send notifications to compliance team
    // 2. Create incident tickets
    // 3. Trigger automated responses
    // 4. Update compliance dashboards
  }

  /**
   * Register alert callback for a compliance framework
   */
  public registerAlertCallback(framework: ComplianceFramework, callback: (event: AuditEvent) => void): void {
    this.alertCallbacks.set(framework, callback);
  }

  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    framework: ComplianceFramework,
    startDate: Date,
    endDate: Date
  ): Promise<{
    framework: ComplianceFramework;
    period: { start: Date; end: Date };
    eventCount: number;
    securityViolations: number;
    criticalEvents: number;
    complianceScore: number;
    recommendations: string[];
  }> {
    const events = await this.getEventsByDateRange(startDate, endDate);
    const frameworkEvents = events.filter(event => 
      event.complianceFrameworks.includes(framework)
    );

    const securityViolations = frameworkEvents.filter(
      event => event.category === EventCategory.SECURITY_VIOLATION
    ).length;

    const criticalEvents = frameworkEvents.filter(
      event => event.severity === AuditSeverity.CRITICAL
    ).length;

    // Calculate compliance score (simplified)
    const baseScore = 100;
    const violationPenalty = securityViolations * 10;
    const criticalPenalty = criticalEvents * 5;
    const complianceScore = Math.max(0, baseScore - violationPenalty - criticalPenalty);

    const recommendations = this.generateRecommendations(framework, frameworkEvents);

    return {
      framework,
      period: { start: startDate, end: endDate },
      eventCount: frameworkEvents.length,
      securityViolations,
      criticalEvents,
      complianceScore,
      recommendations,
    };
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(framework: ComplianceFramework, events: AuditEvent[]): string[] {
    const recommendations: string[] = [];

    const failedEvents = events.filter(event => !event.success);
    if (failedEvents.length > 0) {
      recommendations.push(`Review ${failedEvents.length} failed events for potential security issues`);
    }

    const criticalEvents = events.filter(event => event.severity === AuditSeverity.CRITICAL);
    if (criticalEvents.length > 0) {
      recommendations.push(`Immediate attention required for ${criticalEvents.length} critical security events`);
    }

    // Framework-specific recommendations
    switch (framework) {
      case ComplianceFramework.SOX:
        const financialEvents = events.filter(event => event.financialDataInvolved);
        if (financialEvents.length > 1000) {
          recommendations.push('Consider implementing additional controls for high-volume financial data access');
        }
        break;
        
      case ComplianceFramework.GDPR:
        const piiEvents = events.filter(event => event.piiInvolved);
        if (piiEvents.length > 0) {
          recommendations.push('Ensure proper consent and data processing documentation for PII events');
        }
        break;
    }

    return recommendations;
  }

  /**
   * Get events by date range (simplified - in production would query database)
   */
  private async getEventsByDateRange(startDate: Date, endDate: Date): Promise<AuditEvent[]> {
    // This is a simplified implementation
    // In production, this would query a database or search log files
    return [];
  }

  /**
   * Ensure audit log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  /**
   * Clean up old audit logs based on retention policies
   */
  public async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logPath);
      const now = new Date();

      for (const file of files) {
        if (file.startsWith('audit-') && file.endsWith('.log')) {
          const dateStr = file.match(/audit-(\d{4}-\d{2}-\d{2})\.log/)?.[1];
          if (dateStr) {
            const fileDate = new Date(dateStr);
            const daysDiff = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // Use longest retention period (SOX: 7 years)
            if (daysDiff > 2555) {
              await fs.unlink(path.join(this.logPath, file));
              console.log(`Deleted old audit log: ${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
    }
  }

  /**
   * Verify log integrity
   */
  public async verifyLogIntegrity(date: string): Promise<boolean> {
    try {
      const logFilePath = path.join(this.logPath, `audit-${date}.log`);
      const content = await fs.readFile(logFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const event: AuditEvent = JSON.parse(line);
          const calculatedHash = this.calculateEventHash({
            ...event,
            hash: '', // Exclude hash from calculation
          });
          
          if (calculatedHash !== event.hash) {
            console.error(`Integrity violation detected in audit log for ${date}`);
            return false;
          }
        } catch (error) {
          // Try to decrypt if it's an encrypted entry
          try {
            const encryptedData = JSON.parse(line);
            if (encryptedData.encrypted) {
              // Skip integrity check for encrypted entries in this simplified implementation
              continue;
            }
          } catch {
            console.error(`Malformed audit log entry: ${line}`);
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to verify log integrity for ${date}:`, error);
      return false;
    }
  }
}

// Export convenience functions for common audit scenarios
export const AuditLogger = {
  /**
   * Log authentication event
   */
  authentication: async (
    action: 'login' | 'logout' | 'failed_login' | 'password_change',
    userId: string,
    context: { ipAddress: string; userAgent: string; success?: boolean }
  ) => {
    await auditSystem.logEvent(
      EventCategory.AUTHENTICATION,
      action,
      'user_authentication',
      { userId },
      context
    );
  },

  /**
   * Log financial data access
   */
  financialDataAccess: async (
    action: string,
    resource: string,
    details: Record<string, any>,
    context: { userId?: string; ipAddress: string; userAgent: string }
  ) => {
    await auditSystem.logEvent(
      EventCategory.DATA_ACCESS,
      action,
      resource,
      { ...details, financialData: true },
      { ...context, financialDataInvolved: true }
    );
  },

  /**
   * Log API access
   */
  apiAccess: async (
    endpoint: string,
    method: string,
    context: { ipAddress: string; userAgent: string; success?: boolean; responseTime?: number }
  ) => {
    await auditSystem.logEvent(
      EventCategory.API_ACCESS,
      `${method}_${endpoint}`,
      endpoint,
      { method, responseTime: context.responseTime },
      context
    );
  },

  /**
   * Log security violation
   */
  securityViolation: async (
    violation: string,
    details: Record<string, any>,
    context: { ipAddress: string; userAgent: string }
  ) => {
    await auditSystem.logEvent(
      EventCategory.SECURITY_VIOLATION,
      violation,
      'security_system',
      details,
      { ...context, severity: AuditSeverity.CRITICAL, success: false }
    );
  },
};

// Global audit system instance
export const auditSystem = new ComplianceAuditSystem(
  process.env.AUDIT_LOG_PATH || './audit-logs',
  process.env.AUDIT_ENCRYPTION_SECRET
);