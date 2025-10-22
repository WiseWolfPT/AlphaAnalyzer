/**
 * Centralizada configuração de rotas da aplicação
 *
 * Este ficheiro define todas as rotas, metadados e requer autenticação.
 * Benefícios:
 * - Fonte única de verdade para rotas
 * - Breadcrumbs automáticos
 * - Gestão centralizada de permissões
 * - Fácil manutenção e documentação
 */

export interface RouteConfig {
  path: string;
  title: string;
  breadcrumb?: string;
  requireAuth?: boolean;
  // Para aliases/redirects
  redirectTo?: string;
  // Se é uma rota canónica (principal)
  canonical?: boolean;
  // i18n keys
  titleKey?: string;
  breadcrumbKey?: string;
}

export const ROUTES: Record<string, RouteConfig> = {
  // Landing & Marketing
  landing: {
    path: '/',
    title: 'Alfalyzer - Análise Financeira Visual',
    breadcrumb: 'Início',
    requireAuth: false,
    canonical: true
  },
  metodologia: {
    path: '/metodologia',
    title: 'Metodologia - Alfalyzer',
    breadcrumb: 'Metodologia',
    requireAuth: false,
    canonical: true
  },

  // Authentication
  login: {
    path: '/login',
    title: 'Login - Alfalyzer',
    breadcrumb: 'Login',
    requireAuth: false,
    canonical: true
  },
  authLogin: {
    path: '/auth/login',
    title: 'Login - Alfalyzer',
    breadcrumb: 'Login',
    requireAuth: false,
    redirectTo: '/login' // Alias para /login
  },
  auth: {
    path: '/auth',
    title: 'Autenticação - Alfalyzer',
    requireAuth: false,
    redirectTo: '/login' // Alias para /login
  },
  register: {
    path: '/register',
    title: 'Registar - Alfalyzer',
    breadcrumb: 'Registar',
    requireAuth: false,
    canonical: true
  },
  authRegister: {
    path: '/auth/register',
    title: 'Registar - Alfalyzer',
    requireAuth: false,
    redirectTo: '/register' // Alias para /register
  },
  forgotPassword: {
    path: '/auth/forgot-password',
    title: 'Recuperar Password - Alfalyzer',
    breadcrumb: 'Recuperar Password',
    requireAuth: false,
    canonical: true
  },
  resetPassword: {
    path: '/auth/reset-password',
    title: 'Redefinir Password - Alfalyzer',
    breadcrumb: 'Redefinir Password',
    requireAuth: false,
    canonical: true
  },
  resetPasswordAlt: {
    path: '/reset-password',
    title: 'Redefinir Password - Alfalyzer',
    requireAuth: false,
    redirectTo: '/auth/reset-password' // Alias
  },
  trial: {
    path: '/trial',
    title: 'Trial Gratuito - Alfalyzer',
    breadcrumb: 'Trial',
    requireAuth: false,
    canonical: true
  },

  // Main Application - Canonização de /stocks como principal
  stocks: {
    path: '/stocks',
    title: 'Pesquisar Ações - Alfalyzer',
    breadcrumb: 'Pesquisar Ações',
    titleKey: 'navigation.find_stocks',
    breadcrumbKey: 'navigation.find_stocks',
    requireAuth: false,
    canonical: true // Rota canónica principal
  },
  home: {
    path: '/home',
    title: 'Pesquisar Ações - Alfalyzer',
    requireAuth: false,
    redirectTo: '/stocks' // Alias para /stocks
  },
  findStocks: {
    path: '/find-stocks',
    title: 'Pesquisar Ações - Alfalyzer',
    requireAuth: false,
    redirectTo: '/stocks' // Alias para /stocks
  },
  insights: {
    path: '/insights',
    title: 'Pesquisar Ações - Alfalyzer',
    requireAuth: false,
    redirectTo: '/stocks' // Alias para /stocks
  },

  // Stock Detail
  stockDetail: {
    path: '/stock/:symbol',
    title: 'Detalhes da Ação - Alfalyzer',
    breadcrumb: 'Detalhes',
    requireAuth: false,
    canonical: true
  },
  stockCharts: {
    path: '/stock/:symbol/charts',
    title: 'Gráficos - Alfalyzer',
    breadcrumb: 'Gráficos',
    requireAuth: false,
    canonical: true
  },

  // Comparison & Valuation
  compare: {
    path: '/compare',
    title: 'Comparar Ações - Alfalyzer',
    breadcrumb: 'Comparar',
    requireAuth: false,
    canonical: true
  },
  intrinsicValue: {
    path: '/intrinsic-value',
    title: 'Valor Intrínseco - Alfalyzer',
    breadcrumb: 'Valor Intrínseco',
    titleKey: 'navigation.intrinsic_value',
    breadcrumbKey: 'navigation.intrinsic_value',
    requireAuth: false,
    canonical: true
  },
  valuation: {
    path: '/valuation',
    title: 'Avaliação - Alfalyzer',
    requireAuth: false,
    redirectTo: '/intrinsic-value' // Alias
  },

  // Portfolio Management
  portfolios: {
    path: '/portfolios',
    title: 'Portfólios - Alfalyzer',
    breadcrumb: 'Portfólios',
    titleKey: 'navigation.portfolios',
    breadcrumbKey: 'navigation.portfolios',
    requireAuth: true,
    canonical: true
  },
  watchlists: {
    path: '/watchlists',
    title: 'Watchlists - Alfalyzer',
    breadcrumb: 'Watchlists',
    titleKey: 'navigation.watchlists',
    breadcrumbKey: 'navigation.watchlists',
    requireAuth: true,
    canonical: true
  },

  // Market Data
  earnings: {
    path: '/earnings',
    title: 'Calendário de Resultados - Alfalyzer',
    breadcrumb: 'Resultados',
    titleKey: 'navigation.earnings',
    breadcrumbKey: 'navigation.earnings',
    requireAuth: false,
    canonical: true
  },
  transcripts: {
    path: '/transcripts',
    title: 'Transcrições - Alfalyzer',
    breadcrumb: 'Transcrições',
    titleKey: 'navigation.transcripts',
    breadcrumbKey: 'navigation.transcripts',
    requireAuth: false,
    canonical: true
  },
  transcriptDetail: {
    path: '/transcript/:id',
    title: 'Detalhes da Transcrição - Alfalyzer',
    breadcrumb: 'Detalhes',
    requireAuth: false,
    canonical: true
  },
  news: {
    path: '/news',
    title: 'Notícias - Alfalyzer',
    breadcrumb: 'Notícias',
    titleKey: 'navigation.news',
    breadcrumbKey: 'navigation.news',
    requireAuth: false,
    canonical: true
  },
  alerts: {
    path: '/alerts',
    title: 'Alertas - Alfalyzer',
    breadcrumb: 'Alertas',
    requireAuth: true,
    canonical: true
  },

  // User Management
  profile: {
    path: '/profile',
    title: 'Perfil - Alfalyzer',
    breadcrumb: 'Perfil',
    titleKey: 'navigation.my_account',
    breadcrumbKey: 'navigation.my_account',
    requireAuth: true,
    canonical: true
  },
  settings: {
    path: '/settings',
    title: 'Definições - Alfalyzer',
    breadcrumb: 'Definições',
    titleKey: 'navigation.settings',
    breadcrumbKey: 'navigation.settings',
    requireAuth: true,
    canonical: true
  },

  // Support
  help: {
    path: '/help',
    title: 'Ajuda - Alfalyzer',
    breadcrumb: 'Ajuda',
    titleKey: 'navigation.help',
    breadcrumbKey: 'navigation.help',
    requireAuth: false,
    canonical: true
  },

  // Monitoring
  health: {
    path: '/health',
    title: 'Estado do Sistema - Alfalyzer',
    breadcrumb: 'Estado',
    requireAuth: false,
    canonical: true
  },

  // Legal Pages
  privacyPolicy: {
    path: '/privacy-policy',
    title: 'Política de Privacidade - Alfalyzer',
    breadcrumb: 'Privacidade',
    requireAuth: false,
    canonical: true
  },
  termsOfService: {
    path: '/terms-of-service',
    title: 'Termos de Serviço - Alfalyzer',
    breadcrumb: 'Termos',
    requireAuth: false,
    canonical: true
  },
  cookiePolicy: {
    path: '/cookie-policy',
    title: 'Política de Cookies - Alfalyzer',
    breadcrumb: 'Cookies',
    requireAuth: false,
    canonical: true
  },
  financialDisclaimer: {
    path: '/financial-disclaimer',
    title: 'Aviso Legal Financeiro - Alfalyzer',
    breadcrumb: 'Aviso Legal',
    requireAuth: false,
    canonical: true
  },

  // Admin Routes
  admin: {
    path: '/admin',
    title: 'Admin Dashboard - Alfalyzer',
    breadcrumb: 'Admin',
    requireAuth: true,
    canonical: true
  },
  adminUsers: {
    path: '/admin/users',
    title: 'Gestão de Utilizadores - Alfalyzer',
    breadcrumb: 'Utilizadores',
    requireAuth: true,
    canonical: true
  },
  adminTranscripts: {
    path: '/admin/transcripts',
    title: 'Gestão de Transcrições - Alfalyzer',
    breadcrumb: 'Transcrições',
    requireAuth: true,
    canonical: true
  },
  adminApiMonitoring: {
    path: '/admin/api-monitoring',
    title: 'Monitorização API - Alfalyzer',
    breadcrumb: 'API',
    requireAuth: true,
    canonical: true
  },
  adminCache: {
    path: '/admin/cache',
    title: 'Monitorização Cache - Alfalyzer',
    breadcrumb: 'Cache',
    requireAuth: true,
    canonical: true
  },

  // Test Routes (development only)
  testErrorHandling: {
    path: '/test-error-handling',
    title: 'Test Error Handling - Alfalyzer',
    breadcrumb: 'Test',
    requireAuth: false,
    canonical: true
  },
  testStockHeader: {
    path: '/test/stock-header',
    title: 'Test Stock Header - Alfalyzer',
    breadcrumb: 'Test Header',
    requireAuth: false,
    canonical: true
  },
  testFinancials: {
    path: '/test/financials',
    title: 'Test Financials - Alfalyzer',
    breadcrumb: 'Test Financials',
    requireAuth: false,
    canonical: true
  }
};

/**
 * Helper para obter configuração de rota por path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  return Object.values(ROUTES).find(route => route.path === path);
}

/**
 * Helper para fazer matching de rotas dinâmicas (ex: /stock/:symbol com /stock/AAPL)
 */
function matchDynamicRoute(currentPath: string): RouteConfig | undefined {
  // Tentar match exato primeiro
  const exactMatch = Object.values(ROUTES).find(route => route.path === currentPath);
  if (exactMatch) return exactMatch;

  // Tentar match com padrões dinâmicos
  for (const route of Object.values(ROUTES)) {
    if (route.path.includes(':')) {
      const pattern = route.path.split('/');
      const segments = currentPath.split('/');

      if (pattern.length === segments.length) {
        const match = pattern.every((part, i) =>
          part.startsWith(':') || part === segments[i]
        );
        if (match) return route;
      }
    }
  }

  return undefined;
}

/**
 * Helper para obter rota canónica (sem aliases)
 */
export function getCanonicalRoute(path: string): RouteConfig | undefined {
  const route = matchDynamicRoute(path);
  if (route?.redirectTo) {
    return matchDynamicRoute(route.redirectTo);
  }
  return route;
}

/**
 * Helper para gerar breadcrumbs a partir do path atual
 */
export function generateBreadcrumbs(currentPath: string): Array<{label: string, path: string, labelKey?: string}> {
  const breadcrumbs: Array<{label: string, path: string, labelKey?: string}> = [];

  // Adicionar sempre "Início"
  breadcrumbs.push({ label: 'Início', path: '/', labelKey: 'navigation.dashboard' });

  // Split do path e construção gradual
  const segments = currentPath.split('/').filter(Boolean);
  let accumulatedPath = '';

  for (const segment of segments) {
    accumulatedPath += `/${segment}`;
    const route = getCanonicalRoute(accumulatedPath);

    if (route?.breadcrumb) {
      breadcrumbs.push({
        label: route.breadcrumb,
        labelKey: route.breadcrumbKey,
        path: accumulatedPath
      });
    }
  }

  return breadcrumbs;
}
