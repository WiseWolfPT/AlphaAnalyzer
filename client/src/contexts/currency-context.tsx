import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { exchangeRateService } from '@/services/exchange-rate-service';

type Currency = 'USD' | 'EUR';

interface CurrencyContextType {
  currentCurrency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (value: number, currencyCode?: Currency, locale?: string) => string;
  convertCurrency: (value: number, fromCurrency: Currency, toCurrency: Currency) => Promise<number>;
  getExchangeRate: (fromCurrency: Currency, toCurrency: Currency) => Promise<number | null>;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider = ({ children }: CurrencyProviderProps) => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(() => {
    // Initialize from localStorage or based on region
    const storedCurrency = localStorage.getItem('alfalyzer-currency') as Currency;
    if (storedCurrency) return storedCurrency;

    const region = localStorage.getItem('aa-region');
    return region === 'EU' ? 'EUR' : 'USD'; // Default based on region or USD
  });

  const [isLoading, setIsLoading] = useState(false);
  const exchangeService = exchangeRateService;

  useEffect(() => {
    localStorage.setItem('alfalyzer-currency', currentCurrency);
  }, [currentCurrency]);

  const setCurrency = useCallback((currency: Currency) => {
    setCurrentCurrency(currency);
  }, []);

  const getLocaleForCurrency = useCallback((currencyCode: Currency): string => {
    // Determine locale based on currency for number formatting
    switch (currencyCode) {
      case 'USD':
        return 'en-US';
      case 'EUR':
        return 'pt-PT'; // Using pt-PT for European formatting conventions
      default:
        return i18n.language; // Fallback to current i18n language
    }
  }, [i18n.language]);

  const formatCurrency = useCallback((value: number, currencyCode?: Currency, locale?: string): string => {
    const targetCurrency = currencyCode || currentCurrency;
    const targetLocale = locale || getLocaleForCurrency(targetCurrency);

    return new Intl.NumberFormat(targetLocale, {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [currentCurrency, getLocaleForCurrency]);

  // Dynamic currency conversion using live exchange rates
  const convertCurrency = useCallback(async (value: number, fromCurrency: Currency, toCurrency: Currency): Promise<number> => {
    if (fromCurrency === toCurrency) {
      return value;
    }

    try {
      setIsLoading(true);
      const convertedValue = await exchangeService.convertCurrency(value, fromCurrency, toCurrency);
      return convertedValue;
    } catch (error) {
      console.error('Currency conversion failed, using fallback:', error);
      
      // Fallback to static rates if API fails
      const fallbackRates: Record<Currency, Record<Currency, number>> = {
        'USD': { 'EUR': 0.92 },
        'EUR': { 'USD': 1.08 },
      };

      const rate = fallbackRates[fromCurrency]?.[toCurrency];
      return rate ? value * rate : value;
    } finally {
      setIsLoading(false);
    }
  }, [exchangeRateService]);

  // Get exchange rate between currencies
  const getExchangeRate = useCallback(async (fromCurrency: Currency, toCurrency: Currency): Promise<number | null> => {
    try {
      setIsLoading(true);
      return await exchangeService.getExchangeRate(fromCurrency, toCurrency);
    } catch (error) {
      console.error('Failed to get exchange rate:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [exchangeService]);

  // Warm the cache on startup
  useEffect(() => {
    exchangeService.warmCache().catch(error => {
      console.debug('Exchange rate cache warming failed:', error);
    });
  }, [exchangeService]);

  return (
    <CurrencyContext.Provider value={{ 
      currentCurrency, 
      setCurrency, 
      formatCurrency, 
      convertCurrency, 
      getExchangeRate,
      isLoading 
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};