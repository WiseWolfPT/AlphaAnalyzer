import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SupabaseAuthProvider } from "@/contexts/supabase-auth-context";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { initializeMonitoring } from "@/lib/monitoring";

// i18n and Currency Context imports
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { CurrencyProvider } from './contexts/currency-context';

// Lazy load UnifiedDashboard components for better performance
const UnifiedDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.UnifiedDashboard })));
const UserDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.UserDashboard })));
const UnifiedAdminDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.AdminDashboard })));
const ValuationDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.ValuationDashboard })));
const DebugDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.DebugDashboard })));
const SimpleDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.SimpleDashboard })));
const TestDashboard = lazy(() => import("@/components/dashboard/unified-dashboard").then(module => ({ default: module.TestDashboard })));

// Lazy load components for better performance
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/auth/login"));
const Register = lazy(() => import("@/pages/auth/register"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const FindStocks = lazy(() => import("@/pages/find-stocks"));
const StockDetail = lazy(() => import("@/pages/stock-detail"));
const AdvancedCharts = lazy(() => import("@/pages/AdvancedCharts"));
const Portfolios = lazy(() => import("@/pages/portfolios"));
const Watchlists = lazy(() => import("@/pages/watchlists"));
const Earnings = lazy(() => import("@/pages/earnings"));
const Transcripts = lazy(() => import("@/pages/transcripts"));
const Profile = lazy(() => import("@/pages/profile"));
const IntrinsicValue = lazy(() => import("@/pages/intrinsic-value"));
const Trial = lazy(() => import("@/pages/trial"));
const Settings = lazy(() => import("@/pages/settings"));
const Help = lazy(() => import("@/pages/help"));
const News = lazy(() => import("@/pages/news"));
const ApiMonitoring = lazy(() => import("@/pages/admin/api-monitoring"));
const Alerts = lazy(() => import("@/pages/alerts"));
const StockHeaderTest = lazy(() => import("@/components/stock/stock-header-test"));

// Enhanced loading component for Suspense with progress indication
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chartreuse"></div>
      <div className="text-muted-foreground text-sm animate-pulse">
        Loading Alfalyzer...
      </div>
      <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-chartreuse rounded-full animate-pulse" style={{
          animation: 'loader-progress 2s ease-in-out infinite'
        }}></div>
      </div>
    </div>
    <style jsx>{`
      @keyframes loader-progress {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
    `}</style>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/auth/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/auth/register" component={Register} />
        <Route path="/trial" component={Trial} />
        <Route path="/home" component={FindStocks} />
        
        {/* Unified Dashboard Routes */}
        <Route path="/dashboard" component={UserDashboard} />
        <Route path="/dashboard/enhanced" component={UserDashboard} />
        <Route path="/dashboard/simple" component={SimpleDashboard} />
        <Route path="/dashboard/test" component={TestDashboard} />
        <Route path="/insights" component={UserDashboard} />
        
        {/* Admin Dashboard Routes */}
        <Route path="/admin" component={UnifiedAdminDashboard} />
        <Route path="/admin/dashboard" component={UnifiedAdminDashboard} />
        <Route path="/admin/debug" component={DebugDashboard} />
        
        {/* Valuation Dashboard Route */}
        <Route path="/valuation" component={ValuationDashboard} />
        <Route path="/intrinsic-value" component={ValuationDashboard} />
        
        {/* Other Routes */}
        <Route path="/find-stocks" component={FindStocks} />
        <Route path="/stock/:symbol" component={StockDetail} />
        <Route path="/stock/:symbol/charts" component={AdvancedCharts} />
        <Route path="/portfolios" component={Portfolios} />
        <Route path="/watchlists" component={Watchlists} />
        <Route path="/earnings" component={Earnings} />
        <Route path="/transcripts" component={Transcripts} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/help" component={Help} />
        <Route path="/news" component={News} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/admin/api-monitoring" component={ApiMonitoring} />
        <Route path="/test/stock-header" component={StockHeaderTest} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    initializeMonitoring();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <CurrencyProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark" storageKey="alfalyzer-theme">
              <SupabaseAuthProvider>
                <Toaster />
                <Router />
              </SupabaseAuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </CurrencyProvider>
    </I18nextProvider>
  );
}

export default App;
