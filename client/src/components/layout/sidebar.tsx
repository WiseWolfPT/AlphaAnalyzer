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
  Crown
} from "lucide-react";

const navigation = [
  { name: "🏠 Dashboard", href: "/dashboard", icon: ChartLine },
  { name: "Watchlists", href: "/watchlists", icon: Heart },
  { name: "Earnings", href: "/earnings", icon: Calendar },
  { name: "Transcripts", href: "#", icon: FileText },
  { name: "Portfolios", href: "/portfolios", icon: Briefcase },
  { name: "Intrinsic Value", href: "/intrinsic-value", icon: Calculator },
  { name: "Settings", href: "#", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="w-72 bg-card border-r border-border flex-shrink-0 sticky top-0 h-screen overflow-y-auto">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">Alpha Analyzer</h1>
            <p className="text-xs text-muted-foreground">Professional Analytics</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            
            return (
              <a 
                key={item.name} 
                href={item.href}
                id={`nav-${item.name.toLowerCase()}`}
                onClick={(e) => {
                  console.log(`Clicked ${item.name} -> ${item.href}`);
                  // Don't prevent default - let it navigate normally
                }}
              >
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer",
                    isActive
                      ? "bg-chartreuse/10 text-chartreuse border border-chartreuse/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform group-hover:scale-110",
                    isActive ? "text-chartreuse" : "text-muted-foreground"
                  )} />
                  <span>{item.name}</span>
                </div>
              </a>
            );
          })}
        </nav>

        {/* Auth Section */}
        <div className="mt-8 pt-6 border-t border-border">
          {!user && (
            <Button className="w-full bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

