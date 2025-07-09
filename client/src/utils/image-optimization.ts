/**
 * Image Optimization Utilities for Alfalyzer
 * Handles WebP conversion, lazy loading, blur placeholders, and payload optimization
 */

export interface ImageOptimizationConfig {
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  blur: boolean;
  placeholder: boolean;
  lazy: boolean;
  sizes?: string;
  srcSet?: boolean;
}

export interface OptimizedImageData {
  src: string;
  srcSet?: string;
  sizes?: string;
  placeholder?: string;
  blurDataURL?: string;
  width?: number;
  height?: number;
}

/**
 * Default optimization configuration
 */
export const DEFAULT_CONFIG: ImageOptimizationConfig = {
  quality: 85,
  format: 'webp',
  blur: true,
  placeholder: true,
  lazy: true,
  srcSet: true,
  sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw'
};

/**
 * Generate WebP sources with fallback
 */
export function generateWebPSources(src: string, quality: number = 85): string[] {
  const baseUrl = src.split('.').slice(0, -1).join('.');
  const extension = src.split('.').pop()?.toLowerCase();
  
  return [
    `${baseUrl}.webp`,
    `${baseUrl}@2x.webp`,
    src // Original as fallback
  ];
}

/**
 * Generate responsive image srcSet
 */
export function generateSrcSet(src: string, widths: number[] = [640, 828, 1200, 1920]): string {
  const baseUrl = src.split('.').slice(0, -1).join('.');
  const extension = src.split('.').pop();
  
  return widths
    .map(width => `${baseUrl}-${width}w.webp ${width}w`)
    .join(', ');
}

/**
 * Generate blur placeholder data URL
 */
export function generateBlurPlaceholder(width: number = 10, height: number = 10): string {
  // Create a tiny SVG blur placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#f3f4f6" filter="url(#blur)"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Convert image to WebP using Canvas API
 */
export async function convertToWebP(
  file: File | string, 
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (typeof file === 'string') {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Optimize external image URL with proxy service
 */
export function optimizeExternalImage(
  url: string,
  config: Partial<ImageOptimizationConfig> = {}
): OptimizedImageData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Use a service like Cloudinary, ImageKit, or custom proxy
  const baseUrl = '/api/image-proxy';
  const params = new URLSearchParams({
    url: encodeURIComponent(url),
    quality: finalConfig.quality.toString(),
    format: finalConfig.format,
    blur: finalConfig.blur.toString()
  });
  
  const optimizedSrc = `${baseUrl}?${params}`;
  
  return {
    src: optimizedSrc,
    srcSet: finalConfig.srcSet ? generateSrcSet(optimizedSrc) : undefined,
    sizes: finalConfig.sizes,
    placeholder: finalConfig.placeholder ? generateBlurPlaceholder() : undefined,
    blurDataURL: finalConfig.blur ? generateBlurPlaceholder() : undefined
  };
}

/**
 * Check WebP support
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Preload critical images
 */
export function preloadImages(urls: string[], priority: 'high' | 'low' = 'low'): void {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high');
    }
    document.head.appendChild(link);
  });
}

/**
 * Calculate image payload savings
 */
export interface PayloadSavings {
  originalSize: number;
  optimizedSize: number;
  savings: number;
  savingsPercent: number;
}

export async function calculatePayloadSavings(
  originalUrl: string,
  optimizedUrl: string
): Promise<PayloadSavings> {
  try {
    const [originalResponse, optimizedResponse] = await Promise.all([
      fetch(originalUrl, { method: 'HEAD' }),
      fetch(optimizedUrl, { method: 'HEAD' })
    ]);
    
    const originalSize = parseInt(originalResponse.headers.get('content-length') || '0');
    const optimizedSize = parseInt(optimizedResponse.headers.get('content-length') || '0');
    const savings = originalSize - optimizedSize;
    const savingsPercent = (savings / originalSize) * 100;
    
    return {
      originalSize,
      optimizedSize,
      savings,
      savingsPercent
    };
  } catch (error) {
    console.warn('Failed to calculate payload savings:', error);
    return {
      originalSize: 0,
      optimizedSize: 0,
      savings: 0,
      savingsPercent: 0
    };
  }
}

/**
 * Image format detection
 */
export function detectImageFormat(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  const formatMap: Record<string, string> = {
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'webp': 'webp',
    'gif': 'gif',
    'svg': 'svg+xml'
  };
  
  return formatMap[extension || ''] || 'jpeg';
}

/**
 * Progressive image loading strategies
 */
export const LOADING_STRATEGIES = {
  CRITICAL: {
    loading: 'eager' as const,
    fetchPriority: 'high' as const,
    preload: true
  },
  ABOVE_FOLD: {
    loading: 'eager' as const,
    fetchPriority: 'auto' as const,
    preload: false
  },
  BELOW_FOLD: {
    loading: 'lazy' as const,
    fetchPriority: 'low' as const,
    preload: false
  }
} as const;

/**
 * Image dimension utilities
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}/${height / divisor}`;
}

export function calculateResponsiveDimensions(
  originalWidth: number,
  originalHeight: number,
  containerWidth: number
): { width: number; height: number } {
  const aspectRatio = originalHeight / originalWidth;
  return {
    width: containerWidth,
    height: Math.round(containerWidth * aspectRatio)
  };
}