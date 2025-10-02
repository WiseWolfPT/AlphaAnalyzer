/**
 * Admin Dashboard - Painel Principal de Administração
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  Activity,
  Database,
  Settings,
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useAdminAccess } from '@/components/admin/AdminRoute';

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { permissions, isSuperAdmin } = useAdminAccess();

  const adminSections = [
    {
      title: 'Gestão de Utilizadores',
      description: 'Gerir utilizadores, roles e permissões',
      icon: Users,
      path: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      permission: 'canManageUsers',
      stats: 'Total: 8 utilizadores'
    },
    {
      title: 'Transcrições',
      description: 'Gerir transcrições de earnings calls',
      icon: FileText,
      path: '/admin/transcripts',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      permission: 'canManageTranscripts',
      stats: 'Pendentes: 3'
    },
    {
      title: 'API Monitoring',
      description: 'Monitorizar uso e performance das APIs',
      icon: Activity,
      path: '/admin/api-monitoring',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      permission: 'canViewApiMonitoring',
      stats: 'Status: Operacional'
    },
    {
      title: 'Cache Management',
      description: 'Gerir cache Redis e otimização',
      icon: Database,
      path: '/admin/cache',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      permission: 'canViewApiMonitoring',
      stats: 'Hit Rate: 92%'
    },
    {
      title: 'Configurações',
      description: 'Configurações do sistema',
      icon: Settings,
      path: '/admin/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      permission: 'canManageSettings',
      stats: 'Última atualização: Hoje'
    }
  ];

  // Estatísticas rápidas
  const quickStats = [
    { label: 'Utilizadores Ativos', value: '1,247', change: '+12%', icon: Users },
    { label: 'API Calls Hoje', value: '8,543', change: '+23%', icon: Activity },
    { label: 'Cache Hit Rate', value: '92%', change: '+5%', icon: Database },
    { label: 'Receita Mensal', value: '€4,231', change: '+18%', icon: DollarSign }
  ];

  const canAccess = (permission?: string) => {
    if (isSuperAdmin) return true;
    if (!permission || !permissions) return false;
    return permissions[permission as keyof typeof permissions];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de administração do Alfalyzer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          <span className="font-semibold">
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> vs mês anterior
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin Sections */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => {
          const Icon = section.icon;
          const hasAccess = canAccess(section.permission);

          return (
            <Card
              key={section.path}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                !hasAccess ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => hasAccess && setLocation(section.path)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${section.bgColor}`}>
                    <Icon className={`w-6 h-6 ${section.color}`} />
                  </div>
                  {hasAccess && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <CardTitle className="mt-4">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.stats}</p>
                {!hasAccess && (
                  <p className="text-xs text-red-500 mt-2">
                    Sem permissão de acesso
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimas ações administrativas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium">Nova transcrição adicionada</p>
                  <p className="text-xs text-muted-foreground">AAPL Q4 2024 - há 2 horas</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium">Cache limpo com sucesso</p>
                  <p className="text-xs text-muted-foreground">Redis cache reset - há 5 horas</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium">API limit alcançado</p>
                  <p className="text-xs text-muted-foreground">Alpha Vantage - há 1 dia</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Saúde do Sistema</CardTitle>
            <CardDescription>Status dos serviços principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Backend API</span>
                <span className="text-sm text-green-600 font-medium">Operacional</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Redis Cache</span>
                <span className="text-sm text-green-600 font-medium">Operacional</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Supabase</span>
                <span className="text-sm text-green-600 font-medium">Conectado</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Workers</span>
                <span className="text-sm text-yellow-600 font-medium">2 ativos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas de Performance</CardTitle>
            <CardDescription>Últimas 24 horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Tempo de resposta médio</span>
                <span className="text-sm font-medium">125ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de erro</span>
                <span className="text-sm font-medium">0.03%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">99.98%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Requisições totais</span>
                <span className="text-sm font-medium">45.2k</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}