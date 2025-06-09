import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth/auth-modal";
import { useAuth } from "@/contexts/simple-auth";
import { 
  BarChart3, 
  Menu, 
  X,
  ChevronDown,
  LogOut,
  User,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const navigation = [
    { name: "Home", href: "/", current: true },
    { name: "Features", href: "#features", current: false },
    { name: "Pricing", href: "#pricing", current: false },
    { name: "Community", href: "#community", current: false },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-foreground">Alpha Analyzer</span>
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    BETA
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    item.current ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  {/* User Menu */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-foreground">
                        {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{profile?.full_name || user.email}</span>
                    {profile?.subscription_tier === 'premium' && (
                      <Crown className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  
                  <Link href="/dashboard">
                    <Button size="sm">
                      Dashboard
                    </Button>
                  </Link>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {/* signOut() - disabled for now */}}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Button 
                    size="sm"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Start Free
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border/50">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
                
                <div className="border-t border-border/50 pt-4 pb-3">
                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{profile?.full_name || user.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {profile?.subscription_tier || 'free'} plan
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link href="/dashboard">
                        <Button className="w-full mx-3" onClick={() => setMobileMenuOpen(false)}>
                          Go to Dashboard
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        className="w-full mx-3"
                        onClick={() => {
                          /* signOut() - disabled for now */
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign Out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button 
                        variant="ghost" 
                        className="w-full mx-3"
                        onClick={() => {
                          setShowAuthModal(true);
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign In
                      </Button>
                      <Button 
                        className="w-full mx-3"
                        onClick={() => {
                          setShowAuthModal(true);
                          setMobileMenuOpen(false);
                        }}
                      >
                        Start Free
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </>
  );
}