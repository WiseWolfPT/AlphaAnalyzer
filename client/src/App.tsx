import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SimpleAuthProvider } from "@/contexts/simple-auth-offline";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { initializeAnalytics } from "@/lib/analytics";

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
        <Route path="/admin" component={AdminDashboard} />
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
