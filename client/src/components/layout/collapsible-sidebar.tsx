import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/simple-auth";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Heart, 
  Calendar, 
  FileText, 
  Briefcase, 
  Calculator, 
  Settings,
  ChartLine,
  LogIn,
  LogOut,
  User,
  Crown,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: ChartLine, category: "main" },
  { name: "Watchlists", href: "/watchlists", icon: Heart, category: "main" },
  { name: "Earnings", href: "/earnings", icon: Calendar, category: "main" },
  { name: "Portfolios", href: "/portfolios", icon: Briefcase, category: "main" },
  { name: "Intrinsic Value", href: "/intrinsic-value", icon: Calculator, category: "tools" },
  { name: "Transcripts", href: "#", icon: FileText, category: "tools" },
  { name: "Settings", href: "#", icon: Settings, category: "system" },
];

export function CollapsibleSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={cn(
      "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 flex-shrink-0 sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-72"
    )}>
      <div className="flex flex-col h-full">
        {/* Header with Logo and Collapse Button */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-white">Alpha Analyzer</h1>
                  <p className="text-xs text-slate-400">Professional Analytics</p>
                </div>
              </div>
            )}
            
            {isCollapsed && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg mx-auto">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            
            return (
              <a 
                key={item.name} 
                href={item.href}
                className="block"
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                    isActive
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/50",
                    isCollapsed && "justify-center"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-all",
                    isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white",
                    isCollapsed && "h-6 w-6"
                  )} />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              </a>
            );
          })}
        </nav>

        {/* User Profile Section at Bottom */}
        <div className="p-4 border-t border-slate-700/50 mt-auto">
          {user ? (
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50",
              isCollapsed && "justify-center"
            )}>
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.email || "User"}
                  </p>
                  <p className="text-xs text-slate-400">Free Plan</p>
                </div>
              )}
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white p-1"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <Button 
              className={cn(
                "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg",
                isCollapsed ? "w-10 h-10 p-0" : "w-full"
              )}
            >
              <LogIn className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Sign In</span>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}