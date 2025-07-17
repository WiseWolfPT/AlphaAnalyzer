import { Router } from 'express';
import { webSocketService } from '../../services/websocket-service';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client for WebSocket data
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/admin/websocket/dashboard
 * Get comprehensive WebSocket dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get WebSocket service stats
    const serviceStats = webSocketService.getStats();
    const serviceHealth = webSocketService.getHealth();
    const subscriptions = webSocketService.getSubscriptions();

    // Get database statistics
    const [statsResult, connectionsResult, quotesResult] = await Promise.all([
      supabase.rpc('get_websocket_stats'),
      supabase
        .from('websocket_connections')
        .select('*')
        .order('connected_at', { ascending: false })
        .limit(10),
      supabase
        .from('real_time_quotes')
        .select('symbol, price, source, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20)
    ]);

    const response = {
      service: {
        stats: serviceStats,
        health: serviceHealth,
        subscriptions,
        isConnected: webSocketService.isConnected()
      },
      database: {
        stats: statsResult.data?.[0] || {},
        recentConnections: connectionsResult.data || [],
        recentQuotes: quotesResult.data || []
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('WebSocket dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch WebSocket dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/websocket/connections
 * Get active WebSocket connections with pagination
 */
router.get('/connections', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('websocket_connections')
      .select('*', { count: 'exact' })
      .order('connected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    res.json({
      connections: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('WebSocket connections error:', error);
    res.status(500).json({
      error: 'Failed to fetch WebSocket connections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/websocket/subscriptions
 * Get active subscriptions with analytics
 */
router.get('/subscriptions', async (req, res) => {
  try {
    const [subscriptionsResult, popularSymbolsResult] = await Promise.all([
      supabase
        .from('websocket_subscriptions')
        .select('*, websocket_connections(user_id, ip_address)')
        .eq('is_active', true)
        .order('subscribed_at', { ascending: false }),
      supabase
        .from('websocket_subscriptions')
        .select('symbol')
        .eq('is_active', true)
    ]);

    // Count symbol popularity
    const symbolCounts = (popularSymbolsResult.data || []).reduce((acc, sub) => {
      acc[sub.symbol] = (acc[sub.symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularSymbols = Object.entries(symbolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count }));

    res.json({
      subscriptions: subscriptionsResult.data || [],
      analytics: {
        totalActiveSubscriptions: subscriptionsResult.data?.length || 0,
        uniqueSymbols: Object.keys(symbolCounts).length,
        popularSymbols
      }
    });
  } catch (error) {
    console.error('WebSocket subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to fetch WebSocket subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/websocket/metrics
 * Get WebSocket performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: metrics, error } = await supabase
      .from('websocket_metrics')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Group metrics by type for analysis
    const metricsByType = (metrics || []).reduce((acc, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = [];
      }
      acc[metric.metric_type].push(metric);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate averages
    const analytics = Object.entries(metricsByType).map(([type, typeMetrics]) => {
      const values = typeMetrics.map(m => parseFloat(m.value) || 0);
      return {
        type,
        count: values.length,
        average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
        min: values.length > 0 ? Math.min(...values) : 0,
        max: values.length > 0 ? Math.max(...values) : 0
      };
    });

    res.json({
      metrics: metrics || [],
      analytics,
      timeRange: {
        since,
        hours
      }
    });
  } catch (error) {
    console.error('WebSocket metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch WebSocket metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/websocket/subscribe
 * Manually subscribe to a symbol (admin only)
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({
        error: 'Symbol is required and must be a string'
      });
    }

    const success = await webSocketService.subscribe(symbol.toUpperCase());

    if (success) {
      res.json({
        success: true,
        message: `Successfully subscribed to ${symbol.toUpperCase()}`,
        symbol: symbol.toUpperCase()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to subscribe to symbol',
        symbol: symbol.toUpperCase()
      });
    }
  } catch (error) {
    console.error('WebSocket subscribe error:', error);
    res.status(500).json({
      error: 'Failed to subscribe to symbol',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/websocket/subscribe/:symbol
 * Manually unsubscribe from a symbol (admin only)
 */
router.delete('/subscribe/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol is required'
      });
    }

    const success = await webSocketService.unsubscribe(symbol.toUpperCase());

    if (success) {
      res.json({
        success: true,
        message: `Successfully unsubscribed from ${symbol.toUpperCase()}`,
        symbol: symbol.toUpperCase()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe from symbol',
        symbol: symbol.toUpperCase()
      });
    }
  } catch (error) {
    console.error('WebSocket unsubscribe error:', error);
    res.status(500).json({
      error: 'Failed to unsubscribe from symbol',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/websocket/restart
 * Restart the WebSocket service (admin only)
 */
router.post('/restart', async (req, res) => {
  try {
    console.log('Admin requested WebSocket service restart');
    
    // Stop the service
    webSocketService.stop();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start the service again
    await webSocketService.start();
    
    res.json({
      success: true,
      message: 'WebSocket service restarted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('WebSocket restart error:', error);
    res.status(500).json({
      error: 'Failed to restart WebSocket service',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/websocket/health
 * Get detailed health information
 */
router.get('/health', async (req, res) => {
  try {
    const health = webSocketService.getHealth();
    const stats = webSocketService.getStats();
    
    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('real_time_quotes')
      .select('count', { count: 'exact', head: true });

    const response = {
      service: {
        ...health,
        detailedStats: stats
      },
      database: {
        connected: !dbError,
        error: dbError?.message,
        quotesCount: dbTest?.length || 0
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasApiKey: !!process.env.TWELVE_DATA_API_KEY && process.env.TWELVE_DATA_API_KEY !== 'demo',
        apiKeyLength: process.env.TWELVE_DATA_API_KEY?.length || 0
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('WebSocket health check error:', error);
    res.status(500).json({
      error: 'Failed to check WebSocket health',
      message: error instanceof Error ? error.message : 'Unknown error',
      service: webSocketService.getHealth()
    });
  }
});

/**
 * DELETE /api/admin/websocket/cleanup
 * Clean up old WebSocket data
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { data: cleanupResult, error } = await supabase.rpc('cleanup_websocket_data');

    if (error) throw error;

    res.json({
      success: true,
      message: 'WebSocket data cleanup completed',
      recordsRemoved: cleanupResult || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('WebSocket cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup WebSocket data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;