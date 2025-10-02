/**
 * Admin Authentication Routes
 * Handles admin authentication verification
 */

import { Router, Request, Response } from 'express';
import { requireAdmin, getSupabaseClient } from '../../middleware/supabase-auth';

const router = Router();

function extractAccessToken(req: Request): string | null {
  const cookieToken = req.cookies?.['access-token'];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const headerToken = req.headers['x-access-token'];
  if (typeof headerToken === 'string' && headerToken) {
    return headerToken;
  }

  if (Array.isArray(headerToken) && headerToken.length > 0) {
    return headerToken[0];
  }

  return null;
}

/**
 * GET /api/admin/auth/check
 * Check if current user has admin access
 * NOTE: This endpoint is accessible to any authenticated user (no requireAdmin middleware)
 * to avoid circular dependency where you need admin access to check admin status
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();

    // Support both cookie-based and Authorization header tokens
    const accessToken = extractAccessToken(req);

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required to check admin status',
        isAdmin: false,
        isSuperAdmin: false,
        timestamp: new Date().toISOString()
      });
    }

    // Verify the Supabase access token from cookie
    const { data: userData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !userData.user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
        isAdmin: false,
        isSuperAdmin: false,
        timestamp: new Date().toISOString()
      });
    }

    const userId = userData.user.id;

    if (!supabase || !userId) {
      return res.status(500).json({
        success: false,
        error: 'AUTH_NOT_CONFIGURED',
        isAdmin: false,
        isSuperAdmin: false,
        timestamp: new Date().toISOString()
      });
    }

    // Check user roles - this is safe for any authenticated user
    const { data, error } = await supabase
      .from('user_roles')
      .select('role:roles(name, permissions)')
      .eq('user_id', userId);

    if (error) {
      console.error('Database error checking user roles:', error);
      // If role check fails, assume non-admin user
      return res.json({
        success: true,
        isAdmin: false,
        isSuperAdmin: false,
        permissions: [],
        roles: [],
        message: 'Role check failed, assuming non-admin user',
        timestamp: new Date().toISOString()
      });
    }

    const roles = (data || []).map((r: any) => r.role?.name).filter(Boolean);
    const permissions = new Set<string>();
    (data || []).forEach((r: any) => (r.role?.permissions || []).forEach((p: string) => permissions.add(p)));

    // Also honor user_metadata.role and user_metadata.is_admin as fallback
    const metaRole = (userData.user as any)?.user_metadata?.role;
    const metaIsAdmin = (userData.user as any)?.user_metadata?.is_admin === true || metaRole === 'admin' || metaRole === 'super_admin';

    const isAdmin = metaIsAdmin || roles.includes('admin') || roles.includes('super_admin');
    const isSuperAdmin = metaIsAdmin && metaRole === 'super_admin' ? true : roles.includes('super_admin');

    res.json({
      success: true,
      isAdmin,
      isSuperAdmin,
      permissions: Array.from(permissions),
      roles,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin auth check error:', error);
    res.status(500).json({
      success: false,
      error: 'ADMIN_AUTH_CHECK_FAILED',
      message: 'Failed to verify admin status',
      isAdmin: false,
      isSuperAdmin: false,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/auth/permissions
 * Get detailed admin permissions for current user
 */
router.get('/permissions', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const userId = (req.user as any)?.id;

    if (!supabase || !userId) {
      return res.status(500).json({ success: false, error: 'AUTH_NOT_CONFIGURED' });
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role:roles(name, permissions)')
      .eq('user_id', userId);

    if (error) throw error;

    const roles = (data || []).map((r: any) => r.role?.name).filter(Boolean);
    const permissionsSet = new Set<string>();
    (data || []).forEach((r: any) => (r.role?.permissions || []).forEach((p: string) => permissionsSet.add(p)));

    const metaRole = (req.user as any)?.role || (req as any)?.user?.user_metadata?.role;
    const metaIsSuper = metaRole === 'super_admin';
    const isSuperAdmin = roles.includes('super_admin') || metaIsSuper;
    const has = (p: string) => isSuperAdmin || permissionsSet.has(p);

    const adminPermissions = {
      canViewDashboard: true,
      canManageUsers: has('admin:users'),
      canManageTranscripts: has('admin:transcripts'),
      canViewApiMonitoring: has('admin:api_monitoring'),
      canManageSettings: has('admin:settings'),
      canManageAdmins: has('admin:manage_admins'),
      canViewSystemLogs: has('admin:system_logs'),
      canManageBilling: has('admin:billing'),
    };

    res.json({
      success: true,
      permissions: adminPermissions,
      userRoles: roles,
      userPermissions: Array.from(permissionsSet),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin permissions check error:', error);
    res.status(500).json({
      success: false,
      error: 'ADMIN_PERMISSIONS_CHECK_FAILED',
      message: 'Failed to get admin permissions',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
