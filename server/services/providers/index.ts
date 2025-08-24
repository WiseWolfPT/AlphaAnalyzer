/**
 * PHASE 2: Export only FMP and Alpha Vantage providers
 */

// Export types and classes separately to avoid ES module issues
export type { StockQuote, MarketStatus, ChartData } from './provider-manager';
export { BaseProvider, ProviderManager } from './provider-manager';
// PHASE 2: Removed providers - keeping only FMP and Alpha Vantage
// export { PolygonProvider } from './polygon';
export { AlphaVantageProvider } from './alpha-vantage';
// export { FinnhubProvider } from './finnhub';
// export { TwelveDataProvider } from './twelve-data';
export { FMPProvider } from './fmp';
// export { FiscalAIProvider } from './fiscal-ai';