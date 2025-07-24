/**
 * ALERTS API ROUTES
 * Comprehensive alert management endpoints for Alfalyzer
 * AGENTE 8: Complete notification system implementation
 */

import { Router, Request, Response } from 'express';
import { alertManager } from '../services/alerts/alert-manager';
import { notificationService } from '../services/alerts/notification-service';
import { 
  AlertType, 
  AlertSeverity, 
  NotificationChannel, 
  FrequencyType,
  ConditionOperator,
  AlertConfig,
  UserAlertPreferences 
} from '../services/alerts/alert-types';
import { db } from '../db';
import { z } from 'zod';

const router = Router();

// Validation schemas
const AlertConditionSchema = z.object({
  field: z.string(),
  operator: z.nativeEnum(ConditionOperator),
  value: z.union([z.number(), z.string()]),
  symbol: z.string().optional(),
  timeframe: z.string().optional()
});

const AlertFrequencySchema = z.object({
  type: z.nativeEnum(FrequencyType),
  value: z.number().optional(),
  cooldown: z.number().optional(),
  maxPerDay: z.number().optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
    timezone: z.string()
  }).optional()
});

const CreateAlertSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(AlertType),
  conditions: z.array(AlertConditionSchema).min(1),
  frequency: AlertFrequencySchema,
  channels: z.array(z.nativeEnum(NotificationChannel)).min(1),
  enabled: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

const UpdateAlertSchema = CreateAlertSchema.partial();

const UserPreferencesSchema = z.object({
  globalEnabled: z.boolean().optional(),
  defaultChannels: z.array(z.nativeEnum(NotificationChannel)).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
    timezone: z.string()
  }).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weekendAlerts: z.boolean().optional(),
  maxAlertsPerDay: z.number().min(1).max(1000).optional(),
  preferredFrequency: z.nativeEnum(FrequencyType).optional(),
  categories: z.record(z.object({
    enabled: z.boolean(),
    channels: z.array(z.nativeEnum(NotificationChannel)),
    frequency: z.nativeEnum(FrequencyType)
  })).optional()
});

/**
 * GET /api/alerts
 * Get user's alerts with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';

    const { type, enabled, limit = 50, offset = 0 } = req.query;

    // TODO: Production mode - SQLite disabled. Implement Supabase query
    if (process.env.NODE_ENV === 'production') {
      // For now, return empty array to prevent crashes
      return res.json({
        alerts: [],
        total: 0,
        limit: Number(limit),
        offset: Number(offset)
      });
    }

    let query = `
      SELECT * FROM alerts_v2 
      WHERE user_id = ?
    `;
    const params: any[] = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (enabled !== undefined) {
      query += ' AND enabled = ?';
      params.push(enabled === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const alerts = db.prepare(query).all(...params);

    // Parse JSON fields
    const formattedAlerts = alerts.map(alert => ({
      ...alert,
      enabled: alert.enabled === 1,
      conditions: JSON.parse(alert.conditions),
      frequency: JSON.parse(alert.frequency),
      channels: JSON.parse(alert.channels),
      metadata: alert.metadata ? JSON.parse(alert.metadata) : undefined
    }));

    res.json({
      alerts: formattedAlerts,
      total: formattedAlerts.length,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/alerts
 * Create a new alert
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';

    const validatedData = CreateAlertSchema.parse(req.body);

    const alertId = await alertManager.addAlert({
      ...validatedData,
      userId
    });

    res.status(201).json({
      id: alertId,
      message: 'Alert created successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * GET /api/alerts/:id
 * Get a specific alert
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { id } = req.params;

    const alert = db.prepare(`
      SELECT * FROM alerts_v2 
      WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Parse JSON fields
    const formattedAlert = {
      ...alert,
      enabled: alert.enabled === 1,
      conditions: JSON.parse(alert.conditions),
      frequency: JSON.parse(alert.frequency),
      channels: JSON.parse(alert.channels),
      metadata: alert.metadata ? JSON.parse(alert.metadata) : undefined
    };

    res.json(formattedAlert);

  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

/**
 * PUT /api/alerts/:id
 * Update an alert
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { id } = req.params;

    // Check if alert exists and belongs to user
    const existingAlert = db.prepare(`
      SELECT * FROM alerts_v2 
      WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const validatedData = UpdateAlertSchema.parse(req.body);

    const success = await alertManager.updateAlert(id, validatedData);

    if (success) {
      res.json({ message: 'Alert updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update alert' });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete an alert
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { id } = req.params;

    // Check if alert exists and belongs to user
    const existingAlert = db.prepare(`
      SELECT * FROM alerts_v2 
      WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const success = await alertManager.removeAlert(id);

    if (success) {
      res.json({ message: 'Alert deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete alert' });
    }

  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

/**
 * GET /api/alerts/triggers
 * Get alert trigger history
 */
router.get('/triggers', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { limit = 50, offset = 0, severity, acknowledged } = req.query;

    let query = `
      SELECT at.*, a.name as alert_name, a.type as alert_type
      FROM alert_triggers_v2 at
      JOIN alerts_v2 a ON at.alert_id = a.id
      WHERE at.user_id = ?
    `;
    const params: any[] = [userId];

    if (severity) {
      query += ' AND at.severity = ?';
      params.push(severity);
    }

    if (acknowledged !== undefined) {
      query += ' AND at.acknowledged = ?';
      params.push(acknowledged === 'true' ? 1 : 0);
    }

    query += ' ORDER BY at.triggered_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const triggers = db.prepare(query).all(...params);

    // Parse JSON fields
    const formattedTriggers = triggers.map(trigger => ({
      ...trigger,
      acknowledged: trigger.acknowledged === 1,
      metadata: trigger.metadata ? JSON.parse(trigger.metadata) : undefined,
      notifications_sent: JSON.parse(trigger.notifications_sent)
    }));

    res.json({
      triggers: formattedTriggers,
      total: formattedTriggers.length,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (error) {
    console.error('Error fetching alert triggers:', error);
    res.status(500).json({ error: 'Failed to fetch alert triggers' });
  }
});

/**
 * POST /api/alerts/triggers/:id/acknowledge
 * Acknowledge an alert trigger
 */
router.post('/triggers/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { id } = req.params;

    const result = db.prepare(`
      UPDATE alert_triggers_v2 
      SET acknowledged = 1, acknowledged_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert trigger not found' });
    }

    res.json({ message: 'Alert trigger acknowledged' });

  } catch (error) {
    console.error('Error acknowledging alert trigger:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert trigger' });
  }
});

/**
 * GET /api/alerts/preferences
 * Get user alert preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';

    const preferences = db.prepare(`
      SELECT * FROM user_alert_preferences_v2 WHERE user_id = ?
    `).get(userId);

    if (!preferences) {
      // Create default preferences
      const defaultPrefs = {
        user_id: userId,
        global_enabled: 1,
        default_channels: '["in_app"]',
        quiet_hours: '{"enabled":false,"startHour":22,"endHour":8,"timezone":"UTC"}',
        email_notifications: 0,
        push_notifications: 0,
        weekend_alerts: 1,
        max_alerts_per_day: 50,
        preferred_frequency: 'every_15_minutes',
        categories: '{}'
      };

      db.prepare(`
        INSERT INTO user_alert_preferences_v2 (
          user_id, global_enabled, default_channels, quiet_hours,
          email_notifications, push_notifications, weekend_alerts,
          max_alerts_per_day, preferred_frequency, categories
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        defaultPrefs.user_id,
        defaultPrefs.global_enabled,
        defaultPrefs.default_channels,
        defaultPrefs.quiet_hours,
        defaultPrefs.email_notifications,
        defaultPrefs.push_notifications,
        defaultPrefs.weekend_alerts,
        defaultPrefs.max_alerts_per_day,
        defaultPrefs.preferred_frequency,
        defaultPrefs.categories
      );

      return res.json({
        ...defaultPrefs,
        global_enabled: defaultPrefs.global_enabled === 1,
        email_notifications: defaultPrefs.email_notifications === 1,
        push_notifications: defaultPrefs.push_notifications === 1,
        weekend_alerts: defaultPrefs.weekend_alerts === 1,
        default_channels: JSON.parse(defaultPrefs.default_channels),
        quiet_hours: JSON.parse(defaultPrefs.quiet_hours),
        categories: JSON.parse(defaultPrefs.categories)
      });
    }

    // Parse JSON fields
    const formattedPreferences = {
      ...preferences,
      global_enabled: preferences.global_enabled === 1,
      email_notifications: preferences.email_notifications === 1,
      push_notifications: preferences.push_notifications === 1,
      weekend_alerts: preferences.weekend_alerts === 1,
      default_channels: JSON.parse(preferences.default_channels),
      quiet_hours: JSON.parse(preferences.quiet_hours),
      categories: JSON.parse(preferences.categories)
    };

    res.json(formattedPreferences);

  } catch (error) {
    console.error('Error fetching alert preferences:', error);
    res.status(500).json({ error: 'Failed to fetch alert preferences' });
  }
});

/**
 * PUT /api/alerts/preferences
 * Update user alert preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const validatedData = UserPreferencesSchema.parse(req.body);

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (validatedData.globalEnabled !== undefined) {
      updateFields.push('global_enabled = ?');
      updateValues.push(validatedData.globalEnabled ? 1 : 0);
    }

    if (validatedData.defaultChannels) {
      updateFields.push('default_channels = ?');
      updateValues.push(JSON.stringify(validatedData.defaultChannels));
    }

    if (validatedData.quietHours) {
      updateFields.push('quiet_hours = ?');
      updateValues.push(JSON.stringify(validatedData.quietHours));
    }

    if (validatedData.emailNotifications !== undefined) {
      updateFields.push('email_notifications = ?');
      updateValues.push(validatedData.emailNotifications ? 1 : 0);
    }

    if (validatedData.pushNotifications !== undefined) {
      updateFields.push('push_notifications = ?');
      updateValues.push(validatedData.pushNotifications ? 1 : 0);
    }

    if (validatedData.weekendAlerts !== undefined) {
      updateFields.push('weekend_alerts = ?');
      updateValues.push(validatedData.weekendAlerts ? 1 : 0);
    }

    if (validatedData.maxAlertsPerDay !== undefined) {
      updateFields.push('max_alerts_per_day = ?');
      updateValues.push(validatedData.maxAlertsPerDay);
    }

    if (validatedData.preferredFrequency) {
      updateFields.push('preferred_frequency = ?');
      updateValues.push(validatedData.preferredFrequency);
    }

    if (validatedData.categories) {
      updateFields.push('categories = ?');
      updateValues.push(JSON.stringify(validatedData.categories));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = datetime("now")');
    updateValues.push(userId);

    const query = `
      UPDATE user_alert_preferences_v2 
      SET ${updateFields.join(', ')}
      WHERE user_id = ?
    `;

    const result = db.prepare(query).run(...updateValues);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User preferences not found' });
    }

    res.json({ message: 'Alert preferences updated successfully' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }

    console.error('Error updating alert preferences:', error);
    res.status(500).json({ error: 'Failed to update alert preferences' });
  }
});

/**
 * GET /api/alerts/notifications
 * Get in-app notifications for user
 */
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { limit = 20 } = req.query;

    const notifications = notificationService.getInAppNotifications(userId, Number(limit));

    res.json({
      notifications,
      unreadCount: notifications.filter((n: any) => !n.read).length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/alerts/notifications/:id/read
 * Mark notification as read
 */
router.post('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { id } = req.params;

    const success = notificationService.markNotificationAsRead(userId, id);

    if (success) {
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(404).json({ error: 'Notification not found' });
    }

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * DELETE /api/alerts/notifications
 * Clear all notifications for user
 */
router.delete('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';

    notificationService.clearUserNotifications(userId);

    res.json({ message: 'All notifications cleared' });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics for user
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';

    // Get user-specific stats
    const alertStats = db.prepare(`
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN enabled = 1 THEN 1 END) as active_alerts,
        SUM(trigger_count) as total_triggers
      FROM alerts_v2 
      WHERE user_id = ?
    `).get(userId);

    const recentTriggers = db.prepare(`
      SELECT COUNT(*) as count
      FROM alert_triggers_v2 
      WHERE user_id = ? AND triggered_at > datetime('now', '-24 hours')
    `).get(userId);

    const unacknowledgedTriggers = db.prepare(`
      SELECT COUNT(*) as count
      FROM alert_triggers_v2 
      WHERE user_id = ? AND acknowledged = 0
    `).get(userId);

    res.json({
      totalAlerts: alertStats?.total_alerts || 0,
      activeAlerts: alertStats?.active_alerts || 0,
      totalTriggers: alertStats?.total_triggers || 0,
      triggersToday: recentTriggers?.count || 0,
      unacknowledged: unacknowledgedTriggers?.count || 0
    });

  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch alert stats' });
  }
});

/**
 * POST /api/alerts/test
 * Test notification delivery
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'demo_user';
    const { channel, message } = req.body;

    if (!Object.values(NotificationChannel).includes(channel)) {
      return res.status(400).json({ error: 'Invalid notification channel' });
    }

    const result = await notificationService.testNotification(
      userId,
      channel as NotificationChannel,
      message
    );

    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent' : 'Test notification failed',
      error: result.error
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export { router as alertsRouter };