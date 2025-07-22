import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  // load translation using http -> see /public/locales
  .use(HttpBackend)
  // detect user language
  .use(LanguageDetector)
  .use(initReactI18next)
  // init i18next
  .init({
    fallbackLng: 'en', // Fallback language if translation is missing
    debug: import.meta.env.DEV, // Enable debug mode in development
    
    // Define namespaces and where to load them
    ns: ['common', 'markets', 'currencies'],
    defaultNS: 'common',

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to your translation files
    },

    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'], // Cache user language preference in localStorage
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },
  });

export default i18n;