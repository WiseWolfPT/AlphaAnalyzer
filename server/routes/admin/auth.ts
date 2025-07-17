/**
 * Admin Authentication Routes
 * Handles admin authentication verification
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/admin-auth';

const router = Router();

/**
 * GET /api/admin/auth/check
 * Check if current user has admin access
 */
router.get('/check', requireAdmin(), async (req: Request, res: Response) => {
  try {
    // If we reach here, the user has passed admin auth
    res.json({
      success: true,
      isAdmin: req.adminUser?.isAdmin || false,
      isSuperAdmin: req.adminUser?.isSuperAdmin || false,
      permissions: req.adminUser?.permissions || [],
      roles: req.adminUser?.roles || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin auth check error:', error);
    res.status(500).json({
      success: false,
      error: 'ADMIN_AUTH_CHECK_FAILED',
      message: 'Failed to verify admin status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/auth/permissions
 * Get detailed admin permissions for current user
 */
router.get('/permissions', requireAdmin(), async (req: Request, res: Response) => {
  try {
    const adminPermissions = {
      // Basic admin permissions
      canViewDashboard: req.adminUser?.permissions.includes('admin:dashboard') || req.adminUser?.isAdmin,
      canManageUsers: req.adminUser?.permissions.includes('admin:users') || req.adminUser?.isSuperAdmin,
      canManageTranscripts: req.adminUser?.permissions.includes('admin:transcripts') || req.adminUser?.isAdmin,
      canViewApiMonitoring: req.adminUser?.permissions.includes('admin:api_monitoring') || req.adminUser?.isAdmin,
      canManageSettings: req.adminUser?.permissions.includes('admin:settings') || req.adminUser?.isSuperAdmin,
      
      // Super admin only
      canManageAdmins: req.adminUser?.permissions.includes('admin:manage_admins') || req.adminUser?.isSuperAdmin,
      canViewSystemLogs: req.adminUser?.permissions.includes('admin:system_logs') || req.adminUser?.isSuperAdmin,
      canManageBilling: req.adminUser?.permissions.includes('admin:billing') || req.adminUser?.isSuperAdmin,
    };

    res.json({
      success: true,
      permissions: adminPermissions,
      userRoles: req.adminUser?.roles || [],
      userPermissions: req.adminUser?.permissions || [],
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