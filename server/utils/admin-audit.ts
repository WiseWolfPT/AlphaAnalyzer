import type { Request } from 'express';
import { auditSystem, EventCategory, AuditSeverity } from '../security/compliance-audit';
import { db } from '../lib/supabase';

interface AdminAuditOptions {
  req: Request;
  action: string;
  resource: string;
  success: boolean;
  details?: Record<string, unknown>;
  category?: EventCategory;
  severity?: AuditSeverity;
}

function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || 'unknown';
}

export async function logAdminAction({
  req,
  action,
  resource,
  success,
  details = {},
  category = EventCategory.CONFIGURATION_CHANGE,
  severity = AuditSeverity.MEDIUM,
}: AdminAuditOptions): Promise<void> {
  const userId = req.adminUser?.id || req.user?.id || 'unknown';
  const actorEmail = req.adminUser?.email || req.user?.email;
  const ipAddress = extractIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';

  const payload = {
    ...details,
    actorEmail,
    route: req.originalUrl,
    method: req.method,
  };

  try {
    await db.logSecurityEvent({
      user_id: userId,
      action,
      resource,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      details: payload,
    });
  } catch (error) {
    console.error('Failed to persist security log for admin action:', error);
  }

  try {
    await auditSystem.logEvent(
      category,
      action,
      resource,
      payload,
      {
        userId,
        ipAddress,
        userAgent,
        success,
        severity,
      }
    );
  } catch (error) {
    console.error('Failed to persist compliance audit event:', error);
  }
}
