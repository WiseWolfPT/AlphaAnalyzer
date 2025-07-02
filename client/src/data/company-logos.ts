/**
 * Company Logos Data System for Alfalyzer
 * Provides logo URLs and fallback strategies for stock symbols
 */

export interface LogoData {
  symbol: string;
  name: string;
  logoUrl?: string;
  fallbackColor?: string;
  verified?: boolean;
}

/**
 * Logo URL providers in order of preference
 */
const LOGO_PROVIDERS = {
  CLEARBIT: (symbol: string) => `https://logo.clearbit.com/${getCompanyDomain(symbol)}`,
  FINNHUB: (symbol: string) => `https://finnhub.io/api/logo?symbol=${symbol}`,
  YAHOO: (symbol: string) => `https://logo.yahoo.com/symbol/${symbol}`,
  GOOGLE: (symbol: string) => `https://logo.google.com/finance?q=${symbol}`,
  BRANDWATCH: (symbol: string) => `https://api.brandwatch.com/logo/${symbol}.png`,
  FALLBACK: (symbol: string) => `https://via.placeholder.com/64x64/6366f1/ffffff?text=${symbol.slice(0, 2)}`
};

/**
 * Company domain mapping for Clearbit API
 */
const COMPANY_DOMAINS: Record<string, string> = {
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  'GOOG': 'google.com',
  'AMZN': 'amazon.com',
  'TSLA': 'tesla.com',
  'META': 'meta.com',
  'NVDA': 'nvidia.com',
  'JPM': 'jpmorganchase.com',
  'JNJ': 'jnj.com',
  'V': 'visa.com',
  'WMT': 'walmart.com',
  'PG': 'pg.com',
  'UNH': 'unitedhealthgroup.com',
  'HD': 'homedepot.com',
  'MA': 'mastercard.com',
  'DIS': 'disney.com',
  'PYPL': 'paypal.com',
  'BAC': 'bankofamerica.com',
  'NFLX': 'netflix.com',
  'CRM': 'salesforce.com',
  'ADBE': 'adobe.com',
  'CMCSA': 'comcast.com',
  'VZ': 'verizon.com',
  'KO': 'coca-cola.com',
  'PEP': 'pepsico.com',
  'T': 'att.com',
  'INTC': 'intel.com',
  'IBM': 'ibm.com',
  'ORCL': 'oracle.com',
  'QCOM': 'qualcomm.com',
  'NKE': 'nike.com',
  'MRK': 'merck.com',
  'XOM': 'exxonmobil.com',
  'CVX': 'chevron.com',
  'PFE': 'pfizer.com',
  'ABBV': 'abbvie.com',
  'TMO': 'thermofisher.com',
  'COST': 'costco.com',
  'AVGO': 'broadcom.com',
  'ABT': 'abbott.com',
  'LLY': 'lilly.com',
  'ACN': 'accenture.com',
  'MCD': 'mcdonalds.com',
  'NEE': 'nexteraenergy.com',
  'WFC': 'wellsfargo.com',
  'DHR': 'danaher.com',
  'TXN': 'ti.com',
  'LIN': 'linde.com',
  'RTX': 'rtx.com',
  'PM': 'pmi.com',
  'LOW': 'lowes.com',
  'SBUX': 'starbucks.com',
  'UNP': 'up.com',
  'HON': 'honeywell.com',
  'AMGN': 'amgen.com',
  'BA': 'boeing.com',
  'BLK': 'blackrock.com',
  'CAT': 'caterpillar.com',
  'COP': 'conocophillips.com',
  'ELV': 'elevancehealth.com',
  'GILD': 'gilead.com',
  'GS': 'goldmansachs.com',
  'DE': 'deere.com',
  'ISRG': 'intuitive.com',
  'BKNG': 'booking.com',
  'SYK': 'stryker.com',
  'AXP': 'americanexpress.com',
  'TJX': 'tjx.com',
  'MDT': 'medtronic.com',
  'VRTX': 'vrtx.com',
  'C': 'citigroup.com',
  'MMM': '3m.com',
  'SCHW': 'schwab.com',
  'PLD': 'prologis.com',
  'MDLZ': 'mondelezinternational.com',
  'CB': 'chubb.com',
  'TMUS': 't-mobile.com',
  'SO': 'southernco.com',
  'FI': 'fiserv.com',
  'MO': 'altria.com',
  'SHW': 'sherwin-williams.com',
  'CVS': 'cvshealth.com',
  'ICE': 'ice.com',
  'DUK': 'duke-energy.com',
  'PGR': 'progressive.com'
};

/**
 * Brand colors for companies (used for fallback logos)
 */
const COMPANY_COLORS: Record<string, string> = {
  'AAPL': '#000000',
  'MSFT': '#00A4EF',
  'GOOGL': '#4285F4',
  'GOOG': '#4285F4',
  'AMZN': '#FF9900',
  'TSLA': '#CC0000',
  'META': '#1877F2',
  'NVDA': '#76B900',
  'JPM': '#0066CC',
  'JNJ': '#CC0000',
  'V': '#1A1F71',
  'WMT': '#0071CE',
  'PG': '#003DA5',
  'UNH': '#002677',
  'HD': '#F96302',
  'MA': '#FF5F00',
  'DIS': '#113CCF',
  'PYPL': '#003087',
  'BAC': '#E31837',
  'NFLX': '#E50914',
  'CRM': '#00A1E0',
  'ADBE': '#FF0000',
  'CMCSA': '#000000',
  'VZ': '#ED1C24',
  'KO': '#F40009',
  'PEP': '#004B93',
  'T': '#00A8E0',
  'INTC': '#0071C5',
  'IBM': '#054ADA',
  'ORCL': '#F80000',
  'QCOM': '#3253DC',
  'NKE': '#000000',
  'MRK': '#0099CC',
  'XOM': '#FF1900',
  'CVX': '#1F5582',
  'PFE': '#0093D0',
  'ABBV': '#071D49'
};

/**
 * Get company domain for Clearbit API
 */
function getCompanyDomain(symbol: string): string {
  return COMPANY_DOMAINS[symbol.toUpperCase()] || `${symbol.toLowerCase()}.com`;
}

/**
 * Get company brand color
 */
export function getCompanyColor(symbol: string): string {
  return COMPANY_COLORS[symbol.toUpperCase()] || '#6366F1';
}

/**
 * Generate logo URL with fallback strategy
 */
export function getCompanyLogo(symbol: string, provider: keyof typeof LOGO_PROVIDERS = 'CLEARBIT'): string {
  const upperSymbol = symbol.toUpperCase();
  
  try {
    return LOGO_PROVIDERS[provider](upperSymbol);
  } catch (error) {
    console.warn(`Logo provider ${provider} failed for ${symbol}:`, error);
    return LOGO_PROVIDERS.FALLBACK(upperSymbol);
  }
}

/**
 * Get multiple logo URLs from different providers
 */
export function getCompanyLogos(symbol: string): string[] {
  const upperSymbol = symbol.toUpperCase();
  
  return [
    LOGO_PROVIDERS.CLEARBIT(upperSymbol),
    LOGO_PROVIDERS.FINNHUB(upperSymbol),
    LOGO_PROVIDERS.YAHOO(upperSymbol),
    LOGO_PROVIDERS.FALLBACK(upperSymbol)
  ];
}

/**
 * Logo cache for performance
 */
const logoCache = new Map<string, { url: string; timestamp: number; verified: boolean }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached logo or fetch new one
 */
export function getCachedLogo(symbol: string): { url: string; verified: boolean } | null {
  const cached = logoCache.get(symbol.toUpperCase());
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { url: cached.url, verified: cached.verified };
  }
  
  return null;
}

/**
 * Cache logo URL
 */
export function cacheLogo(symbol: string, url: string, verified: boolean = false): void {
  logoCache.set(symbol.toUpperCase(), {
    url,
    timestamp: Date.now(),
    verified
  });
}

/**
 * Verify if logo URL is accessible
 */
export async function verifyLogoUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get best available logo with verification
 */
export async function getBestLogo(symbol: string): Promise<string> {
  // Check cache first
  const cached = getCachedLogo(symbol);
  if (cached?.verified) {
    return cached.url;
  }
  
  // Try providers in order
  const providers: (keyof typeof LOGO_PROVIDERS)[] = ['CLEARBIT', 'FINNHUB', 'YAHOO'];
  
  for (const provider of providers) {
    const url = getCompanyLogo(symbol, provider);
    const isValid = await verifyLogoUrl(url);
    
    if (isValid) {
      cacheLogo(symbol, url, true);
      return url;
    }
  }
  
  // Fallback to placeholder
  const fallbackUrl = LOGO_PROVIDERS.FALLBACK(symbol);
  cacheLogo(symbol, fallbackUrl, false);
  return fallbackUrl;
}

/**
 * Company name mapping for better display
 */
export const COMPANY_NAMES: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'GOOG': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms Inc.',
  'NVDA': 'NVIDIA Corporation',
  'JPM': 'JPMorgan Chase & Co.',
  'JNJ': 'Johnson & Johnson',
  'V': 'Visa Inc.',
  'WMT': 'Walmart Inc.',
  'PG': 'Procter & Gamble Co.',
  'UNH': 'UnitedHealth Group Inc.',
  'HD': 'Home Depot Inc.',
  'MA': 'Mastercard Inc.',
  'DIS': 'Walt Disney Co.',
  'PYPL': 'PayPal Holdings Inc.',
  'BAC': 'Bank of America Corp.',
  'NFLX': 'Netflix Inc.',
  'CRM': 'Salesforce Inc.',
  'ADBE': 'Adobe Inc.',
  'CMCSA': 'Comcast Corporation',
  'VZ': 'Verizon Communications Inc.',
  'KO': 'Coca-Cola Co.',
  'PEP': 'PepsiCo Inc.',
  'T': 'AT&T Inc.',
  'INTC': 'Intel Corporation',
  'IBM': 'International Business Machines Corp.',
  'ORCL': 'Oracle Corporation',
  'QCOM': 'Qualcomm Inc.',
  'NKE': 'Nike Inc.',
  'MRK': 'Merck & Co. Inc.',
  'XOM': 'Exxon Mobil Corporation',
  'CVX': 'Chevron Corporation',
  'PFE': 'Pfizer Inc.',
  'ABBV': 'AbbVie Inc.'
};

/**
 * Get company display name
 */
export function getCompanyName(symbol: string): string {
  return COMPANY_NAMES[symbol.toUpperCase()] || symbol.toUpperCase();
}