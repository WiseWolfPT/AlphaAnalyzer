/**
 * ALERT MANAGER - Core alert processing engine
 * Comprehensive alert monitoring and processing system for Alfalyzer
 * AGENTE 8: Complete notification system implementation
 */

import { 
  AlertConfig, 
  AlertTrigger, 
  AlertType, 
  AlertSeverity, 
  AlertFrequency,
  FrequencyType,
  ConditionOperator,
  MarketDataSnapshot,
  PortfolioPerformance,
  EarningsEvent,
  NewsMention,
  SystemHealthAlert,
  ApiQuotaAlert,
  CostProtectionAlert,
  UserAlertPreferences,
  AlertManagerConfig,
  NotificationChannel,
  NotificationPayload
} from './alert-types';
import { notificationService } from './notification-service';
import { db } from '../../db';
import { globalCache } from '../../cache/intelligent-cache-manager';

interface ActiveAlert extends AlertConfig {
  lastChecked?: Date;
  nextCheck: Date;
  checkCount: number;
  consecutiveFailures: number;
}

export class AlertManager {
  private activeAlerts = new Map<string, ActiveAlert>();
  private userPreferences = new Map<string, UserAlertPreferences>();
  private marketData = new Map<string, MarketDataSnapshot>();
  private portfolioData = new Map<string, PortfolioPerformance>();
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;
  private config: AlertManagerConfig;

  constructor(config?: Partial<AlertManagerConfig>) {
    this.config = {
      enabled: true,
      checkInterval: 60000, // 1 minute
      batchSize: 50,
      maxConcurrentChecks: 10,
      retryAttempts: 3,
      retryDelay: 5000,
      cacheTimeout: 300000, // 5 minutes
      enableRealTimeUpdates: true,
      enableSystemAlerts: true,
      enableCostProtection: true,
      rateLimits: {
        perUser: 100,
        global: 1000,
        timeWindow: 60000
      },
      ...config
    };

    console.log('🚨 Alert Manager initialized');
    this.logConfiguration();
  }

  private logConfiguration(): void {
    console.log('⚡ Alert processing:', this.config.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log(`⏰ Check interval: ${this.config.checkInterval / 1000}s`);
    console.log(`📦 Batch size: ${this.config.batchSize}`);
    console.log(`🔄 Max concurrent: ${this.config.maxConcurrentChecks}`);
    console.log('🔗 Real-time updates:', this.config.enableRealTimeUpdates ? '✅ Enabled' : '❌ Disabled');
    console.log('🏥 System alerts:', this.config.enableSystemAlerts ? '✅ Enabled' : '❌ Disabled');
    console.log('💰 Cost protection:', this.config.enableCostProtection ? '✅ Enabled' : '❌ Disabled');
  }

  /**
   * Start the alert monitoring system
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('⏸️ Alert Manager is disabled');
      return;
    }

    if (this.processInterval) {
      console.log('⚠️ Alert Manager already running');
      return;
    }

    console.log('🚀 Starting Alert Manager...');

    // Load active alerts from database
    await this.loadActiveAlerts();
    
    // Load user preferences
    await this.loadUserPreferences();

    // Start processing loop
    this.processInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processAlerts();
      }
    }, this.config.checkInterval);

    console.log('✅ Alert Manager started');
  }

  /**
   * Stop the alert monitoring system
   */
  stop(): void {
    console.log('🛑 Stopping Alert Manager...');

    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    this.isProcessing = false;
    console.log('✅ Alert Manager stopped');
  }

  /**
   * Main alert processing loop
   */
  private async processAlerts(): Promise<void> {
    if (!this.config.enabled) return;

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log('🔍 Processing alerts...');

      // Get alerts that need checking
      const alertsToCheck = this.getAlertsToCheck();
      
      if (alertsToCheck.length === 0) {
        console.log('📝 No alerts need checking at this time');
        return;
      }

      console.log(`📋 Checking ${alertsToCheck.length} alerts`);

      // Process alerts in batches
      const batches = this.createBatches(alertsToCheck, this.config.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Alert processing completed in ${duration}ms`);

    } catch (error) {
      console.error('❌ Error processing alerts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of alerts
   */
  private async processBatch(alerts: ActiveAlert[]): Promise<void> {
    const promises = alerts.map(alert => this.processAlert(alert));
    await Promise.allSettled(promises);
  }

  /**
   * Process a single alert
   */
  private async processAlert(alert: ActiveAlert): Promise<void> {
    try {
      alert.lastChecked = new Date();
      alert.checkCount++;

      // Check if alert conditions are met
      const triggerResult = await this.evaluateAlert(alert);

      if (triggerResult.triggered) {
        await this.triggerAlert(alert, triggerResult);
      }

      // Update next check time
      this.updateNextCheckTime(alert);
      alert.consecutiveFailures = 0;

    } catch (error) {
      console.error(`❌ Error processing alert ${alert.id}:`, error);
      alert.consecutiveFailures++;
      
      // Disable alert if too many failures
      if (alert.consecutiveFailures >= this.config.retryAttempts) {
        console.warn(`⚠️ Disabling alert ${alert.id} due to repeated failures`);
        alert.enabled = false;
        await this.saveAlert(alert);
      }
    }
  }

  /**
   * Evaluate if alert conditions are met
   */
  private async evaluateAlert(alert: AlertConfig): Promise<{
    triggered: boolean;
    currentValue?: any;
    previousValue?: any;
    message?: string;
    severity?: AlertSeverity;
    metadata?: Record<string, any>;
  }> {
    switch (alert.type) {
      case AlertType.PRICE_CHANGE:
        return await this.evaluatePriceChangeAlert(alert);
      
      case AlertType.PRICE_THRESHOLD:
        return await this.evaluatePriceThresholdAlert(alert);
      
      case AlertType.VOLUME_SPIKE:
        return await this.evaluateVolumeSpikeAlert(alert);
      
      case AlertType.EARNINGS_REMINDER:
        return await this.evaluateEarningsReminderAlert(alert);
      
      case AlertType.PORTFOLIO_PERFORMANCE:
        return await this.evaluatePortfolioAlert(alert);
      
      case AlertType.SYSTEM_HEALTH:
        return await this.evaluateSystemHealthAlert(alert);
      
      case AlertType.API_QUOTA:
        return await this.evaluateApiQuotaAlert(alert);
      
      case AlertType.COST_PROTECTION:
        return await this.evaluateCostProtectionAlert(alert);
      
      case AlertType.NEWS_MENTION:
        return await this.evaluateNewsMentionAlert(alert);
      
      case AlertType.TECHNICAL_INDICATOR:
        return await this.evaluateTechnicalIndicatorAlert(alert);
      
      default:
        return { triggered: false };
    }
  }

  /**
   * Evaluate price change alerts
   */
  private async evaluatePriceChangeAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    if (!condition.symbol) return { triggered: false };

    const currentData = this.marketData.get(condition.symbol);
    if (!currentData) {
      // Try to fetch current data
      await this.updateMarketData([condition.symbol]);
      const newData = this.marketData.get(condition.symbol);
      if (!newData) return { triggered: false };
    }

    const data = this.marketData.get(condition.symbol)!;
    const changePercent = Math.abs(data.changePercent);
    const threshold = Number(condition.value);

    let triggered = false;
    switch (condition.operator) {
      case ConditionOperator.GREATER_THAN:
        triggered = changePercent > threshold;
        break;
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        triggered = changePercent >= threshold;
        break;
      case ConditionOperator.LESS_THAN:
        triggered = changePercent < threshold;
        break;
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        triggered = changePercent <= threshold;
        break;
    }

    if (triggered) {
      return {
        triggered: true,
        currentValue: changePercent,
        message: `${condition.symbol} moved ${data.changePercent.toFixed(2)}% (${data.change > 0 ? '+' : ''}$${data.change.toFixed(2)})`,
        severity: changePercent > 10 ? AlertSeverity.HIGH : changePercent > 5 ? AlertSeverity.MEDIUM : AlertSeverity.LOW,
        metadata: {
          symbol: condition.symbol,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volume: data.volume
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate price threshold alerts
   */
  private async evaluatePriceThresholdAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    if (!condition.symbol) return { triggered: false };

    const data = this.marketData.get(condition.symbol);
    if (!data) return { triggered: false };

    const currentPrice = data.price;
    const threshold = Number(condition.value);

    let triggered = false;
    switch (condition.operator) {
      case ConditionOperator.GREATER_THAN:
        triggered = currentPrice > threshold;
        break;
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        triggered = currentPrice >= threshold;
        break;
      case ConditionOperator.LESS_THAN:
        triggered = currentPrice < threshold;
        break;
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        triggered = currentPrice <= threshold;
        break;
    }

    if (triggered) {
      return {
        triggered: true,
        currentValue: currentPrice,
        message: `${condition.symbol} reached $${currentPrice.toFixed(2)} (threshold: $${threshold.toFixed(2)})`,
        severity: AlertSeverity.MEDIUM,
        metadata: {
          symbol: condition.symbol,
          price: currentPrice,
          threshold,
          direction: currentPrice > threshold ? 'above' : 'below'
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate volume spike alerts
   */
  private async evaluateVolumeSpikeAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    if (!condition.symbol) return { triggered: false };

    const data = this.marketData.get(condition.symbol);
    if (!data) return { triggered: false };

    // Get average volume from cache or calculate
    const avgVolume = await this.getAverageVolume(condition.symbol);
    if (!avgVolume) return { triggered: false };

    const volumeRatio = data.volume / avgVolume;
    const threshold = Number(condition.value);

    if (volumeRatio > threshold) {
      return {
        triggered: true,
        currentValue: volumeRatio,
        message: `${condition.symbol} volume spike: ${(volumeRatio * 100).toFixed(0)}% of average (${data.volume.toLocaleString()} vs avg ${avgVolume.toLocaleString()})`,
        severity: volumeRatio > 5 ? AlertSeverity.HIGH : volumeRatio > 3 ? AlertSeverity.MEDIUM : AlertSeverity.LOW,
        metadata: {
          symbol: condition.symbol,
          currentVolume: data.volume,
          averageVolume: avgVolume,
          volumeRatio
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate earnings reminder alerts
   */
  private async evaluateEarningsReminderAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    if (!condition.symbol) return { triggered: false };

    // Get upcoming earnings for this symbol
    const earnings = await this.getUpcomingEarnings(condition.symbol);
    if (!earnings) return { triggered: false };

    const now = new Date();
    const earningsDate = new Date(earnings.date);
    const daysDiff = Math.ceil((earningsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const reminderDays = Number(condition.value) || 1;

    if (daysDiff <= reminderDays && daysDiff > 0) {
      return {
        triggered: true,
        currentValue: daysDiff,
        message: `${condition.symbol} earnings in ${daysDiff} day${daysDiff === 1 ? '' : 's'} (${earnings.date})`,
        severity: daysDiff === 1 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        metadata: {
          symbol: condition.symbol,
          earningsDate: earnings.date,
          quarter: earnings.quarter,
          estimatedEPS: earnings.estimatedEPS,
          time: earnings.time
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate portfolio performance alerts
   */
  private async evaluatePortfolioAlert(alert: AlertConfig): Promise<any> {
    const portfolio = this.portfolioData.get(alert.userId);
    if (!portfolio) return { triggered: false };

    const condition = alert.conditions[0];
    const threshold = Number(condition.value);
    
    let currentValue: number;
    let message: string;
    
    switch (condition.field) {
      case 'total_change_percent':
        currentValue = portfolio.totalChangePercent;
        message = `Portfolio ${currentValue > 0 ? 'gained' : 'lost'} ${Math.abs(currentValue).toFixed(2)}%`;
        break;
      case 'day_change_percent':
        currentValue = portfolio.dayChangePercent;
        message = `Portfolio ${currentValue > 0 ? 'up' : 'down'} ${Math.abs(currentValue).toFixed(2)}% today`;
        break;
      case 'total_value':
        currentValue = portfolio.totalValue;
        message = `Portfolio value: $${currentValue.toLocaleString()}`;
        break;
      default:
        return { triggered: false };
    }

    let triggered = false;
    switch (condition.operator) {
      case ConditionOperator.GREATER_THAN:
        triggered = currentValue > threshold;
        break;
      case ConditionOperator.LESS_THAN:
        triggered = currentValue < threshold;
        break;
      case ConditionOperator.PERCENTAGE_CHANGE:
        triggered = Math.abs(currentValue) > threshold;
        break;
    }

    if (triggered) {
      return {
        triggered: true,
        currentValue,
        message,
        severity: Math.abs(currentValue) > 10 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        metadata: {
          portfolioValue: portfolio.totalValue,
          totalChange: portfolio.totalChange,
          totalChangePercent: portfolio.totalChangePercent,
          dayChange: portfolio.dayChange,
          dayChangePercent: portfolio.dayChangePercent,
          topGainer: portfolio.topGainer,
          topLoser: portfolio.topLoser
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate system health alerts
   */
  private async evaluateSystemHealthAlert(alert: AlertConfig): Promise<any> {
    if (!this.config.enableSystemAlerts) return { triggered: false };

    // Check various system health metrics
    const healthMetrics = await this.getSystemHealthMetrics();
    
    for (const metric of Object.entries(healthMetrics)) {
      const [service, data] = metric;
      
      if (data.status !== 'healthy') {
        return {
          triggered: true,
          currentValue: data.status,
          message: `System health alert: ${service} is ${data.status}`,
          severity: data.status === 'offline' ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
          metadata: {
            service,
            status: data.status,
            responseTime: data.responseTime,
            uptime: data.uptime,
            details: data.details
          }
        };
      }
    }

    return { triggered: false };
  }

  /**
   * Evaluate API quota alerts
   */
  private async evaluateApiQuotaAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    const provider = condition.field;
    const threshold = Number(condition.value);

    const quotaInfo = await this.getApiQuotaInfo(provider);
    if (!quotaInfo) return { triggered: false };

    if (quotaInfo.usagePercent > threshold) {
      return {
        triggered: true,
        currentValue: quotaInfo.usagePercent,
        message: `API quota alert: ${provider} at ${quotaInfo.usagePercent.toFixed(1)}% (${quotaInfo.currentUsage}/${quotaInfo.limit})`,
        severity: quotaInfo.usagePercent > 90 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
        metadata: {
          provider,
          currentUsage: quotaInfo.currentUsage,
          limit: quotaInfo.limit,
          usagePercent: quotaInfo.usagePercent,
          timeToReset: quotaInfo.timeToReset,
          rateLimited: quotaInfo.rateLimited
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate cost protection alerts
   */
  private async evaluateCostProtectionAlert(alert: AlertConfig): Promise<any> {
    if (!this.config.enableCostProtection) return { triggered: false };

    const costInfo = await this.getCostInfo();
    if (!costInfo) return { triggered: false };

    const condition = alert.conditions[0];
    const threshold = Number(condition.value);

    if (costInfo.costPercent > threshold) {
      let alertType: string;
      let severity: AlertSeverity;
      
      if (costInfo.costPercent >= 100) {
        alertType = 'budget_exceeded';
        severity = AlertSeverity.CRITICAL;
      } else if (costInfo.costPercent >= 90) {
        alertType = 'emergency_stop';
        severity = AlertSeverity.CRITICAL;
      } else {
        alertType = 'budget_warning';
        severity = AlertSeverity.HIGH;
      }

      return {
        triggered: true,
        currentValue: costInfo.costPercent,
        message: `Cost protection alert: ${costInfo.costPercent.toFixed(1)}% of budget used ($${costInfo.currentCost}/$${costInfo.budgetLimit})`,
        severity,
        metadata: {
          alertType,
          currentCost: costInfo.currentCost,
          budgetLimit: costInfo.budgetLimit,
          costPercent: costInfo.costPercent,
          timeframe: costInfo.timeframe,
          actions: costInfo.actions
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate news mention alerts
   */
  private async evaluateNewsMentionAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    if (!condition.symbol) return { triggered: false };

    const news = await this.getRecentNews(condition.symbol);
    if (!news.length) return { triggered: false };

    // Check for high-relevance news in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNews = news.filter(item => 
      new Date(item.publishedAt) > oneHourAgo && 
      item.relevanceScore > 0.7
    );

    if (recentNews.length > 0) {
      const topNews = recentNews[0];
      return {
        triggered: true,
        currentValue: recentNews.length,
        message: `News alert: ${condition.symbol} mentioned in "${topNews.title}"`,
        severity: topNews.sentiment === 'negative' ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        metadata: {
          symbol: condition.symbol,
          newsCount: recentNews.length,
          topNews: {
            title: topNews.title,
            summary: topNews.summary,
            sentiment: topNews.sentiment,
            source: topNews.source,
            url: topNews.url,
            relevanceScore: topNews.relevanceScore
          }
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Evaluate technical indicator alerts
   */
  private async evaluateTechnicalIndicatorAlert(alert: AlertConfig): Promise<any> {
    const condition = alert.conditions[0];
    if (!condition.symbol) return { triggered: false };

    const indicator = await this.getTechnicalIndicator(condition.symbol, condition.field);
    if (!indicator) return { triggered: false };

    const threshold = Number(condition.value);

    let triggered = false;
    switch (condition.operator) {
      case ConditionOperator.GREATER_THAN:
        triggered = indicator.value > threshold;
        break;
      case ConditionOperator.LESS_THAN:
        triggered = indicator.value < threshold;
        break;
    }

    if (triggered) {
      return {
        triggered: true,
        currentValue: indicator.value,
        message: `Technical alert: ${condition.symbol} ${condition.field} signal (${indicator.signal})`,
        severity: indicator.strength > 80 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
        metadata: {
          symbol: condition.symbol,
          indicator: condition.field,
          value: indicator.value,
          signal: indicator.signal,
          strength: indicator.strength,
          timestamp: indicator.timestamp
        }
      };
    }

    return { triggered: false };
  }

  /**
   * Trigger an alert and send notifications
   */
  private async triggerAlert(alert: AlertConfig, triggerResult: any): Promise<void> {
    try {
      // Check frequency limits
      if (!this.canTriggerAlert(alert)) {
        console.log(`⏳ Alert ${alert.id} skipped due to frequency limits`);
        return;
      }

      // Create alert trigger record
      const trigger: AlertTrigger = {
        id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId: alert.id,
        userId: alert.userId,
        triggeredAt: new Date(),
        currentValue: triggerResult.currentValue,
        previousValue: triggerResult.previousValue,
        symbol: triggerResult.metadata?.symbol,
        message: triggerResult.message || 'Alert triggered',
        severity: triggerResult.severity || AlertSeverity.MEDIUM,
        metadata: triggerResult.metadata,
        notificationsSent: [],
        acknowledged: false
      };

      // Save trigger to database
      await this.saveTrigger(trigger);

      // Get user preferences
      const userPrefs = this.userPreferences.get(alert.userId);

      // Create notification payload
      const payload: NotificationPayload = {
        title: alert.name,
        message: trigger.message,
        severity: trigger.severity,
        type: alert.type,
        symbol: trigger.symbol,
        actionUrl: this.getActionUrl(alert.type, trigger.symbol),
        icon: this.getAlertIcon(alert.type),
        data: trigger.metadata
      };

      // Send notifications
      const notificationResult = await notificationService.sendNotification(
        alert.userId,
        payload,
        alert.channels,
        userPrefs
      );

      // Update trigger with notification results
      trigger.notificationsSent = Object.keys(notificationResult.results) as NotificationChannel[];
      await this.updateTrigger(trigger);

      // Update alert statistics
      alert.triggerCount++;
      alert.lastTriggered = new Date();
      await this.saveAlert(alert);

      console.log(`🚨 Alert triggered: ${alert.name} for user ${alert.userId}`);

    } catch (error) {
      console.error(`❌ Failed to trigger alert ${alert.id}:`, error);
    }
  }

  /**
   * Check if alert can be triggered based on frequency limits
   */
  private canTriggerAlert(alert: AlertConfig): boolean {
    if (!alert.lastTriggered) return true;

    const now = Date.now();
    const lastTriggered = alert.lastTriggered.getTime();
    const cooldown = alert.frequency.cooldown || 0;
    const cooldownMs = cooldown * 60 * 1000; // Convert minutes to milliseconds

    return (now - lastTriggered) >= cooldownMs;
  }

  /**
   * Get action URL for alert type
   */
  private getActionUrl(type: AlertType, symbol?: string): string {
    switch (type) {
      case AlertType.PRICE_CHANGE:
      case AlertType.PRICE_THRESHOLD:
      case AlertType.VOLUME_SPIKE:
        return symbol ? `/stock/${symbol}/charts` : '/dashboard';
      case AlertType.PORTFOLIO_PERFORMANCE:
        return '/portfolios';
      case AlertType.EARNINGS_REMINDER:
        return '/earnings';
      case AlertType.SYSTEM_HEALTH:
      case AlertType.API_QUOTA:
      case AlertType.COST_PROTECTION:
        return '/admin/monitoring';
      default:
        return '/dashboard';
    }
  }

  /**
   * Get alert icon for type
   */
  private getAlertIcon(type: AlertType): string {
    switch (type) {
      case AlertType.PRICE_CHANGE:
      case AlertType.PRICE_THRESHOLD:
        return '📈';
      case AlertType.VOLUME_SPIKE:
        return '📊';
      case AlertType.EARNINGS_REMINDER:
        return '📅';
      case AlertType.PORTFOLIO_PERFORMANCE:
        return '💼';
      case AlertType.SYSTEM_HEALTH:
        return '🏥';
      case AlertType.API_QUOTA:
        return '⚡';
      case AlertType.COST_PROTECTION:
        return '💰';
      case AlertType.NEWS_MENTION:
        return '📰';
      case AlertType.TECHNICAL_INDICATOR:
        return '📉';
      default:
        return '🔔';
    }
  }

  /**
   * Helper methods for data retrieval
   */
  private async updateMarketData(symbols: string[]): Promise<void> {
    // This would integrate with the market data service
    console.log(`📊 Updating market data for ${symbols.length} symbols`);
    // Implementation would depend on the unified API service
  }

  private async getAverageVolume(symbol: string): Promise<number | null> {
    // Get from cache or calculate from historical data
    return globalCache.get(`avg_volume_${symbol}`) || null;
  }

  private async getUpcomingEarnings(symbol: string): Promise<EarningsEvent | null> {
    // Get from earnings calendar API
    return null; // Placeholder
  }

  private async getSystemHealthMetrics(): Promise<Record<string, any>> {
    return {
      api: { status: 'healthy', responseTime: 150, uptime: 99.9 },
      database: { status: 'healthy', responseTime: 50, uptime: 100 },
      cache: { status: 'healthy', responseTime: 5, uptime: 100 }
    };
  }

  private async getApiQuotaInfo(provider: string): Promise<ApiQuotaAlert | null> {
    // Get from quota tracking service
    return null; // Placeholder
  }

  private async getCostInfo(): Promise<CostProtectionAlert | null> {
    // Get from budget monitoring service
    return null; // Placeholder
  }

  private async getRecentNews(symbol: string): Promise<NewsMention[]> {
    // Get from news API
    return []; // Placeholder
  }

  private async getTechnicalIndicator(symbol: string, indicator: string): Promise<any> {
    // Get from technical analysis service
    return null; // Placeholder
  }

  /**
   * Database operations
   */
  private async loadActiveAlerts(): Promise<void> {
    try {
      const alerts = db.prepare(`
        SELECT * FROM alerts 
        WHERE enabled = 1
      `).all();

      for (const alertRecord of alerts) {
        const alert: ActiveAlert = {
          id: alertRecord.id,
          userId: alertRecord.user_id,
          name: alertRecord.name,
          description: alertRecord.description,
          enabled: alertRecord.enabled === 1,
          type: alertRecord.type as AlertType,
          conditions: JSON.parse(alertRecord.conditions),
          frequency: JSON.parse(alertRecord.frequency),
          channels: JSON.parse(alertRecord.channels),
          metadata: alertRecord.metadata ? JSON.parse(alertRecord.metadata) : undefined,
          createdAt: new Date(alertRecord.created_at),
          updatedAt: new Date(alertRecord.updated_at),
          lastTriggered: alertRecord.last_triggered ? new Date(alertRecord.last_triggered) : undefined,
          triggerCount: alertRecord.trigger_count,
          nextCheck: new Date(),
          checkCount: 0,
          consecutiveFailures: 0
        };

        this.activeAlerts.set(alert.id, alert);
      }

      console.log(`📋 Loaded ${this.activeAlerts.size} active alerts`);

    } catch (error) {
      console.error('❌ Failed to load active alerts:', error);
    }
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      const preferences = db.prepare(`
        SELECT * FROM user_alert_preferences
      `).all();

      for (const prefRecord of preferences) {
        const prefs: UserAlertPreferences = {
          userId: prefRecord.user_id,
          globalEnabled: prefRecord.global_enabled === 1,
          defaultChannels: JSON.parse(prefRecord.default_channels),
          quietHours: JSON.parse(prefRecord.quiet_hours),
          emailNotifications: prefRecord.email_notifications === 1,
          pushNotifications: prefRecord.push_notifications === 1,
          weekendAlerts: prefRecord.weekend_alerts === 1,
          maxAlertsPerDay: prefRecord.max_alerts_per_day,
          preferredFrequency: prefRecord.preferred_frequency as FrequencyType,
          categories: JSON.parse(prefRecord.categories)
        };

        this.userPreferences.set(prefs.userId, prefs);
      }

      console.log(`👥 Loaded preferences for ${this.userPreferences.size} users`);

    } catch (error) {
      console.error('❌ Failed to load user preferences:', error);
    }
  }

  private async saveAlert(alert: AlertConfig): Promise<void> {
    try {
      db.prepare(`
        UPDATE alerts SET
          name = ?,
          description = ?,
          enabled = ?,
          conditions = ?,
          frequency = ?,
          channels = ?,
          metadata = ?,
          updated_at = ?,
          last_triggered = ?,
          trigger_count = ?
        WHERE id = ?
      `).run(
        alert.name,
        alert.description,
        alert.enabled ? 1 : 0,
        JSON.stringify(alert.conditions),
        JSON.stringify(alert.frequency),
        JSON.stringify(alert.channels),
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        new Date().toISOString(),
        alert.lastTriggered ? alert.lastTriggered.toISOString() : null,
        alert.triggerCount,
        alert.id
      );
    } catch (error) {
      console.error(`❌ Failed to save alert ${alert.id}:`, error);
    }
  }

  private async saveTrigger(trigger: AlertTrigger): Promise<void> {
    try {
      db.prepare(`
        INSERT INTO alert_triggers (
          id, alert_id, user_id, triggered_at, current_value, previous_value,
          symbol, message, severity, metadata, notifications_sent, acknowledged
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        trigger.id,
        trigger.alertId,
        trigger.userId,
        trigger.triggeredAt.toISOString(),
        String(trigger.currentValue),
        trigger.previousValue ? String(trigger.previousValue) : null,
        trigger.symbol,
        trigger.message,
        trigger.severity,
        trigger.metadata ? JSON.stringify(trigger.metadata) : null,
        JSON.stringify(trigger.notificationsSent),
        trigger.acknowledged ? 1 : 0
      );
    } catch (error) {
      console.error(`❌ Failed to save trigger ${trigger.id}:`, error);
    }
  }

  private async updateTrigger(trigger: AlertTrigger): Promise<void> {
    try {
      db.prepare(`
        UPDATE alert_triggers SET
          notifications_sent = ?,
          acknowledged = ?,
          acknowledged_at = ?
        WHERE id = ?
      `).run(
        JSON.stringify(trigger.notificationsSent),
        trigger.acknowledged ? 1 : 0,
        trigger.acknowledgedAt ? trigger.acknowledgedAt.toISOString() : null,
        trigger.id
      );
    } catch (error) {
      console.error(`❌ Failed to update trigger ${trigger.id}:`, error);
    }
  }

  /**
   * Utility methods
   */
  private getAlertsToCheck(): ActiveAlert[] {
    const now = new Date();
    return Array.from(this.activeAlerts.values()).filter(alert => 
      alert.enabled && alert.nextCheck <= now
    );
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private updateNextCheckTime(alert: ActiveAlert): void {
    const now = new Date();
    let intervalMs: number;

    switch (alert.frequency.type) {
      case FrequencyType.IMMEDIATE:
        intervalMs = 30000; // 30 seconds
        break;
      case FrequencyType.EVERY_5_MINUTES:
        intervalMs = 5 * 60 * 1000;
        break;
      case FrequencyType.EVERY_15_MINUTES:
        intervalMs = 15 * 60 * 1000;
        break;
      case FrequencyType.EVERY_HOUR:
        intervalMs = 60 * 60 * 1000;
        break;
      case FrequencyType.DAILY:
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case FrequencyType.WEEKLY:
        intervalMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case FrequencyType.CUSTOM:
        intervalMs = (alert.frequency.value || 60) * 60 * 1000;
        break;
      default:
        intervalMs = 60 * 1000; // 1 minute default
    }

    alert.nextCheck = new Date(now.getTime() + intervalMs);
  }

  /**
   * Public API methods
   */
  async addAlert(alertConfig: Omit<AlertConfig, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount' | 'lastTriggered'>): Promise<string> {
    const alert: AlertConfig = {
      ...alertConfig,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      triggerCount: 0
    };

    // Save to database
    try {
      db.prepare(`
        INSERT INTO alerts (
          id, user_id, name, description, enabled, type, conditions,
          frequency, channels, metadata, created_at, updated_at, trigger_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        alert.id,
        alert.userId,
        alert.name,
        alert.description,
        alert.enabled ? 1 : 0,
        alert.type,
        JSON.stringify(alert.conditions),
        JSON.stringify(alert.frequency),
        JSON.stringify(alert.channels),
        alert.metadata ? JSON.stringify(alert.metadata) : null,
        alert.createdAt.toISOString(),
        alert.updatedAt.toISOString(),
        alert.triggerCount
      );

      // Add to active alerts if enabled
      if (alert.enabled) {
        const activeAlert: ActiveAlert = {
          ...alert,
          nextCheck: new Date(),
          checkCount: 0,
          consecutiveFailures: 0
        };
        this.activeAlerts.set(alert.id, activeAlert);
      }

      console.log(`✅ Added alert: ${alert.name} (${alert.id})`);
      return alert.id;

    } catch (error) {
      console.error('❌ Failed to add alert:', error);
      throw error;
    }
  }

  async removeAlert(alertId: string): Promise<boolean> {
    try {
      db.prepare(`DELETE FROM alerts WHERE id = ?`).run(alertId);
      this.activeAlerts.delete(alertId);
      console.log(`🗑️ Removed alert: ${alertId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove alert ${alertId}:`, error);
      return false;
    }
  }

  async updateAlert(alertId: string, updates: Partial<AlertConfig>): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) return false;

      Object.assign(alert, updates, { updatedAt: new Date() });
      await this.saveAlert(alert);
      
      console.log(`📝 Updated alert: ${alertId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update alert ${alertId}:`, error);
      return false;
    }
  }

  getAlertStats(): {
    totalAlerts: number;
    activeAlerts: number;
    triggeredToday: number;
    processingStatus: boolean;
  } {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // This is a simplified version - in production you'd query the database
    return {
      totalAlerts: this.activeAlerts.size,
      activeAlerts: Array.from(this.activeAlerts.values()).filter(a => a.enabled).length,
      triggeredToday: 0, // Would need to query alert_triggers table
      processingStatus: this.isProcessing
    };
  }
}

// Global alert manager instance
export const alertManager = new AlertManager();