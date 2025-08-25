import { Router } from 'express';
import { z } from 'zod';
import { emailService } from '../services/email-service';
import { priceAlertWorker } from '../workers/price-alert-worker';
import { portfolioSummaryWorker } from '../workers/portfolio-summary-worker';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase-admin';
import { logger } from '../lib/logger';

const router = Router();

// Schema validations
const createAlertSchema = z.object({
  symbol: z.string().min(1).max(10),
  targetPrice: z.number().positive(),
  alertType: z.enum(['above', 'below'])
});

const updatePreferencesSchema = z.object({
  priceAlerts: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  earningsReminders: z.boolean().optional(),
  marketNews: z.boolean().optional()
});

// Get user's price alerts
router.get('/api/alerts', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const { data: alerts, error } = await supabaseAdmin
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      alerts: alerts || [],
      count: alerts?.length || 0
    });
  } catch (error) {
    logger.error('Failed to fetch alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create new price alert
router.post('/api/alerts', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const validation = createAlertSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validation.error.issues 
      });
    }

    const { symbol, targetPrice, alertType } = validation.data;

    // Check if user already has this alert
    const { data: existing } = await supabaseAdmin
      .from('price_alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .eq('target_price', targetPrice)
      .eq('alert_type', alertType)
      .eq('triggered', false)
      .single();

    if (existing) {
      return res.status(409).json({ 
        error: 'Alert already exists for this price target' 
      });
    }

    // Create the alert
    const { data: alert, error } = await supabaseAdmin
      .from('price_alerts')
      .insert({
        user_id: userId,
        symbol,
        target_price: targetPrice,
        alert_type: alertType,
        triggered: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info(`Price alert created for user ${userId}: ${symbol} ${alertType} ${targetPrice}`);
    
    res.status(201).json({
      message: 'Price alert created successfully',
      alert
    });
  } catch (error) {
    logger.error('Failed to create alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Delete price alert
router.delete('/api/alerts/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const alertId = req.params.id;

    const { error } = await supabaseAdmin
      .from('price_alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// Get email preferences
router.get('/api/notifications/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error) {
      throw error;
    }

    const preferences = user.user_metadata?.email_preferences || {
      priceAlerts: true,
      weeklySummary: true,
      earningsReminders: true,
      marketNews: false
    };

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to fetch preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update email preferences
router.put('/api/notifications/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const validation = updatePreferencesSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid preferences data',
        details: validation.error.issues 
      });
    }

    const { data: user, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (fetchError) {
      throw fetchError;
    }

    const currentPrefs = user.user_metadata?.email_preferences || {};
    const updatedPrefs = { ...currentPrefs, ...validation.data };

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...user.user_metadata,
          email_preferences: updatedPrefs
        }
      }
    );

    if (updateError) {
      throw updateError;
    }

    res.json({ 
      message: 'Preferences updated successfully',
      preferences: updatedPrefs 
    });
  } catch (error) {
    logger.error('Failed to update preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Test endpoints (development only)
if (process.env.NODE_ENV !== 'production') {
  // Send test email
  router.post('/api/notifications/test-email', authMiddleware, async (req, res) => {
    try {
      const userId = req.userId;
      const { type = 'test' } = req.body;
      
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !user.email) {
        return res.status(400).json({ error: 'User email not found' });
      }

      let success = false;
      
      switch (type) {
        case 'welcome':
          success = await emailService.sendWelcomeEmail(
            user.email, 
            user.user_metadata?.name
          );
          break;
          
        case 'alert':
          success = await emailService.sendPriceAlert({
            id: 'test-alert',
            symbol: 'AAPL',
            targetPrice: 150,
            currentPrice: 151.25,
            alertType: 'above',
            userEmail: user.email,
            userName: user.user_metadata?.name
          });
          break;
          
        case 'summary':
          success = await portfolioSummaryWorker.sendTestSummary(userId);
          break;
          
        case 'earnings':
          success = await emailService.sendEarningsReminder(
            user.email,
            user.user_metadata?.name,
            [
              { symbol: 'AAPL', earningsDate: 'Feb 1, 2025', time: 'After Close' },
              { symbol: 'MSFT', earningsDate: 'Feb 2, 2025', time: 'Before Open' }
            ]
          );
          break;
          
        default:
          success = await emailService.sendTestEmail(user.email);
      }

      if (success) {
        res.json({ message: `Test ${type} email sent successfully` });
      } else {
        res.status(500).json({ error: 'Failed to send test email' });
      }
    } catch (error) {
      logger.error('Failed to send test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

  // Manually trigger alert check
  router.post('/api/notifications/check-alerts', authMiddleware, async (req, res) => {
    try {
      const triggeredCount = await priceAlertWorker.checkAlertsManually();
      res.json({ 
        message: 'Alert check completed',
        triggeredCount 
      });
    } catch (error) {
      logger.error('Failed to check alerts:', error);
      res.status(500).json({ error: 'Failed to check alerts' });
    }
  });
}

export default router;