import { useState, useEffect } from "react";
import { Menu, X, BarChart3, PieChart, Calculator, TrendingUp, Eye, Settings, Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMobile } from "@/hooks/use-mobile";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

interface FinancialDashboardLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
  onNavigate?: (path: string) => void;
  className?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <BarChart3 className="h-4 w-4" />,
    path: '/dashboard'
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: <PieChart className="h-4 w-4" />,
    path: '/portfolio'
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: <Eye className="h-4 w-4" />,
    path: '/watchlist'
  },
  {
    id: 'calculator',
    label: 'Valuation',
    icon: <Calculator className="h-4 w-4" />,
    path: '/intrinsic-value'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <TrendingUp className="h-4 w-4" />,
    path: '/analytics'
  }
];

export function FinancialDashboardLayout({
  children,
  currentPath = '/dashboard',
  onNavigate,
  className
}: FinancialDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const isMobile = useMobile();

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [currentPath, isMobile]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.getElementById('financial-sidebar');
        const menuButton = document.getElementById('mobile-menu-button');
        
        if (sidebar && !sidebar.contains(event.target as Node) && 
            menuButton && !menuButton.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  const handleNavigate = (path: string) => {
    onNavigate?.(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button
            id="mobile-menu-button"
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-lg font-semibold">Alfalyzer</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {notifications}
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          id="financial-sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            "lg:block"
          )}
        >
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between p-6 border-b border-border">
            <h1 className="text-xl font-bold">Alfalyzer</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {notifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stocks..."
                className="pl-10 h-9"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentPath === item.path ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    currentPath === item.path && "bg-primary/10 text-primary font-medium"
                  )}
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </nav>

          {/* Market Status Card */}
          <div className="p-4 mt-auto">
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Market Status</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-positive rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Open</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>S&P 500</span>
                    <span className="text-positive">+0.85%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>NASDAQ</span>
                    <span className="text-positive">+1.24%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Dow Jones</span>
                    <span className="text-negative">-0.42%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Button - Mobile Only */}
          <div className="p-4 lg:hidden border-t border-border">
            <Button variant="ghost" className="w-full justify-start gap-3 h-10">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between p-6 border-b border-border bg-card">
            <div>
              <h2 className="text-2xl font-bold capitalize">
                {navigationItems.find(item => item.path === currentPath)?.label || 'Dashboard'}
              </h2>
              <p className="text-muted-foreground">
                Real-time financial analysis and portfolio management
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden xl:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Portfolio:</span>
                  <span className="font-semibold text-positive">+2.34%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Day P&L:</span>
                  <span className="font-semibold text-positive">+$1,247.50</span>
                </div>
              </div>
              
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-4 lg:p-6">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Quick Action Floating Button for Mobile
export function MobileQuickActions({ onAction }: { onAction: (action: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
          <Button
            size="sm"
            onClick={() => {
              onAction('add-stock');
              setIsOpen(false);
            }}
            className="shadow-lg"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onAction('calculate');
              setIsOpen(false);
            }}
            className="shadow-lg"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate
          </Button>
        </div>
      )}
      
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-14 h-14 shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>
    </div>
  );
}