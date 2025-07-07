import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SimpleAuthProvider } from "@/contexts/simple-auth-offline";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { initializeAnalytics } from "@/lib/analytics";

// Import UnifiedDashboard components
import { 
  UnifiedDashboard, 
  UserDashboard, 
  AdminDashboard as UnifiedAdminDashboard, 
  ValuationDashboard, 
  DebugDashboard, 
  SimpleDashboard, 
  TestDashboard 
} from "@/components/dashboard/unified-dashboard";

// Lazy load components for better performance
const Landing = lazy(() => import("@/pages/landing"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
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
    initializeAnalytics();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="alfalyzer-theme">
          <SimpleAuthProvider>
            <Toaster />
            <Router />
          </SimpleAuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
