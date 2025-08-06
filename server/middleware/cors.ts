import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Allow any Vercel deployment in production
const isDevelopment = process.env.NODE_ENV !== 'production';

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://alfalyzer.vercel.app',
  'https://alfalyzer.vercel.app',
  'https://alfalyzerpro4.vercel.app', // Adicionar o domínio específico
  'https://alfalyzer.com',
  'https://www.alfalyzer.com',
  'http://localhost:5173', // desenvolvimento local
  'http://localhost:3000'
];

// Additional patterns for dynamic Vercel deployments
const allowedPatterns = [
  /^https:\/\/alfalyzer.*\.vercel\.app$/,
  /^https:\/\/.*-antonios-projects-.*\.vercel\.app$/
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without origin in development
    if (!origin) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 CORS: Allowing no-origin request in development');
        return callback(null, true);
      } else {
        // In production, we'll handle no-origin in a separate middleware
        // For now, allow it to support Vercel proxy
        console.log('⚠️ CORS: Allowing no-origin request (might be Vercel proxy)');
        return callback(null, true);
      }
    }
    
    // Check exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check pattern matches for Vercel deployments
    const isAllowedPattern = allowedPatterns.some(pattern => pattern.test(origin));
    if (isAllowedPattern) {
      console.log(`✅ CORS: Allowing Vercel deployment: ${origin}`);
      return callback(null, true);
    }
    
    console.warn(`❌ CORS: Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 horas
  optionsSuccessStatus: 204 // Important for legacy browsers
};

// Security middleware to validate Vercel proxy requests
export const verifyVercelProxy = (req: Request, res: Response, next: NextFunction) => {
  // Only check in production when there's no Origin header
  if (process.env.NODE_ENV === 'production' && !req.headers.origin) {
    const forwardedHost = req.headers['x-forwarded-host'] as string;
    const forwardedProto = req.headers['x-forwarded-proto'] as string;
    
    // Check if request is from a valid Vercel proxy
    if (forwardedHost && forwardedHost.includes('vercel.app')) {
      console.log(`✅ Valid Vercel proxy request from: ${forwardedHost}`);
      return next();
    }
    
    // Log warning but allow for now (to not break existing functionality)
    console.warn(`⚠️ No-origin request without valid proxy headers`);
  }
  
  next();
};