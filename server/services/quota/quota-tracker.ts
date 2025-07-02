import { PROVIDER_QUOTAS, ProviderName, QuotaLimit } from './quota-limits';
import { getCache } from '../cache';

export interface ProviderUsage {
  provider: string;
  today: number;
  lastMinute: number;
  lastReset: number;
  quotaRemaining: {
    daily?: number;
    perMinute?: number;
  };
}

export class QuotaTracker {
  private cache = getCache();
  private readonly USAGE_KEY_PREFIX = 'quota:usage:';
  private readonly MINUTE_KEY_PREFIX = 'quota:minute:';

  async recordCall(provider: ProviderName, endpoint: string): Promise<void> {
    const now = Date.now();
    
    // Record daily usage
    const dailyKey = this.getDailyKey(provider);
    const currentDaily = await this.cache.get<number>(dailyKey) || 0;
    await this.cache.set(dailyKey, currentDaily + 1, this.getSecondsUntilReset());

    // Record minute usage
    const minuteKey = this.getMinuteKey(provider);
    const minuteData = await this.cache.get<number[]>(minuteKey) || [];
    const oneMinuteAgo = now - 60000;
    
    // Filter out calls older than 1 minute
    const recentCalls = minuteData.filter(timestamp => timestamp > oneMinuteAgo);
    recentCalls.push(now);
    
    await this.cache.set(minuteKey, recentCalls, 70); // Keep for 70 seconds

    // Log the API call for monitoring
    console.log(`[QuotaTracker] ${provider} - ${endpoint} - Daily: ${currentDaily + 1}, Minute: ${recentCalls.length}`);
  }

  async canUseProvider(provider: ProviderName): Promise<boolean> {
    const usage = await this.getUsage(provider);
    const config = PROVIDER_QUOTAS[provider];
    
    if (!config) {
      console.warn(`[QuotaTracker] Unknown provider: ${provider}`);
      return false;
    }

    // Check minute limit
    if (config.limits.perMinute && usage.lastMinute >= config.limits.perMinute) {
      return false;
    }

    // Check daily limit
    if (config.limits.daily && usage.today >= config.limits.daily) {
      return false;
    }

    return true;
  }

  async getUsage(provider: ProviderName): Promise<ProviderUsage> {
    const config = PROVIDER_QUOTAS[provider];
    const now = Date.now();
    
    // Get daily usage
    const dailyKey = this.getDailyKey(provider);
    const dailyUsage = await this.cache.get<number>(dailyKey) || 0;

    // Get minute usage
    const minuteKey = this.getMinuteKey(provider);
    const minuteData = await this.cache.get<number[]>(minuteKey) || [];
    const oneMinuteAgo = now - 60000;
    const minuteUsage = minuteData.filter(timestamp => timestamp > oneMinuteAgo).length;

    return {
      provider,
      today: dailyUsage,
      lastMinute: minuteUsage,
      lastReset: this.getLastResetTime(),
      quotaRemaining: {
        daily: config.limits.daily ? Math.max(0, config.limits.daily - dailyUsage) : undefined,
        perMinute: config.limits.perMinute ? Math.max(0, config.limits.perMinute - minuteUsage) : undefined
      }
    };
  }

  async getUsagePercent(provider: ProviderName): Promise<number> {
    const usage = await this.getUsage(provider);
    const config = PROVIDER_QUOTAS[provider];
    
    if (config.limits.daily) {
      return Math.round((usage.today / config.limits.daily) * 100);
    }
    
    return 0;
  }

  async getAllProvidersUsage(): Promise<Record<string, ProviderUsage>> {
    const providers = Object.keys(PROVIDER_QUOTAS) as ProviderName[];
    const result: Record<string, ProviderUsage> = {};
    
    for (const provider of providers) {
      result[provider] = await this.getUsage(provider);
    }
    
    return result;
  }

  async selectBestProvider(dataType: string, preferredProviders?: ProviderName[]): Promise<ProviderName | null> {
    const providers = preferredProviders || Object.keys(PROVIDER_QUOTAS) as ProviderName[];
    
    // Sort by priority
    const sortedProviders = providers
      .filter(p => PROVIDER_QUOTAS[p])
      .sort((a, b) => PROVIDER_QUOTAS[a].priority - PROVIDER_QUOTAS[b].priority);

    // Find first available provider
    for (const provider of sortedProviders) {
      if (await this.canUseProvider(provider)) {
        return provider;
      }
    }

    // If all providers exhausted, find the one with lowest usage percentage
    let bestProvider: ProviderName | null = null;
    let lowestUsage = 100;

    for (const provider of sortedProviders) {
      const usagePercent = await this.getUsagePercent(provider);
      if (usagePercent < lowestUsage) {
        lowestUsage = usagePercent;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  // Monitoring methods
  async checkQuotaAlerts(): Promise<{ provider: string; usage: number; alert: boolean }[]> {
    const providers = Object.keys(PROVIDER_QUOTAS) as ProviderName[];
    const alerts = [];

    for (const provider of providers) {
      const usage = await this.getUsagePercent(provider);
      const alert = usage > 80; // Alert at 80% usage
      
      alerts.push({ provider, usage, alert });
      
      if (alert) {
        console.warn(`⚠️ [QuotaTracker] ${provider} quota at ${usage}%`);
      }
    }

    return alerts;
  }

  // Helper methods
  private getDailyKey(provider: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `${this.USAGE_KEY_PREFIX}${provider}:${date}`;
  }

  private getMinuteKey(provider: string): string {
    return `${this.MINUTE_KEY_PREFIX}${provider}`;
  }

  private getSecondsUntilReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }

  private getLastResetTime(): number {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    
    return today.getTime();
  }
}