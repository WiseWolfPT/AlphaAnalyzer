import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Production origins - INCLUDING our Hetzner server
const productionOrigins = [
  'https://128.140.45.28.sslip.io',
  'http://128.140.45.28.sslip.io',
  'https://128.140.45.28',
  'http://128.140.45.28',
  'https://alfalyzer.com',
  'https://www.alfalyzer.com'
];

// Development origins
const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:3000'
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In production
    if (process.env.NODE_ENV === 'production') {
      // No origin = same-origin request (allowed)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check against production whitelist
      if (productionOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check if CORS override is enabled
      if (process.env.DISABLE_CORS === 'true') {
        console.warn(`⚠️ CORS: Allowing origin due to DISABLE_CORS=true: ${origin}`);
        return callback(null, true);
      }
      
      // Block everything else
      console.warn(`🚨 CORS: Blocked unauthorized origin in production: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    
    // Development mode - more permissive
    if (!origin || developmentOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`❌ CORS: Blocked origin in development: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

// Security middleware
export const verifyOrigin = (req: Request, res: Response, next: NextFunction) => {
  next();
};
