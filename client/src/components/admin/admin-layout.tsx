import { useState } from 'react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Database, 
  Users, 
  FileText, 
  Settings, 
  Activity,
  Shield,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/admin', 
    description: 'System overview and statistics'
  },
  { 
    id: 'api-monitoring', 
    label: 'API Monitoring', 
    icon: Activity, 
    path: '/admin/api-monitoring', 
    description: 'API usage, quotas, and performance'
  },
  { 
    id: 'cache-management', 
    label: 'Cache Management', 
    icon: Database, 
    path: '/admin/cache', 
    description: 'Cache statistics and management'
  },
  { 
    id: 'transcripts', 
    label: 'Transcripts', 
    icon: FileText, 
    path: '/admin/transcripts', 
    description: 'Earnings transcript management'
  },
  { 
    id: 'users', 
    label: 'Users', 
    icon: Users, 
    path: '/admin/users', 
    description: 'User management and analytics'
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: Settings, 
    path: '/admin/settings', 
    description: 'System configuration'
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const currentPath = location;
  const currentNavItem = adminNavItems.find(item => item.path === currentPath) || adminNavItems[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-600" />
              <h1 className="text-xl font-bold">Alfalyzer Admin</h1>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                ADMIN ONLY
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border-r shadow-sm transition-all duration-300",
          isSidebarOpen ? "w-72" : "w-0 md:w-16",
          "md:relative absolute z-10 h-[calc(100vh-64px)]"
        )}>
          <nav className="p-4 space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 p-3 h-auto",
                    isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100",
                    !isSidebarOpen && "md:justify-center md:px-2"
                  )}
                  onClick={() => setLocation(item.path)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(isSidebarOpen || window.innerWidth < 768) && (
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  )}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 p-6 transition-all duration-300",
          !isSidebarOpen && "md:ml-4"
        )}>
          {/* Breadcrumb */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span>Admin</span>
              <span>/</span>
              <span className="text-gray-900 font-medium">{currentNavItem.label}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{currentNavItem.label}</h2>
            <p className="text-gray-600 mt-1">{currentNavItem.description}</p>
          </div>

          {/* Page Content */}
          <div className="bg-white rounded-lg shadow-sm border">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}