// Production configuration for Coolify deployment
export const productionConfig = {
  // Server configuration
  port: process.env.PORT || 8000,
  host: '0.0.0.0',
  
  // CORS configuration
  cors: {
    origin: [
      'https://alfalyzerpro4-fd1b9651c-antonios-projects-f9cd3cd0.vercel.app',
      'https://alphaanalyzer.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    credentials: true
  },
  
  // API Keys (from environment variables)
  apiKeys: {
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || '',
    finnhub: process.env.FINNHUB_API_KEY || '',
    fmp: process.env.FMP_API_KEY || '',
    twelveData: process.env.TWELVE_DATA_API_KEY || '',
    polygon: process.env.POLYGON_API_KEY || ''
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'file:./data/production.db'
  },
  
  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
    bcryptRounds: 10
  }
};