import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types for app state
export type Theme = 'light' | 'dark' | 'system';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';
export type Language = 'en' | 'pt' | 'es' | 'fr';

export interface AppSettings {
  theme: Theme;
  currency: Currency;
  language: Language;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  autoRefresh: boolean;
  refreshInterval: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  compactMode: boolean;
  showPreMarket: boolean;
  showAfterHours: boolean;
  defaultChartPeriod: '1D' | '1W' | '1M' | '3M' | '1Y';
  defaultChartType: 'line' | 'candlestick' | 'area';
}

// Enhanced currency management types
export interface ExchangeRates {
  [key: string]: number;
}

export interface CurrencyState {
  exchangeRates: ExchangeRates;
  lastExchangeRateUpdate: string | null;
  isLoadingRates: boolean;
  exchangeRateError: string | null;
}

export interface AppState {
  // Settings
  settings: AppSettings;
  
  // Currency management
  currency: CurrencyState;
  
  // UI State
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentPage: string;
  
  // Layout state
  dashboardLayout: 'grid' | 'list';
  watchlistLayout: 'cards' | 'table';
  portfolioLayout: 'detailed' | 'compact';
  
  // Loading states
  isInitializing: boolean;
  isOnline: boolean;
  
  // Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  setCurrentPage: (page: string) => void;
  setDashboardLayout: (layout: 'grid' | 'list') => void;
  setWatchlistLayout: (layout: 'cards' | 'table') => void;
  setPortfolioLayout: (layout: 'detailed' | 'compact') => void;
  setIsInitializing: (isInitializing: boolean) => void;
  setIsOnline: (isOnline: boolean) => void;
  resetSettings: () => void;
  
  // Currency actions
  setCurrency: (currency: Currency) => void;
  updateExchangeRates: (rates: ExchangeRates) => void;
  setExchangeRateError: (error: string | null) => void;
  setIsLoadingRates: (isLoading: boolean) => void;
  convertCurrency: (value: number, fromCurrency: Currency, toCurrency: Currency) => number;
  formatCurrency: (value: number, currency?: Currency, locale?: string) => string;
  refreshExchangeRates: () => Promise<void>;
}

// Default settings
const defaultSettings: AppSettings = {
  theme: 'system',
  currency: 'USD',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'en-US',
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  soundEnabled: true,
  notificationsEnabled: true,
  compactMode: false,
  showPreMarket: true,
  showAfterHours: true,
  defaultChartPeriod: '1D',
  defaultChartType: 'line',
};

// Default currency state
const defaultCurrencyState: CurrencyState = {
  exchangeRates: { USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110 }, // Initial rates
  lastExchangeRateUpdate: null,
  isLoadingRates: false,
  exchangeRateError: null,
};

// Helper function for currency symbols
const getCurrencySymbol = (currency: Currency): string => {
  const symbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  };
  return symbols[currency] || '$';
};

// Create the store with persistence
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        settings: defaultSettings,
        currency: defaultCurrencyState,
        sidebarOpen: true,
        sidebarCollapsed: false,
        currentPage: 'dashboard',
        dashboardLayout: 'grid',
        watchlistLayout: 'cards',
        portfolioLayout: 'detailed',
        isInitializing: true,
        isOnline: navigator.onLine,

        // Actions
        updateSettings: (newSettings) => {
          set((state) => {
            Object.assign(state.settings, newSettings);
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },

        collapseSidebar: () => {
          set((state) => {
            state.sidebarCollapsed = true;
          });
        },

        expandSidebar: () => {
          set((state) => {
            state.sidebarCollapsed = false;
          });
        },

        setCurrentPage: (page) => {
          set((state) => {
            state.currentPage = page;
          });
        },

        setDashboardLayout: (layout) => {
          set((state) => {
            state.dashboardLayout = layout;
          });
        },

        setWatchlistLayout: (layout) => {
          set((state) => {
            state.watchlistLayout = layout;
          });
        },

        setPortfolioLayout: (layout) => {
          set((state) => {
            state.portfolioLayout = layout;
          });
        },

        setIsInitializing: (isInitializing) => {
          set((state) => {
            state.isInitializing = isInitializing;
          });
        },

        setIsOnline: (isOnline) => {
          set((state) => {
            state.isOnline = isOnline;
          });
        },

        resetSettings: () => {
          set((state) => {
            state.settings = { ...defaultSettings };
          });
        },

        // Currency actions
        setCurrency: (currency) => {
          set((state) => {
            state.settings.currency = currency;
          });
        },

        updateExchangeRates: (rates) => {
          set((state) => {
            state.currency.exchangeRates = rates;
            state.currency.lastExchangeRateUpdate = new Date().toISOString();
            state.currency.exchangeRateError = null;
          });
        },

        setExchangeRateError: (error) => {
          set((state) => {
            state.currency.exchangeRateError = error;
          });
        },

        setIsLoadingRates: (isLoading) => {
          set((state) => {
            state.currency.isLoadingRates = isLoading;
          });
        },

        convertCurrency: (value, fromCurrency, toCurrency) => {
          const { exchangeRates } = get().currency;
          
          if (fromCurrency === toCurrency) return value;
          
          const fromRate = exchangeRates[fromCurrency];
          const toRate = exchangeRates[toCurrency];
          
          if (!fromRate || !toRate) {
            console.warn(`Exchange rate not found for ${fromCurrency} → ${toCurrency}`);
            return value;
          }
          
          // Convert to USD first, then to target currency
          const usdValue = value / fromRate;
          const convertedValue = usdValue * toRate;
          
          return convertedValue;
        },

        formatCurrency: (value, currency, locale) => {
          const currentCurrency = currency || get().settings.currency;
          const currentLocale = locale || get().settings.numberFormat;
          
          try {
            return new Intl.NumberFormat(currentLocale, {
              style: 'currency',
              currency: currentCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value);
          } catch (error) {
            // Fallback formatting
            const symbol = getCurrencySymbol(currentCurrency);
            return `${symbol}${value.toFixed(2)}`;
          }
        },

        refreshExchangeRates: async () => {
          const { setIsLoadingRates, setExchangeRateError, updateExchangeRates } = get();
          
          setIsLoadingRates(true);
          setExchangeRateError(null);
          
          try {
            // Use the exchange rate service
            const { exchangeRateService } = await import('@/services/exchange-rate-service');
            const response = await exchangeRateService.fetchRates();
            updateExchangeRates(response.rates);
          } catch (error) {
            console.error('Failed to refresh exchange rates:', error);
            setExchangeRateError(error instanceof Error ? error.message : 'Failed to fetch exchange rates');
          } finally {
            setIsLoadingRates(false);
          }
        },
      })),
      {
        name: 'alfalyzer-app-store',
        partialize: (state) => ({
          settings: state.settings,
          currency: {
            exchangeRates: state.currency.exchangeRates,
            lastExchangeRateUpdate: state.currency.lastExchangeRateUpdate,
          },
          sidebarCollapsed: state.sidebarCollapsed,
          dashboardLayout: state.dashboardLayout,
          watchlistLayout: state.watchlistLayout,
          portfolioLayout: state.portfolioLayout,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
);

// Selectors for commonly used state slices
export const useAppSettings = () => useAppStore((state) => state.settings);
export const useTheme = () => useAppStore((state) => state.settings.theme);
export const useCurrency = () => useAppStore((state) => state.settings.currency);
export const useLanguage = () => useAppStore((state) => state.settings.language);
export const useSidebarState = () => useAppStore((state) => ({
  isOpen: state.sidebarOpen,
  isCollapsed: state.sidebarCollapsed,
  toggle: state.toggleSidebar,
  collapse: state.collapseSidebar,
  expand: state.expandSidebar,
}));
export const useLayoutSettings = () => useAppStore((state) => ({
  dashboardLayout: state.dashboardLayout,
  watchlistLayout: state.watchlistLayout,
  portfolioLayout: state.portfolioLayout,
  setDashboardLayout: state.setDashboardLayout,
  setWatchlistLayout: state.setWatchlistLayout,
  setPortfolioLayout: state.setPortfolioLayout,
}));

// Currency selectors
export const useCurrencyState = () => useAppStore((state) => state.currency);
export const useCurrencyActions = () => useAppStore((state) => ({
  setCurrency: state.setCurrency,
  updateExchangeRates: state.updateExchangeRates,
  convertCurrency: state.convertCurrency,
  formatCurrency: state.formatCurrency,
  refreshExchangeRates: state.refreshExchangeRates,
}));

// Computed values
export const useFormattedCurrency = () => {
  const formatCurrency = useAppStore((state) => state.formatCurrency);
  return formatCurrency;
};

export const useFormattedNumber = () => {
  const { numberFormat } = useAppSettings();
  
  return (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(numberFormat, options).format(value);
  };
};

export const useFormattedDate = () => {
  const { dateFormat, timezone } = useAppSettings();
  
  return (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  };
};

// Initialize online status listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setIsOnline(true);
  });
  
  window.addEventListener('offline', () => {
    useAppStore.getState().setIsOnline(false);
  });
}