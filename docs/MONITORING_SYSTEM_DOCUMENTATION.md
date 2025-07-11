# Alfalyzer Monitoring System Documentation

## 📊 Overview

The Alfalyzer monitoring system provides comprehensive observability across all aspects of the financial platform, from user experience to API performance. This documentation covers the complete monitoring architecture, setup procedures, and operational guidelines.

## 🏗️ Architecture Overview

### Core Components

1. **Sentry Integration** - Error tracking and performance monitoring
2. **Google Analytics 4** - User behavior and engagement analytics
3. **Web Vitals Monitoring** - Core performance metrics
4. **Custom Dashboards** - Real-time operational dashboards
5. **Performance Hooks** - Component-level performance tracking

### Data Flow

```
User Actions → Client Monitoring → Sentry/GA4 → Custom Dashboards → Alerts
     ↓              ↓                ↓           ↓              ↓
API Calls → Performance Hooks → Aggregation → Visualization → Insights
```

## 🚀 Setup and Configuration

### 1. Environment Variables

Create a `.env` file with the following monitoring configurations:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Performance Monitoring
VITE_PERFORMANCE_MONITORING=true
VITE_WEB_VITALS_ENABLED=true
VITE_SESSION_REPLAY_ENABLED=true
```

### 2. Sentry Setup

The Sentry integration is configured in `client/src/lib/monitoring.tsx`:

```typescript
import { initializeMonitoring } from '@/lib/monitoring';

// Initialize in your main App component
useEffect(() => {
  initializeMonitoring();
}, []);
```

**Key Features:**
- Error tracking with stack traces
- Performance monitoring with Web Vitals
- Session replay for debugging
- User context tracking
- Custom financial platform tags

### 3. Google Analytics 4 Setup

GA4 is automatically initialized when a valid `VITE_GA_MEASUREMENT_ID` is provided:

```typescript
// Custom events tracking
analytics.trackStockSearch('AAPL', 'NYSE');
analytics.trackPortfolioAction('buy', 'TSLA', 1000);
analytics.trackApiCall('alpha-vantage', 'quote', 850, true);
```

### 4. Performance Monitoring

Enable performance hooks in components:

```typescript
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

function MyComponent() {
  const { metrics } = usePerformanceMonitor('MyComponent', {
    reportThreshold: 16, // 60fps threshold
    trackMemory: true
  });
  
  return <div>Component content</div>;
}
```

## 📈 Dashboard System

### 1. API Health Dashboard

**Location:** `/client/src/components/admin/api-health-dashboard.tsx`

**Features:**
- Real-time API provider status
- Response time monitoring
- Quota usage tracking
- Endpoint health metrics
- Error rate analysis

**Key Metrics:**
- Total API requests
- Average response time
- Error rate percentage
- Provider uptime
- Quota utilization

**Usage:**
```typescript
import APIHealthDashboard from '@/components/admin/api-health-dashboard';

// Access via admin routes
<Route path="/admin/api-health" component={APIHealthDashboard} />
```

### 2. Real User Monitoring (RUM) Dashboard

**Location:** `/client/src/components/admin/rum-dashboard.tsx`

**Features:**
- Live user session tracking
- Web Vitals monitoring
- User flow analysis
- Device and browser analytics
- Performance score tracking

**Key Metrics:**
- Active users
- Session duration
- Bounce rate
- Conversion rate
- Web Vitals scores (FCP, LCP, FID, CLS, TTFB)

**Usage:**
```typescript
import RUMDashboard from '@/components/admin/rum-dashboard';

// Time range filtering
const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
```

### 3. Error Monitoring Dashboard

**Location:** `/client/src/components/admin/error-monitoring-dashboard.tsx`

**Features:**
- Error tracking and categorization
- Resolution management
- Error trend analysis
- Affected user tracking
- Stack trace visualization

**Key Metrics:**
- Total errors
- Error rate
- Average resolution time
- Critical issues
- Affected users

**Error Categories:**
- `javascript` - Frontend JavaScript errors
- `api` - Backend API errors
- `network` - Network-related errors
- `validation` - Data validation errors
- `security` - Security-related alerts

### 4. Performance Metrics Dashboard

**Location:** `/client/src/components/admin/performance-metrics-dashboard.tsx`

**Features:**
- Overall performance scoring
- Component performance analysis
- Bundle size optimization
- Network performance metrics
- Web Vitals radar chart

**Key Metrics:**
- Overall performance score
- Load time
- Bundle size
- Memory usage
- Network latency

## 🔧 Performance Hooks

### usePerformanceMonitor

Track component-level performance:

```typescript
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

const { metrics, reset } = usePerformanceMonitor('ComponentName', {
  trackMemory: true,
  sampleRate: 1.0,
  reportThreshold: 16,
  onReport: (metrics) => {
    console.log('Performance report:', metrics);
  }
});
```

### useDataLoadingPerformance

Monitor data loading operations:

```typescript
import { useDataLoadingPerformance } from '@/hooks/use-performance-monitor';

const { loadingMetrics, startLoading, endLoading } = useDataLoadingPerformance();

// Usage
const fetchData = async () => {
  startLoading();
  try {
    const data = await apiCall();
    endLoading(data.length, false);
  } catch (error) {
    endLoading(0, true);
  }
};
```

### useMemoryMonitor

Track memory usage patterns:

```typescript
import { useMemoryMonitor } from '@/hooks/use-performance-monitor';

const memoryStats = useMemoryMonitor(5000); // Check every 5 seconds

// Access memory trends
console.log('Memory trend:', memoryStats.trend);
console.log('Current usage:', memoryStats.current);
```

## 📊 Metrics and Thresholds

### Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| FCP (First Contentful Paint) | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| FID (First Input Delay) | ≤ 100ms | ≤ 300ms | > 300ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| TTFB (Time to First Byte) | ≤ 800ms | ≤ 1.8s | > 1.8s |

### Performance Thresholds

| Component | Excellent | Good | Needs Improvement | Poor |
|-----------|-----------|------|-------------------|------|
| Render Time | < 16ms | < 50ms | < 100ms | ≥ 100ms |
| Memory Usage | < 10MB | < 25MB | < 50MB | ≥ 50MB |
| Re-renders | < 3 | < 10 | < 20 | ≥ 20 |

### API Performance Thresholds

| Metric | Good | Moderate | Poor |
|--------|------|----------|------|
| Response Time | < 500ms | < 2000ms | ≥ 2000ms |
| Error Rate | < 1% | < 5% | ≥ 5% |
| Uptime | > 99.5% | > 99% | ≤ 99% |

## 🔧 Integration Guidelines

### Adding New Monitoring Points

1. **Component Performance Tracking:**
```typescript
// Add to any React component
const MyComponent = withPerformanceTracking(
  OriginalComponent,
  'MyComponent'
);
```

2. **Custom Analytics Events:**
```typescript
// Track financial-specific events
analytics.trackPortfolioAction('rebalance', 'AAPL', 5000);
analytics.trackStockSearch('GOOGL', 'NASDAQ');
```

3. **Error Boundary Integration:**
```typescript
import { FinancialWidgetErrorBoundary } from '@/lib/monitoring';

<FinancialWidgetErrorBoundary>
  <YourFinancialWidget />
</FinancialWidgetErrorBoundary>
```

### API Performance Monitoring

Wrap API calls with performance tracking:

```typescript
import { performanceMonitor } from '@/lib/monitoring';

const fetchStockData = async (symbol: string) => {
  return performanceMonitor.trackApiPerformance(
    () => apiClient.get(`/stocks/${symbol}`),
    'alpha-vantage',
    'stock-quote'
  );
};
```

## 🚨 Alert Configuration

### Critical Alerts

1. **High Error Rate** (> 5%)
2. **API Downtime** (< 95% uptime)
3. **Performance Degradation** (score < 70)
4. **Memory Leaks** (trend increasing)
5. **Security Issues** (failed login attempts)

### Alert Thresholds

```typescript
const alertThresholds = {
  errorRate: 5.0,           // 5% error rate
  responseTime: 2000,       // 2 second response time
  memoryUsage: 100,         // 100MB memory usage
  cpuUsage: 80,             // 80% CPU usage
  consecutiveFailures: 5,   // 5 consecutive failures
  rateLimitUsage: 90        // 90% rate limit usage
};
```

## 📝 Best Practices

### 1. Performance Monitoring

- **Sampling:** Use appropriate sampling rates (1.0 for development, 0.1 for production)
- **Thresholds:** Set realistic performance thresholds based on your infrastructure
- **Memory Tracking:** Monitor memory usage patterns to detect leaks
- **Component Profiling:** Use React DevTools Profiler in conjunction with monitoring

### 2. Error Handling

- **Categorization:** Properly categorize errors by type and severity
- **Context:** Include relevant context (user ID, session, component state)
- **Privacy:** Mask sensitive financial data in error reports
- **Resolution:** Track error resolution time and patterns

### 3. User Experience

- **Web Vitals:** Monitor Core Web Vitals for real user experience
- **User Flows:** Track common user journeys and optimize bottlenecks
- **Device Performance:** Monitor performance across different devices
- **Geographic Performance:** Consider CDN and regional performance

### 4. API Monitoring

- **Provider Rotation:** Monitor multiple API providers for redundancy
- **Quota Management:** Track API usage against quotas
- **Error Patterns:** Identify recurring API issues
- **Response Times:** Monitor and alert on slow API responses

## 🔍 Troubleshooting

### Common Issues

1. **High Memory Usage:**
   - Check for memory leaks in components
   - Review component unmounting
   - Optimize large data structures

2. **Slow Performance:**
   - Analyze bundle size and lazy loading
   - Review component re-render patterns
   - Check for inefficient algorithms

3. **API Errors:**
   - Verify API key configuration
   - Check rate limiting status
   - Review provider-specific error patterns

4. **Monitoring Not Working:**
   - Verify environment variables
   - Check Sentry DSN configuration
   - Ensure GA4 measurement ID is correct

### Debug Commands

```bash
# Check bundle size
npm run build && npm run analyze

# Performance profiling
npm run dev -- --profile

# Memory analysis
node --inspect-brk src/server.js
```

## 📋 Maintenance

### Regular Tasks

1. **Weekly:**
   - Review error reports and resolution times
   - Check performance trends
   - Verify API quota usage

2. **Monthly:**
   - Analyze user behavior patterns
   - Review and update alert thresholds
   - Optimize based on performance data

3. **Quarterly:**
   - Review monitoring tool effectiveness
   - Update performance baselines
   - Assess monitoring costs and ROI

### Monitoring Health Checks

```typescript
// Health check endpoint
app.get('/health/monitoring', (req, res) => {
  const health = {
    sentry: !!process.env.VITE_SENTRY_DSN,
    analytics: !!process.env.VITE_GA_MEASUREMENT_ID,
    performance: process.env.VITE_PERFORMANCE_MONITORING === 'true',
    timestamp: new Date().toISOString()
  };
  
  res.json(health);
});
```

## 🔗 External Resources

### Documentation Links

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Web Vitals Guide](https://web.dev/vitals/)
- [React Performance Profiling](https://reactjs.org/docs/profiler.html)

### Tools and Services

- **Sentry:** Error tracking and performance monitoring
- **Google Analytics 4:** User behavior analytics
- **Web Vitals Library:** Core performance metrics
- **React DevTools:** Component profiling and debugging

---

## 📞 Support

For monitoring system issues or questions:

1. **Check the dashboard status** at `/admin/api-health`
2. **Review recent errors** at `/admin/error-monitoring`
3. **Analyze performance** at `/admin/performance-metrics`
4. **Contact the development team** for persistent issues

---

*This documentation was generated as part of FASE 3 - MATURIDADE implementation.*
*Last updated: January 2025*