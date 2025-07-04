/**
 * KV Health Endpoint - Roadmap V4
 * 
 * Monitors KV (Key-Value) usage for Vercel Edge Config or similar services.
 * Returns: { totalOps, limitOps: 100000 }
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Mock KV operations counter - In production this would track real KV operations
let totalKVOperations = 0;
const KV_OPERATIONS_LIMIT = 100000; // 100k operations limit as specified in roadmap
let kvStartTime = Date.now();

// Track different types of KV operations
interface KVStats {
  reads: number;
  writes: number;
  deletes: number;
  total: number;
  startTime: number;
  resetTime: number;
}

let kvStats: KVStats = {
  reads: 0,
  writes: 0,
  deletes: 0,
  total: 0,
  startTime: Date.now(),
  resetTime: Date.now() + 24 * 60 * 60 * 1000 // Reset daily
};

/**
 * GET /api/health/kv
 * Returns KV usage statistics as specified in roadmap V4
 */
router.get('/', (req: Request, res: Response) => {
  const now = Date.now();
  
  // Reset stats daily
  if (now > kvStats.resetTime) {
    resetKVStats();
  }
  
  const usage = {
    totalOps: kvStats.total,
    limitOps: KV_OPERATIONS_LIMIT,
    usage: {
      reads: kvStats.reads,
      writes: kvStats.writes,
      deletes: kvStats.deletes,
    },
    limits: {
      daily: KV_OPERATIONS_LIMIT,
      remaining: Math.max(0, KV_OPERATIONS_LIMIT - kvStats.total),
      resetIn: Math.max(0, kvStats.resetTime - now),
    },
    status: kvStats.total >= KV_OPERATIONS_LIMIT * 0.9 ? 'warning' : 'healthy',
    timestamps: {
      startTime: new Date(kvStats.startTime).toISOString(),
      resetTime: new Date(kvStats.resetTime).toISOString(),
      currentTime: new Date(now).toISOString(),
    }
  };
  
  // Log warning if approaching limit
  if (kvStats.total >= KV_OPERATIONS_LIMIT * 0.9) {
    console.warn(`⚠️ KV Usage Warning: ${kvStats.total}/${KV_OPERATIONS_LIMIT} operations (${((kvStats.total / KV_OPERATIONS_LIMIT) * 100).toFixed(1)}%)`);
  }
  
  res.json(usage);
});

/**
 * POST /api/health/kv/track
 * Track a KV operation (for internal use)
 */
router.post('/track', (req: Request, res: Response) => {
  const { operation = 'read', count = 1 } = req.body;
  
  // Validate operation type
  if (!['read', 'write', 'delete'].includes(operation)) {
    return res.status(400).json({
      error: 'Invalid operation type',
      validOperations: ['read', 'write', 'delete']
    });
  }
  
  // Track the operation
  trackKVOperation(operation, count);
  
  res.json({
    success: true,
    operation,
    count,
    totalOps: kvStats.total,
    remainingOps: Math.max(0, KV_OPERATIONS_LIMIT - kvStats.total)
  });
});

/**
 * GET /api/health/kv/reset
 * Reset KV statistics (admin only)
 */
router.get('/reset', (req: Request, res: Response) => {
  const oldStats = { ...kvStats };
  resetKVStats();
  
  res.json({
    message: 'KV statistics reset',
    previousStats: oldStats,
    newStats: kvStats
  });
});

/**
 * Track a KV operation
 */
export function trackKVOperation(operation: 'read' | 'write' | 'delete', count: number = 1): void {
  const now = Date.now();
  
  // Reset if needed
  if (now > kvStats.resetTime) {
    resetKVStats();
  }
  
  // Update counters
  switch (operation) {
    case 'read':
      kvStats.reads += count;
      break;
    case 'write':
      kvStats.writes += count;
      break;
    case 'delete':
      kvStats.deletes += count;
      break;
  }
  
  kvStats.total += count;
  
  // Log if approaching limit
  if (kvStats.total >= KV_OPERATIONS_LIMIT * 0.8) {
    console.log(`📊 KV Usage: ${kvStats.total}/${KV_OPERATIONS_LIMIT} operations (${((kvStats.total / KV_OPERATIONS_LIMIT) * 100).toFixed(1)}%)`);
  }
}

/**
 * Reset KV statistics
 */
function resetKVStats(): void {
  const now = Date.now();
  kvStats = {
    reads: 0,
    writes: 0,
    deletes: 0,
    total: 0,
    startTime: now,
    resetTime: now + 24 * 60 * 60 * 1000 // Next day
  };
  
  console.log('🔄 KV Statistics reset');
}

/**
 * Get current KV statistics
 */
export function getKVStats(): KVStats {
  return { ...kvStats };
}

/**
 * Check if KV usage is approaching limit
 */
export function isKVUsageHigh(): boolean {
  return kvStats.total >= KV_OPERATIONS_LIMIT * 0.9;
}

export default router;