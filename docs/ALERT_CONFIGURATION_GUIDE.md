# Alfalyzer Alert Configuration Guide

## 🚨 Overview

This document provides comprehensive guidelines for configuring, managing, and responding to alerts in the Alfalyzer monitoring system. Proper alert configuration is crucial for maintaining platform reliability and user experience.

## 📋 Alert Categories

### 1. Critical Alerts (P0)
**Response Time:** Immediate (< 5 minutes)
**Escalation:** Page on-call engineer, notify management

- **Service Outage:** Complete platform unavailability
- **Security Breach:** Unauthorized access attempts
- **Data Loss:** Critical data corruption or loss
- **Payment System Failure:** Stripe/payment processing errors
- **Multiple API Provider Failures:** All financial data sources down

### 2. High Priority Alerts (P1)
**Response Time:** 15 minutes
**Escalation:** Notify on-call team, create incident

- **High Error Rate:** > 5% application error rate
- **API Provider Outage:** Primary financial data provider down
- **Performance Degradation:** Overall performance score < 60
- **Database Connection Issues:** Connection pool exhaustion
- **Memory Leak Detection:** Memory usage increasing trend

### 3. Medium Priority Alerts (P2)
**Response Time:** 1 hour
**Escalation:** Create ticket, notify team during business hours

- **Moderate Error Rate:** 2-5% application error rate
- **API Rate Limiting:** Approaching quota limits (> 90%)
- **Performance Warning:** Overall performance score 60-70
- **High Response Times:** API responses > 2 seconds
- **Component Performance Issues:** Render times > 100ms

### 4. Low Priority Alerts (P3)
**Response Time:** 4 hours
**Escalation:** Create ticket for next sprint

- **Low Error Rate:** 1-2% application error rate
- **Bundle Size Growth:** Bundle size increased > 10%
- **Memory Usage Warning:** Memory usage > 75% threshold
- **Slow User Flows:** User journey completion time increased
- **Analytics Anomalies:** Unusual user behavior patterns

## ⚙️ Alert Thresholds Configuration

### Performance Thresholds

```typescript
interface AlertThresholds {
  performance: {
    overallScore: {
      critical: 50,    // P0 - Platform unusable
      high: 60,        // P1 - Significant degradation
      medium: 70,      // P2 - Minor degradation
      baseline: 85     // Expected performance
    },
    loadTime: {
      critical: 10,    // 10+ seconds
      high: 5,         // 5-10 seconds
      medium: 3,       // 3-5 seconds
      baseline: 2      // < 2 seconds
    },
    memoryUsage: {
      critical: 500,   // 500MB+ (Memory leak)
      high: 200,       // 200-500MB
      medium: 100,     // 100-200MB
      baseline: 50     // < 50MB
    },
    renderTime: {
      critical: 500,   // 500ms+ (Blocking UI)
      high: 100,       // 100-500ms
      medium: 50,      // 50-100ms
      baseline: 16     // < 16ms (60fps)
    }
  }
}
```

### Error Rate Thresholds

```typescript
interface ErrorThresholds {
  errorRate: {
    critical: 10,      // 10%+ error rate
    high: 5,           // 5-10% error rate
    medium: 2,         // 2-5% error rate
    baseline: 0.5      // < 0.5% error rate
  },
  consecutiveErrors: {
    critical: 10,      // 10 consecutive errors
    high: 5,           // 5 consecutive errors
    medium: 3          // 3 consecutive errors
  },
  errorFrequency: {
    critical: 100,     // 100 errors/minute
    high: 50,          // 50 errors/minute
    medium: 20         // 20 errors/minute
  }
}
```

### API Provider Thresholds

```typescript
interface APIThresholds {
  responseTime: {
    critical: 5000,    // 5+ seconds
    high: 2000,        // 2-5 seconds
    medium: 1000,      // 1-2 seconds
    baseline: 500      // < 500ms
  },
  errorRate: {
    critical: 20,      // 20%+ API errors
    high: 10,          // 10-20% API errors
    medium: 5,         // 5-10% API errors
    baseline: 1        // < 1% API errors
  },
  uptime: {
    critical: 90,      // < 90% uptime
    high: 95,          // 90-95% uptime
    medium: 99,        // 95-99% uptime
    baseline: 99.5     // > 99.5% uptime
  },
  quotaUsage: {
    critical: 95,      // 95%+ quota used
    high: 90,          // 90-95% quota used
    medium: 80,        // 80-90% quota used
    warning: 70        // 70-80% quota used
  }
}
```

### Security Thresholds

```typescript
interface SecurityThresholds {
  failedLogins: {
    critical: 20,      // 20+ failed attempts
    high: 10,          // 10-20 failed attempts
    medium: 5          // 5-10 failed attempts
  },
  rateLimitViolations: {
    critical: 100,     // 100+ violations/hour
    high: 50,          // 50-100 violations/hour
    medium: 20         // 20-50 violations/hour
  },
  suspiciousActivity: {
    multipleIPs: 5,    // Same user, 5+ IPs
    rapidActions: 100, // 100+ actions/minute
    unusualPatterns: true // ML-detected anomalies
  }
}
```

## 🔧 Alert Implementation

### 1. Sentry Alert Rules

Configure Sentry alert rules in your project settings:

```typescript
// Sentry alert configuration
const sentryAlerts = {
  // High error rate alert
  errorRateAlert: {
    name: 'High Error Rate',
    conditions: [
      {
        id: 'sentry.rules.conditions.event_frequency.EventFrequencyCondition',
        interval: '1m',
        value: 50 // 50 errors per minute
      }
    ],
    actions: [
      {
        id: 'sentry.rules.actions.notify_event_service.NotifyEventServiceAction',
        service: 'slack',
        channel: '#alerts-critical'
      }
    ]
  },
  
  // Performance degradation alert
  performanceAlert: {
    name: 'Performance Degradation',
    conditions: [
      {
        id: 'sentry.rules.conditions.tagged_event.TaggedEventCondition',
        key: 'performance_score',
        match: 'lte',
        value: '70'
      }
    ]
  }
};
```

### 2. Custom Alert Functions

```typescript
// client/src/lib/alerts.ts
import { Sentry } from '@/lib/monitoring';

export class AlertManager {
  private static instance: AlertManager;
  private alertThresholds: AlertThresholds;
  
  constructor() {
    this.alertThresholds = {
      performance: { /* ... */ },
      errorRate: { /* ... */ },
      api: { /* ... */ },
      security: { /* ... */ }
    };
  }
  
  // Check performance metrics
  checkPerformanceAlerts(metrics: PerformanceMetrics) {
    const { overallScore, loadTime, memoryUsage } = metrics;
    
    if (overallScore < this.alertThresholds.performance.overallScore.critical) {
      this.triggerAlert('performance', 'critical', {
        message: `Critical performance degradation: ${overallScore}/100`,
        metrics,
        timestamp: new Date()
      });
    }
    
    if (loadTime > this.alertThresholds.performance.loadTime.high) {
      this.triggerAlert('performance', 'high', {
        message: `High load time detected: ${loadTime}s`,
        metrics,
        timestamp: new Date()
      });
    }
  }
  
  // Check error rate
  checkErrorRateAlerts(errorRate: number, timeWindow: string) {
    if (errorRate > this.alertThresholds.errorRate.critical) {
      this.triggerAlert('error-rate', 'critical', {
        message: `Critical error rate: ${errorRate}%`,
        errorRate,
        timeWindow,
        timestamp: new Date()
      });
    }
  }
  
  // Check API health
  checkAPIHealthAlerts(provider: string, metrics: APIMetrics) {
    const { responseTime, errorRate, uptime } = metrics;
    
    if (uptime < this.alertThresholds.api.uptime.critical) {
      this.triggerAlert('api-health', 'critical', {
        message: `API provider ${provider} critical uptime: ${uptime}%`,
        provider,
        metrics,
        timestamp: new Date()
      });
    }
    
    if (responseTime > this.alertThresholds.api.responseTime.high) {
      this.triggerAlert('api-health', 'high', {
        message: `API provider ${provider} slow response: ${responseTime}ms`,
        provider,
        metrics,
        timestamp: new Date()
      });
    }
  }
  
  // Check security alerts
  checkSecurityAlerts(event: SecurityEvent) {
    if (event.type === 'failed_login' && event.count > this.alertThresholds.security.failedLogins.high) {
      this.triggerAlert('security', 'high', {
        message: `Multiple failed login attempts: ${event.count}`,
        event,
        timestamp: new Date()
      });
    }
  }
  
  // Trigger alert
  private triggerAlert(category: string, severity: string, data: any) {
    // Send to Sentry
    Sentry.captureMessage(
      `Alert: ${category} - ${severity}`,
      severity === 'critical' ? 'error' : 'warning',
      {
        tags: {
          alert_category: category,
          alert_severity: severity
        },
        extra: data
      }
    );
    
    // Send to external alerting system
    this.sendToAlertingSystem(category, severity, data);
  }
  
  private sendToAlertingSystem(category: string, severity: string, data: any) {
    // Implementation depends on your alerting system
    // Examples: PagerDuty, Slack, Email, SMS
    if (severity === 'critical') {
      // Page on-call engineer
      // this.pagerDuty.trigger(data);
    }
    
    // Send to Slack
    // this.slack.send(data);
  }
}
```

### 3. Alert Monitoring Integration

```typescript
// client/src/hooks/use-alert-monitor.ts
import { useEffect } from 'react';
import { AlertManager } from '@/lib/alerts';

export function useAlertMonitor() {
  const alertManager = AlertManager.getInstance();
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Check various metrics
      checkAllAlerts();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const checkAllAlerts = async () => {
    // Get current metrics
    const performanceMetrics = await getPerformanceMetrics();
    const errorRate = await getErrorRate();
    const apiHealth = await getAPIHealth();
    
    // Check thresholds
    alertManager.checkPerformanceAlerts(performanceMetrics);
    alertManager.checkErrorRateAlerts(errorRate, '5m');
    alertManager.checkAPIHealthAlerts('alpha-vantage', apiHealth);
  };
}
```

## 📊 Alert Dashboard Configuration

### Alert Summary Component

```typescript
// client/src/components/admin/alert-summary.tsx
import React, { useState, useEffect } from 'react';

interface Alert {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  resolved: boolean;
  acknowledgement?: {
    by: string;
    at: Date;
    note?: string;
  };
}

export const AlertSummary: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<string>('all');
  
  // Load alerts from monitoring system
  useEffect(() => {
    loadAlerts();
  }, []);
  
  const acknowledgeAlert = (alertId: string, note?: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { 
            ...alert, 
            acknowledgement: {
              by: 'current_user',
              at: new Date(),
              note
            }
          }
        : alert
    ));
  };
  
  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, resolved: true }
        : alert
    ));
  };
  
  // Component render logic...
};
```

### Alert Metrics Dashboard

```typescript
// client/src/components/admin/alert-metrics.tsx
export const AlertMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalAlerts: 0,
    criticalAlerts: 0,
    averageResolutionTime: 0,
    alertTrends: [],
    topAlertCategories: []
  });
  
  // Alert trends chart
  const alertTrendData = metrics.alertTrends.map(trend => ({
    timestamp: trend.timestamp,
    critical: trend.critical,
    high: trend.high,
    medium: trend.medium,
    resolved: trend.resolved
  }));
  
  // Component render with charts...
};
```

## 🔄 Alert Escalation Procedures

### Escalation Matrix

| Alert Priority | Initial Response | Escalation Time | Escalation Path |
|----------------|------------------|-----------------|-----------------|
| P0 (Critical) | Immediate page | 5 minutes | On-call → Team Lead → Engineering Manager |
| P1 (High) | Team notification | 15 minutes | On-call → Team Lead |
| P2 (Medium) | Ticket creation | 1 hour | Team Lead → Sprint Planning |
| P3 (Low) | Ticket creation | 4 hours | Product Owner → Next Sprint |

### Escalation Implementation

```typescript
// server/services/escalation-service.ts
export class EscalationService {
  private escalationRules: EscalationRule[] = [
    {
      priority: 'critical',
      initialResponse: 0, // Immediate
      escalationTime: 5 * 60 * 1000, // 5 minutes
      escalationPath: ['on-call', 'team-lead', 'engineering-manager']
    },
    {
      priority: 'high',
      initialResponse: 0,
      escalationTime: 15 * 60 * 1000, // 15 minutes
      escalationPath: ['on-call', 'team-lead']
    }
  ];
  
  async handleAlert(alert: Alert) {
    const rule = this.escalationRules.find(r => r.priority === alert.severity);
    if (!rule) return;
    
    // Initial notification
    await this.notifyInitialResponder(alert, rule);
    
    // Schedule escalation
    setTimeout(() => {
      this.escalateAlert(alert, rule);
    }, rule.escalationTime);
  }
  
  private async escalateAlert(alert: Alert, rule: EscalationRule) {
    if (alert.resolved || alert.acknowledgement) return;
    
    const nextResponder = rule.escalationPath[1]; // Next in escalation path
    await this.notifyResponder(alert, nextResponder);
  }
}
```

## 🔕 Alert Suppression and Filtering

### Suppression Rules

```typescript
// Prevent alert spam
export const suppressionRules = {
  // Suppress duplicate alerts within time window
  duplicateWindow: 15 * 60 * 1000, // 15 minutes
  
  // Suppress alerts during maintenance
  maintenanceMode: {
    enabled: false,
    start: null,
    end: null
  },
  
  // Suppress low-priority alerts outside business hours
  businessHours: {
    enabled: true,
    start: '09:00',
    end: '17:00',
    timezone: 'UTC',
    suppressLowPriority: true
  },
  
  // Suppress alerts for specific components
  componentSuppression: {
    'legacy-widget': ['medium', 'low'],
    'beta-feature': ['low']
  }
};
```

### Alert Filtering

```typescript
export class AlertFilter {
  static shouldSuppressAlert(alert: Alert): boolean {
    // Check duplicate suppression
    if (this.isDuplicate(alert)) return true;
    
    // Check maintenance mode
    if (this.isMaintenanceMode()) return true;
    
    // Check business hours
    if (this.isOutsideBusinessHours(alert)) return true;
    
    // Check component suppression
    if (this.isComponentSuppressed(alert)) return true;
    
    return false;
  }
  
  private static isDuplicate(alert: Alert): boolean {
    // Check if similar alert exists in recent history
    const recentAlerts = this.getRecentAlerts(suppressionRules.duplicateWindow);
    return recentAlerts.some(existing => 
      existing.category === alert.category &&
      existing.message === alert.message &&
      !existing.resolved
    );
  }
  
  private static isMaintenanceMode(): boolean {
    const { maintenanceMode } = suppressionRules;
    if (!maintenanceMode.enabled) return false;
    
    const now = new Date();
    return now >= maintenanceMode.start && now <= maintenanceMode.end;
  }
}
```

## 📧 Notification Channels

### Slack Integration

```typescript
// server/services/slack-notifications.ts
export class SlackNotificationService {
  private webhookUrl: string;
  
  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }
  
  async sendAlert(alert: Alert) {
    const color = this.getAlertColor(alert.severity);
    const message = {
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()} Alert: ${alert.category}`,
        text: alert.message,
        fields: [
          {
            title: 'Timestamp',
            value: alert.timestamp.toISOString(),
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity,
            short: true
          }
        ],
        actions: [
          {
            name: 'acknowledge',
            text: 'Acknowledge',
            type: 'button',
            value: alert.id
          },
          {
            name: 'resolve',
            text: 'Resolve',
            type: 'button',
            value: alert.id
          }
        ]
      }]
    };
    
    await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }
  
  private getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff8000';
      case 'medium': return '#ffff00';
      case 'low': return '#00ff00';
      default: return '#808080';
    }
  }
}
```

### Email Notifications

```typescript
// server/services/email-notifications.ts
export class EmailNotificationService {
  async sendAlert(alert: Alert, recipients: string[]) {
    const subject = `[${alert.severity.toUpperCase()}] ${alert.category} Alert`;
    const body = this.generateEmailBody(alert);
    
    // Send email using your preferred service
    await this.sendEmail(recipients, subject, body);
  }
  
  private generateEmailBody(alert: Alert): string {
    return `
      <h2>Alert Details</h2>
      <p><strong>Category:</strong> ${alert.category}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <p><strong>Timestamp:</strong> ${alert.timestamp.toISOString()}</p>
      
      <h3>Next Steps</h3>
      <ol>
        <li>Acknowledge the alert in the monitoring dashboard</li>
        <li>Investigate the root cause</li>
        <li>Implement a fix</li>
        <li>Monitor for resolution</li>
      </ol>
      
      <p><a href="${process.env.DASHBOARD_URL}/admin/alerts">View in Dashboard</a></p>
    `;
  }
}
```

## 📈 Alert Analytics and Reporting

### Alert Metrics

```typescript
// Track alert effectiveness
export interface AlertMetrics {
  totalAlerts: number;
  alertsByCategory: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  averageResolutionTime: number;
  falsePositiveRate: number;
  escalationRate: number;
  repeatAlerts: number;
  coverageScore: number; // How many real issues were caught
}

// Generate alert reports
export class AlertReporting {
  async generateWeeklyReport(): Promise<AlertReport> {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const alerts = await this.getAlerts(startDate);
    
    return {
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        resolved: alerts.filter(a => a.resolved).length,
        averageResolutionTime: this.calculateAverageResolutionTime(alerts)
      },
      trends: this.calculateTrends(alerts),
      topCategories: this.getTopCategories(alerts),
      recommendations: this.generateRecommendations(alerts)
    };
  }
}
```

## 🔧 Testing Alert Configuration

### Alert Testing Framework

```typescript
// test/alert-system.test.ts
describe('Alert System', () => {
  let alertManager: AlertManager;
  
  beforeEach(() => {
    alertManager = new AlertManager();
  });
  
  describe('Performance Alerts', () => {
    it('should trigger critical alert for performance score < 50', () => {
      const mockMetrics = {
        overallScore: 45,
        loadTime: 3.2,
        memoryUsage: 120
      };
      
      const spy = jest.spyOn(alertManager, 'triggerAlert');
      alertManager.checkPerformanceAlerts(mockMetrics);
      
      expect(spy).toHaveBeenCalledWith('performance', 'critical', expect.any(Object));
    });
    
    it('should not trigger alert for good performance', () => {
      const mockMetrics = {
        overallScore: 92,
        loadTime: 1.1,
        memoryUsage: 35
      };
      
      const spy = jest.spyOn(alertManager, 'triggerAlert');
      alertManager.checkPerformanceAlerts(mockMetrics);
      
      expect(spy).not.toHaveBeenCalled();
    });
  });
  
  describe('Error Rate Alerts', () => {
    it('should trigger alert for high error rate', () => {
      const spy = jest.spyOn(alertManager, 'triggerAlert');
      alertManager.checkErrorRateAlerts(7.5, '5m');
      
      expect(spy).toHaveBeenCalledWith('error-rate', 'high', expect.any(Object));
    });
  });
});
```

## 📚 Best Practices

### 1. Alert Design Principles

- **Actionable:** Every alert should have a clear action
- **Specific:** Include enough context for quick diagnosis
- **Timely:** Alert timing should match urgency
- **Relevant:** Avoid alert fatigue with proper thresholds

### 2. Threshold Management

- **Baseline:** Establish baselines from historical data
- **Adaptation:** Adjust thresholds based on alert effectiveness
- **Seasonality:** Consider business cycles and usage patterns
- **Testing:** Regularly test alert thresholds

### 3. Response Procedures

- **Documentation:** Clear runbooks for each alert type
- **Automation:** Automate response where possible
- **Post-mortem:** Analyze alert effectiveness after incidents
- **Training:** Ensure team knows how to respond

### 4. Continuous Improvement

- **Regular Reviews:** Weekly alert effectiveness reviews
- **Feedback Loops:** Collect feedback from responders
- **Metrics Tracking:** Monitor alert system performance
- **Optimization:** Continuously optimize thresholds and procedures

---

*This document is part of the comprehensive monitoring system implemented in FASE 3 - MATURIDADE.*
*For questions or updates, contact the platform engineering team.*