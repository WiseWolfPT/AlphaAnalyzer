import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Lista de idiomas suportados
export const supportedLanguages = {
  pt: { name: 'Português', flag: '🇧🇷' },
  en: { name: 'English', flag: '🇺🇸' }
};

i18n
  // Carrega traduções usando http backend
  .use(HttpApi)
  // Detecta idioma do usuário
  .use(LanguageDetector)
  // Passa i18n para react-i18next
  .use(initReactI18next)
  // Inicializa i18next
  .init({
    fallbackLng: 'pt',
    debug: process.env.NODE_ENV === 'development',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React já faz escape de XSS
    },

    backend: {
      loadPath: '/locales/{{lng}}/translation.json',
    },

    react: {
      useSuspense: true,
    },
  });

// Função para formatar números conforme o locale
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
  const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
  return new Intl.NumberFormat(locale, options).format(value);
};

// Função para formatar moeda
export const formatCurrency = (value: number, currency?: string) => {
  const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
  const curr = currency || (i18n.language === 'pt' ? 'BRL' : 'USD');
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Função para formatar percentuais
export const formatPercent = (value: number, decimals = 2) => {
  const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

// Função para formatar datas
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
  const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
};

// Função para formatar data e hora
export const formatDateTime = (date: Date | string) => {
  const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

// Função para formatar números grandes (K, M, B)
export const formatLargeNumber = (value: number) => {
  const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
  
  if (value >= 1e9) {
    return formatNumber(value / 1e9, { maximumFractionDigits: 2 }) + (i18n.language === 'pt' ? ' bi' : 'B');
  } else if (value >= 1e6) {
    return formatNumber(value / 1e6, { maximumFractionDigits: 2 }) + (i18n.language === 'pt' ? ' mi' : 'M');
  } else if (value >= 1e3) {
    return formatNumber(value / 1e3, { maximumFractionDigits: 2 }) + (i18n.language === 'pt' ? ' mil' : 'K');
  }
  
  return formatNumber(value);
};

export default i18n;