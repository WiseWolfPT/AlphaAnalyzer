/**
 * Admin Users Management - Gerenciamento de Usuários
 * Fase 3.4 - Administração de usuários do sistema
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Mail,
  Calendar,
  Activity,
  Shield,
  Trash2,
  Eye
} from 'lucide-react';
import { useAdminAccess } from '@/components/admin/AdminRoute';

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_seen?: string;
  status: 'active' | 'inactive' | 'banned';
  role: 'user' | 'admin';
  portfolio_count: number;
  watchlist_count: number;
  api_requests_today: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  bannedUsers: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { permissions, isSuperAdmin, isLoadingPermissions } = useAdminAccess();
  const canManageUsers = isSuperAdmin || permissions?.canManageUsers;

  useEffect(() => {
    fetchUsers();
    fetchUserStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      // Dados mock para desenvolvimento
      setUsers([
        {
          id: '1',
          email: 'usuario1@exemplo.com',
          name: 'João Silva',
          created_at: '2025-01-15T10:30:00Z',
          last_seen: '2025-07-13T09:15:00Z',
          status: 'active',
          role: 'user',
          portfolio_count: 3,
          watchlist_count: 5,
          api_requests_today: 23
        },
        {
          id: '2',
          email: 'admin@alfalyzer.com',
          name: 'Admin Sistema',
          created_at: '2024-12-01T00:00:00Z',
          last_seen: '2025-07-13T15:30:00Z',
          status: 'active',
          role: 'admin',
          portfolio_count: 1,
          watchlist_count: 8,
          api_requests_today: 145
        },
        {
          id: '3',
          email: 'usuario2@exemplo.com',
          created_at: '2025-07-10T14:20:00Z',
          last_seen: '2025-07-12T18:45:00Z',
          status: 'inactive',
          role: 'user',
          portfolio_count: 0,
          watchlist_count: 2,
          api_requests_today: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/admin/users/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      // Dados mock
      setStats({
        totalUsers: 156,
        activeUsers: 89,
        newUsersToday: 7,
        bannedUsers: 2
      });
    }
  };

  const toggleUserStatus = async (userId: string, newStatus: 'active' | 'banned') => {
    if (!canManageUsers) {
      console.warn('Attempted to toggle user status without permission');
      return;
    }

    try {
      await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!canManageUsers) {
      console.warn('Attempted to delete user without permission');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser revertida.')) {
      return;
    }

    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      setUsers(users.filter(user => user.id !== userId));
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Activity className="w-3 h-3 mr-1" />Inativo</Badge>;
      case 'banned':
        return <Badge className="bg-red-100 text-red-800"><UserX className="w-3 h-3 mr-1" />Banido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'user':
        return <Badge variant="outline">Usuário</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLastSeenText = (lastSeen?: string) => {
    if (!lastSeen) return 'Nunca conectado';
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'Online agora';
    if (diffHours < 24) return `${Math.floor(diffHours)}h atrás`;
    return formatDate(lastSeen);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando usuários...</div>;
  }

  if (!canManageUsers && !isLoadingPermissions) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Você não tem permissões para gerir usuários. Contacte um super administrador para obter acesso.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground">Administração e monitoramento de usuários do sistema</p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.newUsersToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Banidos</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.bannedUsers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Usuários</TabsTrigger>
          <TabsTrigger value="details">Detalhes do Usuário</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuários Registrados</CardTitle>
                  <CardDescription>Lista completa de usuários do sistema</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'Nome não informado'}</p>
                        <p className="text-sm text-muted-foreground flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Último acesso: {getLastSeenText(user.last_seen)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-sm">
                        <p>{user.portfolio_count} portfólios</p>
                        <p className="text-muted-foreground">{user.api_requests_today} requests hoje</p>
                      </div>
                      {getStatusBadge(user.status)}
                      {getRoleBadge(user.role)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedUser ? (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Usuário</CardTitle>
                <CardDescription>Informações detalhadas e ações administrativas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label>Nome</Label>
                    <p className="text-sm">{selectedUser.name || 'Não informado'}</p>
                  </div>
                  <div>
                    <Label>Data de Cadastro</Label>
                    <p className="text-sm">{formatDate(selectedUser.created_at)}</p>
                  </div>
                  <div>
                    <Label>Último Acesso</Label>
                    <p className="text-sm">{getLastSeenText(selectedUser.last_seen)}</p>
                  </div>
                  <div>
                    <Label>Portfólios</Label>
                    <p className="text-sm">{selectedUser.portfolio_count} criados</p>
                  </div>
                  <div>
                    <Label>Watchlists</Label>
                    <p className="text-sm">{selectedUser.watchlist_count} itens</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Label>Status Atual:</Label>
                  {getStatusBadge(selectedUser.status)}
                  {getRoleBadge(selectedUser.role)}
                </div>

                <div className="flex space-x-2 pt-4 border-t">
                  {selectedUser.status === 'active' ? (
                    <Button
                      variant="destructive"
                      onClick={() => toggleUserStatus(selectedUser.id, 'banned')}
                      disabled={!canManageUsers}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Banir Usuário
                    </Button>
                  ) : selectedUser.status === 'banned' ? (
                    <Button
                      onClick={() => toggleUserStatus(selectedUser.id, 'active')}
                      disabled={!canManageUsers}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Reativar Usuário
                    </Button>
                  ) : null}
                  
                  <Button
                    variant="destructive"
                    onClick={() => deleteUser(selectedUser.id)}
                    disabled={!canManageUsers}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Usuário
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Selecione um usuário da lista para ver os detalhes</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
