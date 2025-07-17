/**
 * Currency Context Compatibility Layer
 * This file provides backward compatibility for components using the old currency context
 * while migrating to the new Zustand-based currency management in app-store.
 * 
 * @deprecated This compatibility layer will be removed in a future version.
 * Please migrate to using the currency functions from app-store directly.
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { 
  useAppStore, 
  useCurrencyState, 
  useCurrencyActions, 
  type Currency 
} from '@/stores/app-store';

// Legacy currency context interface for backward compatibility
interface CurrencyContextType {
  currentCurrency: Currency;
  isLoading: boolean;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number, currencyCode?: Currency, locale?: string) => string;
  convertCurrency: (value: number, fromCurrency: Currency, toCurrency: Currency) => number;
  getExchangeRate: (fromCurrency: Currency, toCurrency: Currency) => number | null;
}

// Create the compatibility context
const CurrencyCompatContext = createContext<CurrencyContextType | undefined>(undefined);

// Compatibility provider component
export function CurrencyCompatProvider({ children }: { children: ReactNode }) {
  const { currency: currencyState } = useAppStore();
  const { settings } = useAppStore();
  const { 
    setCurrency, 
    convertCurrency, 
    formatCurrency, 
    refreshExchangeRates 
  } = useCurrencyActions();

  // Auto-refresh exchange rates on mount
  useEffect(() => {
    const shouldRefresh = !currencyState.lastExchangeRateUpdate || 
      (Date.now() - new Date(currencyState.lastExchangeRateUpdate).getTime()) > 60 * 60 * 1000; // 1 hour
    
    if (shouldRefresh) {
      refreshExchangeRates().catch(console.error);
    }
  }, [currencyState.lastExchangeRateUpdate, refreshExchangeRates]);

  // Helper function to get exchange rate
  const getExchangeRate = (fromCurrency: Currency, toCurrency: Currency): number | null => {
    if (fromCurrency === toCurrency) return 1;
    
    const fromRate = currencyState.exchangeRates[fromCurrency];
    const toRate = currencyState.exchangeRates[toCurrency];
    
    if (!fromRate || !toRate) return null;
    
    // Convert via USD
    return toRate / fromRate;
  };

  // Synchronous wrapper for convertCurrency (using cached rates)
  const convertCurrencySync = (value: number, fromCurrency: Currency, toCurrency: Currency): number => {
    return convertCurrency(value, fromCurrency, toCurrency);
  };

  const contextValue: CurrencyContextType = {
    currentCurrency: settings.currency,
    isLoading: currencyState.isLoadingRates,
    setCurrency,
    formatCurrency,
    convertCurrency: convertCurrencySync,
    getExchangeRate,
  };

  return (
    <CurrencyCompatContext.Provider value={contextValue}>
      {children}
    </CurrencyCompatContext.Provider>
  );
}

// Compatibility hook for old currency context
export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyCompatContext);
  
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyCompatProvider');
  }

  // Log deprecation warning in development
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '🔄 DEPRECATED: useCurrency from currency-context is deprecated. ' +
      'Please migrate to using currency functions from app-store directly:\n' +
      'import { useCurrencyState, useCurrencyActions } from "@/stores/app-store";\n' +
      'This compatibility layer will be removed in a future version.'
    );
  }

  return context;
}

// Export the provider for easy migration
export { CurrencyCompatProvider };

// Migration helper utilities
export const currencyMigrationUtils = {
  /**
   * Check if all components in a file have migrated away from useCurrency
   */
  checkMigrationStatus: () => {
    if (process.env.NODE_ENV === 'development') {
      console.group('Currency Migration Status');
      console.log('Components still using legacy useCurrency:');
      console.log('- Check console warnings for DEPRECATED: useCurrency messages');
      console.log('Migration guide: https://docs.alfalyzer.com/migration/currency-context');
      console.groupEnd();
    }
  },

  /**
   * Example migration from old to new pattern
   */
  migrationExample: () => {
    console.log(`
    // OLD (deprecated):
    const { currentCurrency, formatCurrency, convertCurrency } = useCurrency();
    
    // NEW (recommended):
    import { useCurrencyState, useCurrencyActions } from '@/stores/app-store';
    const { exchangeRates } = useCurrencyState();
    const { formatCurrency, convertCurrency } = useCurrencyActions();
    const currentCurrency = useAppStore(state => state.settings.currency);
    `);
  }
};