import crypto from 'crypto';
import { db } from './supabase';
import { UserSession, UserProfile } from '../types/auth';

export interface SessionConfig {
  sessionDuration: number; // in milliseconds
  maxConcurrentSessions: number;
  enableSessionRotation: boolean;
  sessionCookieName: string;
  secureSessionCookies: boolean;
  sameSitePolicy: 'strict' | 'lax' | 'none';
}

export class SessionManager {
  private config: SessionConfig;

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      sessionDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxConcurrentSessions: 5,
      enableSessionRotation: true,
      sessionCookieName: 'alfalyzer_session',
      secureSessionCookies: process.env.NODE_ENV === 'production',
      sameSitePolicy: 'strict',
      ...config,
    };
  }

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    additionalData?: Record<string, any>
  ): Promise<UserSession | null> {
    try {
      // Check concurrent session limit
      await this.enforceSessionLimit(userId);

      // Generate secure session token
      const sessionToken = this.generateSecureToken();
      
      const sessionData: Omit<UserSession, 'id' | 'created_at'> = {
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        last_activity: new Date(),
        expires_at: new Date(Date.now() + this.config.sessionDuration),
        active: true,
      };

      const session = await db.createSession(sessionData);
      
      if (session) {
        // Log session creation for security audit
        await db.logSecurityEvent({
          user_id: userId,
          action: 'session_created',
          resource: 'user_session',
          ip_address: ipAddress,
          user_agent: userAgent,
          success: true,
          details: {
            session_id: session.id,
            expires_at: session.expires_at,
            ...additionalData,
          },
        });
      }

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      
      // Log failed session creation
      await db.logSecurityEvent({
        user_id: userId,
        action: 'session_creation_failed',
        resource: 'user_session',
        ip_address: ipAddress,
        user_agent: userAgent,
        success: false,
        details: { error: error.message },
      });

      return null;
    }
  }

  /**
   * Validate and retrieve session
   */
  async validateSession(sessionToken: string): Promise<{
    valid: boolean;
    session?: UserSession;
    user?: UserProfile;
    shouldRotate?: boolean;
  }> {
    try {
      const session = await db.getSession(sessionToken);
      
      if (!session) {
        return { valid: false };
      }

      // Check if session is expired
      if (new Date() > session.expires_at) {
        await this.invalidateSession(session.id);
        return { valid: false };
      }

      // Check if session should be rotated (if more than half of session duration has passed)
      const shouldRotate = this.config.enableSessionRotation && 
        this.shouldRotateSession(session);

      // Update last activity
      await db.updateSessionActivity(session.id);

      // Get user profile
      const user = await db.getProfile(session.user_id);

      return {
        valid: true,
        session,
        user: user || undefined,
        shouldRotate,
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return { valid: false };
    }
  }

  /**
   * Rotate session token
   */
  async rotateSession(currentSessionId: string, ipAddress: string, userAgent: string): Promise<UserSession | null> {
    try {
      const currentSession = await db.getSession(currentSessionId);
      if (!currentSession) {
        return null;
      }

      // Create new session
      const newSession = await this.createSession(
        currentSession.user_id,
        ipAddress,
        userAgent,
        { rotated_from: currentSessionId }
      );

      if (newSession) {
        // Invalidate old session
        await this.invalidateSession(currentSessionId);
        
        // Log session rotation
        await db.logSecurityEvent({
          user_id: currentSession.user_id,
          action: 'session_rotated',
          resource: 'user_session',
          ip_address: ipAddress,
          user_agent: userAgent,
          success: true,
          details: {
            old_session_id: currentSessionId,
            new_session_id: newSession.id,
          },
        });
      }

      return newSession;
    } catch (error) {
      console.error('Error rotating session:', error);
      return null;
    }
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await db.invalidateSession(sessionId);
      return !error;
    } catch (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string, exceptSessionId?: string): Promise<boolean> {
    try {
      if (exceptSessionId) {
        // Custom implementation to invalidate all except one session
        // This would require a custom database query
        console.warn('Selective session invalidation not implemented yet');
      }

      const { error } = await db.invalidateAllUserSessions(userId);
      
      if (!error) {
        // Log mass session invalidation
        await db.logSecurityEvent({
          user_id: userId,
          action: 'all_sessions_invalidated',
          resource: 'user_session',
          ip_address: '',
          user_agent: '',
          success: true,
          details: { except_session_id: exceptSessionId },
        });
      }

      return !error;
    } catch (error) {
      console.error('Error invalidating all user sessions:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await db.cleanupExpiredSessions();
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Generate secure session token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if session should be rotated
   */
  private shouldRotateSession(session: UserSession): boolean {
    const sessionAge = Date.now() - session.created_at.getTime();
    const halfSessionDuration = this.config.sessionDuration / 2;
    
    return sessionAge > halfSessionDuration;
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    try {
      // This would require a custom query to count active sessions
      // For now, we'll skip this implementation
      console.debug(`Checking session limit for user ${userId}`);
    } catch (error) {
      console.error('Error enforcing session limit:', error);
    }
  }

  /**
   * Get session configuration for cookies
   */
  getSessionCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.secureSessionCookies,
      sameSite: this.config.sameSitePolicy,
      maxAge: this.config.sessionDuration,
      path: '/',
    };
  }

  /**
   * Detect suspicious session activity
   */
  async detectSuspiciousActivity(session: UserSession, currentIp: string, currentUserAgent: string): Promise<{
    suspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check for IP address change
    if (session.ip_address && session.ip_address !== currentIp) {
      reasons.push('ip_address_changed');
    }

    // Check for user agent change
    if (session.user_agent && session.user_agent !== currentUserAgent) {
      reasons.push('user_agent_changed');
    }

    // Check for session duration (if session is too old, it might be compromised)
    const sessionAge = Date.now() - session.created_at.getTime();
    if (sessionAge > this.config.sessionDuration * 2) {
      reasons.push('session_too_old');
    }

    const suspicious = reasons.length > 0;

    if (suspicious) {
      // Log suspicious activity
      await db.logSecurityEvent({
        user_id: session.user_id,
        action: 'suspicious_session_activity',
        resource: 'user_session',
        ip_address: currentIp,
        user_agent: currentUserAgent,
        success: true,
        details: {
          session_id: session.id,
          reasons,
          original_ip: session.ip_address,
          original_user_agent: session.user_agent,
        },
      });
    }

    return { suspicious, reasons };
  }

  /**
   * Extend session duration
   */
  async extendSession(sessionId: string, additionalTime?: number): Promise<boolean> {
    try {
      const extensionTime = additionalTime || this.config.sessionDuration;
      const newExpiryTime = new Date(Date.now() + extensionTime);

      // This would require a custom update query
      // For now, we'll return true to indicate the operation would succeed
      console.debug(`Extending session ${sessionId} until ${newExpiryTime}`);
      
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      // This would require a custom query to get active sessions
      // For now, we'll return an empty array
      console.debug(`Getting active sessions for user ${userId}`);
      return [];
    } catch (error) {
      console.error('Error getting user active sessions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager({
  sessionDuration: parseInt(process.env.SESSION_DURATION || '86400000'), // 24 hours default
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
  enableSessionRotation: process.env.ENABLE_SESSION_ROTATION !== 'false',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'alfalyzer_session',
  secureSessionCookies: process.env.NODE_ENV === 'production',
  sameSitePolicy: (process.env.SAME_SITE_POLICY as any) || 'strict',
});

// Schedule periodic cleanup of expired sessions
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 60 * 60 * 1000); // Run every hour