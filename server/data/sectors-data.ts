/**
 * Server-side Sector Data for Alfalyzer
 * Extended sector information and company profiles for backend operations
 */

import { Sector } from '../../shared/types/sectors';

export interface ExtendedCompanyProfile {
  symbol: string;
  name: string;
  sector: Sector;
  industry: string;
  description: string;
  website: string;
  headquarters: string;
  employees?: number;
  founded?: number;
  marketCap?: number;
  logoUrl?: string;
  tags: string[];
  lastUpdated: Date;
}

/**
 * Extended company profiles with detailed information
 */
export const COMPANY_PROFILES: Record<string, ExtendedCompanyProfile> = {
  'AAPL': {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: Sector.INFORMATION_TECHNOLOGY,
    industry: 'Consumer Electronics',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    website: 'https://www.apple.com',
    headquarters: 'Cupertino, California, USA',
    employees: 164000,
    founded: 1976,
    marketCap: 3000000000000,
    tags: ['iPhone', 'Mac', 'iPad', 'Services', 'Innovation'],
    lastUpdated: new Date()
  },
  'MSFT': {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: Sector.INFORMATION_TECHNOLOGY,
    industry: 'Software',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
    website: 'https://www.microsoft.com',
    headquarters: 'Redmond, Washington, USA',
    employees: 221000,
    founded: 1975,
    marketCap: 2800000000000,
    tags: ['Windows', 'Office', 'Azure', 'Cloud', 'Enterprise'],
    lastUpdated: new Date()
  },
  'GOOGL': {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: Sector.COMMUNICATION_SERVICES,
    industry: 'Internet Content & Information',
    description: 'Alphabet Inc. provides online advertising services in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
    website: 'https://abc.xyz',
    headquarters: 'Mountain View, California, USA',
    employees: 190000,
    founded: 1998,
    marketCap: 1700000000000,
    tags: ['Search', 'Advertising', 'YouTube', 'Android', 'AI'],
    lastUpdated: new Date()
  },
  'AMZN': {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: Sector.CONSUMER_DISCRETIONARY,
    industry: 'Internet & Direct Marketing Retail',
    description: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.',
    website: 'https://www.amazon.com',
    headquarters: 'Seattle, Washington, USA',
    employees: 1540000,
    founded: 1994,
    marketCap: 1500000000000,
    tags: ['E-commerce', 'AWS', 'Prime', 'Logistics', 'Cloud'],
    lastUpdated: new Date()
  },
  'TSLA': {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    sector: Sector.CONSUMER_DISCRETIONARY,
    industry: 'Auto Manufacturers',
    description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.',
    website: 'https://www.tesla.com',
    headquarters: 'Austin, Texas, USA',
    employees: 127855,
    founded: 2003,
    marketCap: 800000000000,
    tags: ['Electric Vehicles', 'Batteries', 'Solar', 'Autopilot', 'Energy'],
    lastUpdated: new Date()
  },
  'META': {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    sector: Sector.COMMUNICATION_SERVICES,
    industry: 'Internet Content & Information',
    description: 'Meta Platforms, Inc. develops products that enable people to connect and share with friends and family through mobile devices, personal computers, virtual reality headsets, and wearables.',
    website: 'https://about.meta.com',
    headquarters: 'Menlo Park, California, USA',
    employees: 67317,
    founded: 2004,
    marketCap: 900000000000,
    tags: ['Social Media', 'VR', 'AR', 'Metaverse', 'Advertising'],
    lastUpdated: new Date()
  },
  'NVDA': {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    sector: Sector.INFORMATION_TECHNOLOGY,
    industry: 'Semiconductors',
    description: 'NVIDIA Corporation operates as a computing company in the United States, Taiwan, China, and internationally.',
    website: 'https://www.nvidia.com',
    headquarters: 'Santa Clara, California, USA',
    employees: 29600,
    founded: 1993,
    marketCap: 1800000000000,
    tags: ['GPUs', 'AI', 'Gaming', 'Data Center', 'Automotive'],
    lastUpdated: new Date()
  },
  'JPM': {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: Sector.FINANCIALS,
    industry: 'Banks - Diversified',
    description: 'JPMorgan Chase & Co. operates as a financial services company worldwide.',
    website: 'https://www.jpmorganchase.com',
    headquarters: 'New York, New York, USA',
    employees: 288474,
    founded: 1799,
    marketCap: 500000000000,
    tags: ['Banking', 'Investment', 'Credit Cards', 'Wealth Management', 'Trading'],
    lastUpdated: new Date()
  },
  'JNJ': {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    sector: Sector.HEALTHCARE,
    industry: 'Drug Manufacturers - General',
    description: 'Johnson & Johnson researches and develops, manufactures, and sells a range of products in the health care field worldwide.',
    website: 'https://www.jnj.com',
    headquarters: 'New Brunswick, New Jersey, USA',
    employees: 152700,
    founded: 1886,
    marketCap: 400000000000,
    tags: ['Pharmaceuticals', 'Medical Devices', 'Consumer Products', 'Healthcare', 'Innovation'],
    lastUpdated: new Date()
  },
  'V': {
    symbol: 'V',
    name: 'Visa Inc.',
    sector: Sector.FINANCIALS,
    industry: 'Credit Services',
    description: 'Visa Inc. operates as a payments technology company worldwide.',
    website: 'https://visa.com',
    headquarters: 'San Francisco, California, USA',
    employees: 26500,
    founded: 1958,
    marketCap: 500000000000,
    tags: ['Payments', 'Credit Cards', 'Digital Payments', 'Financial Technology', 'Global'],
    lastUpdated: new Date()
  }
};

/**
 * Sector industry mapping
 */
export const SECTOR_INDUSTRIES: Record<Sector, string[]> = {
  [Sector.INFORMATION_TECHNOLOGY]: [
    'Software',
    'Hardware',
    'Semiconductors',
    'IT Services',
    'Consumer Electronics',
    'Electronic Equipment',
    'Communications Equipment'
  ],
  [Sector.FINANCIALS]: [
    'Banks - Diversified',
    'Banks - Regional',
    'Insurance',
    'Asset Management',
    'Credit Services',
    'Capital Markets',
    'Mortgage Finance'
  ],
  [Sector.HEALTHCARE]: [
    'Drug Manufacturers - General',
    'Drug Manufacturers - Specialty',
    'Biotechnology',
    'Medical Devices',
    'Healthcare Plans',
    'Medical Care Facilities',
    'Diagnostics & Research'
  ],
  [Sector.CONSUMER_DISCRETIONARY]: [
    'Auto Manufacturers',
    'Restaurants',
    'Retail - Apparel',
    'Internet & Direct Marketing Retail',
    'Hotels & Motels',
    'Auto Parts',
    'Leisure'
  ],
  [Sector.COMMUNICATION_SERVICES]: [
    'Internet Content & Information',
    'Entertainment',
    'Telecom Services',
    'Broadcasting',
    'Publishing',
    'Interactive Media'
  ],
  [Sector.INDUSTRIALS]: [
    'Aerospace & Defense',
    'Airlines',
    'Construction',
    'Industrial Distribution',
    'Machinery',
    'Transportation',
    'Waste Management'
  ],
  [Sector.CONSUMER_STAPLES]: [
    'Beverages - Non-Alcoholic',
    'Food Distribution',
    'Packaged Foods',
    'Personal Products',
    'Household Products',
    'Tobacco',
    'Retail - Defensive'
  ],
  [Sector.ENERGY]: [
    'Oil & Gas Integrated',
    'Oil & Gas E&P',
    'Oil & Gas Refining',
    'Oil & Gas Equipment',
    'Oil & Gas Drilling',
    'Renewable Energy'
  ],
  [Sector.MATERIALS]: [
    'Chemicals',
    'Metals & Mining',
    'Construction Materials',
    'Containers & Packaging',
    'Paper & Paper Products',
    'Steel'
  ],
  [Sector.UTILITIES]: [
    'Utilities - Regulated Electric',
    'Utilities - Renewable',
    'Utilities - Regulated Gas',
    'Utilities - Regulated Water',
    'Utilities - Diversified'
  ],
  [Sector.REAL_ESTATE]: [
    'REIT - Retail',
    'REIT - Residential',
    'REIT - Office',
    'REIT - Industrial',
    'REIT - Healthcare Facilities',
    'Real Estate Services'
  ],
  [Sector.OTHER]: [
    'Conglomerates',
    'Miscellaneous',
    'Special Purpose Acquisition Companies'
  ]
};

/**
 * Get company profile by symbol
 */
export function getCompanyProfile(symbol: string): ExtendedCompanyProfile | null {
  return COMPANY_PROFILES[symbol.toUpperCase()] || null;
}

/**
 * Get all companies in a sector
 */
export function getCompaniesBySector(sector: Sector): ExtendedCompanyProfile[] {
  return Object.values(COMPANY_PROFILES).filter(profile => profile.sector === sector);
}

/**
 * Get industries for a sector
 */
export function getSectorIndustries(sector: Sector): string[] {
  return SECTOR_INDUSTRIES[sector] || [];
}

/**
 * Search companies by industry
 */
export function getCompaniesByIndustry(industry: string): ExtendedCompanyProfile[] {
  return Object.values(COMPANY_PROFILES).filter(profile => profile.industry === industry);
}

/**
 * Get sector summary statistics
 */
export function getSectorSummary(sector: Sector) {
  const companies = getCompaniesBySector(sector);
  const totalMarketCap = companies.reduce((sum, company) => sum + (company.marketCap || 0), 0);
  const totalEmployees = companies.reduce((sum, company) => sum + (company.employees || 0), 0);
  const avgAge = companies
    .filter(company => company.founded)
    .reduce((sum, company) => sum + (new Date().getFullYear() - (company.founded || 0)), 0) / companies.length;

  return {
    sector,
    companyCount: companies.length,
    totalMarketCap,
    totalEmployees,
    avgAge: Math.round(avgAge),
    industries: getSectorIndustries(sector),
    topCompanies: companies
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 5)
  };
}