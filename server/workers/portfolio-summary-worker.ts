import { emailService } from '../services/email-service';
import { supabaseAdmin } from '../lib/supabase-admin';
import { logger } from '../middleware/logger';
import { cacheService } from '../services/cache/cache-service';

interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  holdings: any[];
  total_value: number;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    raw_user_meta_data?: {
      name?: string;
      email_preferences?: {
        weekly_summary?: boolean;
      };
    };
  };
}

interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice?: number;
  value?: number;
  change?: number;
  changePercent?: number;
}

class PortfolioSummaryWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  
  // Run weekly on Sundays at 9 AM
  private checkInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
  private lastRunDate: Date | null = null;

  async start() {
    if (this.isRunning) {
      logger.warn('Portfolio summary worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('📊 Portfolio Summary Worker started - sending weekly summaries');
    
    // Check if it's Sunday and time to send
    this.scheduleWeeklySummary();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Portfolio Summary Worker stopped');
  }

  private scheduleWeeklySummary() {
    // Calculate time until next Sunday 9 AM
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay())); // Next Sunday
    nextSunday.setHours(9, 0, 0, 0); // 9 AM
    
    // If it's already past Sunday 9 AM this week, schedule for next week
    if (nextSunday <= now) {
      nextSunday.setDate(nextSunday.getDate() + 7);
    }
    
    const timeUntilSunday = nextSunday.getTime() - now.getTime();
    
    logger.info(`Next portfolio summary scheduled for ${nextSunday.toISOString()}`);
    
    // Schedule the first run
    setTimeout(() => {
      this.sendWeeklySummaries().catch(error => {
        logger.error('Error sending weekly summaries:', error);
      });
      
      // Then schedule recurring weekly runs
      this.intervalId = setInterval(() => {
        this.sendWeeklySummaries().catch(error => {
          logger.error('Error sending weekly summaries:', error);
        });
      }, this.checkInterval);
    }, timeUntilSunday);
  }

  private async sendWeeklySummaries() {
    try {
      logger.info('Starting weekly portfolio summary emails...');
      
      // Fetch all portfolios with user info
      const { data: portfolios, error } = await supabaseAdmin
        .from('portfolios')
        .select(`
          *,
          user:auth.users(
            email,
            raw_user_meta_data
          )
        `);

      if (error) {
        logger.error('Failed to fetch portfolios:', error);
        return;
      }

      if (!portfolios || portfolios.length === 0) {
        logger.info('No portfolios to send summaries for');
        return;
      }

      logger.info(`Processing ${portfolios.length} portfolios for weekly summaries`);

      let summariesSent = 0;
      
      for (const portfolio of portfolios) {
        try {
          // Check if user wants weekly summaries
          const emailPrefs = portfolio.user?.raw_user_meta_data?.email_preferences;
          if (emailPrefs?.weekly_summary === false) {
            logger.info(`User ${portfolio.user_id} opted out of weekly summaries`);
            continue;
          }

          if (!portfolio.user?.email) {
            logger.warn(`No email for user ${portfolio.user_id}`);
            continue;
          }

          // Calculate portfolio performance
          const summary = await this.calculatePortfolioSummary(portfolio);
          
          if (summary) {
            const emailSent = await emailService.sendWeeklySummary(
              portfolio.user.email,
              portfolio.user.raw_user_meta_data?.name,
              summary
            );

            if (emailSent) {
              summariesSent++;
              logger.info(`Weekly summary sent for portfolio ${portfolio.id}`);
            }
          }
        } catch (error) {
          logger.error(`Failed to process portfolio ${portfolio.id}:`, error);
        }
      }

      logger.info(`Weekly summaries sent: ${summariesSent}/${portfolios.length}`);
      this.lastRunDate = new Date();
      
    } catch (error) {
      logger.error('Error in weekly summary process:', error);
    }
  }

  private async calculatePortfolioSummary(portfolio: Portfolio) {
    try {
      const holdings: Holding[] = portfolio.holdings || [];
      
      if (holdings.length === 0) {
        return null;
      }

      // Fetch current prices for all holdings
      const symbols = holdings.map(h => h.symbol);
      const priceMap = new Map<string, number>();
      const weekAgoPriceMap = new Map<string, number>();

      for (const symbol of symbols) {
        try {
          // Get current price from cache or API
          const cachedQuote = await cacheService.getQuote(symbol);
          if (cachedQuote && cachedQuote.price) {
            priceMap.set(symbol, cachedQuote.price);
            // Estimate week ago price (using change percentage if available)
            const weekAgoPrice = cachedQuote.previousClose || cachedQuote.price;
            weekAgoPriceMap.set(symbol, weekAgoPrice);
          }
        } catch (error) {
          logger.error(`Failed to fetch price for ${symbol}:`, error);
        }
      }

      // Calculate portfolio metrics
      let totalValue = 0;
      let weekAgoValue = 0;
      const performanceData: Array<{ symbol: string; change: number }> = [];

      for (const holding of holdings) {
        const currentPrice = priceMap.get(holding.symbol) || holding.avgCost;
        const weekAgoPrice = weekAgoPriceMap.get(holding.symbol) || holding.avgCost;
        
        const currentValue = currentPrice * holding.shares;
        const weekAgoVal = weekAgoPrice * holding.shares;
        
        totalValue += currentValue;
        weekAgoValue += weekAgoVal;
        
        const changePercent = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
        performanceData.push({ symbol: holding.symbol, change: changePercent });
      }

      const weeklyChange = totalValue - weekAgoValue;
      const weeklyChangePercent = (weeklyChange / weekAgoValue) * 100;
      
      // Sort for top gainers and losers
      performanceData.sort((a, b) => b.change - a.change);
      const topGainers = performanceData.filter(p => p.change > 0).slice(0, 3);
      const topLosers = performanceData.filter(p => p.change < 0).slice(-3).reverse();

      return {
        portfolioName: portfolio.name,
        totalValue,
        dailyChange: 0, // Could calculate if we store daily data
        dailyChangePercent: 0,
        weeklyChange,
        weeklyChangePercent,
        topGainers,
        topLosers
      };
      
    } catch (error) {
      logger.error('Error calculating portfolio summary:', error);
      return null;
    }
  }

  // Manual trigger for testing
  async sendTestSummary(userId: string): Promise<boolean> {
    try {
      const { data: portfolio, error } = await supabaseAdmin
        .from('portfolios')
        .select(`
          *,
          user:auth.users(
            email,
            raw_user_meta_data
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error || !portfolio) {
        logger.error('Portfolio not found:', error);
        return false;
      }

      const summary = await this.calculatePortfolioSummary(portfolio);
      
      if (!summary || !portfolio.user?.email) {
        return false;
      }

      return await emailService.sendWeeklySummary(
        portfolio.user.email,
        portfolio.user.raw_user_meta_data?.name,
        summary
      );
    } catch (error) {
      logger.error('Error sending test summary:', error);
      return false;
    }
  }
}

// Export singleton instance
export const portfolioSummaryWorker = new PortfolioSummaryWorker();