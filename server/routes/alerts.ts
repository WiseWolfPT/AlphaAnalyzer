import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';

const router = Router();

// Validation schemas
const createAlertSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  alert_type: z.enum(['price_above', 'price_below', 'volume_spike', 'news_sentiment', 'technical_indicator']),
  threshold_value: z.number().positive().optional(),
  threshold_operator: z.enum(['>', '<', '>=', '<=', '=']).optional(),
  condition_data: z.string().optional(),
  notification_methods: z.string().default('app,email'),
  is_active: z.boolean().default(true)
});

const updateAlertSchema = z.object({
  alert_type: z.enum(['price_above', 'price_below', 'volume_spike', 'news_sentiment', 'technical_indicator']).optional(),
  threshold_value: z.number().positive().optional(),
  threshold_operator: z.enum(['>', '<', '>=', '<=', '=']).optional(),
  condition_data: z.string().optional(),
  notification_methods: z.string().optional(),
  is_active: z.boolean().optional(),
  snooze_until: z.string().optional()
});

// Apply rate limiting and auth to all routes
const alertsRateLimit = rateLimitMiddleware.endpointRateLimit('/api/alerts', {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60
});
router.use(alertsRateLimit);
router.use(authMiddleware.instance.authenticate());

// GET /api/alerts - Get user's alerts
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }

    res.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/active - Get active alerts (for engine)
router.get('/active', async (req, res) => {
  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)
      .is('snooze_until', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active alerts:', error);
      return res.status(500).json({ error: 'Failed to fetch active alerts' });
    }

    res.json({ alerts: alerts || [] });
  } catch (error) {
    console.error('Active alerts fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/triggers - Get user's alert triggers
router.get('/triggers', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { data: triggers, error } = await supabase
      .from('alert_triggers')
      .select(`
        *,
        alerts!inner(
          user_id,
          symbol,
          alert_type
        )
      `)
      .eq('alerts.user_id', userId)
      .order('triggered_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching alert triggers:', error);
      return res.status(500).json({ error: 'Failed to fetch alert triggers' });
    }

    res.json({ triggers: triggers || [] });
  } catch (error) {
    console.error('Alert triggers fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/alerts - Create new alert
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const validatedData = createAlertSchema.parse(req.body);

    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        ...validatedData,
        user_id: userId,
        triggered_count: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      return res.status(500).json({ error: 'Failed to create alert' });
    }

    res.status(201).json({ alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    console.error('Alert creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/alerts/:id - Update alert
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alertId = req.params.id;
    const validatedData = updateAlertSchema.parse(req.body);

    // Check if alert belongs to user
    const { data: existingAlert, error: fetchError } = await supabase
      .from('alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (existingAlert.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this alert' });
    }

    const { data: alert, error } = await supabase
      .from('alerts')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error updating alert:', error);
      return res.status(500).json({ error: 'Failed to update alert' });
    }

    res.json({ alert });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    console.error('Alert update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/alerts/:id - Delete alert
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alertId = req.params.id;

    // Check if alert belongs to user
    const { data: existingAlert, error: fetchError } = await supabase
      .from('alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (existingAlert.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this alert' });
    }

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      console.error('Error deleting alert:', error);
      return res.status(500).json({ error: 'Failed to delete alert' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Alert deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/alerts/:id/snooze - Snooze alert
router.post('/:id/snooze', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alertId = req.params.id;
    const { hours } = req.body;

    if (!hours || hours < 1 || hours > 168) { // Max 1 week
      return res.status(400).json({ error: 'Invalid snooze duration (1-168 hours)' });
    }

    // Check if alert belongs to user
    const { data: existingAlert, error: fetchError } = await supabase
      .from('alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (existingAlert.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to snooze this alert' });
    }

    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);

    const { data: alert, error } = await supabase
      .from('alerts')
      .update({ 
        snooze_until: snoozeUntil.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error snoozing alert:', error);
      return res.status(500).json({ error: 'Failed to snooze alert' });
    }

    res.json({ alert });
  } catch (error) {
    console.error('Alert snooze error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/alerts/:id/toggle - Toggle alert active state
router.post('/:id/toggle', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alertId = req.params.id;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    // Check if alert belongs to user
    const { data: existingAlert, error: fetchError } = await supabase
      .from('alerts')
      .select('user_id')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (existingAlert.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to toggle this alert' });
    }

    const { data: alert, error } = await supabase
      .from('alerts')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling alert:', error);
      return res.status(500).json({ error: 'Failed to toggle alert' });
    }

    res.json({ alert });
  } catch (error) {
    console.error('Alert toggle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/alerts/trigger - Create alert trigger (internal use)
router.post('/trigger', async (req, res) => {
  try {
    const { alert_id, trigger_value, trigger_data } = req.body;

    if (!alert_id || typeof trigger_value !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: trigger, error } = await supabase
      .from('alert_triggers')
      .insert({
        alert_id,
        trigger_value,
        trigger_data: trigger_data ? JSON.stringify(trigger_data) : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert trigger:', error);
      return res.status(500).json({ error: 'Failed to create alert trigger' });
    }

    // Update alert triggered count
    await supabase
      .from('alerts')
      .update({ 
        triggered_count: supabase.raw('triggered_count + 1'),
        last_triggered_at: new Date().toISOString()
      })
      .eq('id', alert_id);

    res.status(201).json({ trigger });
  } catch (error) {
    console.error('Alert trigger creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;