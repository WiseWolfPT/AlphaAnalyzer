import { Request, Response, NextFunction } from 'express';
import { vercelProxyAuth, requireVercelProxy, vercelProxyRateLimit, isFromVercelProxy, getProxyMetadata } from '../vercel-proxy-auth';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Helper to create mock request
function createMockRequest(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers,
    ip: '127.0.0.1',
  };
}

// Helper to create mock response
function createMockResponse(): Partial<Response> {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

// Helper to create mock next function
const mockNext: NextFunction = jest.fn();

describe('Vercel Proxy Authentication Middleware', () => {
  describe('vercelProxyAuth', () => {
    it('should skip authentication when disabled', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'false';
      
      const middleware = vercelProxyAuth();
      const req = createMockRequest();
      const res = createMockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(req.isVercelProxy).toBeUndefined();
    });

    it('should detect Vercel proxy requests by headers', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'true';
      process.env.VERCEL_PROXY_BYPASS_AUTH = 'true';
      
      const middleware = vercelProxyAuth();
      const req = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-deployment-url': 'test.vercel.app',
        'x-forwarded-for': '1.2.3.4',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'test.vercel.app',
      });
      const res = createMockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(req.isVercelProxy).toBe(true);
      expect(req.proxyMetadata).toBeDefined();
      expect(req.proxyMetadata?.deployment).toBe('test.vercel.app');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should verify proxy secret when required', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'true';
      process.env.VERCEL_PROXY_REQUIRE_SECRET = 'true';
      process.env.VERCEL_PROXY_SECRET = 'test-secret';
      
      const middleware = vercelProxyAuth();
      
      // Test with invalid secret
      const reqInvalid = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-proxy-secret': 'wrong-secret',
      });
      const resInvalid = createMockResponse();
      
      await middleware(reqInvalid as Request, resInvalid as Response, mockNext);
      
      expect(resInvalid.status).toHaveBeenCalledWith(403);
      expect(resInvalid.json).toHaveBeenCalledWith({
        error: 'INVALID_PROXY_SIGNATURE',
        message: 'Invalid proxy authentication',
      });
      
      // Test with valid secret
      const reqValid = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-proxy-secret': 'test-secret',
      });
      const resValid = createMockResponse();
      
      await middleware(reqValid as Request, resValid as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should create system user when bypass is enabled', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'true';
      process.env.VERCEL_PROXY_BYPASS_AUTH = 'true';
      
      const middleware = vercelProxyAuth();
      const req = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-deployment-url': 'test.vercel.app',
      });
      const res = createMockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('vercel-proxy');
      expect(req.user?.email).toBe('proxy@vercel.com');
      expect(req.user?.role).toBe('system');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should check allowed deployments', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'true';
      process.env.VERCEL_ALLOWED_DEPLOYMENTS = 'allowed.vercel.app,test-*.vercel.app';
      
      const middleware = vercelProxyAuth();
      
      // Test disallowed deployment
      const reqDisallowed = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-deployment-url': 'disallowed.vercel.app',
      });
      const resDisallowed = createMockResponse();
      
      await middleware(reqDisallowed as Request, resDisallowed as Response, mockNext);
      
      expect(resDisallowed.status).toHaveBeenCalledWith(403);
      expect(resDisallowed.json).toHaveBeenCalledWith({
        error: 'DEPLOYMENT_NOT_ALLOWED',
        message: 'This deployment is not authorized',
      });
      
      // Test allowed deployment
      const reqAllowed = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-deployment-url': 'allowed.vercel.app',
      });
      const resAllowed = createMockResponse();
      
      await middleware(reqAllowed as Request, resAllowed as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should check allowed regions', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'true';
      process.env.VERCEL_ALLOWED_REGIONS = 'us-east-1,eu-west-1';
      
      const middleware = vercelProxyAuth();
      
      // Test disallowed region
      const reqDisallowed = createMockRequest({
        'x-vercel-id': 'test-id',
        'x-vercel-ip-country-region': 'ap-south-1',
      });
      const resDisallowed = createMockResponse();
      
      await middleware(reqDisallowed as Request, resDisallowed as Response, mockNext);
      
      expect(resDisallowed.status).toHaveBeenCalledWith(403);
      expect(resDisallowed.json).toHaveBeenCalledWith({
        error: 'REGION_NOT_ALLOWED',
        message: 'This region is not authorized',
      });
    });

    it('should handle errors gracefully', async () => {
      process.env.ENABLE_VERCEL_PROXY_AUTH = 'true';
      
      const middleware = vercelProxyAuth();
      const req: any = {
        headers: {
          get 'x-vercel-id'() {
            throw new Error('Test error');
          },
        },
      };
      const res = createMockResponse();
      
      await middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'PROXY_AUTH_ERROR',
        message: 'Proxy authentication failed',
      });
    });
  });

  describe('requireVercelProxy', () => {
    it('should block non-proxy requests', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      requireVercelProxy(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'PROXY_REQUIRED',
        message: 'This endpoint requires Vercel proxy',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow proxy requests', () => {
      const req = createMockRequest();
      req.isVercelProxy = true;
      const res = createMockResponse();
      
      requireVercelProxy(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('vercelProxyRateLimit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should skip rate limiting for non-proxy requests', () => {
      const middleware = vercelProxyRateLimit(60000, 5);
      const req = createMockRequest();
      const res = createMockResponse();
      
      middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should rate limit proxy requests by deployment', () => {
      const middleware = vercelProxyRateLimit(60000, 2);
      
      // Make 2 requests (within limit)
      for (let i = 0; i < 2; i++) {
        const req = createMockRequest();
        req.isVercelProxy = true;
        req.proxyMetadata = { deployment: 'test.vercel.app' };
        const res = createMockResponse();
        
        middleware(req as Request, res as Response, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
      }
      
      // Make 3rd request (exceeds limit)
      const req = createMockRequest();
      req.isVercelProxy = true;
      req.proxyMetadata = { deployment: 'test.vercel.app' };
      const res = createMockResponse();
      
      middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this deployment',
        retryAfter: 60,
      });
    });

    it('should reset rate limit after window expires', () => {
      const middleware = vercelProxyRateLimit(60000, 1);
      
      // Make first request
      const req1 = createMockRequest();
      req1.isVercelProxy = true;
      req1.proxyMetadata = { deployment: 'test.vercel.app' };
      const res1 = createMockResponse();
      
      middleware(req1 as Request, res1 as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Advance time past window
      jest.advanceTimersByTime(61000);
      
      // Make second request (should be allowed)
      const req2 = createMockRequest();
      req2.isVercelProxy = true;
      req2.proxyMetadata = { deployment: 'test.vercel.app' };
      const res2 = createMockResponse();
      
      middleware(req2 as Request, res2 as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Helper functions', () => {
    it('getProxyMetadata should return metadata or null', () => {
      const req1 = createMockRequest();
      expect(getProxyMetadata(req1 as Request)).toBeNull();
      
      const req2 = createMockRequest();
      req2.proxyMetadata = { deployment: 'test.vercel.app' };
      expect(getProxyMetadata(req2 as Request)).toEqual({ deployment: 'test.vercel.app' });
    });

    it('isFromVercelProxy should check proxy status', () => {
      const req1 = createMockRequest();
      expect(isFromVercelProxy(req1 as Request)).toBe(false);
      
      const req2 = createMockRequest();
      req2.isVercelProxy = true;
      expect(isFromVercelProxy(req2 as Request)).toBe(true);
    });
  });
});