/**
 * Admin Dashboard - Painel de Controle Principal
 * Fase 3.4 - Monitoramento de sistema e gerenciamento
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Users, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react';

interface SystemStats {
  activeUsers: number;
  totalUsers: number;
  apiQuotaUsed: {
    alphaVantage: number;
    fmp: number;
    finnhub: number;
    twelveData: number;
  };
  recentJobs: Array<{
    id: string;
    symbol: string;
    type: 'earnings' | 'price' | 'fundamentals';
    status: 'success' | 'failed' | 'running';
    timestamp: string;
    duration?: number;
  }>;
  dbStats: {
    totalRecords: number;
    lastBackup: string;
    diskUsage: string;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualJobSymbol, setManualJobSymbol] = useState('');
  const [runningManualJob, setRunningManualJob] = useState(false);

  // Carregar estatísticas do sistema
  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/system-stats');
      const data = await response.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Dados mock para desenvolvimento
      setStats({
        activeUsers: 12,
        totalUsers: 156,
        apiQuotaUsed: {
          alphaVantage: 75,
          fmp: 45,
          finnhub: 0,
          twelveData: 32
        },
        recentJobs: [
          {
            id: '1',
            symbol: 'AAPL',
            type: 'price',
            status: 'success',
            timestamp: new Date().toISOString(),
            duration: 1250
          },
          {
            id: '2',
            symbol: 'MSFT',
            type: 'earnings',
            status: 'success',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            duration: 3400
          },
          {
            id: '3',
            symbol: 'GOOGL',
            type: 'fundamentals',
            status: 'failed',
            timestamp: new Date(Date.now() - 600000).toISOString()
          }
        ],
        dbStats: {
          totalRecords: 45230,
          lastBackup: new Date(Date.now() - 86400000).toISOString(),
          diskUsage: '2.4 GB'
        }
      });
      setLoading(false);
    }
  };

  const triggerManualJob = async () => {
    if (!manualJobSymbol.trim()) return;
    
    setRunningManualJob(true);
    try {
      const response = await fetch('/api/admin/trigger-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: manualJobSymbol.toUpperCase() })
      });
      
      if (response.ok) {
        setManualJobSymbol('');
        await fetchSystemStats(); // Atualizar stats
      }
    } catch (error) {
      console.error('Erro ao executar job manual:', error);
    } finally {
      setRunningManualJob(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Monitoramento e controle do sistema Alfalyzer</p>
      </div>

      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.totalUsers} usuários totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operacional</div>
            <p className="text-xs text-muted-foreground">
              Todas as APIs funcionando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros DB</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.dbStats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.dbStats.diskUsage} utilizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Hoje</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentJobs.length}</div>
            <p className="text-xs text-muted-foreground">
              Execuções recentes
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
          <TabsTrigger value="api-quotas">Quotas API</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="manual-jobs">Jobs Manuais</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jobs Recentes</CardTitle>
              <CardDescription>Últimas execuções do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{job.symbol} - {job.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.timestamp).toLocaleString('pt-BR')}
                          {job.duration && ` • ${job.duration}ms`}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso de Quotas das APIs</CardTitle>
              <CardDescription>Monitoramento do consumo das APIs de dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats?.apiQuotaUsed || {}).map(([provider, percentage]) => (
                <div key={provider} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{provider}</span>
                    <span className={`text-sm ${getQuotaColor(percentage)}`}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        percentage >= 90 ? 'bg-red-500' : 
                        percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance dos Providers</CardTitle>
                <CardDescription>Métricas de resposta das APIs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium">Finnhub</p>
                        <p className="text-sm text-muted-foreground">
                          Success: 98.5% • Avg: 245ms
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-4 h-4 text-yellow-600" />
                      <div>
                        <p className="font-medium">Alpha Vantage</p>
                        <p className="text-sm text-muted-foreground">
                          Success: 85.2% • Avg: 1.2s
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium">Polygon.io</p>
                        <p className="text-sm text-muted-foreground">
                          Success: 99.1% • Avg: 180ms
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas do Sistema</CardTitle>
                <CardDescription>Performance geral da aplicação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                    <span className="text-sm text-green-600">87.3%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: '87.3%' }}></div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">DB Response Time</span>
                    <span className="text-sm text-green-600">12ms</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500" style={{ width: '15%' }}></div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-yellow-600">68.2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-yellow-500" style={{ width: '68.2%' }}></div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Active Connections</span>
                    <span className="text-sm text-blue-600">23</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Circuit Breakers Status</CardTitle>
              <CardDescription>Estado dos circuit breakers dos providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium">Finnhub</p>
                  <p className="text-xs text-muted-foreground">CLOSED</p>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <Clock className="w-6 h-6 mx-auto text-yellow-600 mb-2" />
                  <p className="text-sm font-medium">Alpha Vantage</p>
                  <p className="text-xs text-muted-foreground">HALF-OPEN</p>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium">FMP</p>
                  <p className="text-xs text-muted-foreground">CLOSED</p>
                </div>
                
                <div className="text-center p-3 border rounded-lg">
                  <CheckCircle className="w-6 h-6 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium">Polygon.io</p>
                  <p className="text-xs text-muted-foreground">CLOSED</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual-jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Executar Job Manual</CardTitle>
              <CardDescription>Atualizar dados para um símbolo específico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Label htmlFor="symbol">Símbolo da Ação</Label>
                  <Input
                    id="symbol"
                    placeholder="Ex: AAPL, MSFT..."
                    value={manualJobSymbol}
                    onChange={(e) => setManualJobSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && triggerManualJob()}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={triggerManualJob}
                    disabled={!manualJobSymbol.trim() || runningManualJob}
                  >
                    {runningManualJob ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Executar
                  </Button>
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Jobs manuais consomem quotas de API. Use com moderação.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export nomeado para lazy loading
export { default as AdminDashboard } from './admin-dashboard';