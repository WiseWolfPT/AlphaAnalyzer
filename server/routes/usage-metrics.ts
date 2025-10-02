import { Router } from 'express';
import { apiUsageTracker } from '../services/api-usage-tracker';

const router = Router();

// Allow only local requests for these endpoints
function isLocalRequest(req: any): boolean {
  const ip = req.ip || '';
  // Express may provide IPv6 loopback '::1' or IPv4-mapped '::ffff:127.0.0.1'
  return ip === '127.0.0.1' || ip === '::1' || ip.endsWith('::ffff:127.0.0.1');
}

router.get('/top-endpoints', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !isLocalRequest(req)) {
      return res.status(403).json({ error: 'Forbidden: local access only' });
    }
    const limit = Math.min(parseInt(String(req.query.limit || '5'), 10) || 5, 20);
    const period = (String(req.query.period || 'hour') as any);
    const top = await apiUsageTracker.getTopEndpoints(limit, period);
    res.json({ success: true, top, period, limit, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch top endpoints', message: error?.message || String(error) });
  }
});

router.get('/summary', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !isLocalRequest(req)) {
      return res.status(403).json({ error: 'Forbidden: local access only' });
    }
    const period = (String(req.query.period || 'hour') as any);
    const summary = await apiUsageTracker.getMetricsSummary(period);
    res.json({ success: true, summary, period, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch usage summary', message: error?.message || String(error) });
  }
});

export default router;

