import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { MainLayout } from "@/components/layout/main-layout";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { ToastProvider } from "@/components/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/theme";
import { SupabaseAuthProvider } from "@/contexts/supabase-auth";
import { AppInitializer } from "@/components/app-initializer";

// Remove debug imports in production
const IS_PRODUCTION = import.meta.env.VITE_ENVIRONMENT === 'production';

// Lazy load all pages
import { lazy, Suspense } from "react";
import PageTransition from "@/components/shared/page-transition";

const LandingPage = lazy(() => import("@/pages/landing"));
const TrialPage = lazy(() => import("@/pages/trial"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const StockDetail = lazy(() => import("@/pages/stock-detail"));
const Watchlists = lazy(() => import("@/pages/watchlists"));
const Portfolios = lazy(() => import("@/pages/portfolios"));
const Transcripts = lazy(() => import("@/pages/transcripts"));
const TranscriptDetail = lazy(() => import("@/pages/transcript-detail"));
const News = lazy(() => import("@/pages/news"));
const AdvancedCharts = lazy(() => import("@/pages/AdvancedCharts"));
const Earnings = lazy(() => import("@/pages/earnings"));
const Compare = lazy(() => import("@/pages/compare"));
const IntrinsicValue = lazy(() => import("@/pages/intrinsic-value"));
const FindStocks = lazy(() => import("@/pages/find-stocks"));
const Alerts = lazy(() => import("@/pages/alerts"));
const Profile = lazy(() => import("@/pages/profile"));
const Settings = lazy(() => import("@/pages/settings"));
const Help = lazy(() => import("@/pages/help"));
const Metodologia = lazy(() => import("@/pages/metodologia"));
const NotFound = lazy(() => import("@/pages/not-found"));
const LoginPage = lazy(() => import("@/pages/auth/login"));
const RegisterPage = lazy(() => import("@/pages/auth/register"));
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard"));
const AdminTranscripts = lazy(() => import("@/pages/admin/admin-transcripts"));
const AdminUsers = lazy(() => import("@/pages/admin/admin-users"));
const ApiMonitoring = lazy(() => import("@/pages/admin/api-monitoring"));

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <ErrorBoundary>
      <MainLayout>
        <AnimatePresence mode="wait">
          <Suspense fallback={<PageTransition />}>
            <Switch location={location}>
              {/* Public routes */}
              <Route path="/" component={LandingPage} />
              <Route path="/trial" component={TrialPage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/transcripts" component={Transcripts} />
              <Route path="/transcript/:id" component={TranscriptDetail} />
              <Route path="/metodologia" component={Metodologia} />
              
              {/* Protected routes */}
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/stock/:symbol" component={StockDetail} />
              <Route path="/stock/:symbol/charts" component={AdvancedCharts} />
              <Route path="/watchlists" component={Watchlists} />
              <Route path="/portfolios" component={Portfolios} />
              <Route path="/news" component={News} />
              <Route path="/earnings" component={Earnings} />
              <Route path="/compare" component={Compare} />
              <Route path="/intrinsic-value" component={IntrinsicValue} />
              <Route path="/find-stocks" component={FindStocks} />
              <Route path="/alerts" component={Alerts} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route path="/help" component={Help} />
              
              {/* Admin routes */}
              <Route path="/admin">
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </Route>
              <Route path="/admin/transcripts">
                <AdminRoute>
                  <AdminTranscripts />
                </AdminRoute>
              </Route>
              <Route path="/admin/users">
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              </Route>
              <Route path="/admin/api-monitoring">
                <AdminRoute>
                  <ApiMonitoring />
                </AdminRoute>
              </Route>
              
              {/* 404 */}
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </AnimatePresence>
      </MainLayout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer>
        <ThemeProvider>
          <SupabaseAuthProvider>
            <ToastProvider>
              <AppContent />
              <Toaster />
            </ToastProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </AppInitializer>
    </QueryClientProvider>
  );
}

export default App;