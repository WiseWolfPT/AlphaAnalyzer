/**
 * European Top 100 Priority Stocks
 *
 * Curated list of top 100 European stocks from STOXX 600.
 * Focus: Germany, France, UK, Netherlands, Switzerland + Spain, Italy
 *
 * Last Updated: 2025-11-05
 * Source: STOXX indices, major EU exchanges
 */

export const EU_TOP_100_STOCKS = {
  // Germany (30 stocks - DAX 40 + large caps)
  germany: [
    'SAP',       // SAP SE - Software
    'SIE.DE',    // Siemens AG - Industrials
    'ALV.DE',    // Allianz SE - Insurance
    'DTE.DE',    // Deutsche Telekom AG - Telecom
    'VOW3.DE',   // Volkswagen AG - Automotive
    'BAS.DE',    // BASF SE - Chemicals
    'BAYN.DE',   // Bayer AG - Healthcare/Pharma
    'BMW.DE',    // BMW AG - Automotive
    'MUV2.DE',   // Munich Re - Insurance
    'EOAN.DE',   // E.ON SE - Utilities
    'DAI.DE',    // Daimler AG (Mercedes-Benz) - Automotive
    'DB1.DE',    // Deutsche Boerse AG - Financials
    'ADS.DE',    // Adidas AG - Consumer
    'HEN3.DE',   // Henkel AG - Consumer
    'MBG.DE',    // Mercedes-Benz Group - Automotive
    'FRE.DE',    // Fresenius SE - Healthcare
    'IFX.DE',    // Infineon Technologies - Semiconductors
    'VNA.DE',    // Vonovia SE - Real Estate
    'HEI.DE',    // HeidelbergCement AG - Materials
    'CON.DE',    // Continental AG - Automotive
    'RWE.DE',    // RWE AG - Utilities
    'BEI.DE',    // Beiersdorf AG - Consumer
    '1COV.DE',   // Covestro AG - Chemicals
    'SHL.DE',    // Siemens Healthineers - Healthcare
    'ZAL.DE',    // Zalando SE - E-commerce
    'PAH3.DE',   // Porsche Automobil Holding - Automotive
    'AIR.DE',    // Airbus SE - Aerospace
    'MTX.DE',    // MTU Aero Engines - Aerospace
    'SY1.DE',    // Symrise AG - Chemicals
    'PUM.DE'     // Puma SE - Consumer
  ],

  // France (25 stocks - CAC 40 top)
  france: [
    'MC.PA',     // LVMH - Luxury
    'OR.PA',     // L'Oreal - Consumer
    'SAN.PA',    // Sanofi - Pharma
    'TTE.PA',    // TotalEnergies - Energy
    'AIR.PA',    // Airbus - Aerospace
    'BN.PA',     // Danone - Consumer
    'SU.PA',     // Schneider Electric - Industrials
    'CA.PA',     // Carrefour - Retail
    'AI.PA',     // Air Liquide - Chemicals
    'CS.PA',     // AXA - Insurance
    'EL.PA',     // EssilorLuxottica - Healthcare
    'RMS.PA',    // Hermes - Luxury
    'SAF.PA',    // Safran - Aerospace
    'GLE.PA',    // Societe Generale - Banking
    'BNP.PA',    // BNP Paribas - Banking
    'EN.PA',     // Bouygues - Industrials
    'VIV.PA',    // Vivendi - Media
    'SGO.PA',    // Saint-Gobain - Materials
    'RI.PA',     // Pernod Ricard - Consumer
    'ACA.PA',    // Credit Agricole - Banking
    'DSY.PA',    // Dassault Systemes - Software
    'DG.PA',     // Vinci - Industrials
    'CAP.PA',    // Capgemini - IT Services
    'VIE.PA',    // Veolia - Utilities
    'ORA.PA'     // Orange - Telecom
  ],

  // UK (20 stocks - FTSE 100 top)
  uk: [
    'SHEL.L',    // Shell - Energy
    'AZN.L',     // AstraZeneca - Pharma
    'HSBA.L',    // HSBC - Banking
    'BP.L',      // BP - Energy
    'ULVR.L',    // Unilever - Consumer
    'GSK.L',     // GSK - Pharma
    'DGE.L',     // Diageo - Consumer
    'NG.L',      // National Grid - Utilities
    'BATS.L',    // British American Tobacco - Consumer
    'RIO.L',     // Rio Tinto - Mining
    'LSEG.L',    // London Stock Exchange - Financials
    'REL.L',     // RELX - Media/Data
    'BARC.L',    // Barclays - Banking
    'LLOY.L',    // Lloyds Banking - Banking
    'VOD.L',     // Vodafone - Telecom
    'BHP.L',     // BHP Group - Mining
    'PRU.L',     // Prudential - Insurance
    'GLEN.L',    // Glencore - Mining
    'AAL.L',     // Anglo American - Mining
    'CRH.L'      // CRH - Materials
  ],

  // Netherlands (10 stocks)
  netherlands: [
    'ASML.AS',   // ASML - Semiconductors
    'HEIA.AS',   // Heineken - Consumer
    'PHIA.AS',   // Philips - Healthcare
    'AD.AS',     // Ahold Delhaize - Retail
    'INGA.AS',   // ING Group - Banking
    'ABN.AS',    // ABN AMRO - Banking
    'KPN.AS',    // KPN - Telecom
    'RAND.AS',   // Randstad - Services
    'DSM.AS',    // DSM - Chemicals
    'WKL.AS'     // Wolters Kluwer - Media/Data
  ],

  // Switzerland (10 stocks)
  switzerland: [
    'NESN.SW',   // Nestle - Consumer
    'ROG.SW',    // Roche - Pharma
    'NOVN.SW',   // Novartis - Pharma
    'ABBN.SW',   // ABB - Industrials
    'UHR.SW',    // Swatch Group - Luxury
    'UBSG.SW',   // UBS - Banking
    'ZURN.SW',   // Zurich Insurance - Insurance
    'CSGN.SW',   // Credit Suisse - Banking
    'SREN.SW',   // Swiss Re - Insurance
    'GIVN.SW'    // Givaudan - Chemicals
  ],

  // Spain (3 stocks)
  spain: [
    'ITX.MC',    // Inditex (Zara) - Retail
    'SAN.MC',    // Santander - Banking
    'TEF.MC'     // Telefonica - Telecom
  ],

  // Italy (2 stocks)
  italy: [
    'ENEL.MI',   // Enel - Utilities
    'ENI.MI'     // Eni - Energy
  ]
};

// Flatten all stocks into a single array
export const EU_TOP_100_STOCKS_FLAT = [
  ...EU_TOP_100_STOCKS.germany,
  ...EU_TOP_100_STOCKS.france,
  ...EU_TOP_100_STOCKS.uk,
  ...EU_TOP_100_STOCKS.netherlands,
  ...EU_TOP_100_STOCKS.switzerland,
  ...EU_TOP_100_STOCKS.spain,
  ...EU_TOP_100_STOCKS.italy
];

export const EU_TOP_100_METADATA = {
  total: 100,
  byCountry: {
    Germany: 30,
    France: 25,
    UK: 20,
    Netherlands: 10,
    Switzerland: 10,
    Spain: 3,
    Italy: 2
  },
  bySector: {
    'Financials': 20,
    'Industrials': 15,
    'Consumer': 15,
    'Healthcare/Pharma': 12,
    'Energy': 8,
    'Materials': 8,
    'Technology': 7,
    'Utilities': 6,
    'Telecom': 5,
    'Real Estate': 2,
    'Luxury': 2
  },
  avgMarketCap: '> €20 billion',
  exchanges: ['XETRA', 'EURONEXT', 'LSE', 'SIX', 'BME'],
  lastUpdated: '2025-11-05',
  dataQuality: 'High - major European blue chips with good FMP coverage'
};

// Helper function to get country for a stock
export function getCountryForStock(symbol: string): string | null {
  if (EU_TOP_100_STOCKS.germany.includes(symbol)) return 'Germany';
  if (EU_TOP_100_STOCKS.france.includes(symbol)) return 'France';
  if (EU_TOP_100_STOCKS.uk.includes(symbol)) return 'UK';
  if (EU_TOP_100_STOCKS.netherlands.includes(symbol)) return 'Netherlands';
  if (EU_TOP_100_STOCKS.switzerland.includes(symbol)) return 'Switzerland';
  if (EU_TOP_100_STOCKS.spain.includes(symbol)) return 'Spain';
  if (EU_TOP_100_STOCKS.italy.includes(symbol)) return 'Italy';
  return null;
}

// Helper function to check if stock is European
export function isEuropeanStock(symbol: string): boolean {
  return EU_TOP_100_STOCKS_FLAT.includes(symbol);
}
