/**
 * Google Analytics 4 Integration for Alfalyzer
 * Tracking de eventos de conversão e engagement
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Configuração do GA4
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const isDevelopment = import.meta.env.NODE_ENV === 'development';

// Tipos de eventos
export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface ConversionEvent {
  event_name: string;
  currency?: string;
  value?: number;
  transaction_id?: string;
  custom_parameters?: Record<string, any>;
}

// Inicializar Google Analytics
export function initializeAnalytics() {
  if (isDevelopment) {
    console.log('Analytics: Modo desenvolvimento - tracking desativado');
    return;
  }

  if (typeof window === 'undefined') return;

  // Carregamento do script do GA4
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Inicialização do dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(...args: any[]) {
    window.dataLayer.push(arguments);
  };

  // Configuração inicial
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: 'Alfalyzer',
    page_location: window.location.href,
    send_page_view: true
  });

  console.log('Analytics: GA4 inicializado com sucesso');
}

// Tracking de páginas
export function trackPageView(page_title: string, page_location?: string) {
  if (isDevelopment) {
    console.log('Analytics: Page view -', page_title);
    return;
  }

  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title,
    page_location: page_location || window.location.href
  });
}

// Tracking de eventos gerais
export function trackEvent({ action, category, label, value, custom_parameters }: AnalyticsEvent) {
  if (isDevelopment) {
    console.log('Analytics: Event -', { action, category, label, value, custom_parameters });
    return;
  }

  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...custom_parameters
  });
}

// Tracking de conversões
export function trackConversion({ event_name, currency = 'EUR', value, transaction_id, custom_parameters }: ConversionEvent) {
  if (isDevelopment) {
    console.log('Analytics: Conversion -', { event_name, currency, value, transaction_id, custom_parameters });
    return;
  }

  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', event_name, {
    currency,
    value,
    transaction_id,
    ...custom_parameters
  });
}

// Eventos específicos do Alfalyzer
export const AlfalyzerEvents = {
  // Autenticação
  signUp: (method: 'email' | 'google' = 'email') => {
    trackConversion({
      event_name: 'sign_up',
      custom_parameters: { method }
    });
  },

  login: (method: 'email' | 'google' = 'email') => {
    trackEvent({
      action: 'login',
      category: 'engagement',
      label: method
    });
  },

  // Trial e conversões
  startTrial: () => {
    trackConversion({
      event_name: 'begin_checkout',
      value: 0,
      custom_parameters: {
        content_type: 'trial',
        content_id: 'trial_14_days'
      }
    });
  },

  subscriptionCreated: (plan: string, value: number) => {
    trackConversion({
      event_name: 'purchase',
      value: value,
      transaction_id: `sub_${Date.now()}`,
      custom_parameters: {
        content_type: 'subscription',
        content_id: plan
      }
    });
  },

  // Engagement com funcionalidades
  stockSearch: (symbol: string) => {
    trackEvent({
      action: 'search',
      category: 'stocks',
      label: symbol
    });
  },

  stockView: (symbol: string) => {
    trackEvent({
      action: 'view_item',
      category: 'stocks',
      label: symbol,
      custom_parameters: {
        content_type: 'stock',
        content_id: symbol
      }
    });
  },

  chartView: (symbol: string, chartType: string) => {
    trackEvent({
      action: 'view_chart',
      category: 'analysis',
      label: `${symbol}_${chartType}`
    });
  },

  watchlistAdd: (symbol: string) => {
    trackEvent({
      action: 'add_to_wishlist',
      category: 'engagement',
      label: symbol,
      custom_parameters: {
        content_type: 'stock',
        content_id: symbol
      }
    });
  },

  intrinsicValueCalculated: (symbol: string, value: number) => {
    trackEvent({
      action: 'calculate_intrinsic_value',
      category: 'analysis',
      label: symbol,
      value: Math.round(value)
    });
  },

  // Funnel de conversão
  landingPageCTA: (cta_name: string) => {
    trackEvent({
      action: 'cta_click',
      category: 'conversion',
      label: cta_name
    });
  },

  pricingPageView: () => {
    trackEvent({
      action: 'view_item_list',
      category: 'conversion',
      label: 'pricing_plans'
    });
  },

  // Engajamento
  timeOnDashboard: (seconds: number) => {
    trackEvent({
      action: 'engagement_time',
      category: 'engagement',
      value: seconds
    });
  },

  featureUsage: (feature: string) => {
    trackEvent({
      action: 'feature_usage',
      category: 'engagement',
      label: feature
    });
  }
};

// Hook para React components
export function useAnalytics() {
  const trackPageView = (title: string) => {
    AlfalyzerEvents.featureUsage(`page_${title.toLowerCase()}`);
  };

  const trackUserAction = (action: string, details?: any) => {
    trackEvent({
      action,
      category: 'user_action',
      custom_parameters: details
    });
  };

  return {
    trackPageView,
    trackUserAction,
    events: AlfalyzerEvents
  };
}

// Tracking automático de tempo na página
let pageStartTime = Date.now();

export function startPageTimer() {
  pageStartTime = Date.now();
}

export function endPageTimer(pageName: string) {
  if (isDevelopment) return;
  
  const timeSpent = Math.round((Date.now() - pageStartTime) / 1000);
  if (timeSpent > 10) { // Só trackear se passou mais de 10 segundos
    trackEvent({
      action: 'page_engagement',
      category: 'timing',
      label: pageName,
      value: timeSpent
    });
  }
}

// Middleware para router
export function trackRouteChange(path: string) {
  const pageName = path.split('/')[1] || 'home';
  endPageTimer(pageName);
  startPageTimer();
  trackPageView(pageName, window.location.href);
}