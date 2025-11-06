/**
 * Chinese ADRs Top 50 Priority Stocks
 *
 * Curated list of major Chinese ADRs listed on NYSE/NASDAQ.
 * Focus: Tech, EV, Fintech, Energy, Consumer - all liquid ADRs
 *
 * Last Updated: 2025-11-05
 * Source: NYSE, NASDAQ listings
 */

export const CHINA_ADRS_TOP_50 = {
  // Technology & E-commerce (20 stocks)
  tech: [
    'BABA',   // Alibaba Group - E-commerce
    'JD',     // JD.com - E-commerce
    'PDD',    // Pinduoduo - E-commerce
    'BIDU',   // Baidu - Search/AI
    'NTES',   // NetEase - Gaming/Tech
    'BILI',   // Bilibili - Video streaming
    'TME',    // Tencent Music - Music streaming
    'BEKE',   // KE Holdings (Beike) - Real estate platform
    'VIPS',   // Vipshop - E-commerce
    'IQ',     // iQIYI - Video streaming
    'DOYU',   // DouYu - Live streaming
    'HUYA',   // Huya - Live streaming
    'WB',     // Weibo - Social media
    'MOMO',   // Hello Group (Momo) - Social
    'YY',     // JOYY Inc - Social/Live streaming
    'KC',     // Kingsoft Cloud - Cloud services
    'RERE',   // ATRenew (AiHuiShou) - E-commerce
    'ATHM',   // Autohome - Auto platform
    'VNET',   // 21Vianet - Data centers
    'TUYA'    // Tuya - IoT platform
  ],

  // Electric Vehicles & Auto (8 stocks)
  ev: [
    'NIO',    // NIO Inc - EV manufacturer
    'XPEV',   // XPeng Motors - EV manufacturer
    'LI',     // Li Auto - EV manufacturer
    'NIU',    // Niu Technologies - E-scooters
    'KNDI',   // Kandi Technologies - EVs
    'SY',     // So-Young International - Healthcare tech (mobility)
    'WKHS',   // Workhorse (China partnerships)
    'GOEV'    // Canoo (China manufacturing)
  ],

  // Financials & Insurance (8 stocks)
  fintech: [
    'LU',     // Lufax Holding - Fintech
    'TIGR',   // UP Fintech (Tiger Brokers)
    'FUTU',   // Futu Holdings
    'QFIN',   // Qifu Technology
    'LX',     // LexinFintech
    'PPDF',   // Phoenix New Media
    'YRD',    // Yirendai - P2P lending
    'BZUN'    // Baozun - E-commerce services
  ],

  // Energy & Telecom (6 stocks)
  energy: [
    'PTR',    // PetroChina - Oil & gas
    'SNP',    // China Petroleum & Chemical (Sinopec)
    'CEO',    // CNOOC - Offshore oil
    'CHA',    // China Telecom - Telecom
    'CHU',    // China Unicom - Telecom
    'ACH'     // Aluminum Corp of China - Materials
  ],

  // Consumer & Retail (5 stocks)
  consumer: [
    'YUMC',   // Yum China - Fast food (KFC, Pizza Hut)
    'MNSO',   // Miniso Group - Retail
    'TCOM',   // Trip.com - Online travel
    'EDU',    // New Oriental Education - Education
    'TAL'     // TAL Education - Education
  ],

  // Others (3 stocks)
  others: [
    'HTHT',   // Huazhu Group - Hotels
    'ZTO',    // ZTO Express - Logistics
    'GDS'     // GDS Holdings - Data centers
  ]
};

// Flatten all ADRs into a single array
export const CHINA_ADRS_TOP_50_FLAT = [
  ...CHINA_ADRS_TOP_50.tech,
  ...CHINA_ADRS_TOP_50.ev,
  ...CHINA_ADRS_TOP_50.fintech,
  ...CHINA_ADRS_TOP_50.energy,
  ...CHINA_ADRS_TOP_50.consumer,
  ...CHINA_ADRS_TOP_50.others
];

export const CHINA_ADRS_METADATA = {
  total: 50,
  byCategory: {
    'Technology & E-commerce': 20,
    'Electric Vehicles & Auto': 8,
    'Financials & Fintech': 8,
    'Energy & Telecom': 6,
    'Consumer & Retail': 5,
    'Others': 3
  },
  exchange: {
    NYSE: 30,
    NASDAQ: 20
  },
  avgMarketCap: '> $5 billion',
  avgDailyVolume: '> 5 million shares',
  lastUpdated: '2025-11-05',
  dataQuality: 'Good - all ADRs have US exchange listings with reliable data',
  risks: [
    'Regulatory risk (VIE structures)',
    'Delisting risk (SEC/PCAOB compliance)',
    'Geopolitical risk (US-China relations)',
    'Currency risk (CNY exposure)'
  ],
  topHoldings: [
    'BABA (27% weighting)',
    'JD (12%)',
    'PDD (11%)',
    'NIO (8%)',
    'BIDU (7%)'
  ]
};

// Helper function to get category for a stock
export function getCategoryForADR(symbol: string): string | null {
  if (CHINA_ADRS_TOP_50.tech.includes(symbol)) return 'Technology & E-commerce';
  if (CHINA_ADRS_TOP_50.ev.includes(symbol)) return 'Electric Vehicles & Auto';
  if (CHINA_ADRS_TOP_50.fintech.includes(symbol)) return 'Financials & Fintech';
  if (CHINA_ADRS_TOP_50.energy.includes(symbol)) return 'Energy & Telecom';
  if (CHINA_ADRS_TOP_50.consumer.includes(symbol)) return 'Consumer & Retail';
  if (CHINA_ADRS_TOP_50.others.includes(symbol)) return 'Others';
  return null;
}

// Helper function to check if stock is Chinese ADR
export function isChineseADR(symbol: string): boolean {
  return CHINA_ADRS_TOP_50_FLAT.includes(symbol);
}

// Helper to get exchange for ADR
export function getExchangeForADR(symbol: string): 'NYSE' | 'NASDAQ' | null {
  const nyseADRs = [
    'BABA', 'JD', 'PDD', 'NIO', 'XPEV', 'LI', 'PTR', 'SNP', 'CEO',
    'CHA', 'CHU', 'YUMC', 'TCOM', 'EDU', 'ZTO', 'HTHT', 'LU',
    'BEKE', 'VIPS', 'YY', 'ACH', 'TAL', 'GDS', 'LX'
  ];

  if (nyseADRs.includes(symbol)) return 'NYSE';
  if (CHINA_ADRS_TOP_50_FLAT.includes(symbol)) return 'NASDAQ';
  return null;
}
