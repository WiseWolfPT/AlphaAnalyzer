// DEPRECATED: Smart Alert Engine - DISABLED TO PREVENT API EXPLOSION
// This client-side polling engine was causing 1.440.000 API calls/day
// Replaced with server-side Edge Functions + Supabase Realtime
// DO NOT RE-ENABLE WITHOUT EDGE FUNCTION IMPLEMENTATION

// import { realDataService } from './real-data-integration';
import { db, realtime, type Alert, type AlertTrigger } from '@/lib/supabase';
import { notificationService } from './notification-service';

interface AlertCondition {
  symbol: string;
  currentPrice: number;
  previousPrice?: number;
  volume?: number;
  averageVolume?: number;
  technicalIndicators?: Record<string, number>;
  newsScore?: number;
}

interface AlertEngineConfig {
  enabled: boolean;
  checkInterval: number; // milliseconds
  batchSize: number;
  maxRetries: number;
}

class AlertEngine {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private priceCache = new Map<string, { price: number; timestamp: number; volume?: number }>();
  private alertCache = new Map<string, Alert>();
  private config: AlertEngineConfig = {
    enabled: true,
    checkInterval: 30000, // 30 seconds
    batchSize: 50, // Process 50 alerts at a time
    maxRetries: 3
  };

  constructor() {
    // DISABLED: Client-side polling to prevent API explosion
    console.warn('🚨 ALERT ENGINE DISABLED: Client-side polling disabled to prevent API quota exhaustion');
    console.warn('📡 Using server-side processing + Realtime subscriptions only');
    // this.initializeEngine();
  }

  private async initializeEngine() {
    console.log('🚨 Initializing Alert Engine...');
    
    // Load active alerts into cache
    await this.refreshAlertCache();
    
    // Start monitoring if enabled
    if (this.config.enabled) {
      await this.start();
    }

    console.log('✅ Alert Engine initialized');
  }

  async start(): Promise<void> {
    console.warn('🚨 ALERT ENGINE START BLOCKED: Client-side polling disabled');
    console.warn('📡 Server-side Edge Functions handle all alert processing');
    console.warn('🔄 Use Realtime subscriptions for alert updates');
    return;
    
    // DISABLED CODE - DO NOT UNCOMMENT WITHOUT EDGE FUNCTION IMPLEMENTATION
    /*
    if (this.isRunning) {
      console.warn('⚠️ Alert Engine is already running');
      return;
    }

    console.log('🚀 Starting Alert Engine...');
    this.isRunning = true;

    // Start the monitoring interval
    this.intervalId = setInterval(async () => {
      try {
        await this.processAlerts();
      } catch (error) {
        console.error('❌ Error in alert processing cycle:', error);
      }
    }, this.config.checkInterval);

    console.log(`✅ Alert Engine started with ${this.config.checkInterval}ms interval`);
    */
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('⚠️ Alert Engine is not running');
      return;
    }

    console.log('🛑 Stopping Alert Engine...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Alert Engine stopped');
  }

  async refreshAlertCache(): Promise<void> {
    try {
      const alerts = await db.getActiveAlerts();
      this.alertCache.clear();
      
      alerts.forEach(alert => {
        this.alertCache.set(alert.id, alert);
      });

      console.log(`📊 Loaded ${alerts.length} active alerts into cache`);
    } catch (error) {
      console.error('❌ Failed to refresh alert cache:', error);
    }
  }

  private async processAlerts(): Promise<void> {
    console.warn('🚨 PROCESS ALERTS BLOCKED: Client-side processing disabled to prevent API explosion');
    console.warn('📡 Alert processing handled by server-side Edge Functions only');
    return;
    
    // DISABLED CODE - This was causing 1.440.000 API calls/day
    /*
    if (this.alertCache.size === 0) {
      // Refresh cache periodically in case new alerts were added
      await this.refreshAlertCache();
      return;
    }

    console.log(`🔍 Processing ${this.alertCache.size} active alerts...`);

    // Group alerts by symbol for efficient batch processing
    const symbolGroups = new Map<string, Alert[]>();
    
    for (const alert of this.alertCache.values()) {
      const existing = symbolGroups.get(alert.symbol) || [];
      existing.push(alert);
      symbolGroups.set(alert.symbol, existing);
    }

    const symbols = Array.from(symbolGroups.keys());
    console.log(`📈 Fetching prices for ${symbols.length} symbols...`);

    // CRITICAL: This was the API explosion point
    // const quotes = await realDataService.getBatchQuotes(symbols);

    // DISABLED PROCESSING LOGIC
    // Process alerts for each symbol
    /*
    for (const [symbol, alerts] of symbolGroups) {
      const quote = quotes[symbol];
      if (!quote) {
        console.warn(`⚠️ No price data available for ${symbol}`);
        continue;
      }

      const currentPrice = parseFloat(quote.price);
      const previousData = this.priceCache.get(symbol);
      
      // Update price cache
      this.priceCache.set(symbol, {
        price: currentPrice,
        timestamp: Date.now(),
        volume: quote.marketCap ? this.extractVolumeFromMarketCap(quote.marketCap) : undefined
      });

      // Check each alert for this symbol
      for (const alert of alerts) {
        try {
          await this.checkAlert(alert, {
            symbol,
            currentPrice,
            previousPrice: previousData?.price,
            volume: this.priceCache.get(symbol)?.volume
          });
        } catch (error) {
          console.error(`❌ Error checking alert ${alert.id}:`, error);
        }
      }
    }

    console.log('✅ Alert processing cycle completed');
    */
  }

  private async checkAlert(alert: Alert, condition: AlertCondition): Promise<void> {
    let shouldTrigger = false;
    let triggerData: any = {};

    switch (alert.alert_type) {
      case 'price_above':
        if (alert.threshold_value && condition.currentPrice > alert.threshold_value) {
          shouldTrigger = true;
          triggerData = {
            type: 'price_above',
            threshold: alert.threshold_value,
            current_price: condition.currentPrice,
            message: `${condition.symbol} rose above $${alert.threshold_value}`
          };
        }
        break;

      case 'price_below':
        if (alert.threshold_value && condition.currentPrice < alert.threshold_value) {
          shouldTrigger = true;
          triggerData = {
            type: 'price_below',
            threshold: alert.threshold_value,
            current_price: condition.currentPrice,
            message: `${condition.symbol} dropped below $${alert.threshold_value}`
          };
        }
        break;

      case 'volume_spike':
        if (condition.volume && condition.averageVolume) {
          const volumeRatio = condition.volume / condition.averageVolume;
          const threshold = alert.threshold_value || 2.0; // Default 2x volume spike
          
          if (volumeRatio > threshold) {
            shouldTrigger = true;
            triggerData = {
              type: 'volume_spike',
              volume_ratio: volumeRatio,
              current_volume: condition.volume,
              average_volume: condition.averageVolume,
              message: `${condition.symbol} volume spike: ${volumeRatio.toFixed(1)}x average`
            };
          }
        }
        break;

      case 'technical_indicator':
        // Placeholder for technical indicator logic
        if (alert.condition_data) {
          try {
            const conditionConfig = JSON.parse(alert.condition_data);
            shouldTrigger = await this.checkTechnicalIndicator(alert, condition, conditionConfig);
            if (shouldTrigger) {
              triggerData = {
                type: 'technical_indicator',
                indicator: conditionConfig.indicator,
                message: `${condition.symbol} ${conditionConfig.indicator} signal triggered`
              };
            }
          } catch (error) {
            console.error(`❌ Failed to parse technical indicator condition for alert ${alert.id}:`, error);
          }
        }
        break;

      case 'news_sentiment':
        // Placeholder for news sentiment logic
        if (condition.newsScore !== undefined) {
          const threshold = alert.threshold_value || 0.7;
          if (Math.abs(condition.newsScore) > threshold) {
            shouldTrigger = true;
            triggerData = {
              type: 'news_sentiment',
              sentiment_score: condition.newsScore,
              message: `${condition.symbol} significant news sentiment: ${condition.newsScore > 0 ? 'positive' : 'negative'}`
            };
          }
        }
        break;
    }

    if (shouldTrigger) {
      await this.triggerAlert(alert, condition.currentPrice, triggerData);
    }
  }

  private async checkTechnicalIndicator(alert: Alert, condition: AlertCondition, config: any): Promise<boolean> {
    // Placeholder for technical indicator calculations
    // In a real implementation, this would calculate RSI, MACD, etc.
    console.log(`📊 Checking technical indicator ${config.indicator} for ${condition.symbol}`);
    return false; // Not implemented yet
  }

  private async triggerAlert(alert: Alert, triggerValue: number, triggerData: any): Promise<void> {
    console.log(`🚨 Alert triggered: ${alert.id} for ${alert.symbol} at $${triggerValue}`);

    try {
      // Create alert trigger record
      const trigger = await db.createAlertTrigger({
        alert_id: alert.id,
        trigger_value: triggerValue,
        trigger_data: JSON.stringify(triggerData)
      });

      if (!trigger) {
        console.error('❌ Failed to create alert trigger record');
        return;
      }

      // Send notifications
      await this.sendNotifications(alert, trigger, triggerData);

      // Update alert trigger count
      await db.updateAlert(alert.id, {
        triggered_count: alert.triggered_count + 1,
        last_triggered_at: new Date().toISOString()
      });

      // Refresh alert in cache
      const updatedAlert = await db.getUserAlerts(alert.user_id);
      const refreshedAlert = updatedAlert.find(a => a.id === alert.id);
      if (refreshedAlert) {
        this.alertCache.set(alert.id, refreshedAlert);
      }

    } catch (error) {
      console.error(`❌ Failed to trigger alert ${alert.id}:`, error);
    }
  }

  private async sendNotifications(alert: Alert, trigger: AlertTrigger, triggerData: any): Promise<void> {
    const notificationMethods = alert.notification_methods.split(',').map(m => m.trim());
    
    const notificationPayload = {
      title: `Alert: ${alert.symbol}`,
      body: triggerData.message || `Alert triggered for ${alert.symbol}`,
      data: {
        alertId: alert.id,
        triggerId: trigger.id,
        symbol: alert.symbol,
        type: alert.alert_type,
        url: `/stock/${alert.symbol}/charts`
      }
    };

    let notificationSent = false;

    for (const method of notificationMethods) {
      try {
        switch (method) {
          case 'app':
            await notificationService.showInAppNotification(notificationPayload);
            notificationSent = true;
            break;
          case 'push':
            await notificationService.sendPushNotification(alert.user_id, notificationPayload);
            notificationSent = true;
            break;
          case 'email':
            await notificationService.sendEmailNotification(alert.user_id, notificationPayload);
            notificationSent = true;
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to send ${method} notification:`, error);
      }
    }

    // Update trigger status
    await db.updateAlertTriggerStatus(
      trigger.id,
      notificationSent ? 'sent' : 'failed'
    );
  }

  private extractVolumeFromMarketCap(marketCap: string): number | undefined {
    // Simple heuristic to estimate volume from market cap
    // In real implementation, you'd get actual volume data
    try {
      const value = parseFloat(marketCap.replace(/[^0-9.]/g, ''));
      if (marketCap.includes('B')) {
        return value * 1000000; // Billions to volume estimate
      } else if (marketCap.includes('M')) {
        return value * 10000; // Millions to volume estimate
      }
      return value;
    } catch {
      return undefined;
    }
  }

  // Public API methods
  async addAlert(alert: Alert): Promise<void> {
    this.alertCache.set(alert.id, alert);
    console.log(`➕ Added alert ${alert.id} to engine cache`);
  }

  async removeAlert(alertId: string): Promise<void> {
    this.alertCache.delete(alertId);
    console.log(`➖ Removed alert ${alertId} from engine cache`);
  }

  async updateAlert(alert: Alert): Promise<void> {
    if (alert.is_active) {
      this.alertCache.set(alert.id, alert);
    } else {
      this.alertCache.delete(alert.id);
    }
    console.log(`🔄 Updated alert ${alert.id} in engine cache`);
  }

  getStatus(): {
    isRunning: boolean;
    alertCount: number;
    symbolCount: number;
    lastCheck: number;
    config: AlertEngineConfig;
  } {
    const symbols = new Set(Array.from(this.alertCache.values()).map(a => a.symbol));
    
    return {
      isRunning: this.isRunning,
      alertCount: this.alertCache.size,
      symbolCount: symbols.size,
      lastCheck: Math.max(...Array.from(this.priceCache.values()).map(p => p.timestamp)) || 0,
      config: { ...this.config }
    };
  }

  updateConfig(newConfig: Partial<AlertEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart if interval changed and engine is running
    if (newConfig.checkInterval && this.isRunning) {
      this.stop().then(() => this.start());
    }
    
    console.log('⚙️ Alert engine config updated:', this.config);
  }
}

// Create and export singleton instance
export const alertEngine = new AlertEngine();

// Export the class for testing
export { AlertEngine };

// Export types
export type { AlertCondition, AlertEngineConfig };