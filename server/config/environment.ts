import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment configuration
export const environment = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  
  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://alfalyzer.vercel.app',
  
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  
  // External APIs
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || '',
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || '',
  FMP_API_KEY: process.env.FMP_API_KEY || '',
  TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY || '',
  POLYGON_API_KEY: process.env.POLYGON_API_KEY || '',
  
  // Security
  CRON_SECRET: process.env.CRON_SECRET || 'default-cron-secret',
  JWT_SECRET: process.env.JWT_SECRET || 'default-jwt-secret',
  UPTIME_ROBOT_KEY: process.env.UPTIME_ROBOT_KEY || '',
  
  // Environment flags
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Validate required environment variables
export function validateEnvironment() {
  const required = [
    'FRONTEND_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    if (environment.isProduction) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
  
  console.log('✅ Environment variables loaded successfully');
}