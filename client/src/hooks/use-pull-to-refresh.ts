/**
 * Pull-to-Refresh Hook - Wave 3 Implementation
 * 
 * Custom hook for implementing pull-to-refresh functionality
 * Optimized for Portuguese telemóvel users accessing international markets
 */

import { useEffect, useRef, useCallback } from 'react';
import PullToRefresh from 'pulltorefreshjs';
import { useQueryClient } from '@tanstack/react-query';
import { usePortfolio } from '@/contexts/portfolio-context';

interface PullToRefreshOptions {
  enabled?: boolean;
  onRefresh?: () => Promise<void>;
  customInstructions?: {
    pullToRefresh?: string;
    releaseToRefresh?: string;
    refreshing?: string;
  };
  hapticFeedback?: boolean;
  mainElement?: string;
  threshold?: number;
}

export function usePullToRefresh(options: PullToRefreshOptions = {}) {
  const {
    enabled = true,
    onRefresh,
    hapticFeedback = true,
    mainElement = 'body',
    threshold = 100,
    customInstructions
  } = options;

  const queryClient = useQueryClient();
  const { refreshPortfolio, isLoading } = usePortfolio();
  const { t } = useTranslation(['common']);
  const isInitialized = useRef(false);

  // PWA Detection for iOS standalone mode
  const isStandalone = typeof window !== 'undefined' && 
    window.matchMedia('(display-mode: standalone)').matches;
  const isIOS = typeof navigator !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = isStandalone && isIOS;

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((pattern: number | number[] = 50) => {
    if (!hapticFeedback || typeof navigator === 'undefined') return;
    
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      // Silently fail if vibration is not supported
      console.debug('Haptic feedback not supported:', error);
    }
  }, [hapticFeedback]);

  // Default refresh function
  const defaultRefresh = useCallback(async () => {
    console.log('🔄 Pull-to-refresh triggered');
    
    try {
      // Trigger success haptic feedback
      triggerHapticFeedback(50);

      // 1. Refresh market indices
      await queryClient.invalidateQueries({ queryKey: ['market', 'indices'] });
      await queryClient.refetchQueries({ queryKey: ['market', 'indices'] });

      // 2. Refresh portfolio with all holdings
      await refreshPortfolio();

      // 3. Refresh any other dashboard data
      await queryClient.invalidateQueries({ queryKey: ['stocks', 'batch'] });
      await queryClient.invalidateQueries({ queryKey: ['api', 'quota'] });

      // 4. Warm cache for popular stocks
      await queryClient.invalidateQueries({ queryKey: ['cache', 'warm'] });

      console.log('✅ Pull-to-refresh completed successfully');
      
      // Success haptic feedback
      triggerHapticFeedback([50, 30, 50]);
      
    } catch (error) {
      console.error('❌ Pull-to-refresh failed:', error);
      
      // Error haptic feedback - longer pattern
      triggerHapticFeedback([100, 50, 100, 50, 100]);
      
      // Re-throw to let PullToRefresh handle the error state
      throw error;
    }
  }, [queryClient, refreshPortfolio, triggerHapticFeedback]);

  // Get localized instructions
  const getInstructions = useCallback(() => {
    if (customInstructions) {
      return customInstructions;
    }

    return {
      pullToRefresh: t('pull_to_refresh.pull_instruction', { 
        defaultValue: 'Puxe para atualizar dados' 
      }),
      releaseToRefresh: t('pull_to_refresh.release_instruction', { 
        defaultValue: 'Solte para atualizar' 
      }),
      refreshing: t('pull_to_refresh.refreshing', { 
        defaultValue: 'Atualizando dados...' 
      })
    };
  }, [t, customInstructions]);

  // Initialize pull-to-refresh
  useEffect(() => {
    if (!enabled || isInitialized.current) return;

    // Only initialize in browser environment
    if (typeof window === 'undefined') return;

    const instructions = getInstructions();
    
    console.log('🔧 Initializing pull-to-refresh', {
      isPWA,
      isStandalone,
      isIOS,
      enabled,
      mainElement
    });

    try {
      PullToRefresh.init({
        mainElement,
        distThreshold: threshold,
        distMax: 150,
        distReload: 80,
        instructionsPullToRefresh: instructions.pullToRefresh,
        instructionsReleaseToRefresh: instructions.releaseToRefresh,
        instructionsRefreshing: instructions.refreshing,
        onRefresh: onRefresh || defaultRefresh,
        resistance: 2.5,
        shouldPullToRefresh: () => {
          // Only enable if at the top of the page and not currently loading
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          return scrollTop === 0 && !isLoading;
        },
        // Custom styling for better mobile experience
        getMarkup: () => `
          <div class="ptr">
            <div class="ptr__box">
              <div class="ptr__content">
                <div class="ptr__icon">📈</div>
                <div class="ptr__text"></div>
              </div>
            </div>
          </div>
        `,
        getStyles: () => `
          .ptr {
            box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.12);
            pointer-events: none;
            font-size: 0.85em;
            font-weight: bold;
            top: 0;
            height: 0;
            transition: height 0.3s, min-height 0.3s;
            text-align: center;
            width: 100%;
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            align-content: stretch;
            background: rgba(34, 197, 94, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          .ptr--pull {
            transition: none;
          }
          .ptr--loading {
            height: 50px;
            min-height: 50px;
          }
          .ptr__box {
            padding: 10px;
            flex-basis: 100%;
          }
          .ptr__content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            color: #059669;
          }
          .ptr__icon {
            font-size: 1.2em;
            animation: pulse 1.5s infinite;
          }
          .ptr__text {
            font-size: 0.9em;
            font-weight: 500;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .ptr--loading .ptr__icon {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      });

      isInitialized.current = true;
      console.log('✅ Pull-to-refresh initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize pull-to-refresh:', error);
    }

    // Cleanup function
    return () => {
      try {
        PullToRefresh.destroyAll();
        isInitialized.current = false;
        console.log('🧹 Pull-to-refresh destroyed');
      } catch (error) {
        console.error('❌ Error destroying pull-to-refresh:', error);
      }
    };
  }, [
    enabled, 
    onRefresh, 
    defaultRefresh, 
    mainElement, 
    threshold, 
    getInstructions,
    isLoading,
    isPWA
  ]);

  // Disable when loading to prevent conflicts
  useEffect(() => {
    if (!isInitialized.current) return;

    // Update the shouldPullToRefresh condition based on loading state
    const ptr = document.querySelector('.ptr') as HTMLElement;
    if (ptr) {
      ptr.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
  }, [isLoading]);

  return {
    isInitialized: isInitialized.current,
    isPWA,
    isStandalone,
    triggerHapticFeedback,
    refresh: onRefresh || defaultRefresh,
    destroy: () => {
      PullToRefresh.destroyAll();
      isInitialized.current = false;
    }
  };
}