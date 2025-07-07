import { useState } from "react";
import { useLocation, useRoute } from "wouter";
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
  Search
} from "lucide-react";

const navigation = [
  { name: "Find Stocks", href: "/home", icon: Search },
  { name: "Intrinsic Value", href: "/intrinsic-value", icon: Calculator },
  { name: "My Portfolios", href: "/portfolios", icon: Briefcase },
  { name: "Watchlists", href: "/watchlists", icon: Heart },
  { name: "Transcripts", href: "/transcripts", icon: FileText },
  { name: "Earnings", href: "/earnings", icon: Calendar },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="w-72 bg-card flex-shrink-0 sticky top-0 h-screen shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="p-6 h-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground">Alfalyzer</h1>
            <p className="text-xs text-muted-foreground">Professional Analytics</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 flex-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            
            return (
              <button
                key={item.name}
                onClick={(e) => {
                  e.preventDefault();
                  console.log(`Navigating to ${item.name} -> ${item.href}`);
                  window.location.href = item.href;
                }}
                className="w-full text-left"
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
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="pt-6 border-t border-border">
          {user ? (
            <div className="space-y-3">
              {/* Enhanced User Banner with better visual balance */}
              <div className="bg-gradient-to-br from-chartreuse/15 via-chartreuse/10 to-chartreuse/5 border border-chartreuse/25 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-chartreuse/30 to-chartreuse/20 rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-5 w-5 text-chartreuse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base text-foreground">{user.name || "User"}</p>
                    <p className="text-sm text-muted-foreground/90">{user.email}</p>
                  </div>
                </div>
                
                {/* Enhanced Plan Badge Section */}
                <div className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {user.plan || "Free"} Plan
                    </span>
                  </div>
                  {(!user.plan || user.plan === "Free") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs font-medium border-chartreuse/40 text-chartreuse hover:bg-chartreuse/15 hover:border-chartreuse/60 transition-all duration-200"
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Button 
              className="w-full bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

