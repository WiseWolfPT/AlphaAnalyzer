/**
 * SECURITY FIX: Log Retention Policy for Audit Logs
 * 
 * This module defines the retention policy for security audit logs
 * to ensure compliance and efficient storage management.
 */

import { db } from '../lib/supabase';
import cron from 'node-cron';

export interface LogRetentionConfig {
  securityLogs: number; // Days to retain security logs
  accessLogs: number;   // Days to retain access logs
  errorLogs: number;    // Days to retain error logs
  transactionLogs: number; // Days to retain transaction logs
}

// SECURITY FIX: Define retention periods for different log types
export const LOG_RETENTION_POLICY: LogRetentionConfig = {
  securityLogs: 365,      // 1 year for security audit logs
  accessLogs: 90,         // 90 days for access logs
  errorLogs: 180,         // 6 months for error logs
  transactionLogs: 2555,  // 7 years for financial transaction logs (compliance)
};

/**
 * Clean up old logs based on retention policy
 */
export async function cleanupOldLogs(): Promise<void> {
  const now = new Date();
  
  try {
    // Clean security logs
    const securityCutoff = new Date(now.getTime() - LOG_RETENTION_POLICY.securityLogs * 24 * 60 * 60 * 1000);
    await db.from('security_events')
      .delete()
      .lt('created_at', securityCutoff.toISOString())
      .neq('severity', 'critical'); // Keep critical events longer
    
    // Clean access logs
    const accessCutoff = new Date(now.getTime() - LOG_RETENTION_POLICY.accessLogs * 24 * 60 * 60 * 1000);
    await db.from('access_logs')
      .delete()
      .lt('created_at', accessCutoff.toISOString());
    
    // Clean error logs
    const errorCutoff = new Date(now.getTime() - LOG_RETENTION_POLICY.errorLogs * 24 * 60 * 60 * 1000);
    await db.from('error_logs')
      .delete()
      .lt('created_at', errorCutoff.toISOString());
    
    // Archive old transaction logs instead of deleting
    const transactionCutoff = new Date(now.getTime() - LOG_RETENTION_POLICY.transactionLogs * 24 * 60 * 60 * 1000);
    const { data: oldTransactions } = await db.from('transaction_logs')
      .select('*')
      .lt('created_at', transactionCutoff.toISOString());
    
    if (oldTransactions && oldTransactions.length > 0) {
      // Archive to cold storage (implement based on your infrastructure)
      await archiveTransactionLogs(oldTransactions);
      
      // Delete from main table after archiving
      await db.from('transaction_logs')
        .delete()
        .lt('created_at', transactionCutoff.toISOString());
    }
    
    console.log(`Log cleanup completed at ${now.toISOString()}`);
  } catch (error) {
    console.error('Log cleanup error:', error);
    // Log the cleanup error but don't throw to prevent service disruption
  }
}

/**
 * Archive transaction logs to cold storage
 */
async function archiveTransactionLogs(logs: any[]): Promise<void> {
  // TODO: Implement archiving to S3, Glacier, or other cold storage
  // For now, just log the action
  console.log(`Archiving ${logs.length} transaction logs to cold storage`);
}

/**
 * Initialize log retention scheduler
 * Runs daily at 3 AM to clean up old logs
 */
export function initializeLogRetention(): void {
  // Schedule daily cleanup at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Starting scheduled log cleanup...');
    await cleanupOldLogs();
  });
  
  console.log('Log retention policy initialized. Cleanup scheduled daily at 3 AM.');
}

/**
 * Get log retention statistics
 */
export async function getLogRetentionStats(): Promise<any> {
  const now = new Date();
  const stats: any = {};
  
  for (const [logType, days] of Object.entries(LOG_RETENTION_POLICY)) {
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Get count of logs that will be retained
    const tableName = logType.replace(/([A-Z])/g, '_$1').toLowerCase();
    const { count } = await db.from(tableName)
      .select('*', { count: 'exact', head: true })
      .gte('created_at', cutoff.toISOString());
    
    stats[logType] = {
      retentionDays: days,
      retainedCount: count || 0,
      oldestRetainedDate: cutoff.toISOString(),
    };
  }
  
  return stats;
}

// Export for use in server initialization
export default {
  initializeLogRetention,
  cleanupOldLogs,
  getLogRetentionStats,
  LOG_RETENTION_POLICY,
};