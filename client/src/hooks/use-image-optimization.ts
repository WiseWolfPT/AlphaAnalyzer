/**
 * Image Optimization Hooks
 * Custom hooks for image loading, caching, and optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  convertToWebP,
  optimizeExternalImage,
  calculatePayloadSavings,
  supportsWebP,
  type OptimizedImageData,
  type PayloadSavings,
  type ImageOptimizationConfig
} from '../utils/image-optimization';

/**
 * Hook for progressive image loading with multiple sources
 */
export function useProgressiveImage(sources: string[], fallback?: string) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const attemptedSources = useRef<Set<string>>(new Set());
  const sourceIndex = useRef(0);

  const tryNextSource = useCallback(() => {
    if (sourceIndex.current >= sources.length) {
      // All sources failed, try fallback
      if (fallback && !attemptedSources.current.has(fallback)) {
        setCurrentSrc(fallback);
        attemptedSources.current.add(fallback);
        return;
      }
      
      // No more sources to try
      setIsLoading(false);
      setError(new Error('All image sources failed to load'));
      return;
    }

    const nextSource = sources[sourceIndex.current];
    sourceIndex.current++;
    
    if (attemptedSources.current.has(nextSource)) {
      tryNextSource();
      return;
    }

    attemptedSources.current.add(nextSource);
    setCurrentSrc(nextSource);
  }, [sources, fallback]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    tryNextSource();
  }, [tryNextSource]);

  // Reset when sources change
  useEffect(() => {
    attemptedSources.current.clear();
    sourceIndex.current = 0;
    setIsLoading(true);
    setError(null);
    tryNextSource();
  }, [sources.join(','), tryNextSource]);

  return {
    src: currentSrc,
    isLoading,
    error,
    onLoad: handleLoad,
    onError: handleError
  };
}

/**
 * Hook for optimizing external images (like company logos)
 */
export function useOptimizedImage(
  url: string,
  config: Partial<ImageOptimizationConfig> = {}
) {
  const [optimizedData, setOptimizedData] = useState<OptimizedImageData | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) return;

    setIsOptimizing(true);
    setError(null);

    try {
      const data = optimizeExternalImage(url, config);
      setOptimizedData(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Optimization failed'));
    } finally {
      setIsOptimizing(false);
    }
  }, [url, JSON.stringify(config)]);

  return {
    optimizedData,
    isOptimizing,
    error
  };
}

/**
 * Hook for batch image preloading
 */
export function useImagePreloader() {
  const [preloadedImages] = useState(new Set<string>());
  const [loadingImages] = useState(new Set<string>());

  const preloadImage = useCallback((url: string): Promise<void> => {
    if (preloadedImages.has(url)) {
      return Promise.resolve();
    }

    if (loadingImages.has(url)) {
      // Return existing promise if already loading
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (preloadedImages.has(url)) {
            resolve();
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }

    loadingImages.add(url);

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        preloadedImages.add(url);
        loadingImages.delete(url);
        resolve();
      };
      
      img.onerror = () => {
        loadingImages.delete(url);
        reject(new Error(`Failed to preload image: ${url}`));
      };
      
      img.src = url;
    });
  }, [preloadedImages, loadingImages]);

  const preloadImages = useCallback(async (urls: string[]): Promise<void> => {
    const promises = urls.map(url => preloadImage(url).catch(err => {
      console.warn(`Failed to preload ${url}:`, err);
    }));
    
    await Promise.all(promises);
  }, [preloadImage]);

  const isPreloaded = useCallback((url: string): boolean => {
    return preloadedImages.has(url);
  }, [preloadedImages]);

  return {
    preloadImage,
    preloadImages,
    isPreloaded,
    preloadedCount: preloadedImages.size
  };
}

/**
 * Hook for WebP format detection and conversion
 */
export function useWebPConversion() {
  const [supportsWebPFormat, setSupportsWebPFormat] = useState<boolean | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    supportsWebP().then(setSupportsWebPFormat);
  }, []);

  const convertImage = useCallback(async (
    source: File | string,
    quality: number = 0.85
  ): Promise<string> => {
    if (supportsWebPFormat === false) {
      throw new Error('WebP format not supported');
    }

    setIsConverting(true);
    
    try {
      const webpDataUrl = await convertToWebP(source, quality);
      return webpDataUrl;
    } finally {
      setIsConverting(false);
    }
  }, [supportsWebPFormat]);

  return {
    supportsWebPFormat,
    convertImage,
    isConverting
  };
}

/**
 * Hook for tracking image performance metrics
 */
export function useImageMetrics() {
  const [metrics, setMetrics] = useState<{
    totalImages: number;
    loadedImages: number;
    failedImages: number;
    totalPayloadSaved: number;
    averageLoadTime: number;
  }>({
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    totalPayloadSaved: 0,
    averageLoadTime: 0
  });

  const loadTimes = useRef<number[]>([]);

  const trackImageLoad = useCallback((url: string, loadTime: number, payloadSavings?: PayloadSavings) => {
    loadTimes.current.push(loadTime);
    
    setMetrics(prev => ({
      ...prev,
      loadedImages: prev.loadedImages + 1,
      totalPayloadSaved: prev.totalPayloadSaved + (payloadSavings?.savings || 0),
      averageLoadTime: loadTimes.current.reduce((a, b) => a + b, 0) / loadTimes.current.length
    }));
  }, []);

  const trackImageError = useCallback((url: string) => {
    setMetrics(prev => ({
      ...prev,
      failedImages: prev.failedImages + 1
    }));
  }, []);

  const registerImage = useCallback((url: string) => {
    setMetrics(prev => ({
      ...prev,
      totalImages: prev.totalImages + 1
    }));
  }, []);

  const resetMetrics = useCallback(() => {
    loadTimes.current = [];
    setMetrics({
      totalImages: 0,
      loadedImages: 0,
      failedImages: 0,
      totalPayloadSaved: 0,
      averageLoadTime: 0
    });
  }, []);

  return {
    metrics,
    trackImageLoad,
    trackImageError,
    registerImage,
    resetMetrics
  };
}

/**
 * Hook for intelligent image caching
 */
export function useImageCache(maxSize: number = 50) {
  const cache = useRef(new Map<string, {
    data: string;
    timestamp: number;
    accessCount: number;
  }>());

  const getCachedImage = useCallback((url: string): string | null => {
    const cached = cache.current.get(url);
    if (cached) {
      cached.accessCount++;
      cached.timestamp = Date.now();
      return cached.data;
    }
    return null;
  }, []);

  const setCachedImage = useCallback((url: string, data: string): void => {
    // Implement LRU eviction if cache is full
    if (cache.current.size >= maxSize) {
      // Find least recently used item
      let lruKey = '';
      let lruTime = Date.now();
      
      for (const [key, value] of cache.current.entries()) {
        if (value.timestamp < lruTime) {
          lruTime = value.timestamp;
          lruKey = key;
        }
      }
      
      if (lruKey) {
        cache.current.delete(lruKey);
      }
    }

    cache.current.set(url, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }, [maxSize]);

  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      size: cache.current.size,
      maxSize,
      entries: Array.from(cache.current.entries()).map(([url, data]) => ({
        url,
        timestamp: data.timestamp,
        accessCount: data.accessCount
      }))
    };
  }, [maxSize]);

  return {
    getCachedImage,
    setCachedImage,
    clearCache,
    getCacheStats
  };
}

/**
 * Hook for responsive image management
 */
export function useResponsiveImage(
  src: string,
  breakpoints: { [key: string]: number } = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280
  }
) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('xl');
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      let newBreakpoint = 'xl';
      
      for (const [bp, minWidth] of Object.entries(breakpoints)) {
        if (width >= minWidth) {
          newBreakpoint = bp;
        }
      }
      
      setCurrentBreakpoint(newBreakpoint);
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [breakpoints]);

  useEffect(() => {
    // Generate responsive image URL based on current breakpoint
    const breakpointWidth = breakpoints[currentBreakpoint];
    if (breakpointWidth) {
      const baseUrl = src.split('.').slice(0, -1).join('.');
      const extension = src.split('.').pop();
      setImageSrc(`${baseUrl}-${breakpointWidth}w.${extension}`);
    }
  }, [src, currentBreakpoint, breakpoints]);

  return {
    imageSrc,
    currentBreakpoint,
    breakpointWidth: breakpoints[currentBreakpoint]
  };
}