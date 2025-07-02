export * from './provider.interface';
export * from './unified-api-service';

import { UnifiedAPIService } from './unified-api-service';

// Singleton instance
let unifiedAPIInstance: UnifiedAPIService | null = null;

export function getUnifiedAPIService(): UnifiedAPIService {
  if (!unifiedAPIInstance) {
    unifiedAPIInstance = new UnifiedAPIService();
  }
  return unifiedAPIInstance;
}