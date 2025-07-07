import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireAuth, optionalAuth } from '../auth';
import jwt from 'jsonwebtoken';

// Mock JWT
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  
  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });
  
  describe('authenticateToken', () => {
    it('should authenticate with valid Bearer token', () => {
      const token = 'valid-token';
      const decoded = { userId: '123', email: 'test@example.com' };
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect((mockReq as any).user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should authenticate with valid cookie token', () => {
      const token = 'valid-token';
      const decoded = { userId: '123', email: 'test@example.com' };
      
      mockReq.cookies = { token };
      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect((mockReq as any).user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject invalid token', () => {
      const token = 'invalid-token';
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject expired token', () => {
      const token = 'expired-token';
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Token expired') as any;
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
      });
    });
    
    it('should handle missing token', () => {
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
  
  describe('requireAuth', () => {
    it('should call next if user is authenticated', () => {
      (mockReq as any).user = { userId: '123', email: 'test@example.com' };
      
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    it('should return 401 if user is not authenticated', () => {
      requireAuth(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
  
  describe('optionalAuth', () => {
    it('should authenticate valid token but continue without error if invalid', () => {
      const token = 'valid-token';
      const decoded = { userId: '123', email: 'test@example.com' };
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).user).toEqual(decoded);
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should continue without user if no token provided', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    it('should continue without user if token is invalid', () => {
      const token = 'invalid-token';
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);
      
      expect((mockReq as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
  
  describe('Security considerations', () => {
    it('should handle malformed authorization header', () => {
      mockReq.headers = { authorization: 'InvalidFormat' };
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
    });
    
    it('should handle JWT with invalid signature', () => {
      const token = 'token-with-invalid-signature';
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error('Invalid signature') as any;
        error.name = 'JsonWebTokenError';
        throw error;
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });
    
    it('should not expose sensitive error details', () => {
      const token = 'malicious-token';
      
      mockReq.headers = { authorization: `Bearer ${token}` };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Sensitive internal error with database connection details');
      });
      
      authenticateToken(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token', // Generic error message
      });
      // Should not expose the actual error message
      expect(mockRes.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('database'),
        })
      );
    });
  });
});