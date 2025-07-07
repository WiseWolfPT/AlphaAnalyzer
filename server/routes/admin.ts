import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth-middleware';
import transcriptsRouter from './admin/transcripts';
// Import Alert Monitor for AGENTE 3: Alert Engine Backend admin endpoints
import { alertMonitor } from '../workers/alert-monitor';
import { backgroundScheduler } from '../services/background-scheduler';
// Import Push Notification Service for AGENTE 4: PWA Push Notifications admin endpoints
import { pushNotificationService } from '../services/push-notification-service';

const router = Router();

// SECURITY FIX: Apply admin authentication to ALL admin routes
router.use(authMiddleware.instance.authenticate());
router.use(authMiddleware.instance.requirePermissions(['admin:access']));

// ROADMAP V4: Mount transcripts admin router
router.use('/transcripts', transcriptsRouter);

// Mock data for admin metrics (in a real app, this would come from a database)
interface APIMetric {
  id: string;
  provider: string;
  endpoint: string;
  method: string;
  timestamp: number;
  responseTime: number;
  status: 'success' | 'error' | 'rate_limited' | 'timeout';
  statusCode?: number;
  errorType?: string;
  errorMessage?: string;
  requestSize?: number;
  responseSize?: number;
  cacheHit: boolean;
  quotaUsed?: number;
  quotaRemaining?: number;
  apiKeyId?: string;
  symbol?: string;
  dataType?: string;
  userAgent?: string;
  region?: string;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  lastCheck: number;
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded' | 'maintenance';
    responseTime?: number;
    lastCheck: number;
    endpoint?: string;
    description?: string;
  }>;
  overallScore?: number;
}

interface AlertData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  isRead?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Mock data storage (in production, use a proper database)
let metricsData: APIMetric[] = [];
let systemHealthData: SystemHealth = {
  status: 'healthy',
  uptime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
  lastCheck: Date.now(),
  services: [
    {
      name: 'Alpha Vantage API',
      status: 'online',
      responseTime: 245,
      lastCheck: Date.now(),
      endpoint: 'https://www.alphavantage.co',
      description: 'Stock market data provider'
    },
    {
      name: 'Finnhub API',
      status: 'online',
      responseTime: 180,
      lastCheck: Date.now(),
      endpoint: 'https://finnhub.io',
      description: 'Financial data provider'
    },
    {
      name: 'Twelve Data API',
      status: 'online',
      responseTime: 320,
      lastCheck: Date.now(),
      endpoint: 'https://api.twelvedata.com',
      description: 'Real-time and historical market data'
    },
    {
      name: 'Database',
      status: 'online',
      responseTime: 45,
      lastCheck: Date.now(),
      description: 'Application database'
    },
    {
      name: 'Cache System',
      status: 'online',
      responseTime: 12,
      lastCheck: Date.now(),
      description: 'Redis cache layer'
    }
  ],
  overallScore: 98
};

let alertsData: AlertData[] = [
  {
    id: '1',
    type: 'warning',
    title: 'High API Usage',
    message: 'Alpha Vantage API usage is at 85% of daily limit',
    timestamp: Date.now() - (15 * 60 * 1000), // 15 minutes ago
    isRead: false,
    severity: 'medium'
  },
  {
    id: '2',
    type: 'info',
    title: 'Cache Performance',
    message: 'Cache hit rate improved to 94.2%',
    timestamp: Date.now() - (30 * 60 * 1000), // 30 minutes ago
    isRead: true,
    severity: 'low'
  }
];

// Generate mock metrics data
function generateMockMetrics(count: number = 1000): APIMetric[] {
  const providers = ['alphavantage', 'finnhub', 'twelvedata', 'iexcloud'];
  const endpoints = ['/quote', '/time_series', '/company_profile', '/earnings', '/news'];
  const methods = ['GET', 'POST'] as const;
  const statuses = ['success', 'error', 'rate_limited', 'timeout'] as const;
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA'];
  
  const metrics: APIMetric[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    // Bias towards more recent timestamps
    const hoursAgo = Math.floor(Math.random() * 24 * 7); // Up to 7 days ago
    const timestamp = now - (hoursAgo * 60 * 60 * 1000);
    
    // Generate realistic response times based on provider
    let baseResponseTime = 200;
    switch (provider) {
      case 'alphavantage': baseResponseTime = 250; break;
      case 'finnhub': baseResponseTime = 180; break;
      case 'twelvedata': baseResponseTime = 320; break;
      case 'iexcloud': baseResponseTime = 150; break;
    }
    
    const responseTime = Math.max(50, baseResponseTime + (Math.random() - 0.5) * 400);
    
    metrics.push({
      id: `metric_${i}`,
      provider,
      endpoint,
      method,
      timestamp,
      responseTime,
      status,
      statusCode: status === 'success' ? 200 : status === 'rate_limited' ? 429 : 500,
      errorType: status === 'error' ? ['network', 'timeout', 'auth', 'json_parse'][Math.floor(Math.random() * 4)] : undefined,
      errorMessage: status === 'error' ? 'Mock error message' : undefined,
      requestSize: Math.floor(Math.random() * 1000) + 100,
      responseSize: Math.floor(Math.random() * 5000) + 500,
      cacheHit: Math.random() > 0.3, // 70% cache hit rate
      quotaUsed: Math.floor(Math.random() * 500),
      quotaRemaining: Math.floor(Math.random() * 1000) + 500,
      apiKeyId: `key_${provider}_${Math.floor(Math.random() * 3) + 1}`,
      symbol,
      dataType: ['quote', 'historical', 'news', 'earnings'][Math.floor(Math.random() * 4)],
      userAgent: 'AlphaAnalyzer/1.0',
      region: 'us-east-1'
    });
  }
  
  return metrics.sort((a, b) => b.timestamp - a.timestamp);
}

// Initialize with mock data
metricsData = generateMockMetrics(1000);

// Validation schemas
const timeRangeSchema = z.object({
  start: z.coerce.number().optional(),
  end: z.coerce.number().optional(),
  window: z.enum(['5m', '1h', '24h', '7d']).optional()
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(100)
});

// Utility functions
function getTimeWindow(window?: string): { start: number; end: number } {
  const now = Date.now();
  let start = now - (24 * 60 * 60 * 1000); // Default: 24 hours
  
  switch (window) {
    case '5m': start = now - (5 * 60 * 1000); break;
    case '1h': start = now - (60 * 60 * 1000); break;
    case '24h': start = now - (24 * 60 * 60 * 1000); break;
    case '7d': start = now - (7 * 24 * 60 * 60 * 1000); break;
  }
  
  return { start, end: now };
}

function filterMetricsByTime(metrics: APIMetric[], start: number, end: number): APIMetric[] {
  return metrics.filter(m => m.timestamp >= start && m.timestamp <= end);
}

function calculateMetricsSnapshot(metrics: APIMetric[]) {
  if (metrics.length === 0) {
    return {
      totalCalls: 0,
      successfulCalls: 0,
      errorCalls: 0,
      rateLimitedCalls: 0,
      timeoutCalls: 0,
      avgResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      cacheHitRate: 0,
      topErrors: [],
      topSlowEndpoints: [],
      providerStats: {},
      endpointStats: {}
    };
  }

  const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
  const successfulCalls = metrics.filter(m => m.status === 'success').length;
  const errorCalls = metrics.filter(m => m.status === 'error').length;
  const rateLimitedCalls = metrics.filter(m => m.status === 'rate_limited').length;
  const timeoutCalls = metrics.filter(m => m.status === 'timeout').length;
  const cacheHits = metrics.filter(m => m.cacheHit).length;

  // Calculate percentiles
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const medianIndex = Math.floor(responseTimes.length * 0.5);

  // Top errors
  const errorCounts = new Map<string, number>();
  metrics.filter(m => m.errorMessage).forEach(m => {
    const error = m.errorMessage!;
    errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
  });
  const topErrors = Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top slow endpoints
  const endpointTimes = new Map<string, number[]>();
  metrics.forEach(m => {
    const key = `${m.provider}:${m.endpoint}`;
    if (!endpointTimes.has(key)) endpointTimes.set(key, []);
    endpointTimes.get(key)!.push(m.responseTime);
  });
  const topSlowEndpoints = Array.from(endpointTimes.entries())
    .map(([endpoint, times]) => ({
      endpoint,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 5);

  // Provider stats
  const providerStats: Record<string, any> = {};
  const providers = new Set(metrics.map(m => m.provider));
  providers.forEach(provider => {
    const providerMetrics = metrics.filter(m => m.provider === provider);
    providerStats[provider] = {
      calls: providerMetrics.length,
      errors: providerMetrics.filter(m => m.status === 'error').length,
      avgResponseTime: providerMetrics.reduce((sum, m) => sum + m.responseTime, 0) / providerMetrics.length,
      quotaUsage: Math.random() * 100, // Mock quota usage
      quotaRemaining: Math.floor(Math.random() * 1000) + 100
    };
  });

  // Endpoint stats
  const endpointStats: Record<string, any> = {};
  const endpoints = new Set(metrics.map(m => `${m.provider}:${m.endpoint}`));
  endpoints.forEach(endpoint => {
    const endpointMetrics = metrics.filter(m => `${m.provider}:${m.endpoint}` === endpoint);
    const cacheHitsForEndpoint = endpointMetrics.filter(m => m.cacheHit).length;
    
    endpointStats[endpoint] = {
      calls: endpointMetrics.length,
      errors: endpointMetrics.filter(m => m.status === 'error').length,
      avgResponseTime: endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0) / endpointMetrics.length,
      cacheHitRate: (cacheHitsForEndpoint / endpointMetrics.length) * 100
    };
  });

  return {
    totalCalls: metrics.length,
    successfulCalls,
    errorCalls,
    rateLimitedCalls,
    timeoutCalls,
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    medianResponseTime: responseTimes[medianIndex] || 0,
    p95ResponseTime: responseTimes[p95Index] || 0,
    cacheHitRate: (cacheHits / metrics.length) * 100,
    topErrors,
    topSlowEndpoints,
    providerStats,
    endpointStats
  };
}

// Routes

// GET /api/admin/metrics - Get API usage metrics
router.get('/metrics', (req, res) => {
  try {
    const query = timeRangeSchema.parse(req.query);
    const { start, end } = query.start && query.end 
      ? { start: query.start, end: query.end }
      : getTimeWindow(query.window);
    
    const filteredMetrics = filterMetricsByTime(metricsData, start, end);
    const snapshot = calculateMetricsSnapshot(filteredMetrics);
    
    res.json({
      success: true,
      data: {
        timeRange: { start, end },
        metrics: snapshot,
        raw: filteredMetrics.slice(0, 100) // Return first 100 raw metrics
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// GET /api/admin/system-health - Get system health status
router.get('/system-health', (req, res) => {
  try {
    // Update system health data
    systemHealthData.lastCheck = Date.now();
    systemHealthData.uptime = Date.now() - (systemHealthData.uptime || Date.now());
    
    // Simulate service health checks
    systemHealthData.services.forEach(service => {
      service.lastCheck = Date.now();
      service.responseTime = Math.random() * 500 + 50; // 50-550ms
      
      // Occasionally simulate service issues
      if (Math.random() < 0.05) { // 5% chance of issues
        service.status = 'degraded';
        service.responseTime = Math.random() * 2000 + 1000; // 1-3 seconds
      } else {
        service.status = 'online';
      }
    });
    
    // Calculate overall status
    const degradedServices = systemHealthData.services.filter(s => s.status === 'degraded').length;
    const offlineServices = systemHealthData.services.filter(s => s.status === 'offline').length;
    
    if (offlineServices > 0) {
      systemHealthData.status = 'critical';
      systemHealthData.overallScore = Math.max(0, 100 - (offlineServices * 30) - (degradedServices * 10));
    } else if (degradedServices > 0) {
      systemHealthData.status = 'warning';
      systemHealthData.overallScore = Math.max(60, 100 - (degradedServices * 15));
    } else {
      systemHealthData.status = 'healthy';
      systemHealthData.overallScore = 100;
    }
    
    res.json({
      success: true,
      data: systemHealthData
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health'
    });
  }
});

// GET /api/admin/cache-stats - Get cache performance metrics
router.get('/cache-stats', (req, res) => {
  try {
    const query = timeRangeSchema.parse(req.query);
    const { start, end } = query.start && query.end 
      ? { start: query.start, end: query.end }
      : getTimeWindow(query.window);
    
    const filteredMetrics = filterMetricsByTime(metricsData, start, end);
    const cacheHits = filteredMetrics.filter(m => m.cacheHit);
    const cacheMisses = filteredMetrics.filter(m => !m.cacheHit);
    
    const cacheStats = {
      totalRequests: filteredMetrics.length,
      cacheHits: cacheHits.length,
      cacheMisses: cacheMisses.length,
      hitRate: filteredMetrics.length > 0 ? (cacheHits.length / filteredMetrics.length) * 100 : 0,
      avgResponseTimeWithCache: cacheHits.length > 0 
        ? cacheHits.reduce((sum, m) => sum + m.responseTime, 0) / cacheHits.length 
        : 0,
      avgResponseTimeWithoutCache: cacheMisses.length > 0 
        ? cacheMisses.reduce((sum, m) => sum + m.responseTime, 0) / cacheMisses.length 
        : 0,
      cacheEfficiency: cacheHits.length > 0 && cacheMisses.length > 0 
        ? ((cacheMisses.reduce((sum, m) => sum + m.responseTime, 0) / cacheMisses.length) - 
           (cacheHits.reduce((sum, m) => sum + m.responseTime, 0) / cacheHits.length)) / 
          (cacheMisses.reduce((sum, m) => sum + m.responseTime, 0) / cacheMisses.length) * 100
        : 0
    };
    
    res.json({
      success: true,
      data: cacheStats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics'
    });
  }
});

// GET /api/admin/alerts - Get system alerts
router.get('/alerts', (req, res) => {
  try {
    const query = paginationSchema.parse(req.query);
    const { page, limit } = query;
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedAlerts = alertsData.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        alerts: paginatedAlerts,
        pagination: {
          page,
          limit,
          total: alertsData.length,
          pages: Math.ceil(alertsData.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// POST /api/admin/alerts/:id/read - Mark alert as read
router.post('/alerts/:id/read', (req, res) => {
  try {
    const alertId = req.params.id;
    const alert = alertsData.find(a => a.id === alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
    
    alert.isRead = true;
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark alert as read'
    });
  }
});

// GET /api/admin/quota-status - Get API quota status
router.get('/quota-status', (req, res) => {
  try {
    const providers = ['alphavantage', 'finnhub', 'twelvedata', 'iexcloud', 'polygon'];
    
    const quotaStatus = providers.map(provider => {
      const dailyLimit = Math.floor(Math.random() * 1000) + 500;
      const currentUsage = Math.floor(Math.random() * dailyLimit);
      
      return {
        provider,
        dailyLimit,
        minuteLimit: Math.floor(dailyLimit / 100),
        currentDailyUsage: currentUsage,
        currentMinuteUsage: Math.floor(Math.random() * 10),
        lastDailyReset: Date.now() - (Math.random() * 24 * 60 * 60 * 1000),
        lastMinuteReset: Date.now() - (Math.random() * 60 * 1000),
        quotaRemaining: dailyLimit - currentUsage,
        usagePercent: (currentUsage / dailyLimit) * 100,
        status: currentUsage / dailyLimit > 0.9 ? 'warning' : 'healthy'
      };
    });
    
    res.json({
      success: true,
      data: quotaStatus
    });
  } catch (error) {
    console.error('Error fetching quota status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quota status'
    });
  }
});

// POST /api/admin/metrics - Add new metric (for testing)
router.post('/metrics', (req, res) => {
  try {
    const metric: APIMetric = {
      id: `metric_${Date.now()}`,
      provider: req.body.provider || 'test',
      endpoint: req.body.endpoint || '/test',
      method: req.body.method || 'GET',
      timestamp: Date.now(),
      responseTime: req.body.responseTime || 200,
      status: req.body.status || 'success',
      cacheHit: req.body.cacheHit || false,
      ...req.body
    };
    
    metricsData.unshift(metric);
    
    // Keep only last 10000 metrics
    if (metricsData.length > 10000) {
      metricsData = metricsData.slice(0, 10000);
    }
    
    res.json({
      success: true,
      data: metric
    });
  } catch (error) {
    console.error('Error adding metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add metric'
    });
  }
});

// GET /api/admin/export - Export metrics data
router.get('/export', (req, res) => {
  try {
    const query = timeRangeSchema.parse(req.query);
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const { start, end } = query.start && query.end 
      ? { start: query.start, end: query.end }
      : getTimeWindow(query.window);
    
    const filteredMetrics = filterMetricsByTime(metricsData, start, end);
    
    if (format === 'csv') {
      const headers = [
        'timestamp', 'provider', 'endpoint', 'method', 'status', 
        'responseTime', 'cacheHit', 'errorType', 'symbol'
      ];
      
      const rows = filteredMetrics.map(m => [
        new Date(m.timestamp).toISOString(),
        m.provider,
        m.endpoint,
        m.method,
        m.status,
        m.responseTime,
        m.cacheHit,
        m.errorType || '',
        m.symbol || ''
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        timeRange: { start, end },
        metrics: filteredMetrics,
        summary: calculateMetricsSnapshot(filteredMetrics)
      });
    }
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export metrics'
    });
  }
});

// ===== AGENTE 3: ALERT ENGINE BACKEND ADMIN ENDPOINTS =====

// GET /api/admin/alert-monitor/status - Get Alert Monitor status
router.get('/alert-monitor/status', (req, res) => {
  try {
    const status = alertMonitor.getStatus();
    const schedulerStats = backgroundScheduler.getStats();
    const schedulerJobs = backgroundScheduler.getJobs();
    
    const alertJob = schedulerJobs.find(job => job.id === 'alert-monitoring');
    
    res.json({
      success: true,
      data: {
        alertMonitor: status,
        schedulerJob: alertJob,
        schedulerStats,
        systemTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
      }
    });
  } catch (error) {
    console.error('Error fetching alert monitor status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert monitor status'
    });
  }
});

// POST /api/admin/alert-monitor/refresh-cache - Force refresh alert cache
router.post('/alert-monitor/refresh-cache', async (req, res) => {
  try {
    await alertMonitor.forceRefreshCache();
    
    res.json({
      success: true,
      message: 'Alert cache refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing alert cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh alert cache'
    });
  }
});

// PUT /api/admin/alert-monitor/config - Update Alert Monitor configuration
router.put('/alert-monitor/config', (req, res) => {
  try {
    const configSchema = z.object({
      enabled: z.boolean().optional(),
      checkInterval: z.number().min(5000).max(300000).optional(), // 5s to 5min
      batchSize: z.number().min(1).max(100).optional(),
      maxSymbolsPerRequest: z.number().min(1).max(50).optional(),
      cacheTimeout: z.number().min(10000).max(600000).optional() // 10s to 10min
    });
    
    const newConfig = configSchema.parse(req.body);
    alertMonitor.updateConfig(newConfig);
    
    res.json({
      success: true,
      message: 'Alert monitor configuration updated',
      config: newConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid configuration', 
        details: error.errors 
      });
    }
    
    console.error('Error updating alert monitor config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert monitor configuration'
    });
  }
});

// POST /api/admin/alert-monitor/start - Start Alert Monitor
router.post('/alert-monitor/start', (req, res) => {
  try {
    alertMonitor.start();
    backgroundScheduler.enableJob('alert-monitoring');
    
    res.json({
      success: true,
      message: 'Alert monitor started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting alert monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start alert monitor'
    });
  }
});

// POST /api/admin/alert-monitor/stop - Stop Alert Monitor
router.post('/alert-monitor/stop', (req, res) => {
  try {
    alertMonitor.stop();
    backgroundScheduler.disableJob('alert-monitoring');
    
    res.json({
      success: true,
      message: 'Alert monitor stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping alert monitor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop alert monitor'
    });
  }
});

// POST /api/admin/alert-monitor/run-now - Force run alert monitoring cycle
router.post('/alert-monitor/run-now', async (req, res) => {
  try {
    await backgroundScheduler.runJobNow('alert-monitoring');
    
    res.json({
      success: true,
      message: 'Alert monitoring cycle executed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running alert monitoring cycle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run alert monitoring cycle'
    });
  }
});

// GET /api/admin/alert-monitor/metrics - Get detailed Alert Monitor metrics
router.get('/alert-monitor/metrics', (req, res) => {
  try {
    const status = alertMonitor.getStatus();
    
    // Enhanced metrics with performance calculations
    const metrics = {
      ...status.metrics,
      performance: {
        alertsPerMinute: status.metrics.cyclesCompleted > 0 
          ? (status.metrics.alertsProcessed / (status.metrics.cyclesCompleted * 0.5)) // 30s cycles
          : 0,
        triggerSuccessRate: status.metrics.alertsProcessed > 0 
          ? (status.metrics.triggersCreated / status.metrics.alertsProcessed) * 100 
          : 0,
        errorRate: status.metrics.alertsProcessed > 0 
          ? (status.metrics.errorsEncountered / status.metrics.alertsProcessed) * 100 
          : 0,
        efficiency: status.metrics.averageProcessingTime > 0 
          ? (1000 / status.metrics.averageProcessingTime) * 100 // alerts per second * 100
          : 0
      },
      cache: status.cacheStatus,
      config: status.config,
      lastUpdate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching alert monitor metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert monitor metrics'
    });
  }
});

// ===== AGENTE 4: PWA PUSH NOTIFICATIONS ADMIN ENDPOINTS =====

// GET /api/admin/push-notifications/status - Get push notification system status
router.get('/push-notifications/status', async (req, res) => {
  try {
    const stats = await pushNotificationService.getSystemStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        vapidConfigured: !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
        systemTime: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
      }
    });
  } catch (error) {
    console.error('Error fetching push notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch push notification system status'
    });
  }
});

// GET /api/admin/push-notifications/subscriptions - Get all push subscriptions
router.get('/push-notifications/subscriptions', async (req, res) => {
  try {
    const query = paginationSchema.parse(req.query);
    const { page, limit } = query;
    
    const subscriptions = await pushNotificationService.getAllSubscriptions(page, limit);
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch push subscriptions'
    });
  }
});

// POST /api/admin/push-notifications/broadcast - Send broadcast notification to all users
router.post('/push-notifications/broadcast', async (req, res) => {
  try {
    const broadcastSchema = z.object({
      title: z.string().min(1).max(100),
      body: z.string().min(1).max(200),
      url: z.string().optional(),
      icon: z.string().optional(),
      badge: z.string().optional(),
      tag: z.string().optional(),
      targetAudience: z.enum(['all', 'subscribed', 'active']).default('subscribed')
    });
    
    const notificationData = broadcastSchema.parse(req.body);
    
    const result = await pushNotificationService.sendBroadcastNotification(
      notificationData.title,
      notificationData.body,
      {
        url: notificationData.url,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag
      },
      notificationData.targetAudience
    );
    
    res.json({
      success: true,
      message: 'Broadcast notification sent successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid notification data', 
        details: error.errors 
      });
    }
    
    console.error('Error sending broadcast notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send broadcast notification'
    });
  }
});

// DELETE /api/admin/push-notifications/subscriptions/:subscriptionId - Remove specific subscription
router.delete('/push-notifications/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const subscriptionId = parseInt(req.params.subscriptionId);
    
    if (isNaN(subscriptionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription ID'
      });
    }
    
    const result = await pushNotificationService.removeSubscription(subscriptionId);
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Subscription removed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove push subscription'
    });
  }
});

// POST /api/admin/push-notifications/test-user - Send test notification to specific user
router.post('/push-notifications/test-user', async (req, res) => {
  try {
    const testSchema = z.object({
      userId: z.string().min(1),
      title: z.string().min(1).max(100).default('Test Notification'),
      body: z.string().min(1).max(200).default('This is a test notification from the admin panel'),
      url: z.string().optional()
    });
    
    const testData = testSchema.parse(req.body);
    
    const result = await pushNotificationService.sendPushToUser(
      testData.userId,
      {
        title: testData.title,
        body: testData.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: {
          type: 'admin-test',
          url: testData.url || '/dashboard'
        },
        tag: 'admin-test'
      }
    );
    
    res.json({
      success: true,
      message: `Test notification sent to user ${testData.userId}`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid test data', 
        details: error.errors 
      });
    }
    
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// GET /api/admin/push-notifications/analytics - Get push notification analytics
router.get('/push-notifications/analytics', async (req, res) => {
  try {
    const timeRangeQuery = timeRangeSchema.parse(req.query);
    const { start, end } = timeRangeQuery.start && timeRangeQuery.end 
      ? { start: timeRangeQuery.start, end: timeRangeQuery.end }
      : getTimeWindow(timeRangeQuery.window);
    
    const analytics = await pushNotificationService.getAnalytics(start, end);
    
    res.json({
      success: true,
      data: {
        timeRange: { start, end },
        analytics
      }
    });
  } catch (error) {
    console.error('Error fetching push notification analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch push notification analytics'
    });
  }
});

// PUT /api/admin/push-notifications/config - Update push notification system configuration
router.put('/push-notifications/config', async (req, res) => {
  try {
    const configSchema = z.object({
      enabled: z.boolean().optional(),
      defaultIcon: z.string().optional(),
      defaultBadge: z.string().optional(),
      ttl: z.number().min(0).max(86400).optional(), // Max 24 hours
      urgency: z.enum(['very-low', 'low', 'normal', 'high']).optional(),
      maxDailyNotifications: z.number().min(1).max(100).optional()
    });
    
    const newConfig = configSchema.parse(req.body);
    
    // Update the push notification service configuration
    await pushNotificationService.updateConfig(newConfig);
    
    res.json({
      success: true,
      message: 'Push notification configuration updated',
      config: newConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid configuration', 
        details: error.errors 
      });
    }
    
    console.error('Error updating push notification config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update push notification configuration'
    });
  }
});

// POST /api/admin/push-notifications/cleanup - Cleanup expired subscriptions
router.post('/push-notifications/cleanup', async (req, res) => {
  try {
    const result = await pushNotificationService.cleanupExpiredSubscriptions();
    
    res.json({
      success: true,
      message: 'Expired subscriptions cleaned up successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up push subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired subscriptions'
    });
  }
});

export default router;