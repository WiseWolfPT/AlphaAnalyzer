/**
 * Comprehensive sector and industry classification system for Alfalyzer
 * Based on GICS (Global Industry Classification Standard) sectors
 */

export enum Sector {
  COMMUNICATION_SERVICES = 'Communication Services',
  CONSUMER_DISCRETIONARY = 'Consumer Discretionary', 
  CONSUMER_STAPLES = 'Consumer Staples',
  ENERGY = 'Energy',
  FINANCIALS = 'Financials',
  HEALTHCARE = 'Healthcare',
  INDUSTRIALS = 'Industrials',
  INFORMATION_TECHNOLOGY = 'Information Technology',
  MATERIALS = 'Materials',
  REAL_ESTATE = 'Real Estate',
  UTILITIES = 'Utilities',
  OTHER = 'Other'
}

export interface SectorInfo {
  name: Sector;
  description: string;
  color: string;
  backgroundColor: string;
  icon: string;
  examples: string[];
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: Sector;
  industry?: string;
  description?: string;
  logo?: string;
  website?: string;
  marketCap?: number;
  country?: string;
}

export interface SectorPerformance {
  sector: Sector;
  change1D: number;
  change1W: number;
  change1M: number;
  change3M: number;
  change1Y: number;
  marketCap: number;
  stockCount: number;
}

export const SECTOR_COLORS: Record<Sector, { primary: string; background: string; text: string }> = {
  [Sector.COMMUNICATION_SERVICES]: {
    primary: '#8B5CF6',
    background: '#F3F4F6',
    text: '#374151'
  },
  [Sector.CONSUMER_DISCRETIONARY]: {
    primary: '#F59E0B',
    background: '#FEF3C7',
    text: '#92400E'
  },
  [Sector.CONSUMER_STAPLES]: {
    primary: '#10B981',
    background: '#D1FAE5', 
    text: '#065F46'
  },
  [Sector.ENERGY]: {
    primary: '#EF4444',
    background: '#FEE2E2',
    text: '#991B1B'
  },
  [Sector.FINANCIALS]: {
    primary: '#3B82F6',
    background: '#DBEAFE',
    text: '#1E40AF'
  },
  [Sector.HEALTHCARE]: {
    primary: '#06B6D4',
    background: '#CFFAFE',
    text: '#0E7490'
  },
  [Sector.INDUSTRIALS]: {
    primary: '#6B7280',
    background: '#F9FAFB',
    text: '#374151'
  },
  [Sector.INFORMATION_TECHNOLOGY]: {
    primary: '#8B5CF6',
    background: '#EDE9FE',
    text: '#5B21B6'
  },
  [Sector.MATERIALS]: {
    primary: '#84CC16',
    background: '#ECFCCB',
    text: '#365314'
  },
  [Sector.REAL_ESTATE]: {
    primary: '#F97316',
    background: '#FED7AA',
    text: '#9A3412'
  },
  [Sector.UTILITIES]: {
    primary: '#14B8A6',
    background: '#CCFBF1',
    text: '#134E4A'
  },
  [Sector.OTHER]: {
    primary: '#6B7280',
    background: '#F3F4F6',
    text: '#374151'
  }
};

export const SECTOR_INFO: Record<Sector, SectorInfo> = {
  [Sector.COMMUNICATION_SERVICES]: {
    name: Sector.COMMUNICATION_SERVICES,
    description: 'Companies that facilitate communication and offer related content and information through various mediums',
    color: SECTOR_COLORS[Sector.COMMUNICATION_SERVICES].primary,
    backgroundColor: SECTOR_COLORS[Sector.COMMUNICATION_SERVICES].background,
    icon: '📱',
    examples: ['Alphabet (Google)', 'Meta (Facebook)', 'Netflix', 'Disney']
  },
  [Sector.CONSUMER_DISCRETIONARY]: {
    name: Sector.CONSUMER_DISCRETIONARY,
    description: 'Companies that sell non-essential goods and services that consumers can forgo during tough times',
    color: SECTOR_COLORS[Sector.CONSUMER_DISCRETIONARY].primary,
    backgroundColor: SECTOR_COLORS[Sector.CONSUMER_DISCRETIONARY].background,
    icon: '🛍️',
    examples: ['Amazon', 'Tesla', 'Nike', 'Starbucks']
  },
  [Sector.CONSUMER_STAPLES]: {
    name: Sector.CONSUMER_STAPLES,
    description: 'Companies that sell essential products including food, beverages, household items',
    color: SECTOR_COLORS[Sector.CONSUMER_STAPLES].primary,
    backgroundColor: SECTOR_COLORS[Sector.CONSUMER_STAPLES].background,
    icon: '🛒',
    examples: ['Procter & Gamble', 'Coca-Cola', 'Walmart', 'Costco']
  },
  [Sector.ENERGY]: {
    name: Sector.ENERGY,
    description: 'Companies involved in exploring, producing, marketing and refining oil and gas',
    color: SECTOR_COLORS[Sector.ENERGY].primary,
    backgroundColor: SECTOR_COLORS[Sector.ENERGY].background,
    icon: '⚡',
    examples: ['ExxonMobil', 'Chevron', 'ConocoPhillips', 'EOG Resources']
  },
  [Sector.FINANCIALS]: {
    name: Sector.FINANCIALS,
    description: 'Banks, investment funds, insurance companies and real estate companies',
    color: SECTOR_COLORS[Sector.FINANCIALS].primary,
    backgroundColor: SECTOR_COLORS[Sector.FINANCIALS].background,
    icon: '🏦',
    examples: ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Goldman Sachs']
  },
  [Sector.HEALTHCARE]: {
    name: Sector.HEALTHCARE,
    description: 'Companies involved in medical services, pharmaceutical products and medical equipment',
    color: SECTOR_COLORS[Sector.HEALTHCARE].primary,
    backgroundColor: SECTOR_COLORS[Sector.HEALTHCARE].background,
    icon: '🏥',
    examples: ['Johnson & Johnson', 'Pfizer', 'UnitedHealth', 'Merck']
  },
  [Sector.INDUSTRIALS]: {
    name: Sector.INDUSTRIALS,
    description: 'Companies involved in aerospace, defense, machinery, construction and logistics',
    color: SECTOR_COLORS[Sector.INDUSTRIALS].primary,
    backgroundColor: SECTOR_COLORS[Sector.INDUSTRIALS].background,
    icon: '🏭',
    examples: ['Boeing', 'Caterpillar', '3M', 'General Electric']
  },
  [Sector.INFORMATION_TECHNOLOGY]: {
    name: Sector.INFORMATION_TECHNOLOGY,
    description: 'Companies that deal with software, hardware, semiconductors and IT services',
    color: SECTOR_COLORS[Sector.INFORMATION_TECHNOLOGY].primary,
    backgroundColor: SECTOR_COLORS[Sector.INFORMATION_TECHNOLOGY].background,
    icon: '💻',
    examples: ['Apple', 'Microsoft', 'NVIDIA', 'Intel']
  },
  [Sector.MATERIALS]: {
    name: Sector.MATERIALS,
    description: 'Companies involved in the discovery, development and processing of raw materials',
    color: SECTOR_COLORS[Sector.MATERIALS].primary,
    backgroundColor: SECTOR_COLORS[Sector.MATERIALS].background,
    icon: '🏗️',
    examples: ['Linde', 'Sherwin-Williams', 'Freeport-McMoRan', 'Newmont']
  },
  [Sector.REAL_ESTATE]: {
    name: Sector.REAL_ESTATE,
    description: 'Real Estate Investment Trusts (REITs) and real estate management companies',
    color: SECTOR_COLORS[Sector.REAL_ESTATE].primary,
    backgroundColor: SECTOR_COLORS[Sector.REAL_ESTATE].background,
    icon: '🏢',
    examples: ['American Tower', 'Prologis', 'Crown Castle', 'Realty Income']
  },
  [Sector.UTILITIES]: {
    name: Sector.UTILITIES,
    description: 'Electric, gas and water utilities, as well as renewable energy companies',
    color: SECTOR_COLORS[Sector.UTILITIES].primary,
    backgroundColor: SECTOR_COLORS[Sector.UTILITIES].background,
    icon: '🔌',
    examples: ['NextEra Energy', 'Duke Energy', 'Southern Company', 'Dominion Energy']
  },
  [Sector.OTHER]: {
    name: Sector.OTHER,
    description: 'Companies that do not fit into other defined sectors',
    color: SECTOR_COLORS[Sector.OTHER].primary,
    backgroundColor: SECTOR_COLORS[Sector.OTHER].background,
    icon: '📊',
    examples: ['Miscellaneous companies', 'Emerging sectors', 'Special cases']
  }
};