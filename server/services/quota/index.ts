export * from './quota-limits';
export * from './quota-tracker';

import { QuotaTracker } from './quota-tracker';

// Singleton quota tracker instance
let quotaTrackerInstance: QuotaTracker | null = null;

export function getQuotaTracker(): QuotaTracker {
  if (!quotaTrackerInstance) {
    quotaTrackerInstance = new QuotaTracker();
  }
  return quotaTrackerInstance;
}