export interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  marketCap?: string;
  industry?: string;
}

export const ALL_STOCKS: Stock[] = [
  // Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', industry: 'E-Commerce' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Social Media' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  
  // Financial
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', industry: 'Banking' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', industry: 'Payment Processing' },
  { symbol: 'MA', name: 'Mastercard Incorporated', sector: 'Financial', industry: 'Payment Processing' },
  { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financial', industry: 'Banking' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial', industry: 'Banking' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', sector: 'Financial', industry: 'Conglomerate' },
  
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'CVS', name: 'CVS Health Corporation', sector: 'Healthcare', industry: 'Healthcare Services' },
  { symbol: 'MDT', name: 'Medtronic plc', sector: 'Healthcare', industry: 'Medical Devices' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb Co.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  
  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', sector: 'Consumer', industry: 'Consumer Goods' },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Consumer', industry: 'Entertainment' },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer', industry: 'Apparel' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer', industry: 'Restaurants' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'LOW', name: 'Lowe\'s Companies Inc.', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer', industry: 'Retail' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer', industry: 'Beverages' },
  
  // Energy & Industrials
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'UPS', name: 'United Parcel Service Inc.', sector: 'Industrial', industry: 'Logistics' },
  { symbol: 'UNP', name: 'Union Pacific Corporation', sector: 'Industrial', industry: 'Railroads' },
  { symbol: 'HON', name: 'Honeywell International Inc.', sector: 'Industrial', industry: 'Conglomerate' },
  { symbol: 'LIN', name: 'Linde plc', sector: 'Industrial', industry: 'Chemicals' },
  { symbol: 'DHR', name: 'Danaher Corporation', sector: 'Healthcare', industry: 'Medical Devices' },
  
  // Tech/Software
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', industry: 'Software' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Technology', industry: 'Entertainment' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', sector: 'Technology', industry: 'Payment Processing' },
  { symbol: 'TXN', name: 'Texas Instruments Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology', industry: 'Semiconductors' },
  
  // Telecom & Others
  { symbol: 'VZ', name: 'Verizon Communications Inc.', sector: 'Telecom', industry: 'Telecommunications' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Telecom', industry: 'Cable & Internet' },
  { symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities', industry: 'Electric Utilities' },
  { symbol: 'PM', name: 'Philip Morris International Inc.', sector: 'Consumer', industry: 'Tobacco' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer', industry: 'Electric Vehicles' },
  { symbol: 'ACN', name: 'Accenture plc', sector: 'Technology', industry: 'Consulting' },
];
