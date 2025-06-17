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
      "bg-gray-mouse dark:bg-dark-slate-navy border-r border-gray-300 dark:border-slate-700/50 flex-shrink-0 sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-72"
    )}>
      <div className="flex flex-col h-full">
        {/* Header with Logo and Collapse Button */}
        <div className={cn(
          "border-b border-gray-300 dark:border-slate-700/50 transition-all duration-300",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-chartreuse to-chartreuse-dark rounded-lg flex items-center justify-center shadow-lg">
                    <BarChart3 className="h-4 w-4 text-rich-black" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white">Alpha Analyzer</h1>
                    <p className="text-xs text-gray-600 dark:text-slate-400">Professional Analytics</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-chartreuse to-chartreuse-dark rounded-lg flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-4 w-4 text-rich-black" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-1 w-8 h-8"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className={cn(
          "flex-1 space-y-1 transition-all duration-300",
          isCollapsed ? "p-2" : "p-4"
        )}>
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
                    "flex items-center text-sm font-medium transition-all duration-200 group cursor-pointer rounded-lg",
                    isActive
                      ? "bg-gradient-to-r from-chartreuse/20 via-chartreuse-dark/15 to-chartreuse/10 text-white border border-chartreuse/40 shadow-lg shadow-chartreuse/10"
                      : "text-slate-300 hover:text-chartreuse hover:bg-gradient-to-r hover:from-slate-700/50 hover:to-slate-600/50",
                    isCollapsed 
                      ? "justify-center p-2 mx-1"
                      : "gap-3 px-3 py-3"
                  )}
                >
                  <item.icon className={cn(
                    "transition-all drop-shadow-sm",
                    isActive 
                      ? "text-chartreuse drop-shadow-[0_0_8px_rgba(216,242,45,0.3)]" 
                      : "text-gray-600 dark:text-slate-400 group-hover:text-chartreuse group-hover:drop-shadow-[0_0_6px_rgba(216,242,45,0.4)]",
                    isCollapsed ? "h-5 w-5" : "h-5 w-5"
                  )} />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              </a>
            );
          })}
        </nav>

        {/* User Profile Section at Bottom */}
        <div className={cn(
          "border-t border-gray-300 dark:border-slate-700/50 mt-auto transition-all duration-300",
          isCollapsed ? "p-2" : "p-4"
        )}>
          {user ? (
            <div className={cn(
              "rounded-lg bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 transition-all duration-300",
              isCollapsed 
                ? "flex flex-col items-center gap-2 p-2"
                : "flex items-center gap-3 p-3"
            )}>
              <div className="w-8 h-8 bg-gradient-to-br from-chartreuse to-chartreuse-dark rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-rich-black" />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.email || "User"}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">Free Plan</p>
                </div>
              )}
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white p-1"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <Button 
              className={cn(
                "bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black border-0 shadow-lg shadow-chartreuse/25 hover:shadow-chartreuse/40 font-semibold transition-all duration-300 hover:scale-105",
                isCollapsed ? "w-10 h-10 p-0 mx-auto" : "w-full"
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