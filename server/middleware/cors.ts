import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const isDevelopment = process.env.NODE_ENV !== 'production';

// STRICT production origins - NO wildcards or patterns
const productionOrigins = [
  'https://alfalyzer.com',
  'https://www.alfalyzer.com'
];

// Development origins
const developmentOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173'
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // In production, STRICT origin checking
    if (process.env.NODE_ENV === 'production') {
      // No origin = same-origin request (allowed after Hetzner consolidation)
      if (!origin) {
        // Same-origin requests are OK in consolidated architecture
        return callback(null, true);
      }
      
      // Check against strict whitelist
      if (productionOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Block everything else in production
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 horas
  optionsSuccessStatus: 204 // Important for legacy browsers
};

// Security middleware - removed Vercel proxy support (no longer needed after consolidation)
export const verifyOrigin = (req: Request, res: Response, next: NextFunction) => {
  // In consolidated architecture, we don't need Vercel proxy checks
  // All requests come directly to our Hetzner server
  next();
};