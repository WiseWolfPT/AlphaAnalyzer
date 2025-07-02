import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/simple-auth-offline";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/auth-modal";
import { 
  BarChart3, 
  Heart, 
  Calendar, 
  FileText, 
  Briefcase, 
  Calculator, 
  Settings,
  Home,
  LogIn,
  User,
  Crown,
  Newspaper,
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const navigation = [
  { name: "Find Stocks", href: "/home", icon: Search },
  { name: "Intrinsic Value", href: "/intrinsic-value", icon: Calculator },
  { name: "My Portfolios", href: "/portfolios", icon: Briefcase },
  { name: "Watchlists", href: "/watchlists", icon: Heart },
  { name: "Transcripts", href: "/transcripts", icon: FileText },
  { name: "Earnings", href: "/earnings", icon: Calendar },
];

export function CollapsibleSidebar() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSidebar}
            className="bg-background border-chartreuse/20 hover:bg-chartreuse/10"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={cn(
        "bg-sidebar-background border-r border-sidebar-border flex-shrink-0 sticky top-0 h-screen overflow-hidden transition-all duration-300 ease-out shadow-lg",
        isMobile ? (
          isMobileMenuOpen ? "fixed left-0 top-0 z-50 w-72" : "hidden"
        ) : (
          isCollapsed ? "w-16" : "w-64"
        )
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "border-b border-sidebar-border p-4 transition-all duration-300",
            isCollapsed && !isMobile ? "relative" : "flex items-center justify-between"
          )}>
            {isCollapsed && !isMobile ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-gradient-to-br from-chartreuse to-chartreuse-dark rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-5 w-5 text-black" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-chartreuse/10 transition-all duration-200 rounded-lg p-1 w-8 h-8 border border-transparent hover:border-chartreuse/30"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-chartreuse to-chartreuse-dark rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-5 w-5 text-black" />
                  </div>
                  <div className="overflow-hidden">
                    <h1 className="font-bold text-lg text-sidebar-foreground truncate">Alfalyzer</h1>
                    <p className="text-xs text-sidebar-foreground/60">Financial Analytics</p>
                  </div>
                </div>
                {!isMobile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-chartreuse/10 transition-all duration-200 rounded-lg p-2 flex-shrink-0 border border-transparent hover:border-chartreuse/30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className={cn(
              "space-y-1",
              isCollapsed && !isMobile ? "space-y-2" : ""
            )}>
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || 
                  (item.href === '/dashboard' && location === '/') ||
                  (item.href === '/home' && location === '/dashboard');
                
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      if (isMobile) setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full group relative transition-all duration-200 ease-out rounded-xl",
                      isCollapsed && !isMobile 
                        ? "flex items-center justify-center p-3 h-12" 
                        : "flex items-center gap-3 px-4 py-3",
                      isActive 
                        ? "bg-chartreuse/15 text-chartreuse shadow-lg shadow-chartreuse/20 border border-chartreuse/30" 
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-chartreuse/5 hover:shadow-md border border-transparent hover:border-chartreuse/20"
                    )}
                    title={isCollapsed && !isMobile ? item.name : undefined}
                  >
                    <Icon className={cn(
                      "flex-shrink-0 transition-all duration-200",
                      isCollapsed && !isMobile ? "w-5 h-5" : "w-5 h-5",
                      isActive ? "text-chartreuse" : "group-hover:scale-110"
                    )} />
                    {(!isCollapsed || isMobile) && (
                      <span className="text-sm font-medium truncate transition-all duration-200">
                        {item.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            {user ? (
              <div className="space-y-3">
                {(!isCollapsed || isMobile) && (
                  <div className="bg-gradient-to-r from-chartreuse/10 to-chartreuse/5 border border-chartreuse/20 rounded-xl p-3">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        if (isMobile) setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-3 mb-2 w-full hover:bg-chartreuse/5 rounded-lg p-2 -m-2 transition-colors duration-200 group"
                    >
                      <div className="w-8 h-8 bg-chartreuse/20 rounded-full flex items-center justify-center group-hover:bg-chartreuse/30 transition-colors duration-200">
                        <User className="h-4 w-4 text-chartreuse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-sidebar-foreground truncate">{user.name || "User"}</p>
                        <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
                      </div>
                    </button>
                    
                    {/* Plan Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          {user.plan || "Free"} Plan
                        </span>
                      </div>
                      {(!user.plan || user.plan === "Free") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs border-chartreuse/30 text-chartreuse hover:bg-chartreuse/10"
                        >
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {isCollapsed && !isMobile && (
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex justify-center mb-2 w-full hover:bg-chartreuse/5 rounded-lg p-2 transition-colors duration-200 group"
                    title="Profile Settings"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-chartreuse/20 to-chartreuse/10 rounded-full flex items-center justify-center group-hover:bg-chartreuse/30 transition-colors duration-200">
                      <User className="w-4 h-4 text-chartreuse" />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className={cn(
                  "w-full bg-gradient-to-r from-chartreuse to-chartreuse-dark hover:from-chartreuse-dark hover:to-chartreuse text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg",
                  isCollapsed && !isMobile ? "px-2 py-3" : "py-3"
                )}
                title={isCollapsed && !isMobile ? "Sign In" : undefined}
              >
                <LogIn className="w-4 h-4" />
                {(!isCollapsed || isMobile) && (
                  <span className="ml-2">Sign In</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}