import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { recentSearchesApi } from "@/lib/api";
import { useAuth } from "@/contexts/simple-auth";
import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  { name: "Dashboard", href: "/", icon: ChartLine },
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
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Auth Section */}
        <div className="mt-8 pt-6 border-t border-border">
          {!user && (
            <Button
              className="w-full"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>

        {/* Recent Searches */}
        <RecentSearches />

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </div>
  );
}

function RecentSearches() {
  const { data: recentSearches = [] } = useQuery({
    queryKey: ["recent-searches"],
    queryFn: () => recentSearchesApi.getAll("default", 5),
  });

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <ChartLine className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Recent Searches</h3>
      </div>
      <div className="space-y-1">
        {recentSearches.length > 0 ? (
          recentSearches.map((search) => (
            <Link key={search.id} href={`/stock/${search.symbol}`}>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-all duration-200 group">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {search.symbol.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium text-sm text-foreground">{search.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {search.name.length > 18 ? search.name.substring(0, 18) + "..." : search.name}
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">No recent searches</p>
          </div>
        )}
      </div>
    </div>
  );
}
