/**
 * Admin Route Protection Component
 * Ensures only admin users can access admin pages
 */

import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { AdminLayout } from './admin-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

interface AdminCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function AdminRoute({ children, requireSuperAdmin = false }: AdminRouteProps) {
  const [, setLocation] = useLocation();
  const [adminCheck, setAdminCheck] = useState<AdminCheck>({
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      // Check if user has admin access by calling admin endpoint
      const response = await fetch('/api/admin/auth/check', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // Not authenticated
        setAdminCheck({ isAdmin: false, isSuperAdmin: false, loading: false, error: 'Not authenticated' });
        return;
      }

      if (response.status === 403) {
        // Authenticated but not admin
        setAdminCheck({ isAdmin: false, isSuperAdmin: false, loading: false, error: 'Admin access required' });
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAdminCheck({
          isAdmin: data.isAdmin,
          isSuperAdmin: data.isSuperAdmin,
          loading: false,
          error: null
        });
      } else {
        throw new Error('Failed to check admin status');
      }
    } catch (error) {
      console.error('Admin status check failed:', error);
      setAdminCheck({
        isAdmin: false,
        isSuperAdmin: false,
        loading: false,
        error: 'Failed to verify admin status'
      });
    }
  };

  // Loading state
  if (adminCheck.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
            <h2 className="text-xl font-semibold mb-2">Verificando Acesso</h2>
            <p className="text-gray-600">Validando permissões de administrador...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (adminCheck.error === 'Not authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <LogIn className="w-12 h-12 mx-auto mb-4 text-orange-600" />
            <h2 className="text-xl font-semibold mb-2">Autenticação Necessária</h2>
            <p className="text-gray-600 mb-6">
              Faça login para acessar o painel administrativo.
            </p>
            <Button onClick={() => setLocation('/login')} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not admin or insufficient permissions
  if (!adminCheck.isAdmin || (requireSuperAdmin && !adminCheck.isSuperAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-6">
              {requireSuperAdmin 
                ? 'Você precisa de permissões de super administrador para acessar esta área.'
                : 'Você precisa de permissões de administrador para acessar esta área.'
              }
            </p>
            <div className="space-y-2">
              <Button onClick={() => setLocation('/dashboard')} className="w-full">
                Voltar ao Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={checkAdminStatus} 
                className="w-full"
              >
                Verificar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin access granted
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}