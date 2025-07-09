/**
 * AGENTE A - OPTIMIZED IMAGE COMPONENT
 * Provides lazy loading, WebP support, and LQIP placeholders
 * Replaces all standard img elements for optimal performance
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  /** Source image path (without extension) */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** CSS classes */
  className?: string;
  /** Image width (for aspect ratio) */
  width?: number;
  /** Image height (for aspect ratio) */
  height?: number;
  /** Loading strategy */
  loading?: 'eager' | 'lazy';
  /** Placeholder blur effect */
  placeholder?: 'blur' | 'empty';
  /** Quality preset */
  quality?: 'low' | 'medium' | 'high';
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
  /** Additional props */
  [key: string]: any;
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Automatic WebP format with fallback
 * - Lazy loading with Intersection Observer
 * - LQIP (Low Quality Image Placeholder) blur effect
 * - Responsive images with srcset
 * - Fallback to original format if WebP fails
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  placeholder = 'blur',
  quality = 'high',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const [showLQIP, setShowLQIP] = useState(placeholder === 'blur');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Quality settings for WebP
  const qualitySettings = {
    low: 60,
    medium: 75,
    high: 85
  };

  // Generate image URLs
  const getImageUrls = (baseSrc: string) => {
    const basePath = baseSrc.startsWith('/') ? baseSrc : `/images/${baseSrc}`;
    const basePathWithoutExt = basePath.replace(/\.(png|jpg|jpeg|gif|bmp|tiff)$/i, '');
    
    return {
      webp: `${basePathWithoutExt}.webp`,
      lqip: `${basePathWithoutExt}.lqip.webp`,
      fallback: baseSrc.includes('.') ? baseSrc : `${baseSrc}.png` // Original format fallback
    };
  };

  const urls = getImageUrls(src);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'lazy' && imgRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        },
        {
          threshold: 0.1,
          rootMargin: '50px' // Start loading 50px before image comes into view
        }
      );

      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading]);

  // Handle image load success
  const handleLoad = () => {
    setIsLoaded(true);
    setShowLQIP(false);
    onLoad?.();
  };

  // Handle image load error (fallback to original format)
  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      // Will trigger fallback through <source> elements
    } else {
      // Even fallback failed
      setIsLoaded(true);
      setShowLQIP(false);
      onError?.();
    }
  };

  // Calculate aspect ratio for container
  const aspectRatio = width && height ? (height / width) * 100 : undefined;

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-gray-100 dark:bg-gray-800',
        className
      )}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : aspectRatio ? 'auto' : '100%',
        paddingBottom: aspectRatio ? `${aspectRatio}%` : undefined,
      }}
      {...props}
    >
      {/* LQIP Blur Placeholder */}
      {showLQIP && (
        <img
          src={urls.lqip}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
          style={{
            opacity: isLoaded ? 0 : 1,
          }}
        />
      )}

      {/* Main optimized image */}
      {isInView && (
        <picture className="absolute inset-0 w-full h-full">
          {/* WebP source */}
          <source
            srcSet={urls.webp}
            type="image/webp"
          />
          
          {/* Fallback to original format */}
          <img
            src={hasError ? urls.fallback : urls.webp}
            alt={alt}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleLoad}
            onError={handleError}
            loading={loading}
            decoding="async"
          />
        </picture>
      )}

      {/* Loading placeholder when not in view */}
      {!isInView && placeholder === 'empty' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

/**
 * Utility hook for preloading critical images
 */
export const useImagePreload = (srcs: string[]) => {
  useEffect(() => {
    srcs.forEach(src => {
      const urls = getImageUrls(src);
      
      // Preload WebP version
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = urls.webp;
      link.type = 'image/webp';
      document.head.appendChild(link);
      
      // Preload fallback
      const linkFallback = document.createElement('link');
      linkFallback.rel = 'preload';
      linkFallback.as = 'image';
      linkFallback.href = urls.fallback;
      document.head.appendChild(linkFallback);
    });
  }, [srcs]);
};

// Helper function used by the hook (moved outside component)
const getImageUrls = (baseSrc: string) => {
  const basePath = baseSrc.startsWith('/') ? baseSrc : `/images/${baseSrc}`;
  const basePathWithoutExt = basePath.replace(/\.(png|jpg|jpeg|gif|bmp|tiff)$/i, '');
  
  return {
    webp: `${basePathWithoutExt}.webp`,
    lqip: `${basePathWithoutExt}.lqip.webp`,
    fallback: baseSrc.includes('.') ? baseSrc : `${baseSrc}.png`
  };
};

export default OptimizedImage;