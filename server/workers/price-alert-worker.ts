import { emailService } from '../services/email-service';
import { supabaseAdmin } from '../lib/supabase-admin';
import { logger } from '../lib/logger';
import { cacheService } from '../services/cache/cache-service';

interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  alert_type: 'above' | 'below';
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  user?: {
    email: string;
    raw_user_meta_data?: {
      name?: string;
    };
  };
}

class PriceAlertWorker {
  private checkInterval = 5 * 60 * 1000; // 5 minutes
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  async start() {
    if (this.isRunning) {
      logger.warn('Price alert worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔔 Price Alert Worker started - checking every 5 minutes');
    
    // Initial check
    await this.checkAlerts();
    
    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkAlerts().catch(error => {
        logger.error('Error in price alert check:', error);
      });
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Price Alert Worker stopped');
  }

  private async checkAlerts() {
    try {
      logger.info('Checking price alerts...');
      
      // Fetch all untriggered alerts with user info
      const { data: alerts, error } = await supabaseAdmin
        .from('price_alerts')
        .select(`
          *,
          user:auth.users(
            email,
            raw_user_meta_data
          )
        `)
        .eq('triggered', false);

      if (error) {
        logger.error('Failed to fetch price alerts:', error);
        return;
      }

      if (!alerts || alerts.length === 0) {
        logger.info('No active price alerts to check');
        return;
      }

      logger.info(`Checking ${alerts.length} active price alerts`);

      // Group alerts by symbol for efficient price fetching
      const symbolsToCheck = [...new Set(alerts.map(a => a.symbol))];
      const priceMap = new Map<string, number>();

      // Fetch current prices for all symbols
      for (const symbol of symbolsToCheck) {
        try {
          // Try cache first
          const cachedQuote = await cacheService.getQuote(symbol);
          if (cachedQuote && cachedQuote.price) {
            priceMap.set(symbol, cachedQuote.price);
            continue;
          }

          // Fallback to API
          const response = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${process.env.FMP_API_KEY}`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0].price) {
              priceMap.set(symbol, data[0].price);
              // Cache the quote
              await cacheService.setQuote(symbol, data[0]);
            }
          }
        } catch (error) {
          logger.error(`Failed to fetch price for ${symbol}:`, error);
        }
      }

      // Check each alert
      const triggeredAlerts: string[] = [];
      
      for (const alert of alerts) {
        const currentPrice = priceMap.get(alert.symbol);
        
        if (!currentPrice) {
          logger.warn(`No price data available for ${alert.symbol}`);
          continue;
        }

        // Check if alert should trigger
        const shouldTrigger = alert.alert_type === 'above' 
          ? currentPrice >= alert.target_price
          : currentPrice <= alert.target_price;

        if (shouldTrigger) {
          logger.info(`Alert triggered for ${alert.symbol}: ${currentPrice} ${alert.alert_type} ${alert.target_price}`);
          
          // Send email notification
          if (alert.user?.email) {
            const emailSent = await emailService.sendPriceAlert({
              id: alert.id,
              symbol: alert.symbol,
              targetPrice: alert.target_price,
              currentPrice,
              alertType: alert.alert_type,
              userEmail: alert.user.email,
              userName: alert.user.raw_user_meta_data?.name
            });

            if (emailSent) {
              triggeredAlerts.push(alert.id);
              
              // Mark alert as triggered
              const { error: updateError } = await supabaseAdmin
                .from('price_alerts')
                .update({ 
                  triggered: true, 
                  triggered_at: new Date().toISOString(),
                  triggered_price: currentPrice
                })
                .eq('id', alert.id);

              if (updateError) {
                logger.error(`Failed to mark alert as triggered: ${alert.id}`, updateError);
              } else {
                logger.info(`Alert ${alert.id} marked as triggered and email sent`);
              }
            } else {
              logger.warn(`Failed to send email for alert ${alert.id}`);
            }
          } else {
            logger.warn(`No email address for user ${alert.user_id}`);
          }
        }
      }

      if (triggeredAlerts.length > 0) {
        logger.info(`Triggered ${triggeredAlerts.length} alerts in this check`);
      } else {
        logger.info('No alerts triggered in this check');
      }
      
    } catch (error) {
      logger.error('Error checking price alerts:', error);
    }
  }

  // Manual check method for testing
  async checkAlertsManually(): Promise<number> {
    await this.checkAlerts();
    
    // Return count of triggered alerts for testing
    const { count } = await supabaseAdmin
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('triggered', true)
      .gte('triggered_at', new Date(Date.now() - 60000).toISOString()); // Last minute
    
    return count || 0;
  }

  // Create test alert for development
  async createTestAlert(userId: string, symbol: string, targetPrice: number, alertType: 'above' | 'below' = 'above') {
    const { data, error } = await supabaseAdmin
      .from('price_alerts')
      .insert({
        user_id: userId,
        symbol,
        target_price: targetPrice,
        alert_type: alertType,
        triggered: false
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create test alert:', error);
      return null;
    }

    logger.info(`Test alert created: ${symbol} ${alertType} ${targetPrice}`);
    return data;
  }
}

// Export singleton instance
export const priceAlertWorker = new PriceAlertWorker();