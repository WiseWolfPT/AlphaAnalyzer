import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://alfalyzer.vercel.app',
  'https://alfalyzer.vercel.app',
  'https://alfalyzer.com',
  'https://www.alfalyzer.com',
  'http://localhost:5173', // desenvolvimento local
  'http://localhost:3000'
];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 horas
};

// Middleware para lidar com preflight requests
export const handlePreflightRequests = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  } else {
    next();
  }
};