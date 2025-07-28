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
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);
    
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

// REMOVED: handlePreflightRequests middleware
// This was causing "Cannot set headers after they are sent" error
// The cors() middleware from npm already handles OPTIONS requests correctly