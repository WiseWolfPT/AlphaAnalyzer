import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { name: "Terms of Service", href: "#" },
    { name: "Privacy Policy", href: "#" },
    { name: "Instagram", href: "https://instagram.com/alphaanalyzer" },
    { name: "Twitter", href: "https://twitter.com/alphaanalyzer" },
    { name: "Discord", href: "https://discord.gg/alphaanalyzer" },
    { name: "Whop", href: "https://whop.com/alphaanalyzer" }
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
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="font-bold text-xl text-foreground">
              Alpha Analyzer
            </div>
          </div>

          {/* Tagline */}
          <p className="text-muted-foreground max-w-md">
            Análise profissional de stocks para investidores inteligentes.
          </p>

          {/* Links */}
          <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
            {links.map((link, index) => (
              <span key={link.name} className="flex items-center">
                <a
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {link.name}
                </a>
                {index < links.length - 1 && (
                  <span className="mx-3 text-muted-foreground/50">·</span>
                )}
              </span>
            ))}
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