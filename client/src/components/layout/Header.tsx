import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, Moon, Sun, User, LogOut } from "lucide-react";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { useTheme } from "@/hooks/use-theme";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const { user, userProfile, signOut } = useSupabaseAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

  const displayName =
    userProfile?.name ||
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined) ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Utilizador';
  const emailAddress = user?.email || '';
  const plan = userProfile?.subscription_tier || 'free';

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Erro no logout:', error.message);
      return;
    }
    setLocation('/');
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      
      // Determine active section
      const sections = ['hero', 'education', 'pricing', 'benefits'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Início", href: "#hero", id: "hero" },
    { name: "Valor Intrínseco", href: "#education", id: "education" },
    { name: "Porquê", href: "#benefits", id: "benefits" },
    { name: "Preço", href: "#pricing", id: "pricing" }
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const handleBetaLogin = () => {
    // Beta login - redirect directly to find-stocks since we're in demo mode
    // No actual authentication needed for demo
    setLocation('/stocks');
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-lg" 
          : "bg-transparent"
      }`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: isScrolled ? 0.98 : 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setLocation(user ? "/stocks" : "/")}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teya-green-dark dark:bg-teya-green rounded-xl flex items-center justify-center shadow-lg hover:shadow-teya-green/30 transition-all duration-300 hover:scale-105">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-deep-black" />
            </div>
            <div className="font-bold text-lg sm:text-xl text-foreground">
              Alfalyzer
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.href)}
                className={`relative text-muted-foreground hover:text-teya-green transition-all duration-200 font-medium group ${
                  activeSection === item.id ? 'text-foreground' : ''
                }`}
              >
                {item.name}
                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-teya-green transform origin-left transition-transform duration-200 ${
                  activeSection === item.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-11 w-11 p-0 bg-secondary/60 hover:bg-secondary text-foreground border border-border/60"
              aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
              aria-pressed={theme === "dark"}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 bg-teya-green-dark dark:bg-teya-green rounded-full flex items-center justify-center text-deep-black font-semibold text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline">{displayName}</span>
              </div>
                <Button 
                  onClick={() => setLocation('/stocks')}
                  className="bg-teya-green-dark dark:bg-teya-green hover:bg-teya-green-dark/90 dark:hover:bg-teya-green/90 text-deep-black dark:text-rich-black"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignOut}
                  className="h-11 w-11 p-0 bg-secondary/60 hover:bg-secondary text-foreground border border-border/60"
                  aria-label="Terminar sessão"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-11 px-4 text-foreground hover:bg-secondary/60 border border-border/60"
                  onClick={handleBetaLogin}
                >
                  Beta Login
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-11 px-4 text-foreground hover:bg-secondary/60 border border-border/60"
                  onClick={() => setLocation('/login')}
                >
                  Login
                </Button>
                <Button 
                  className="bg-teya-green-dark dark:bg-teya-green hover:bg-teya-green-dark/90 dark:hover:bg-teya-green/90 text-deep-black dark:text-rich-black font-semibold"
                  onClick={() => setLocation('/register')}
                >
                  Registar
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="md:hidden h-11 w-11 p-0 bg-secondary/60 hover:bg-secondary text-foreground border border-border/60"
                aria-label={isMobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-full sm:max-w-sm p-0 bg-background text-foreground"
            >
              <SheetHeader className="px-6 pt-10 pb-4 text-left">
                <SheetTitle id="mobile-menu-title">Navegação principal</SheetTitle>
                <SheetDescription>Escolhe uma secção ou ação rápida</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col h-full overflow-y-auto" aria-labelledby="mobile-menu-title">
                <div className="px-6 pb-6 space-y-4">
                  <div className="flex flex-col space-y-4">
                    {navItems.map((item) => (
                      <SheetClose asChild key={item.name}>
                        <button
                          onClick={() => scrollToSection(item.href)}
                          className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors text-left"
                        >
                          {item.name}
                        </button>
                      </SheetClose>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border/50 space-y-3">
                    <Button
                      variant="ghost"
                      className="justify-start text-foreground bg-secondary/60 hover:bg-secondary border border-border/60"
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
                      aria-pressed={theme === "dark"}
                    >
                      {theme === "light" ? (
                        <>
                          <Moon className="h-4 w-4 mr-2" aria-hidden="true" />
                          Modo escuro
                        </>
                      ) : (
                        <>
                          <Sun className="h-4 w-4 mr-2" aria-hidden="true" />
                          Modo claro
                        </>
                      )}
                    </Button>

                    {user ? (
                      <>
                        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                          <div className="w-8 h-8 bg-teya-green-dark dark:bg-teya-green rounded-full flex items-center justify-center text-deep-black font-semibold text-xs">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <span>{displayName}</span>
                        </div>
                        <SheetClose asChild>
                          <Button 
                            onClick={() => setLocation('/stocks')}
                            className="bg-teya-green-dark dark:bg-teya-green hover:bg-teya-green-dark/90 dark:hover:bg-teya-green/90 text-deep-black dark:text-rich-black justify-start"
                          >
                            <User className="h-4 w-4 mr-2" aria-hidden="true" />
                            Dashboard
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button 
                            variant="ghost" 
                            onClick={handleSignOut}
                            className="text-foreground justify-start bg-secondary/60 hover:bg-secondary border border-border/60"
                          >
                            <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                            Terminar sessão
                          </Button>
                        </SheetClose>
                      </>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Button 
                            variant="ghost" 
                            className="text-foreground justify-start bg-secondary/60 hover:bg-secondary border border-border/60"
                            onClick={handleBetaLogin}
                          >
                            Beta Login
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button 
                            variant="ghost" 
                            className="text-foreground justify-start bg-secondary/60 hover:bg-secondary border border-border/60"
                            onClick={() => setLocation('/login')}
                          >
                            Login
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button 
                            className="bg-teya-green-dark dark:bg-teya-green hover:bg-teya-green-dark/90 dark:hover:bg-teya-green/90 text-deep-black dark:text-rich-black justify-start"
                            onClick={() => setLocation('/register')}
                          >
                            Registar
                          </Button>
                        </SheetClose>
                      </>
                    )}
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
