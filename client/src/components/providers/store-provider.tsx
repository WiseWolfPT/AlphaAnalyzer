import { useEffect, ReactNode } from 'react';
import { useStoreInitializer } from '@/stores';

interface StoreProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes all Zustand stores
 * and handles cross-store effects
 */
export function StoreProvider({ children }: StoreProviderProps) {
  // Initialize stores
  useStoreInitializer();

  // Performance monitoring for store updates
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Monitor store performance in development
      const monitorStores = () => {
        const startTime = performance.now();
        
        // Log slow store updates
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 16) { // 60fps threshold
              console.warn(
                `Store operation took ${entry.duration}ms:`,
                entry.name
              );
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure'] });
        
        return () => observer.disconnect();
      };

      const cleanup = monitorStores();
      return cleanup;
    }
  }, []);

  return <>{children}</>;
}

// HOC for components that need store access
export function withStores<P extends object>(Component: React.ComponentType<P>) {
  return function WithStoresComponent(props: P) {
    return (
      <StoreProvider>
        <Component {...props} />
      </StoreProvider>
    );
  };
}