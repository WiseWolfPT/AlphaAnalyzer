import { Router } from 'express';
import { z } from 'zod';
import { pushNotificationService } from '../services/push-notification-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';

const router = Router();

// Validation schemas
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

const testNotificationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  body: z.string().min(1).max(200).optional()
});

// Apply rate limiting and auth to all routes
const pushRateLimit = rateLimitMiddleware.endpointRateLimit('/api/push', {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 30
});
router.use(pushRateLimit);
router.use(authMiddleware.instance.authenticate());

// POST /api/push/subscribe - Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const validatedSubscription = subscriptionSchema.parse(req.body);

    const result = await pushNotificationService.saveSubscription(userId, validatedSubscription);

    if (result.success) {
      res.status(201).json({ 
        success: true, 
        message: 'Push subscription saved successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || 'Failed to save subscription' 
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    console.error('Push subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/push/unsubscribe - Unsubscribe from push notifications
router.delete('/unsubscribe', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    const result = await pushNotificationService.removeSubscription(userId, endpoint);

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Push subscription removed successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error || 'Failed to remove subscription' 
      });
    }
  } catch (error) {
    console.error('Push unsubscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/push/subscriptions - Get user's push subscriptions
router.get('/subscriptions', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subscriptions = await pushNotificationService.getUserSubscriptions(userId);
    
    // Return only essential info, not the full subscription details
    const publicSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      endpoint: sub.subscription_details.endpoint,
      created_at: sub.created_at
    }));

    res.json({ 
      subscriptions: publicSubscriptions,
      count: subscriptions.length 
    });
  } catch (error) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/push/test - Send test notification
router.post('/test', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Optional custom title/body from request
    const { title, body } = req.body;
    
    const result = await pushNotificationService.sendTestNotification(userId);

    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.message 
      });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/push/status - Get push service status
router.get('/status', async (req, res) => {
  try {
    const status = pushNotificationService.getStatus();
    
    res.json({ 
      configured: status.configured,
      vapidPublicKey: status.vapidPublicKey,
      available: true
    });
  } catch (error) {
    console.error('Push status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/push/vapid-public-key - Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!publicKey) {
      return res.status(503).json({ 
        error: 'Push notifications not configured' 
      });
    }

    res.json({ 
      publicKey,
      configured: true 
    });
  } catch (error) {
    console.error('VAPID key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/push/send - Send custom push notification (internal use)
router.post('/send', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { title, body, data, actions, icon, badge } = req.body;

    if (!title || !body) {
      return res.status(400).json({ 
        error: 'Title and body are required' 
      });
    }

    const payload = {
      title,
      body,
      icon: icon || '/icon-192.png',
      badge: badge || '/badge-72x72.svg',
      data: data || {},
      actions: actions || [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: true,
      tag: data?.alertId || 'custom-notification'
    };

    const result = await pushNotificationService.sendPushToUser(userId, payload);

    if (result.success) {
      res.json({ 
        success: true, 
        sent: result.sent, 
        failed: result.failed,
        message: `Notification sent to ${result.sent} device(s)` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send notification' 
      });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;