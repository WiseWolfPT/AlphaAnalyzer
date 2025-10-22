import { Link, useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { generateBreadcrumbs } from "@/config/routes";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const [location] = useLocation();
  const { t } = useTranslation('common');
  const breadcrumbs = generateBreadcrumbs(location);

  // Não mostrar breadcrumbs na landing page ou em rotas de 1º nível
  // Multinível = rotas com 2+ segmentos (ex: /stock/AAPL) vs 1 segmento (ex: /stocks)
  const segments = location.split('/').filter(Boolean);
  if (location === '/' || segments.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumbs"
      className={cn(
        "flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
              )}

              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {isFirst && <Home className="inline h-4 w-4 mr-1" aria-hidden="true" />}
                  {crumb.labelKey ? t(crumb.labelKey) : crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1"
                >
                  {isFirst && <Home className="inline h-4 w-4 mr-1" aria-hidden="true" />}
                  {crumb.labelKey ? t(crumb.labelKey) : crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
