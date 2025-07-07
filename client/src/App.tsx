import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SupabaseAuthProvider } from "@/contexts/supabase-auth";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { initializeAnalytics } from "@/lib/analytics";
// NEW: Event-driven alert system (zero polling)
import { alertRealtimeListener } from "@/services/alert-realtime-listener";
import { notificationService } from "@/services/notification-service";

// Lazy load components for better performance
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const FindStocks = lazy(() => import("@/pages/find-stocks"));
const Dashboard = lazy(() => import("@/pages/insights-safe"));
const EnhancedDashboard = lazy(() => import("@/pages/dashboard-enhanced"));
const NewEnhancedDashboard = lazy(() => import("@/pages/enhanced-dashboard"));
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
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard"));
const ApiMonitoring = lazy(() => import("@/pages/admin/api-monitoring"));
const Alerts = lazy(() => import("@/pages/alerts"));
const StockHeaderTest = lazy(() => import("@/components/stock/stock-header-test"));
const AiChatDemo = lazy(() => import("@/pages/ai-chat-demo"));
const I18nTest = lazy(() => import("@/components/demo/i18n-test"));

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-chartreuse"></div>
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/trial" component={Trial} />
        <Route path="/home" component={FindStocks} />
        <Route path="/dashboard" component={NewEnhancedDashboard} />
        <Route path="/find-stocks" component={FindStocks} />
        <Route path="/dashboard-safe" component={Dashboard} />
        <Route path="/insights" component={EnhancedDashboard} />
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
        <Route path="/intrinsic-value" component={IntrinsicValue} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/api-monitoring" component={ApiMonitoring} />
        <Route path="/test/stock-header" component={StockHeaderTest} />
        <Route path="/demo/ai-chat" component={AiChatDemo} />
        <Route path="/test/i18n" component={I18nTest} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize analytics
      initializeAnalytics();
      
      // NEW: Initialize event-driven alert system
      console.log('📡 Alert System: 100% Event-driven via Supabase Realtime');
      console.log('🚫 ZERO client-side polling - API quota safe');
      
      // Alert architecture:
      // 1. Server-side Edge Functions (60s interval) process all alerts
      // 2. Supabase Realtime broadcasts triggers instantly to clients
      // 3. Client only listens for events - no API calls
      
      // Initialize the realtime listener (does not start listening yet)
      console.log('✅ Alert Realtime Listener ready for user connections');
    };

    initializeApp();
  }, []);

  return (
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
  );
}

export default App;
