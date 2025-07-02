import { Request, Response, NextFunction } from 'express';

// Demo authentication middleware that accepts our simple tokens
export function demoAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      let token = null;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
      
      // If no token, allow request to continue (for testing)
      if (!token) {
        console.log('🔧 Demo Auth: No token provided, allowing request');
        return next();
      }
      
      // Simple validation for our demo tokens
      if (token.includes('.')) {
        try {
          // Try to decode the base64 encoded payload
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            
            // Create a demo user from the token payload
            req.user = {
              id: payload.sub || 'demo-user',
              email: payload.email || 'demo@alfalyzer.com',
              subscriptionTier: 'premium' as any, // Give premium access for demo
              roles: [],
              permissions: ['read:market-data', 'read:valuation'],
            };
            
            console.log('🔧 Demo Auth: Valid token for user', req.user.email);
            return next();
          }
        } catch (error) {
          console.warn('🔧 Demo Auth: Failed to decode token, allowing anyway');
        }
      }
      
      // Even if token is invalid, allow for demo purposes
      req.user = {
        id: 'demo-user',
        email: 'demo@alfalyzer.com',
        subscriptionTier: 'premium' as any,
        roles: [],
        permissions: ['read:market-data', 'read:valuation'],
      };
      
      console.log('🔧 Demo Auth: Using default demo user');
      next();
    } catch (error) {
      console.error('🔧 Demo Auth: Error in middleware', error);
      // Even on error, allow request for demo
      next();
    }
  };
}

// Optional demo auth that doesn't require authentication
export function optionalDemoAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Always allow the request to continue
    // but try to set user if token is present
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        if (token.includes('.')) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
              req.user = {
                id: payload.sub || 'demo-user',
                email: payload.email || 'demo@alfalyzer.com',
                subscriptionTier: 'premium' as any,
                roles: [],
                permissions: ['read:market-data', 'read:valuation'],
              };
            }
          } catch (error) {
            // Silently ignore token decode errors
          }
        }
      }
    } catch (error) {
      // Silently ignore any errors
    }
    
    next();
  };
}