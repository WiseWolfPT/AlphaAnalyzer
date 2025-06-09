import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { SimpleAuthProvider } from "@/contexts/simple-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/simple-dashboard";
import StockDetail from "@/pages/stock-detail";
import Portfolios from "@/pages/portfolios";
import Watchlists from "@/pages/watchlists";
import Earnings from "@/pages/earnings";
import Profile from "@/pages/profile";
import IntrinsicValue from "@/pages/intrinsic-value";

function Router() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="alpha-analyzer-theme">
        <SimpleAuthProvider>
          <Toaster />
          <Router />
        </SimpleAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
