/**
 * Polygon API Fix
 * 
 * The Polygon free tier returns 403 for certain endpoints.
 * This file documents the issue and provides fallback options.
 */

export const POLYGON_FREE_TIER_LIMITATIONS = {
  issue: "403 Forbidden - You are not entitled to this data. Please upgrade your plan",
  
  affectedEndpoints: [
    '/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}',
    '/v3/reference/tickers/{ticker}',
    '/v2/reference/financials/{ticker}'
  ],
  
  solution: {
    option1: "Upgrade to paid Polygon plan ($29/month minimum)",
    option2: "Use fallback providers in this order:",
    fallbackOrder: [
      "Alpha Vantage (5 calls/minute free)",
      "Twelve Data (800 calls/day free)",
      "Finnhub (60 calls/minute free)",
      "FMP (250 calls/day free)"
    ]
  },
  
  implementation: `
    // In unified-api.service.ts, modify getStockData:
    
    try {
      return await this.polygonProvider.getStockData(symbol);
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('not entitled')) {
        console.warn('Polygon free tier limit hit, falling back to Alpha Vantage');
        return await this.alphaVantageProvider.getStockData(symbol);
      }
      throw error;
    }
  `
};

export const isPolygonFreeError = (error: any): boolean => {
  return error?.response?.status === 403 && 
         (error?.response?.data?.includes('not entitled') || 
          error?.response?.data?.includes('upgrade your plan'));
};