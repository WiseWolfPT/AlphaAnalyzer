/**
 * ALERT MONITOR WORKER - BACKEND ENGINE
 * Real-time monitoring de alertas de mercado com execução server-side
 * Parte crítica do AGENTE 3: Alert Engine Backend
 */

import { backgroundScheduler } from '../services/background-scheduler';
import { ServerMarketDataService } from '../services/market-data-service';
import { supabase } from '../lib/supabase';
import { globalCache, DataType, CacheKeys } from '../cache/intelligent-cache-manager';
// Import Push Notification Service for AGENTE 4: PWA Push Notifications integration
import { pushNotificationService } from '../services/push-notification-service';

interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: 'price_above' | 'price_below' | 'volume_spike' | 'news_sentiment' | 'technical_indicator';
  threshold_value: number;
  threshold_operator: '>' | '<' | '>=' | '<=' | '=';
  condition_data?: string;
  notification_methods: string;
  is_active: boolean;
  triggered_count: number;
  last_triggered_at?: string;
  created_at: string;
  snooze_until?: string;
}

interface AlertTrigger {
  id: string;
  alert_id: string;
  triggered_at: string;
  trigger_value: number;
  trigger_data?: string;
  status: 'pending' | 'sent' | 'failed' | 'dismissed';
}

interface PriceData {
  symbol: string;
  price: number;
  volume?: number;
  change?: number;
  timestamp: number;
}

interface AlertMonitorConfig {
  enabled: boolean;
  checkInterval: number; // 30000ms (30s) during market hours
  batchSize: number;     // 50 alerts per batch
  maxSymbolsPerRequest: number; // 20 symbols per API call
  cacheTimeout: number;  // 30000ms cache TTL
}

interface AlertMonitorMetrics {
  alertsProcessed: number;
  triggersCreated: number;
  apiCallsMade: number;
  errorsEncountered: number;
  lastProcessingTime: number;
  cyclesCompleted: number;
  averageProcessingTime: number;
  uniqueSymbolsMonitored: number;
}

class AlertMonitor {
  private marketDataService: ServerMarketDataService;
  private alertCache = new Map<string, Alert>();
  private priceCache = new Map<string, PriceData>();
  private metrics: AlertMonitorMetrics;
  private isRunning: boolean = false;
  private config: AlertMonitorConfig;
  private lastCacheRefresh: number = 0;

  constructor() {
    this.marketDataService = new ServerMarketDataService();
    
    this.config = {
      enabled: true,
      checkInterval: 60000, // OPTIMIZED: 60 seconds (from 30s) - more efficient server processing
      batchSize: 50,
      maxSymbolsPerRequest: 20,
      cacheTimeout: 60000 // OPTIMIZED: 60 seconds cache (from 30s) - reduce API calls
    };

    this.metrics = {
      alertsProcessed: 0,
      triggersCreated: 0,
      apiCallsMade: 0,
      errorsEncountered: 0,
      lastProcessingTime: 0,
      cyclesCompleted: 0,
      averageProcessingTime: 0,
      uniqueSymbolsMonitored: 0
    };

    this.registerWithScheduler();
    console.log('🚨 Alert Monitor Worker initialized');
  }

  /**
   * Register alert monitoring job with background scheduler
   */
  private registerWithScheduler(): void {
    try {
      // Register the alert monitoring job
      const alertMonitorJob = {
        id: 'alert-monitoring',
        name: 'Real-time Alert Monitoring',
        interval: this.config.checkInterval,
        lastRun: null,
        nextRun: new Date(Date.now() + this.config.checkInterval),
        isRunning: false,
        enabled: this.config.enabled,
        priority: 'high' as const
      };

      // Add to background scheduler
      backgroundScheduler['addJob'](alertMonitorJob);
      
      console.log('✅ Alert monitoring job registered with background scheduler');
    } catch (error) {
      console.error('❌ Failed to register alert monitoring job:', error);
    }
  }

  /**
   * MAIN PROCESSING LOOP - Called by background scheduler
   */
  async processActiveAlerts(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Alert processing already running, skipping cycle');
      return;
    }

    const startTime = Date.now();
    this.isRunning = true;

    try {
      console.log('🔍 Starting alert processing cycle...');

      // 1. Refresh alert cache if needed
      await this.refreshAlertCacheIfNeeded();

      if (this.alertCache.size === 0) {
        console.log('📊 No active alerts to process');
        return;
      }

      // 2. Group alerts by symbol for batch processing
      const symbolGroups = this.groupAlertsBySymbol();
      const uniqueSymbols = Array.from(symbolGroups.keys());

      console.log(`📈 Processing ${this.alertCache.size} alerts for ${uniqueSymbols.length} symbols`);

      // 3. Fetch current prices for all symbols in batches
      const priceUpdates = await this.fetchPricesInBatches(uniqueSymbols);

      // 4. Process alerts for each symbol
      let alertsProcessed = 0;
      let triggersCreated = 0;

      for (const [symbol, alerts] of symbolGroups) {
        const priceData = priceUpdates[symbol];
        if (!priceData) {
          console.warn(`⚠️ No price data available for ${symbol}`);
          continue;
        }

        // Check each alert for this symbol
        for (const alert of alerts) {
          try {
            const shouldTrigger = await this.evaluateAlert(alert, priceData);
            if (shouldTrigger) {
              await this.triggerAlert(alert, priceData);
              triggersCreated++;
            }
            alertsProcessed++;
          } catch (error) {
            console.error(`❌ Error processing alert ${alert.id}:`, error);
            this.metrics.errorsEncountered++;
          }
        }
      }

      // 5. Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetrics(alertsProcessed, triggersCreated, processingTime);

      console.log(`✅ Alert cycle completed: ${alertsProcessed} alerts processed, ${triggersCreated} triggers created in ${processingTime}ms`);

    } catch (error) {
      console.error('❌ Alert processing cycle failed:', error);
      this.metrics.errorsEncountered++;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Refresh alert cache from database
   */
  private async refreshAlertCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Refresh cache every 5 minutes or if empty
    if (now - this.lastCacheRefresh < 300000 && this.alertCache.size > 0) {
      return;
    }

    try {
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .or('snooze_until.is.null,snooze_until.lt.' + new Date().toISOString())
        .order('symbol', { ascending: true });

      if (error) {
        throw error;
      }

      // Clear and rebuild cache
      this.alertCache.clear();
      alerts?.forEach(alert => {
        this.alertCache.set(alert.id, alert as Alert);
      });

      this.lastCacheRefresh = now;
      console.log(`📊 Refreshed alert cache: ${alerts?.length || 0} active alerts loaded`);

    } catch (error) {
      console.error('❌ Failed to refresh alert cache:', error);
      throw error;
    }
  }

  /**
   * Group alerts by symbol for efficient batch processing
   */
  private groupAlertsBySymbol(): Map<string, Alert[]> {
    const symbolGroups = new Map<string, Alert[]>();
    
    for (const alert of this.alertCache.values()) {
      const existing = symbolGroups.get(alert.symbol) || [];
      existing.push(alert);
      symbolGroups.set(alert.symbol, existing);
    }
    
    return symbolGroups;
  }

  /**
   * Fetch prices in batches to respect API limits
   */
  private async fetchPricesInBatches(symbols: string[]): Promise<Record<string, PriceData>> {
    const priceUpdates: Record<string, PriceData> = {};
    
    // Process symbols in batches
    for (let i = 0; i < symbols.length; i += this.config.maxSymbolsPerRequest) {
      const batch = symbols.slice(i, i + this.config.maxSymbolsPerRequest);
      
      try {
        // Check cache first
        const cacheKey = `batch_prices_${batch.join(',')}_${Math.floor(Date.now() / this.config.cacheTimeout)}`;
        const cached = globalCache.get<Record<string, PriceData>>(cacheKey, DataType.REAL_TIME_PRICE);
        
        if (cached) {
          Object.assign(priceUpdates, cached);
          continue;
        }

        // Fetch from API
        const quotes = await this.marketDataService.getBatchQuotes(batch);
        this.metrics.apiCallsMade++;

        // Convert to PriceData format and cache
        const batchPrices: Record<string, PriceData> = {};
        quotes.forEach(quote => {
          if (quote && quote.symbol && quote.price) {
            const priceData: PriceData = {
              symbol: quote.symbol,
              price: parseFloat(quote.price),
              volume: this.extractVolumeFromQuote(quote),
              change: parseFloat(quote.change || '0'),
              timestamp: Date.now()
            };
            
            batchPrices[quote.symbol] = priceData;
            this.priceCache.set(quote.symbol, priceData);
          }
        });

        // Cache the batch result
        globalCache.set(cacheKey, batchPrices, DataType.REAL_TIME_PRICE, this.config.cacheTimeout);
        Object.assign(priceUpdates, batchPrices);

      } catch (error) {
        console.error(`❌ Failed to fetch prices for batch:`, batch, error);
        this.metrics.errorsEncountered++;
      }
    }

    return priceUpdates;
  }

  /**
   * Evaluate if an alert should trigger based on current price data
   */
  private async evaluateAlert(alert: Alert, priceData: PriceData): Promise<boolean> {
    try {
      switch (alert.alert_type) {
        case 'price_above':
          return alert.threshold_value && priceData.price > alert.threshold_value;

        case 'price_below':
          return alert.threshold_value && priceData.price < alert.threshold_value;

        case 'volume_spike':
          return this.evaluateVolumeSpike(alert, priceData);

        case 'technical_indicator':
          return this.evaluateTechnicalIndicator(alert, priceData);

        case 'news_sentiment':
          return this.evaluateNewsSentiment(alert, priceData);

        default:
          console.warn(`⚠️ Unknown alert type: ${alert.alert_type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error evaluating alert ${alert.id}:`, error);
      return false;
    }
  }

  /**
   * Evaluate volume spike alert
   */
  private evaluateVolumeSpike(alert: Alert, priceData: PriceData): boolean {
    if (!priceData.volume) {
      return false;
    }

    // Simple volume spike detection (needs historical average)
    const threshold = alert.threshold_value || 2.0; // Default 2x volume spike
    const averageVolume = this.getAverageVolume(alert.symbol); // Placeholder
    
    return averageVolume && (priceData.volume / averageVolume) > threshold;
  }

  /**
   * Evaluate technical indicator alert (placeholder)
   */
  private evaluateTechnicalIndicator(alert: Alert, priceData: PriceData): boolean {
    // Placeholder for technical indicator logic
    // Would need historical price data and indicator calculations
    console.log(`📊 Technical indicator check for ${alert.symbol} (not implemented)`);
    return false;
  }

  /**
   * Evaluate news sentiment alert (placeholder)
   */
  private evaluateNewsSentiment(alert: Alert, priceData: PriceData): boolean {
    // Placeholder for news sentiment logic
    // Would need news API integration
    console.log(`📰 News sentiment check for ${alert.symbol} (not implemented)`);
    return false;
  }

  /**
   * Trigger an alert and send notifications
   */
  private async triggerAlert(alert: Alert, priceData: PriceData): Promise<void> {
    try {
      console.log(`🚨 ALERT TRIGGERED: ${alert.symbol} - ${alert.alert_type} at $${priceData.price}`);

      // 1. Create alert trigger record
      const triggerData = {
        type: alert.alert_type,
        symbol: alert.symbol,
        threshold: alert.threshold_value,
        current_price: priceData.price,
        message: this.createAlertMessage(alert, priceData),
        timestamp: new Date().toISOString()
      };

      const { data: trigger, error: triggerError } = await supabase
        .from('alert_triggers')
        .insert({
          alert_id: alert.id,
          trigger_value: priceData.price,
          trigger_data: JSON.stringify(triggerData),
          status: 'pending'
        })
        .select()
        .single();

      if (triggerError) {
        throw triggerError;
      }

      // 2. Update alert trigger count
      const { error: updateError } = await supabase
        .from('alerts')
        .update({
          triggered_count: alert.triggered_count + 1,
          last_triggered_at: new Date().toISOString()
        })
        .eq('id', alert.id);

      if (updateError) {
        console.error('❌ Failed to update alert trigger count:', updateError);
      }

      // 3. Send notifications via Supabase Realtime
      await this.sendRealtimeNotification(alert, trigger, triggerData);

      // 3.5. Send push notifications (AGENTE 4: PWA Push Notifications)
      await this.sendPushNotification(alert, triggerData);

      // 4. Update local cache
      alert.triggered_count += 1;
      alert.last_triggered_at = new Date().toISOString();
      this.alertCache.set(alert.id, alert);

      this.metrics.triggersCreated++;

      console.log(`✅ Alert ${alert.id} triggered successfully`);

    } catch (error) {
      console.error(`❌ Failed to trigger alert ${alert.id}:`, error);
      this.metrics.errorsEncountered++;
    }
  }

  /**
   * Send real-time notification via Supabase channels
   */
  private async sendRealtimeNotification(alert: Alert, trigger: AlertTrigger, triggerData: any): Promise<void> {
    try {
      // Broadcast to user-specific channel
      const channelName = `alerts:${alert.user_id}`;
      
      const notificationPayload = {
        type: 'alert_triggered',
        alert_id: alert.id,
        trigger_id: trigger.id,
        symbol: alert.symbol,
        alert_type: alert.alert_type,
        trigger_value: trigger.trigger_value,
        message: triggerData.message,
        timestamp: trigger.triggered_at,
        notification_methods: alert.notification_methods.split(',').map(m => m.trim())
      };

      // Use Supabase Realtime to broadcast
      const { error } = await supabase
        .channel(channelName)
        .send({
          type: 'broadcast',
          event: 'alert_triggered',
          payload: notificationPayload
        });

      if (error) {
        console.error('❌ Failed to send realtime notification:', error);
        return;
      }

      // Update trigger status
      await supabase
        .from('alert_triggers')
        .update({ status: 'sent' })
        .eq('id', trigger.id);

      console.log(`📡 Real-time notification sent for alert ${alert.id}`);

    } catch (error) {
      console.error(`❌ Real-time notification failed:`, error);
    }
  }

  /**
   * Send push notification for triggered alert (AGENTE 4: PWA Push Notifications)
   */
  private async sendPushNotification(alert: Alert, triggerData: any): Promise<void> {
    try {
      // Check if push notifications are enabled for this alert
      const notificationMethods = alert.notification_methods.split(',').map(m => m.trim());
      if (!notificationMethods.includes('push') && !notificationMethods.includes('all')) {
        console.log(`📱 Push notifications not enabled for alert ${alert.id}`);
        return;
      }

      // Create push notification payload
      const pushPayload = {
        title: `🚨 ${alert.symbol} Alert`,
        body: triggerData.message,
        icon: '/icon-192.png',
        badge: '/badge-72x72.svg',
        data: {
          type: 'market_alert',
          alertId: alert.id,
          symbol: alert.symbol,
          alertType: alert.alert_type,
          triggerValue: triggerData.current_price,
          url: `/dashboard?symbol=${alert.symbol}&alert=${alert.id}`,
          timestamp: Date.now()
        },
        actions: [
          { action: 'view', title: 'View Details', icon: '/icon-32.png' },
          { action: 'snooze', title: 'Snooze 1h', icon: '/icon-32.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        requireInteraction: true,
        tag: `alert-${alert.id}`,
        vibrate: [200, 100, 200, 100, 200] // Alert vibration pattern
      };

      // Send push notification to user
      const result = await pushNotificationService.sendPushToUser(alert.user_id, pushPayload);
      
      if (result.success) {
        console.log(`📱 Push notification sent for alert ${alert.id} - Sent: ${result.sent}, Failed: ${result.failed}`);
        
        // Log push notification attempt
        await supabase
          .from('alert_triggers')
          .update({ 
            status: 'sent',
            trigger_data: JSON.stringify({
              ...JSON.parse(triggerData),
              push_notification: {
                sent: result.sent,
                failed: result.failed,
                timestamp: new Date().toISOString()
              }
            })
          })
          .eq('alert_id', alert.id)
          .eq('trigger_value', triggerData.current_price);
      } else {
        console.warn(`⚠️ Push notification failed for alert ${alert.id}`);
      }

    } catch (error) {
      console.error(`❌ Push notification failed for alert ${alert.id}:`, error);
    }
  }

  /**
   * Create human-readable alert message
   */
  private createAlertMessage(alert: Alert, priceData: PriceData): string {
    switch (alert.alert_type) {
      case 'price_above':
        return `${alert.symbol} rose above $${alert.threshold_value} (current: $${priceData.price.toFixed(2)})`;
      case 'price_below':
        return `${alert.symbol} dropped below $${alert.threshold_value} (current: $${priceData.price.toFixed(2)})`;
      case 'volume_spike':
        return `${alert.symbol} volume spike detected (current price: $${priceData.price.toFixed(2)})`;
      case 'technical_indicator':
        return `${alert.symbol} technical indicator signal triggered (current: $${priceData.price.toFixed(2)})`;
      case 'news_sentiment':
        return `${alert.symbol} significant news sentiment change (current: $${priceData.price.toFixed(2)})`;
      default:
        return `${alert.symbol} alert triggered at $${priceData.price.toFixed(2)}`;
    }
  }

  /**
   * Extract volume from quote data (helper)
   */
  private extractVolumeFromQuote(quote: any): number | undefined {
    if (quote.volume) {
      return parseFloat(quote.volume);
    }
    
    // Fallback: estimate from market cap (simplified)
    if (quote.marketCap) {
      const value = parseFloat(quote.marketCap.replace(/[^0-9.]/g, ''));
      if (quote.marketCap.includes('B')) {
        return value * 1000000;
      } else if (quote.marketCap.includes('M')) {
        return value * 10000;
      }
    }
    
    return undefined;
  }

  /**
   * Get average volume for symbol (placeholder - needs implementation)
   */
  private getAverageVolume(symbol: string): number | undefined {
    // Placeholder: would need historical volume data
    // For now, return undefined to skip volume spike alerts
    return undefined;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(alertsProcessed: number, triggersCreated: number, processingTime: number): void {
    this.metrics.alertsProcessed += alertsProcessed;
    this.metrics.triggersCreated += triggersCreated;
    this.metrics.lastProcessingTime = processingTime;
    this.metrics.cyclesCompleted++;
    
    // Calculate average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.cyclesCompleted - 1) + processingTime) / 
      this.metrics.cyclesCompleted;
    
    this.metrics.uniqueSymbolsMonitored = new Set(
      Array.from(this.alertCache.values()).map(a => a.symbol)
    ).size;
  }

  /**
   * PUBLIC API METHODS
   */

  /**
   * Get current alert monitor status and metrics
   */
  getStatus(): {
    isRunning: boolean;
    config: AlertMonitorConfig;
    metrics: AlertMonitorMetrics;
    cacheStatus: {
      alertsCached: number;
      pricesCached: number;
      lastCacheRefresh: Date;
    };
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
      metrics: { ...this.metrics },
      cacheStatus: {
        alertsCached: this.alertCache.size,
        pricesCached: this.priceCache.size,
        lastCacheRefresh: new Date(this.lastCacheRefresh)
      }
    };
  }

  /**
   * Force refresh alert cache
   */
  async forceRefreshCache(): Promise<void> {
    this.lastCacheRefresh = 0;
    await this.refreshAlertCacheIfNeeded();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AlertMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Alert monitor config updated:', this.config);
  }

  /**
   * Start alert monitoring (if not already running)
   */
  start(): void {
    this.config.enabled = true;
    console.log('🚀 Alert monitor enabled');
  }

  /**
   * Stop alert monitoring
   */
  stop(): void {
    this.config.enabled = false;
    console.log('🛑 Alert monitor disabled');
  }
}

// Create and export singleton instance
export const alertMonitor = new AlertMonitor();

// Export the class for testing
export { AlertMonitor };

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  alertMonitor.start();
  console.log('🚀 Alert Monitor auto-started for production');
}