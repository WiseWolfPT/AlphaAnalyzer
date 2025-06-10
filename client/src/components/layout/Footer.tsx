import { BarChart3, Instagram, Twitter } from "lucide-react";
import { motion } from "framer-motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: "Instagram", href: "https://instagram.com/alphaanalyzer", icon: Instagram },
    { name: "Twitter", href: "https://twitter.com/alphaanalyzer", icon: Twitter },
    { name: "Discord", href: "https://discord.gg/alphaanalyzer", icon: null },
    { name: "Whop", href: "https://whop.com/alphaanalyzer", icon: null }
  ];

  const legalLinks = [
    { name: "Termos de Serviço", href: "#" },
    { name: "Política de Privacidade", href: "#" }
  ];

  return (
    <footer className="bg-card/30 border-t border-border/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col items-center text-center space-y-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="font-bold text-xl text-foreground">
              Alpha Analyzer
            </div>
          </div>

          {/* Tagline */}
          <p className="text-muted-foreground max-w-md">
            Análise profissional de ações para investidores inteligentes.
          </p>

          {/* Desktop Links Layout for >= 1280px */}
          <div className="w-full max-w-4xl">
            <div className="hidden xl:flex items-center justify-center gap-8">
              {/* Social Links on the left */}
              <div className="flex items-center gap-6">
                {socialLinks.map((link, index) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.icon && <link.icon className="h-4 w-4" />}
                    <span className="text-sm">{link.name}</span>
                  </a>
                ))}
              </div>

              {/* Legal Links on the right */}
              <div className="flex items-center gap-6 text-sm">
                {legalLinks.map((link, index) => (
                  <span key={link.name} className="flex items-center">
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                    {index < legalLinks.length - 1 && (
                      <span className="mx-3 text-muted-foreground/50">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Mobile/Tablet Layout for < 1280px */}
            <div className="xl:hidden space-y-6">
              {/* Social Links */}
              <div className="flex flex-wrap justify-center items-center gap-6">
                {socialLinks.map((link, index) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.icon && <link.icon className="h-4 w-4" />}
                    <span className="text-sm">{link.name}</span>
                  </a>
                ))}
              </div>

              {/* Legal Links */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
                {legalLinks.map((link, index) => (
                  <span key={link.name} className="flex items-center">
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                    {index < legalLinks.length - 1 && (
                      <span className="mx-3 text-muted-foreground/50">·</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-xs text-muted-foreground">
            © {currentYear} Alpha Analyzer. Todos os direitos reservados.
          </div>
        </motion.div>
      </div>
    </footer>
  );
}