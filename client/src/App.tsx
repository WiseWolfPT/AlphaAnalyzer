import { Switch, Route } from "wouter";
import { queryClient } from "./lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryDebugWrapper } from "@/components/debug/query-debug-wrapper";
import React, { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SupabaseAuthProvider } from "@/contexts/supabase-auth-context";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { DebugErrorBoundary } from "@/components/shared/debug-error-boundary";
import { AppInitializer } from "@/components/app-initializer";
import { EnhancedErrorBoundary } from "@/components/error/enhanced-error-boundary";
import { NotificationToast } from "@/components/notifications/notification-toast";
// Temporarily disable monitoring
// import { initializeMonitoring, FinancialWidgetErrorBoundary, performanceMonitor } from "@/lib/monitoring";

// Temporary replacement for FinancialWidgetErrorBoundary
const FinancialWidgetErrorBoundary = ({ children }: { children: React.ReactNode }) => <>{children}</>;
import { createLazyComponent, getLoadingMetrics } from "@/lib/lazy-loader";

// Initialize logging system
import logger from "@/lib/logger";
import httpInterceptor from "@/lib/http-interceptor";
import { DebugModeToggle } from "@/components/debug/debug-mode-toggle";

// Currency Context imports
import { CurrencyProvider } from './contexts/currency-context';
import { PortfolioProvider } from './contexts/portfolio-context';
import { PortfolioProvider as PortfolioManagerProvider } from './contexts/portfolio-manager';

// GDPR Compliance
import { CookieConsentBanner } from '@/components/gdpr/cookie-consent-banner';

// AGGRESSIVE DYNAMIC IMPORTS - Load everything lazily with micro-bundles

// Admin pages
const AdminUsers = createLazyComponent(
  () => import("@/pages/admin/admin-users"),
  {
    name: 'AdminUsers'
  }
);


// Critical route micro-bundles (high priority)
const Landing = createLazyComponent(
  () => import("@/pages/landing"),
  {
    name: 'Landing',
    preload: [
      () => import("@/pages/auth/login")
    ]
  }
);

const Metodologia = createLazyComponent(
  () => import("@/pages/metodologia").then(module => ({ default: module.MetodologiaPage })),
  {
    name: 'Metodologia'
  }
);

const FindStocks = createLazyComponent(
  () => import("@/pages/find-stocks"),
  {
    name: 'FindStocks',
    preload: [
      () => import("@/pages/stock-detail"),
      () => import("@/components/stock/stock-search")
    ]
  }
);

// Authentication micro-bundles (group related functionality)
const Login = createLazyComponent(
  () => import("@/pages/auth/login"),
  {
    name: 'Login',
    preload: [
      () => import("@/pages/auth/register"),
      () => import("@/components/ui/form")
    ]
  }
);

const Register = createLazyComponent(
  () => import("@/pages/auth/register"),
  {
    name: 'Register',
    preload: [
      () => import("@/pages/trial"),
      () => import("@/components/ui/form")
    ]
  }
);

// Stock analysis micro-bundles (heavy components)
const StockDetail = createLazyComponent(
  () => import("@/pages/stock-detail"),
  {
    name: 'StockDetail'
  }
);

// Legal pages micro-bundles
const PrivacyPolicy = createLazyComponent(
  () => import("@/pages/privacy-policy"),
  {
    name: 'PrivacyPolicy'
  }
);

const TermsOfService = createLazyComponent(
  () => import("@/pages/terms-of-service"),
  {
    name: 'TermsOfService'
  }
);

const CookiePolicy = createLazyComponent(
  () => import("@/pages/cookie-policy"),
  {
    name: 'CookiePolicy'
  }
);

const FinancialDisclaimer = createLazyComponent(
  () => import("@/pages/financial-disclaimer"),
  {
    name: 'FinancialDisclaimer'
  }
);

const AdvancedCharts = createLazyComponent(
  () => import("@/pages/AdvancedCharts"),
  {
    name: 'AdvancedCharts',
    retries: 3 // Charts are heavy, allow more retries
  }
);

// Portfolio management micro-bundles
const Portfolios = createLazyComponent(
  () => import("@/pages/portfolios"),
  {
    name: 'Portfolios'
  }
);

const Watchlists = createLazyComponent(
  () => import("@/pages/watchlists-v2"),
  {
    name: 'Watchlists'
  }
);

// Market data micro-bundles
const Earnings = createLazyComponent(
  () => import("@/pages/earnings"),
  {
    name: 'Earnings'
  }
);

const Transcripts = createLazyComponent(
  () => import("@/pages/transcripts"),
  {
    name: 'Transcripts'
  }
);

const TranscriptDetail = createLazyComponent(
  () => import("@/pages/transcript-detail"),
  {
    name: 'TranscriptDetail'
  }
);

const News = createLazyComponent(
  () => import("@/pages/news"),
  {
    name: 'News'
  }
);

const Alerts = createLazyComponent(
  () => import("@/pages/alerts"),
  {
    name: 'Alerts'
  }
);

// Valuation tools micro-bundle
const IntrinsicValue = createLazyComponent(
  () => import("@/pages/intrinsic-value"),
  {
    name: 'IntrinsicValue'
  }
);

// Stock comparison micro-bundle
const Compare = createLazyComponent(
  () => import("@/pages/compare"),
  {
    name: 'Compare',
    // Remove heavy preloads to evitar side-effects e reduzir 404 residuais
  }
);

// User management micro-bundles
const Profile = createLazyComponent(
  () => import("@/pages/profile"),
  {
    name: 'Profile'
  }
);

const Settings = createLazyComponent(
  () => import("@/pages/settings"),
  {
    name: 'Settings'
  }
);

// Monitoring micro-bundles
const CacheMonitor = createLazyComponent(
  () => import("@/pages/cache-monitor"),
  {
    name: 'CacheMonitor'
  }
);

const HealthMonitor = createLazyComponent(
  () => import("@/pages/health-monitor"),
  {
    name: 'HealthMonitor'
  }
);

// Support and onboarding micro-bundles
const Help = createLazyComponent(
  () => import("@/pages/help"),
  {
    name: 'Help'
  }
);

const Trial = createLazyComponent(
  () => import("@/pages/trial"),
  {
    name: 'Trial'
  }
);

// Admin micro-bundles (isolated for security)
const ApiMonitoring = createLazyComponent(
  () => import("@/pages/admin/api-monitoring"),
  {
    name: 'ApiMonitoring'
  }
);

const AdminTranscripts = createLazyComponent(
  () => import("@/pages/admin/admin-transcripts"),
  {
    name: 'AdminTranscripts'
  }
);

// Admin Route wrapper for protection
const AdminRoute = createLazyComponent(
  () => import("@/components/admin/AdminRoute").then(module => ({ default: module.AdminRoute })),
  {
    name: 'AdminRoute'
  }
);

// Utility and fallback micro-bundles
const NotFound = createLazyComponent(
  () => import("@/pages/not-found"),
  { name: 'NotFound' }
);

const Home = createLazyComponent(
  () => import("@/pages/home"),
  { name: 'Home' }
);

const StockHeaderTest = createLazyComponent(
  () => import("@/components/stock/stock-header-test"),
  { name: 'StockHeaderTest' }
);


// Enhanced loading component with micro-bundle awareness
const PageLoader = () => {
  const [loadingTime, setLoadingTime] = React.useState(0);
  const [loadingMessage, setLoadingMessage] = React.useState('Carregando Alfalyzer...');
  
  React.useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setLoadingTime(elapsed);
      
      // Progressive loading messages
      if (elapsed > 3000) {
        setLoadingMessage('Carregando componentes avançados...');
      } else if (elapsed > 1500) {
        setLoadingMessage('Preparando interface...');
      } else if (elapsed > 500) {
        setLoadingMessage('Conectando aos serviços...');
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  const getProgressWidth = () => {
    const baseProgress = Math.min((loadingTime / 2000) * 60, 60);
    const randomFactor = Math.sin(loadingTime / 300) * 10;
    return Math.max(10, Math.min(85, baseProgress + randomFactor));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-6 max-w-md w-full px-6">
        {/* Main spinner */}
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary"></div>
          <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-teya-green animate-spin" 
               style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}>
          </div>
        </div>
        
        {/* Loading message */}
        <div className="text-center space-y-2">
          <div className="text-lg font-medium text-foreground">
            {loadingMessage}
          </div>
          <div className="text-sm text-muted-foreground">
            Optimizando para a melhor experiência
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-teya-green rounded-full transition-all duration-300 ease-out"
              style={{ width: `${getProgressWidth()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Carregando micro-bundles</span>
            <span>{(loadingTime / 1000).toFixed(1)}s</span>
          </div>
        </div>
        
        {/* Micro-loading indicators */}
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-primary rounded-full animate-pulse"
              style={{ 
                animationDelay: `${i * 200}ms`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
        
        {/* Performance hint for slow connections */}
        {loadingTime > 5000 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-medium">Conexão lenta detectada</p>
            <p>Os componentes estão a ser carregados de forma otimizada para sua conexão</p>
          </div>
        )}
      </div>
    </div>
  );
};

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/metodologia" component={Metodologia} />
        <Route path="/login" component={Login} />
        <Route path="/auth/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/auth/register" component={Register} />
        <Route path="/trial" component={Trial} />
        <Route path="/home" component={FindStocks} />
        <Route path="/compare" component={Compare} />
        
        {/* Main routes */}
        <Route path="/insights" component={FindStocks} />
        
        {/* Test Route for Error Handling */}
        <Route path="/test-error-handling" component={lazy(() => import('@/pages/test-error-handling'))} />
        
        {/* Admin Routes - Protected */}
        <Route path="/admin">
          {() => (
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          )}
        </Route>
        <Route path="/admin/users">
          {() => (
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          )}
        </Route>
        <Route path="/admin/transcripts">
          {() => (
            <AdminRoute>
              <AdminTranscripts />
            </AdminRoute>
          )}
        </Route>
        <Route path="/admin/api-monitoring">
          {() => (
            <AdminRoute>
              <ApiMonitoring />
            </AdminRoute>
          )}
        </Route>
        <Route path="/admin/cache">
          {() => (
            <AdminRoute>
              <CacheMonitor />
            </AdminRoute>
          )}
        </Route>
        
        {/* Valuation Route */}
        <Route path="/valuation" component={IntrinsicValue} />
        <Route path="/intrinsic-value" component={IntrinsicValue} />
        
        {/* Other Routes */}
        <Route path="/find-stocks" component={FindStocks} />
        <Route path="/stock/:symbol" component={StockDetail} />
        <Route path="/stock/:symbol/charts" component={AdvancedCharts} />
        <Route path="/portfolios" component={Portfolios} />
        <Route path="/watchlists" component={Watchlists} />
        <Route path="/earnings" component={Earnings} />
        <Route path="/transcripts" component={Transcripts} />
        <Route path="/transcript/:id" component={TranscriptDetail} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/help" component={Help} />
        <Route path="/news" component={News} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/health" component={HealthMonitor} />
        
        {/* Legal Pages */}
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/cookie-policy" component={CookiePolicy} />
        <Route path="/financial-disclaimer" component={FinancialDisclaimer} />
        
        <Route path="/test/stock-header" component={StockHeaderTest} />
        <Route path="/test/financials" component={() => {
          const TestFinancials = lazy(() => import('./pages/test-financials'));
          return (
            <Suspense fallback={<div>Loading financial test...</div>}>
              <TestFinancials />
            </Suspense>
          );
        }} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // Initialize logging system on app start
  useEffect(() => {
    logger.info('🚀 Alfalyzer App Started', {
      environment: import.meta.env.MODE,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
    
    // Log unhandled errors
    window.addEventListener('error', (event) => {
      logger.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });
    
    // Log unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
      });
    });
    
    // Enable remote logging in production
    if (import.meta.env.PROD) {
      logger.enableRemoteLogging('/api/logs');
    }
  }, []);
  
  console.log('🚀 App component rendering');
  console.log('QueryClient instance at App render:', queryClient);

  return (
    <DebugErrorBoundary>
      <SupabaseAuthProvider>
        <CurrencyProvider>
          <PortfolioManagerProvider>
            <FinancialWidgetErrorBoundary>
              <EnhancedErrorBoundary context="Root Application">
                <QueryClientProvider client={queryClient}>
                  <QueryDebugWrapper queryClient={queryClient}>
                    <ThemeProvider defaultTheme="dark" storageKey="alfalyzer-theme">
                      <NotificationToast />
                      <Toaster />
                      <DebugModeToggle />
                      <Router />
                      <CookieConsentBanner />
                      <ReactQueryDevtools 
                        initialIsOpen={false} 
                        buttonPosition="bottom-right"
                        position="bottom"
                      />
                    </ThemeProvider>
                  </QueryDebugWrapper>
                </QueryClientProvider>
              </EnhancedErrorBoundary>
            </FinancialWidgetErrorBoundary>
          </PortfolioManagerProvider>
        </CurrencyProvider>
      </SupabaseAuthProvider>
    </DebugErrorBoundary>
  );
}

export default App;
