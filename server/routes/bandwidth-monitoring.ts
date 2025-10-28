/**
 * Bandwidth Monitoring Routes
 *
 * Provides real-time bandwidth usage stats for monitoring
 *
 * ONDA 6: Bandwidth Safety System
 */

import { Router } from 'express';
import { getBandwidthStatsForMonitoring } from '../middleware/bandwidth-protection';
import { redisCacheService } from '../cache/redis-cache-service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/bandwidth/stats
 *
 * Returns current bandwidth usage for today
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getBandwidthStatsForMonitoring();

    res.json({
      success: true,
      data: {
        daily: {
          used: `${stats.dailyUsedMB.toFixed(2)} MB`,
          budget: `${stats.dailyBudgetMB.toFixed(2)} MB`,
          remaining: `${stats.estimatedMBRemaining.toFixed(2)} MB`,
          percentUsed: `${(stats.percentUsed * 100).toFixed(2)}%`,
        },
        requests: {
          today: stats.requestsToday,
        },
        status: getStatusFromPercent(stats.percentUsed),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[BandwidthMonitoring] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bandwidth stats',
    });
  }
});

/**
 * GET /api/bandwidth/history
 *
 * Returns bandwidth usage for last 7 days
 */
router.get('/history', async (req, res) => {
  try {
    const history: any[] = [];
    const today = new Date();

    // Get last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const key = `bandwidth:daily:${dateStr}`;
      const requestsKey = `bandwidth:requests:${dateStr}`;

      const usedKB = await redisCacheService.get(key) || 0;
      const requests = await redisCacheService.get(requestsKey) || 0;

      history.push({
        date: dateStr,
        usedMB: (Number(usedKB) / 1024).toFixed(2),
        requests: Number(requests),
      });
    }

    res.json({
      success: true,
      data: {
        history: history.reverse(), // Oldest first
        totalLast7Days: history.reduce((sum, day) => sum + parseFloat(day.usedMB), 0).toFixed(2) + ' MB',
      },
    });
  } catch (error) {
    logger.error('[BandwidthMonitoring] Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bandwidth history',
    });
  }
});

/**
 * POST /api/bandwidth/manual-update
 *
 * Manually update bandwidth reading from FMP dashboard
 * (Since FMP doesn't provide automatic API for bandwidth tracking)
 */
router.post('/manual-update', async (req, res) => {
  try {
    const { totalUsedGB } = req.body;

    if (!totalUsedGB || typeof totalUsedGB !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'totalUsedGB (number) is required',
      });
    }

    // Save to config file (for monitoring script)
    const fs = require('fs');
    const path = '/tmp/.fmp-bandwidth-current';
    fs.writeFileSync(path, totalUsedGB.toString());

    logger.info(`[BandwidthMonitoring] Manual update: ${totalUsedGB} GB`);

    res.json({
      success: true,
      message: `Bandwidth updated to ${totalUsedGB} GB`,
      data: {
        totalUsedGB,
        dailyAverage: (totalUsedGB / 30).toFixed(3) + ' GB/day',
        percentUsed: ((totalUsedGB / 20) * 100).toFixed(2) + '%',
      },
    });
  } catch (error) {
    logger.error('[BandwidthMonitoring] Error in manual update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bandwidth',
    });
  }
});

/**
 * Helper: Get status from percent used
 */
function getStatusFromPercent(percent: number): string {
  if (percent >= 0.95) return 'CRITICAL';
  if (percent >= 0.85) return 'WARNING';
  if (percent >= 0.70) return 'CAUTION';
  return 'OK';
}

export default router;
