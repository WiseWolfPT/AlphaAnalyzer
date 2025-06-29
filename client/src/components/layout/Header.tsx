import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, Moon, Sun, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/simple-auth-offline";
import { useTheme } from "@/hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const { user, signOut, toggleAuthState } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

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
            onClick={() => setLocation(user ? "/dashboard" : "/")}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-chartreuse-dark to-chartreuse rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
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
                className={`relative text-muted-foreground hover:text-tangerine transition-all duration-200 font-medium group ${
                  activeSection === item.id ? 'text-foreground' : ''
                }`}
              >
                {item.name}
                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-tangerine transform origin-left transition-transform duration-200 ${
                  activeSection === item.id ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-9 w-9 p-0"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 bg-chartreuse-dark dark:bg-chartreuse rounded-full flex items-center justify-center text-deep-black font-semibold text-xs">
                    {user.avatar || user.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden lg:inline">{user.name}</span>
                </div>
                <Button 
                  onClick={() => setLocation('/dashboard')}
                  className="bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={signOut}
                  className="h-9 w-9 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-foreground hover:text-chartreuse border border-transparent hover:border-chartreuse/30"
                  onClick={toggleAuthState}
                >
                  Beta Login
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-foreground hover:text-chartreuse border border-transparent hover:border-chartreuse/30"
                  onClick={() => setLocation('/login')}
                >
                  Login
                </Button>
                <Button 
                  className="bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black font-semibold"
                  onClick={() => setLocation('/register')}
                >
                  Registar
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-1.5 sm:p-2 rounded-lg hover:bg-secondary/50 transition-colors touch-target-44"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 py-4"
            >
              <nav className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => scrollToSection(item.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium px-4 py-2 text-left"
                  >
                    {item.name}
                  </button>
                ))}
                
                <div className="flex flex-col space-y-2 px-4 pt-4 border-t border-border/50">
                  {/* Theme Toggle Mobile */}
                  <Button
                    variant="ghost"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="justify-start"
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        Modo escuro
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        Modo claro
                      </>
                    )}
                  </Button>

                  {user ? (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                        <div className="w-8 h-8 bg-chartreuse-dark dark:bg-chartreuse rounded-full flex items-center justify-center text-deep-black font-semibold text-xs">
                          {user.avatar || user.name?.charAt(0) || 'U'}
                        </div>
                        <span>{user.name}</span>
                      </div>
                      <Button 
                        onClick={() => setLocation('/dashboard')}
                        className="bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black justify-start"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={signOut}
                        className="text-foreground justify-start"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        className="text-foreground justify-start border border-transparent hover:border-chartreuse/30"
                        onClick={() => setLocation('/login')}
                      >
                        Login
                      </Button>
                      <Button 
                        className="bg-chartreuse-dark dark:bg-chartreuse hover:bg-chartreuse-dark/90 dark:hover:bg-chartreuse/90 text-deep-black dark:text-rich-black justify-start"
                        onClick={() => setLocation('/register')}
                      >
                        Registar
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}