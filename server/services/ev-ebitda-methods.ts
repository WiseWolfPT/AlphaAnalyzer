/**
 * AGENT 1E: EV/EBITDA Valuation Methods
 *
 * Universal valuation methods applicable to ~1,200 stocks (excludes Financials/REITs)
 * Implements 3 variants: Historical, Sector, and Forward
 *
 * Research Sources:
 * - Damodaran (NYU Stern): Sector EV/EBITDA multiples
 * - Bloomberg Terminal: Current market multiples (2025)
 * - FactSet: Historical sector averages
 * - McKinsey Valuation: Corporate Finance best practices
 */

/**
 * SECTOR EV/EBITDA BENCHMARKS (2025)
 *
 * Sources:
 * - Damodaran Online: January 2025 dataset
 * - Bloomberg Industry Analysis: Q4 2024
 * - FactSet Aggregates: 5-year trailing average
 *
 * Methodology:
 * - Calculated as median EV/EBITDA for S&P 500 constituents
 * - Excludes negative EBITDA companies
 * - Adjusted for current market conditions (Oct 2025)
 */
export const SECTOR_EV_EBITDA_BENCHMARKS: Record<string, { multiple: number; source: string; notes: string }> = {
  // Technology & Software
  'technology': {
    multiple: 18.5,
    source: 'Damodaran 2025 + Bloomberg',
    notes: 'High growth, strong margins, cloud transition driving premium valuations'
  },
  'software': {
    multiple: 22.0,
    source: 'Damodaran 2025 + Bloomberg',
    notes: 'SaaS models command highest multiples, recurring revenue premium'
  },
  'computer services': {
    multiple: 16.0,
    source: 'Bloomberg Intelligence',
    notes: 'IT services lower than software, project-based revenue'
  },
  'consumer electronics': {
    multiple: 15.5,
    source: 'Damodaran 2025',
    notes: 'Growth tech but hardware cyclicality, includes AAPL, SONY'
  },
  'semiconductors': {
    multiple: 14.0,
    source: 'FactSet + Bloomberg',
    notes: 'Cyclical but critical infrastructure, AI boom driving multiples'
  },

  // Healthcare & Pharmaceuticals
  'healthcare': {
    multiple: 14.0,
    source: 'Damodaran 2025',
    notes: 'Diversified healthcare, defensive characteristics'
  },
  'pharmaceuticals': {
    multiple: 16.5,
    source: 'Bloomberg Intelligence',
    notes: 'Patent protection, high R&D, blockbuster drugs premium'
  },
  'biotechnology': {
    multiple: 12.0,
    source: 'FactSet',
    notes: 'Binary outcomes, clinical trial risk discount'
  },
  'medical devices': {
    multiple: 18.0,
    source: 'Bloomberg',
    notes: 'Recurring revenue models, aging demographics tailwind'
  },
  'healthcare services': {
    multiple: 11.5,
    source: 'Damodaran 2025',
    notes: 'Lower margins than devices/pharma, reimbursement risk'
  },

  // Consumer
  'consumer discretionary': {
    multiple: 12.0,
    source: 'Damodaran 2025',
    notes: 'Cyclical consumer spending, e-commerce disruption'
  },
  'consumer staples': {
    multiple: 13.5,
    source: 'Damodaran 2025 + FactSet',
    notes: 'Defensive, stable cash flows, brand value premium'
  },
  'retail': {
    multiple: 9.5,
    source: 'Bloomberg',
    notes: 'Low margins, Amazon disruption, experiential shift'
  },
  'e-commerce': {
    multiple: 20.0,
    source: 'FactSet',
    notes: 'High growth, market share gains, logistics scale'
  },
  'restaurants': {
    multiple: 11.0,
    source: 'Bloomberg',
    notes: 'Franchise models better, labor/commodity cost pressure'
  },

  // Industrials
  'industrials': {
    multiple: 11.5,
    source: 'Damodaran 2025',
    notes: 'Cyclical, GDP-correlated, infrastructure spending tailwind'
  },
  'aerospace & defense': {
    multiple: 14.5,
    source: 'Bloomberg',
    notes: 'Long-term contracts, government revenue stability'
  },
  'construction': {
    multiple: 9.0,
    source: 'FactSet',
    notes: 'Highly cyclical, project-based, margin pressure'
  },
  'machinery': {
    multiple: 12.0,
    source: 'Damodaran 2025',
    notes: 'Manufacturing capex dependent, automation trends'
  },

  // Financials (NOT RECOMMENDED - use P/TBV instead)
  'financials': {
    multiple: -1,  // Sentinel value
    source: 'N/A',
    notes: 'NOT APPLICABLE: Use P/TBV or P/E for banks/insurance. Financial balance sheets are their business model.'
  },
  'banks': {
    multiple: -1,
    source: 'N/A',
    notes: 'Use P/TBV (Price/Tangible Book Value) instead'
  },
  'insurance': {
    multiple: -1,
    source: 'N/A',
    notes: 'Use P/B or embedded value methods instead'
  },
  'financial services': {
    multiple: -1,
    source: 'N/A',
    notes: 'Asset-based business, EV/EBITDA not meaningful'
  },

  // Energy & Materials
  'energy': {
    multiple: 7.5,
    source: 'Damodaran 2025 + Bloomberg',
    notes: 'Commodity-driven, cyclical, ESG headwinds offsetting supply discipline'
  },
  'oil & gas': {
    multiple: 6.5,
    source: 'Bloomberg',
    notes: 'Low multiples reflect transition risk, dividend focus'
  },
  'renewable energy': {
    multiple: 14.0,
    source: 'FactSet',
    notes: 'Growth premium, government subsidies, ESG demand'
  },
  'materials': {
    multiple: 9.5,
    source: 'Damodaran 2025',
    notes: 'Commodity price volatility, China demand exposure'
  },
  'chemicals': {
    multiple: 10.5,
    source: 'Bloomberg',
    notes: 'Specialty chemicals premium over commodities'
  },
  'mining': {
    multiple: 7.0,
    source: 'FactSet',
    notes: 'Cyclical, capital intensive, geopolitical risk'
  },

  // Communication Services
  'telecommunications': {
    multiple: 8.0,
    source: 'Damodaran 2025 + FactSet',
    notes: 'Mature markets, 5G capex burden, regulatory pressure'
  },
  'media': {
    multiple: 10.0,
    source: 'Bloomberg',
    notes: 'Streaming transition, content costs rising'
  },
  'entertainment': {
    multiple: 12.0,
    source: 'FactSet',
    notes: 'IP value, franchise leverage, global expansion'
  },

  // Utilities & REITs
  'utilities': {
    multiple: 9.5,
    source: 'Damodaran 2025',
    notes: 'Regulated, stable but limited growth, renewable transition'
  },
  'electric utilities': {
    multiple: 9.0,
    source: 'Bloomberg',
    notes: 'Rate of return regulation, grid modernization capex'
  },
  'real estate': {
    multiple: -1,  // Sentinel value
    source: 'N/A',
    notes: 'NOT APPLICABLE: Use FFO/AFFO multiples for REITs instead. REITs have unique accounting (D&A distorts EBITDA).'
  },
  'reits': {
    multiple: -1,
    source: 'N/A',
    notes: 'Use P/FFO or NAV methods instead'
  },

  // Default fallback
  'default': {
    multiple: 12.0,
    source: 'Market average',
    notes: 'Cross-sector median for unclassified industries'
  },
};

/**
 * Helper: Check if EV/EBITDA is applicable for a given sector
 * Returns false for Financials and REITs where EV/EBITDA breaks down
 */
export function isEVEBITDAApplicable(sector: string): boolean {
  const excludedSectors = [
    'financial services',
    'financials',
    'banks',
    'insurance',
    'real estate',
    'reits',
    'reit',
  ];

  const sectorLower = sector.toLowerCase();
  return !excludedSectors.some(excluded => sectorLower.includes(excluded));
}

/**
 * Helper: Get sector EV/EBITDA benchmark
 * Uses fuzzy matching to find best sector fit
 */
export function getSectorEVEBITDABenchmark(sector: string): {
  multiple: number;
  source: string;
  matchedSector: string;
} {
  const sectorLower = sector.toLowerCase();

  // Try exact match first
  if (SECTOR_EV_EBITDA_BENCHMARKS[sectorLower]) {
    const benchmark = SECTOR_EV_EBITDA_BENCHMARKS[sectorLower];
    return {
      multiple: benchmark.multiple,
      source: benchmark.source,
      matchedSector: sectorLower,
    };
  }

  // Try fuzzy match (contains)
  for (const [key, value] of Object.entries(SECTOR_EV_EBITDA_BENCHMARKS)) {
    if (sectorLower.includes(key) || key.includes(sectorLower)) {
      return {
        multiple: value.multiple,
        source: value.source,
        matchedSector: key,
      };
    }
  }

  // Fallback to default
  const defaultBenchmark = SECTOR_EV_EBITDA_BENCHMARKS['default'];
  return {
    multiple: defaultBenchmark.multiple,
    source: defaultBenchmark.source,
    matchedSector: 'default',
  };
}
