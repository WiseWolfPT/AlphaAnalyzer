import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/insights";
import StockDetail from "@/pages/stock-detail";
import Portfolios from "@/pages/portfolios";
import Watchlists from "@/pages/watchlists";
import Earnings from "@/pages/earnings";
import Profile from "@/pages/profile";
import IntrinsicValue from "@/pages/intrinsic-value";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/insights" component={Dashboard} />
      <Route path="/stock/:symbol" component={StockDetail} />
      <Route path="/portfolios" component={Portfolios} />
      <Route path="/watchlists" component={Watchlists} />
      <Route path="/earnings" component={Earnings} />
      <Route path="/profile" component={Profile} />
      <Route path="/intrinsic-value" component={IntrinsicValue} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="alpha-analyzer-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
