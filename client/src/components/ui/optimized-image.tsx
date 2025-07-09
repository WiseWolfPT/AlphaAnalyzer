/**
 * OptimizedImage Component
 * High-performance image component with WebP support, lazy loading, and blur placeholders
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { 
  generateBlurPlaceholder, 
  generateSrcSet, 
  supportsWebP,
  LOADING_STRATEGIES,
  calculateAspectRatio,
  DEFAULT_CONFIG,
  type ImageOptimizationConfig,
  type OptimizedImageData
} from '../../utils/image-optimization';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: 'critical' | 'above-fold' | 'below-fold';
  placeholder?: 'blur' | 'empty' | 'skeleton';
  optimization?: Partial<ImageOptimizationConfig>;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: string;
  blurDataURL?: string;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = 'below-fold',
  placeholder = 'blur',
  optimization = {},
  onLoad,
  onError,
  fallback,
  blurDataURL,
  sizes,
  className,
  style,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(priority === 'critical');

  const config = { ...DEFAULT_CONFIG, ...optimization };
  const strategyConfig = LOADING_STRATEGIES[priority.toUpperCase() as keyof typeof LOADING_STRATEGIES];

  // Check WebP support
  useEffect(() => {
    supportsWebP().then(setWebpSupported);
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority === 'critical' || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Start loading 50px before the image enters viewport
      }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
    
    // Try fallback if available
    if (fallback && imgRef.current) {
      imgRef.current.src = fallback;
      setHasError(false);
    }
  };

  // Generate optimized source URLs
  const getOptimizedSrc = (): string => {
    if (webpSupported && config.format === 'webp') {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return webpSrc;
    }
    return src;
  };

  const getSrcSet = (): string | undefined => {
    if (!config.srcSet) return undefined;
    return generateSrcSet(getOptimizedSrc());
  };

  // Generate placeholder
  const getPlaceholder = (): string | undefined => {
    if (placeholder === 'empty') return undefined;
    if (blurDataURL) return blurDataURL;
    if (placeholder === 'blur' && width && height) {
      return generateBlurPlaceholder(width, height);
    }
    return generateBlurPlaceholder();
  };

  // Calculate container styles
  const containerStyle: React.CSSProperties = {
    ...style,
    position: 'relative',
    overflow: 'hidden'
  };

  if (width && height) {
    containerStyle.aspectRatio = calculateAspectRatio(width, height);
  }

  // Render skeleton placeholder
  const renderSkeleton = () => {
    if (placeholder !== 'skeleton') return null;
    
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gray-200 animate-pulse",
          "flex items-center justify-center"
        )}
      >
        <div className="w-8 h-8 bg-gray-300 rounded" />
      </div>
    );
  };

  // Render blur placeholder
  const renderBlurPlaceholder = () => {
    const placeholderSrc = getPlaceholder();
    if (!placeholderSrc || placeholder === 'skeleton') return null;

    return (
      <img
        src={placeholderSrc}
        alt=""
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          "transition-opacity duration-300",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          filter: 'blur(10px)',
          transform: 'scale(1.1)' // Prevent white edges from blur
        }}
      />
    );
  };

  // Don't render image until it's in view (for non-critical images)
  if (!isInView) {
    return (
      <div ref={imgRef} className={className} style={containerStyle}>
        {renderSkeleton()}
        {renderBlurPlaceholder()}
      </div>
    );
  }

  return (
    <div className={className} style={containerStyle}>
      {/* Blur placeholder */}
      {renderBlurPlaceholder()}
      
      {/* Skeleton placeholder */}
      {renderSkeleton()}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={getOptimizedSrc()}
        srcSet={getSrcSet()}
        sizes={sizes || config.sizes}
        alt={alt}
        width={width}
        height={height}
        loading={strategyConfig.loading}
        fetchPriority={strategyConfig.fetchPriority}
        className={cn(
          "w-full h-full object-cover",
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          hasError && "hidden"
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
      
      {/* Error fallback */}
      {hasError && !fallback && (
        <div className={cn(
          "absolute inset-0 bg-gray-100",
          "flex items-center justify-center text-gray-400"
        )}>
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized version for better performance in lists
 */
export const OptimizedImageMemo = React.memo(OptimizedImage, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.priority === nextProps.priority &&
    prevProps.className === nextProps.className
  );
});

/**
 * Picture component with multiple source formats
 */
export interface OptimizedPictureProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: OptimizedImageProps['priority'];
  sources?: Array<{
    srcSet: string;
    type: string;
    sizes?: string;
  }>;
}

export function OptimizedPicture({
  src,
  alt,
  width,
  height,
  className,
  priority = 'below-fold',
  sources = []
}: OptimizedPictureProps) {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);

  useEffect(() => {
    supportsWebP().then(setWebpSupported);
  }, []);

  // Generate WebP source if supported
  const webpSource = webpSupported ? {
    srcSet: src.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
    type: 'image/webp'
  } : null;

  const strategyConfig = LOADING_STRATEGIES[priority.toUpperCase() as keyof typeof LOADING_STRATEGIES];

  return (
    <picture className={className}>
      {/* WebP source (highest priority) */}
      {webpSource && (
        <source
          srcSet={webpSource.srcSet}
          type={webpSource.type}
        />
      )}
      
      {/* Custom sources */}
      {sources.map((source, index) => (
        <source
          key={index}
          srcSet={source.srcSet}
          type={source.type}
          sizes={source.sizes}
        />
      ))}
      
      {/* Fallback image */}
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={strategyConfig.loading}
        fetchPriority={strategyConfig.fetchPriority}
      />
    </picture>
  );
}

export default OptimizedImage;