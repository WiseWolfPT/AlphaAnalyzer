import { notificationService } from './notification-service';
import type { AlertTrigger, AlertRule, PriceAlert } from './alert-types';

class AlertManager {
  private alerts: Map<string, AlertRule> = new Map();
  private activeMonitoring: Set<string> = new Set();

  /**
   * Create a new alert rule
   */
  async createAlert(alert: Omit<AlertRule, 'id' | 'createdAt'>): Promise<string> {
    const id = this.generateAlertId();
    const alertRule: AlertRule = {
      ...alert,
      id,
      createdAt: new Date(),
      isActive: true,
    };

    this.alerts.set(id, alertRule);
    
    if (alertRule.isActive) {
      this.startMonitoring(id);
    }

    return id;
  }

  /**
   * Get all alerts for a user
   */
  getUserAlerts(userId: string): AlertRule[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId);
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    this.alerts.delete(alertId);
    this.stopMonitoring(alertId);
    
    return true;
  }

  /**
   * Add a new alert (alias for createAlert)
   */
  async addAlert(alert: Omit<AlertRule, 'id' | 'createdAt'>): Promise<string> {
    return this.createAlert(alert);
  }

  /**
   * Update an existing alert
   */
  async updateAlert(alertId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    Object.assign(alert, updates);
    return true;
  }

  /**
   * Remove an alert
   */
  async removeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    this.stopMonitoring(alertId);
    return this.alerts.delete(alertId);
  }

  /**
   * Toggle alert active status
   */
  async toggleAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.isActive = !alert.isActive;
    
    if (alert.isActive) {
      this.startMonitoring(alertId);
    } else {
      this.stopMonitoring(alertId);
    }

    return true;
  }

  /**
   * Check if alert should trigger
   */
  async checkAlert(alertId: string, currentPrice: number): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || !alert.isActive) return false;

    const shouldTrigger = this.evaluateAlertCondition(alert, currentPrice);
    
    if (shouldTrigger) {
      await this.triggerAlert(alert, currentPrice);
      return true;
    }

    return false;
  }

  /**
   * Process price update for all alerts
   */
  async processPriceUpdate(symbol: string, price: number): Promise<void> {
    const symbolAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.symbol === symbol && alert.isActive);

    for (const alert of symbolAlerts) {
      await this.checkAlert(alert.id, price);
    }
  }

  private evaluateAlertCondition(alert: AlertRule, currentPrice: number): boolean {
    switch (alert.condition) {
      case 'above':
        return currentPrice > alert.targetPrice;
      case 'below':
        return currentPrice < alert.targetPrice;
      case 'reaches':
        // Consider "reaches" as within 0.1% of target
        const tolerance = alert.targetPrice * 0.001;
        return Math.abs(currentPrice - alert.targetPrice) <= tolerance;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: AlertRule, currentPrice: number): Promise<void> {
    try {
      // Send notification
      await notificationService.sendAlert({
        userId: alert.userId,
        symbol: alert.symbol,
        condition: alert.condition,
        targetPrice: alert.targetPrice,
        currentPrice,
        message: `${alert.symbol} has ${alert.condition} ${alert.targetPrice}. Current price: ${currentPrice}`,
      });

      // Disable one-time alerts
      if (!alert.recurring) {
        alert.isActive = false;
        this.stopMonitoring(alert.id);
      }
    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  private startMonitoring(alertId: string): void {
    this.activeMonitoring.add(alertId);
  }

  private stopMonitoring(alertId: string): void {
    this.activeMonitoring.delete(alertId);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    totalAlerts: number;
    activeAlerts: number;
    monitoredSymbols: string[];
  } {
    const activeAlerts = Array.from(this.alerts.values()).filter(a => a.isActive);
    const symbols = [...new Set(activeAlerts.map(a => a.symbol))];

    return {
      totalAlerts: this.alerts.size,
      activeAlerts: activeAlerts.length,
      monitoredSymbols: symbols,
    };
  }

  /**
   * Clean up expired alerts
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const expiredAlerts = Array.from(this.alerts.entries())
      .filter(([_, alert]) => {
        if (!alert.expiresAt) return false;
        return alert.expiresAt < now;
      });

    for (const [id] of expiredAlerts) {
      await this.deleteAlert(id);
    }
  }
}

export const alertManager = new AlertManager();