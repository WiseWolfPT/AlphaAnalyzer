/**
 * Admin Route Protection Component
 * Ensures only admin users can access admin pages
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

interface AdminPermissionFlags {
  canViewDashboard: boolean;
  canManageUsers: boolean;
  canManageTranscripts: boolean;
  canViewApiMonitoring: boolean;
  canManageSettings: boolean;
  canManageAdmins: boolean;
  canViewSystemLogs: boolean;
  canManageBilling: boolean;
}

interface AdminAccessContextValue {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: AdminPermissionFlags | null;
  isLoadingPermissions: boolean;
  refreshPermissions: () => Promise<void>;
}

export const AdminAccessContext = createContext<AdminAccessContextValue | undefined>(undefined);

export function useAdminAccess(): AdminAccessContextValue {
  const context = useContext(AdminAccessContext);
  if (!context) {
    throw new Error('useAdminAccess must be used within an AdminRoute context');
  }
  return context;
}

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const directToken = window.localStorage.getItem('auth_token');
    if (directToken) {
      return directToken;
    }

    // Fallback: Supabase stores sessions under keys like sb-<project>-auth-token
    let supabaseAuthKey: string | null = null;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
        supabaseAuthKey = key;
        break;
      }
    }

    if (!supabaseAuthKey) {
      return null;
    }

    const rawValue = window.localStorage.getItem(supabaseAuthKey);
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (typeof parsed === 'string') {
        return parsed;
      }

      if (parsed?.access_token) {
        return parsed.access_token;
      }

      if (parsed?.currentSession?.access_token) {
        return parsed.currentSession.access_token;
      }
    } catch {
      // Value might already be the raw token string
      if (rawValue.startsWith('ey')) {
        return rawValue;
      }
    }
  } catch (error) {
    console.warn('Failed to read auth token from storage', error);
  }

  return null;
}

function buildAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getStoredAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function AdminRoute({ children, requireSuperAdmin = false }: AdminRouteProps) {
  const [, setLocation] = useLocation();
  const [adminCheck, setAdminCheck] = useState<AdminCheck>({
    isAdmin: false,
    isSuperAdmin: false,
    loading: true,
    error: null,
  });
  const [permissions, setPermissions] = useState<AdminPermissionFlags | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const response = await fetch('/api/admin/auth/permissions', {
        headers: buildAuthHeaders(),
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        setPermissions(null);
        return;
      }

      const data = await response.json();
      setPermissions(data.permissions as AdminPermissionFlags);
    } catch (error) {
      console.error('Failed to load admin permissions:', error);
      setPermissions(null);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/auth/check', {
        headers: buildAuthHeaders(),
        credentials: 'include', // Include cookies for authentication
      });

      if (response.status === 401) {
        setAdminCheck({ isAdmin: false, isSuperAdmin: false, loading: false, error: 'Not authenticated' });
        setPermissions(null);
        return;
      }

      if (response.status === 403) {
        setAdminCheck({ isAdmin: false, isSuperAdmin: false, loading: false, error: 'Admin access required' });
        setPermissions(null);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAdminCheck({
          isAdmin: data.isAdmin,
          isSuperAdmin: data.isSuperAdmin,
          loading: false,
          error: null,
        });

        if (data.isAdmin) {
          await loadPermissions();
        } else {
          setPermissions(null);
        }
      } else {
        throw new Error('Failed to check admin status');
      }
    } catch (error) {
      console.error('Admin status check failed:', error);
      setAdminCheck({
        isAdmin: false,
        isSuperAdmin: false,
        loading: false,
        error: 'Failed to verify admin status',
      });
      setPermissions(null);
    }
  };

  // Loading state
  if (adminCheck.loading || (adminCheck.isAdmin && permissionsLoading)) {
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

  const contextValue = useMemo<AdminAccessContextValue>(() => ({
    isAdmin: adminCheck.isAdmin,
    isSuperAdmin: adminCheck.isSuperAdmin,
    permissions,
    isLoadingPermissions: permissionsLoading,
    refreshPermissions: loadPermissions,
  }), [adminCheck.isAdmin, adminCheck.isSuperAdmin, permissions, permissionsLoading]);

  // Admin access granted
  return (
    <AdminAccessContext.Provider value={contextValue}>
      <AdminLayout>
        {children}
      </AdminLayout>
    </AdminAccessContext.Provider>
  );
}
