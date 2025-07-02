/**
 * CompanyLogo Component for Alfalyzer
 * Displays company logos with intelligent fallback strategies
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { getCompanyLogo, getCompanyLogos, getCompanyColor, getCompanyName, getCachedLogo, cacheLogo } from '../../data/company-logos';

export interface CompanyLogoProps {
  symbol: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
  rounded?: boolean;
  fallbackToText?: boolean;
  onError?: (symbol: string) => void;
  priority?: 'speed' | 'quality';
}

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64
};

export function CompanyLogo({
  symbol,
  size = 'md',
  className,
  showName = false,
  rounded = true,
  fallbackToText = true,
  onError,
  priority = 'speed'
}: CompanyLogoProps) {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const triedUrls = useRef<Set<string>>(new Set());
  const logoProviders = useRef<string[]>([]);

  const actualSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const displaySymbol = symbol.toUpperCase();
  const companyName = getCompanyName(symbol);
  const companyColor = getCompanyColor(symbol);

  // Initialize logo providers
  useEffect(() => {
    logoProviders.current = getCompanyLogos(symbol);
    triedUrls.current.clear();
    
    // Check cache first
    const cached = getCachedLogo(symbol);
    if (cached?.verified) {
      setCurrentLogoUrl(cached.url);
      setIsLoading(false);
      setLogoError(false);
      return;
    }

    // Start with first provider
    tryNextLogo();
  }, [symbol]);

  const tryNextLogo = () => {
    const availableUrls = logoProviders.current.filter(url => !triedUrls.current.has(url));
    
    if (availableUrls.length === 0) {
      // All providers failed, show fallback
      setLogoError(true);
      setIsLoading(false);
      onError?.(symbol);
      return;
    }

    const nextUrl = availableUrls[0];
    triedUrls.current.add(nextUrl);
    setCurrentLogoUrl(nextUrl);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setLogoError(false);
    
    // Cache successful URL
    if (currentLogoUrl) {
      cacheLogo(symbol, currentLogoUrl, true);
    }
  };

  const handleImageError = () => {
    console.warn(`Logo failed for ${symbol}: ${currentLogoUrl}`);
    tryNextLogo();
  };

  const renderFallback = () => {
    if (!fallbackToText) {
      return (
        <div
          className={cn(
            "flex items-center justify-center bg-gray-200 text-gray-600",
            rounded ? "rounded-full" : "rounded",
            className
          )}
          style={{ 
            width: actualSize, 
            height: actualSize,
            fontSize: Math.max(8, actualSize * 0.3)
          }}
        >
          ?
        </div>
      );
    }

    const initials = displaySymbol.length >= 2 ? displaySymbol.slice(0, 2) : displaySymbol;
    
    return (
      <div
        className={cn(
          "flex items-center justify-center text-white font-semibold shadow-sm",
          rounded ? "rounded-full" : "rounded",
          className
        )}
        style={{ 
          width: actualSize, 
          height: actualSize,
          backgroundColor: companyColor,
          fontSize: Math.max(8, actualSize * 0.3)
        }}
        title={companyName}
      >
        {initials}
      </div>
    );
  };

  const renderLogo = () => {
    if (logoError || !currentLogoUrl) {
      return renderFallback();
    }

    return (
      <div className="relative">
        <img
          src={currentLogoUrl}
          alt={`${companyName} logo`}
          className={cn(
            "object-contain bg-white",
            rounded ? "rounded-full" : "rounded",
            isLoading ? "opacity-0" : "opacity-100",
            "transition-opacity duration-200",
            className
          )}
          style={{ width: actualSize, height: actualSize }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority === 'speed' ? 'lazy' : 'eager'}
        />
        
        {isLoading && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse",
              rounded ? "rounded-full" : "rounded"
            )}
          >
            <div
              className="bg-gray-300 rounded"
              style={{ 
                width: actualSize * 0.6, 
                height: actualSize * 0.6 
              }}
            />
          </div>
        )}
      </div>
    );
  };

  if (showName) {
    return (
      <div className="flex items-center gap-3">
        {renderLogo()}
        <div className="flex flex-col">
          <span className="font-medium text-sm">{displaySymbol}</span>
          <span className="text-xs text-gray-500 truncate max-w-[120px]">
            {companyName}
          </span>
        </div>
      </div>
    );
  }

  return renderLogo();
}

/**
 * Optimized version for lists - minimal re-renders
 */
export const CompanyLogoMemo = React.memo(CompanyLogo, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.size === nextProps.size &&
    prevProps.className === nextProps.className &&
    prevProps.showName === nextProps.showName &&
    prevProps.rounded === nextProps.rounded
  );
});

/**
 * Batch logo preloader for performance
 */
export function preloadLogos(symbols: string[]): void {
  symbols.forEach(symbol => {
    const logoUrls = getCompanyLogos(symbol);
    logoUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  });
}

/**
 * Logo grid component for showcasing multiple companies
 */
export interface LogoGridProps {
  symbols: string[];
  size?: CompanyLogoProps['size'];
  maxItems?: number;
  className?: string;
}

export function LogoGrid({ symbols, size = 'md', maxItems = 12, className }: LogoGridProps) {
  const displaySymbols = symbols.slice(0, maxItems);
  const remainingCount = Math.max(0, symbols.length - maxItems);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displaySymbols.map(symbol => (
        <CompanyLogoMemo
          key={symbol}
          symbol={symbol}
          size={size}
          rounded={true}
          fallbackToText={true}
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center bg-gray-100 text-gray-600 rounded-full text-xs font-medium",
          )}
          style={{ 
            width: typeof size === 'number' ? size : SIZE_MAP[size], 
            height: typeof size === 'number' ? size : SIZE_MAP[size]
          }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default CompanyLogo;