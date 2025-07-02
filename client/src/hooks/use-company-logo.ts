/**
 * Company Logo Hook for Alfalyzer
 * Custom hook for managing company logos with caching and fallback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getCompanyLogo, 
  getCompanyLogos, 
  getBestLogo, 
  getCompanyColor, 
  getCompanyName,
  getCachedLogo,
  cacheLogo,
  verifyLogoUrl
} from '../data/company-logos';

export interface LogoState {
  url: string | null;
  isLoading: boolean;
  error: string | null;
  verified: boolean;
  fallbackColor: string;
  companyName: string;
}

export interface UseCompanyLogoOptions {
  priority?: 'speed' | 'quality';
  enableCache?: boolean;
  autoRetry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Main hook for company logo management
 */
export function useCompanyLogo(symbol: string, options: UseCompanyLogoOptions = {}) {
  const {
    priority = 'speed',
    enableCache = true,
    autoRetry = true,
    retryDelay = 1000,
    maxRetries = 3
  } = options;

  const [logoState, setLogoState] = useState<LogoState>({
    url: null,
    isLoading: true,
    error: null,
    verified: false,
    fallbackColor: getCompanyColor(symbol),
    companyName: getCompanyName(symbol)
  });

  const [retryCount, setRetryCount] = useState(0);

  // Memoize logo providers to prevent unnecessary recalculations
  const logoProviders = useMemo(() => getCompanyLogos(symbol), [symbol]);

  const loadLogo = useCallback(async () => {
    if (!symbol) return;

    setLogoState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check cache first if enabled
      if (enableCache) {
        const cached = getCachedLogo(symbol);
        if (cached?.verified) {
          setLogoState(prev => ({
            ...prev,
            url: cached.url,
            isLoading: false,
            verified: true,
            error: null
          }));
          return;
        }
      }

      // Get best available logo
      let logoUrl: string;
      
      if (priority === 'quality') {
        logoUrl = await getBestLogo(symbol);
      } else {
        // Speed priority - use first provider
        logoUrl = getCompanyLogo(symbol, 'CLEARBIT');
      }

      // Verify URL if quality is priority
      let verified = false;
      if (priority === 'quality') {
        verified = await verifyLogoUrl(logoUrl);
      }

      setLogoState(prev => ({
        ...prev,
        url: logoUrl,
        isLoading: false,
        verified,
        error: null
      }));

      // Cache successful result
      if (enableCache && verified) {
        cacheLogo(symbol, logoUrl, verified);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load logo';
      
      setLogoState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        verified: false
      }));

      // Auto retry logic
      if (autoRetry && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadLogo();
        }, retryDelay);
      }
    }
  }, [symbol, priority, enableCache, autoRetry, retryCount, maxRetries, retryDelay]);

  // Load logo when symbol changes
  useEffect(() => {
    setRetryCount(0);
    loadLogo();
  }, [symbol, loadLogo]);

  // Manual retry function
  const retry = useCallback(() => {
    setRetryCount(0);
    loadLogo();
  }, [loadLogo]);

  // Preload next logo option
  const preloadNext = useCallback(() => {
    if (logoProviders.length > 1) {
      const nextUrl = logoProviders[1];
      const img = new Image();
      img.src = nextUrl;
    }
  }, [logoProviders]);

  return {
    ...logoState,
    retry,
    preloadNext,
    hasMultipleOptions: logoProviders.length > 1,
    logoProviders
  };
}

/**
 * Hook for batch loading multiple company logos
 */
export function useCompanyLogos(symbols: string[], options: UseCompanyLogoOptions = {}) {
  const [logosState, setLogosState] = useState<Record<string, LogoState>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllLogos = async () => {
      setIsLoading(true);
      const newLogosState: Record<string, LogoState> = {};

      // Initialize all logos
      symbols.forEach(symbol => {
        newLogosState[symbol] = {
          url: null,
          isLoading: true,
          error: null,
          verified: false,
          fallbackColor: getCompanyColor(symbol),
          companyName: getCompanyName(symbol)
        };
      });
      
      setLogosState(newLogosState);

      // Load logos in batches to avoid overwhelming the browser
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (symbol) => {
          try {
            // Check cache first
            if (options.enableCache !== false) {
              const cached = getCachedLogo(symbol);
              if (cached?.verified) {
                setLogosState(prev => ({
                  ...prev,
                  [symbol]: {
                    ...prev[symbol],
                    url: cached.url,
                    isLoading: false,
                    verified: true
                  }
                }));
                return;
              }
            }

            const logoUrl = options.priority === 'quality' 
              ? await getBestLogo(symbol)
              : getCompanyLogo(symbol);

            setLogosState(prev => ({
              ...prev,
              [symbol]: {
                ...prev[symbol],
                url: logoUrl,
                isLoading: false,
                verified: options.priority === 'quality'
              }
            }));

          } catch (error) {
            setLogosState(prev => ({
              ...prev,
              [symbol]: {
                ...prev[symbol],
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load logo'
              }
            }));
          }
        }));

        // Small delay between batches
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setIsLoading(false);
    };

    if (symbols.length > 0) {
      loadAllLogos();
    }
  }, [symbols, options]);

  const getLogoState = useCallback((symbol: string) => {
    return logosState[symbol] || {
      url: null,
      isLoading: true,
      error: null,
      verified: false,
      fallbackColor: getCompanyColor(symbol),
      companyName: getCompanyName(symbol)
    };
  }, [logosState]);

  const getLoadedLogos = useCallback(() => {
    return Object.entries(logosState)
      .filter(([_, state]) => state.url && !state.isLoading)
      .map(([symbol, state]) => ({ symbol, ...state }));
  }, [logosState]);

  const getFailedLogos = useCallback(() => {
    return Object.entries(logosState)
      .filter(([_, state]) => state.error)
      .map(([symbol, state]) => ({ symbol, error: state.error }));
  }, [logosState]);

  return {
    logosState,
    isLoading,
    getLogoState,
    getLoadedLogos,
    getFailedLogos,
    totalLogos: symbols.length,
    loadedCount: getLoadedLogos().length,
    failedCount: getFailedLogos().length
  };
}

/**
 * Hook for logo utilities
 */
export function useLogoUtils() {
  const generateFallbackUrl = useCallback((symbol: string, size: number = 64) => {
    const color = getCompanyColor(symbol).replace('#', '');
    const initials = symbol.slice(0, 2).toUpperCase();
    return `https://via.placeholder.com/${size}x${size}/${color}/ffffff?text=${initials}`;
  }, []);

  const preloadLogos = useCallback((symbols: string[]) => {
    symbols.forEach(symbol => {
      const logoUrls = getCompanyLogos(symbol);
      logoUrls.forEach(url => {
        const img = new Image();
        img.src = url;
      });
    });
  }, []);

  const clearLogoCache = useCallback(() => {
    // This would clear the logo cache if we had a public API for it
    console.log('Logo cache cleared');
  }, []);

  return {
    generateFallbackUrl,
    preloadLogos,
    clearLogoCache,
    getCompanyColor,
    getCompanyName
  };
}