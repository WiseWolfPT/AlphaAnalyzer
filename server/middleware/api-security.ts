import { Request, Response, NextFunction } from 'express';
import { rateLimitTracker } from '../services/rate-limit-tracker';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware de segurança para APIs
 * Protege contra exposição de API keys e implementa rate limiting por usuário
 */
export const apiSecurityMiddleware = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // 1. Verificar autenticação
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
    }
    
    // 2. Rate limiting por usuário
    const userLimit = await rateLimitTracker.checkUserLimit(req.user.id);
    if (!userLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: userLimit.retryAfter 
      });
    }
    
    // 3. Remover headers sensíveis que possam vazar informações
    delete req.headers['x-api-key'];
    delete req.headers['authorization'];
    delete req.headers['x-finnhub-token'];
    delete req.headers['x-alpha-vantage-key'];
    delete req.headers['x-fmp-key'];
    delete req.headers['x-twelve-data-key'];
    delete req.headers['x-polygon-key'];
    
    // 4. Adicionar headers de segurança
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 5. Não permitir cache de responses sensíveis
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    next();
  } catch (error) {
    console.error('❌ API Security middleware error:', error);
    return res.status(500).json({
      error: 'Internal security error',
      message: 'Unable to validate security requirements'
    });
  }
};

/**
 * Middleware específico para admin endpoints
 * Verifica se o usuário tem permissões de administrador
 */
export const adminSecurityMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Verificar autenticação primeiro
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
    }
    
    // Verificar se o usuário é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'Administrator access required'
      });
    }
    
    // Aplicar rate limiting
    const userLimit = await rateLimitTracker.checkUserLimit(req.user.id);
    if (!userLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: userLimit.retryAfter 
      });
    }
    
    // Aplicar headers de segurança
    if (!res.headersSent) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  } catch (error) {
    console.error('❌ Admin Security middleware error:', error);
    return res.status(500).json({
      error: 'Internal security error',
      message: 'Unable to validate admin permissions'
    });
  }
};

/**
 * Middleware para validar origem das requisições
 * Previne CSRF e requisições de origens não autorizadas
 */
export const originValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Build allowed origins dynamically including environment variables
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://alfalyzer.vercel.app',
    'https://alfalyzerpro4.vercel.app',
    'https://alfalyzer.com'
  ];
  
  // Add Koyeb domains from environment
  if (process.env.KOYEB_APP_URL) {
    allowedOrigins.push(process.env.KOYEB_APP_URL);
    // Add both http and https versions
    if (process.env.KOYEB_APP_URL.startsWith('http://')) {
      allowedOrigins.push(process.env.KOYEB_APP_URL.replace('http://', 'https://'));
    } else if (process.env.KOYEB_APP_URL.startsWith('https://')) {
      allowedOrigins.push(process.env.KOYEB_APP_URL.replace('https://', 'http://'));
    }
  }
  
  if (process.env.APP_URL) {
    allowedOrigins.push(process.env.APP_URL);
  }
  
  if (process.env.FRONTEND_ORIGIN) {
    allowedOrigins.push(process.env.FRONTEND_ORIGIN);
  }
  
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Allow requests without origin header (same-origin / direct browser access)
  if (!origin && !referer) {
    return next();
  }
  
  // KOYEB FIX: Check for dynamic Koyeb subdomains
  if (process.env.NODE_ENV === 'production' && origin) {
    const coolifyPattern = /^http:\/\/[a-z0-9]+\.128\.140\.45\.28\.sslip\.io$/;
    if (coolifyPattern.test(origin)) {
      console.log(`✅ Origin validation: Allowing Coolify subdomain: ${origin}`);
      return next();
    }
    
    // VERCEL FIX: Check for Vercel preview deployments
    const vercelPattern = /^https:\/\/alfalyzer[a-z0-9-]*\.vercel\.app$/;
    if (vercelPattern.test(origin)) {
      console.log(`✅ Origin validation: Allowing Vercel subdomain: ${origin}`);
      return next();
    }
  }
  
  // Verificar se a origem é permitida
  if (origin && !allowedOrigins.includes(origin)) {
    console.warn(`🚫 Origin validation failed: ${origin} not in allowed list`);
    return res.status(403).json({
      error: 'Forbidden origin',
      message: 'Request origin not allowed'
    });
  }
  
  // KOYEB FIX: Check referer for dynamic Koyeb subdomains
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    if (process.env.NODE_ENV === 'production' && referer) {
      const coolifyPattern = /^http:\/\/[a-z0-9]+\.128\.140\.45\.28\.sslip\.io/;
      if (coolifyPattern.test(referer)) {
        console.log(`✅ Referer validation: Allowing Coolify subdomain: ${referer}`);
        return next();
      }
      
      // VERCEL FIX: Check for Vercel preview deployments
      const vercelPattern = /^https:\/\/alfalyzer[a-z0-9-]*\.vercel\.app/;
      if (vercelPattern.test(referer)) {
        console.log(`✅ Referer validation: Allowing Vercel subdomain: ${referer}`);
        return next();
      }
    }
    
    if (!referer || !allowedOrigins.some(allowed => referer.startsWith(allowed))) {
      console.warn(`🚫 Referer validation failed for ${req.method}: ${referer}`);
      return res.status(403).json({
        error: 'Invalid referer',
        message: 'Request referer validation failed'
      });
    }
  }
  
  next();
};

/**
 * Middleware para sanitizar input
 * Remove caracteres perigosos e valida dados de entrada
 */
export const inputSanitationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    // Remove caracteres perigosos
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };
  
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Sanitizar body, query e params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * Middleware para logging de segurança
 * Registra tentativas de acesso suspeitas
 */
export const securityLoggingMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Log da requisição
  console.log(`🔒 [SECURITY] ${req.method} ${req.originalUrl}`, {
    userId: req.user?.id,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
  
  // Store security info in res.locals
  res.locals.securityLog = {
    startTime,
    userId: req.user?.id,
    endpoint: req.originalUrl
  };
  
  // Log response after it's sent
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log responses com erro
    if (res.statusCode >= 400) {
      console.warn(`⚠️ [SECURITY] ${res.statusCode} response`, {
        userId: req.user?.id,
        endpoint: req.originalUrl,
        responseTime,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};