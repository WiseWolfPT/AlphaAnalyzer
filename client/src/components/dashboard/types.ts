// TypeScript interfaces for dashboard components
export interface MetricData {
  value: number | string;
  label: string;
  change?: number;
  changeType?: 'percentage' | 'absolute' | 'duration';
  trend?: 'up' | 'down' | 'neutral';
  target?: number;
  unit?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface APIUsageData {
  timestamp: number | string;
  requests: number;
  errors?: number;
  latency?: number;
  endpoint?: string;
}

export interface PerformanceData {
  timestamp: number | string;
  responseTime: number;
  throughput?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  activeConnections?: number;
}

export interface ErrorData {
  timestamp: number | string;
  count: number;
  type: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  stack?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  lastCheck: number;
  services: ServiceHealth[];
  overallScore?: number;
}

export interface ServiceHealth {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  responseTime?: number;
  lastCheck: number;
  endpoint?: string;
  description?: string;
}

export interface AlertData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  isRead?: boolean;
  actions?: AlertAction[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'secondary';
}

export interface APIKeyUsage {
  keyId: string;
  name: string;
  requests: number;
  requestsLimit: number;
  lastUsed: number;
  status: 'active' | 'expired' | 'suspended' | 'rate_limited';
  rotationScheduled?: number;
  provider?: string;
  costEstimate?: number;
}

export interface DashboardTimeRange {
  label: string;
  value: string;
  hours?: number;
  days?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
  retryCount?: number;
  lastFetch?: number;
}

export interface ChartConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  gradients: {
    [key: string]: string;
  };
}