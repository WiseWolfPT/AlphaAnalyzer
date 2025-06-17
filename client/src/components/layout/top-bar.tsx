import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, User } from "lucide-react";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [currency, setCurrency] = useState("USD");

  // Mock data instead of API call
  const indices = {
    dow: { value: 39131.53, change: 0.52 },
    sp500: { value: 5088.80, change: 0.39 },
    nasdaq: { value: 15996.82, change: 0.17 }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <header className="bg-chartreuse/20 backdrop-blur-xl border-b border-chartreuse/30 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-8">
        {/* Market Indices */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DOW</span>
            <span className="font-bold text-sm">{formatNumber(indices.dow.value)}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              indices.dow.change >= 0 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {formatChange(indices.dow.change)}
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">S&P</span>
            <span className="font-bold text-sm">{formatNumber(indices.sp500.value)}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              indices.sp500.change >= 0 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {formatChange(indices.sp500.change)}
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">NASDAQ</span>
            <span className="font-bold text-sm">{formatNumber(indices.nasdaq.value)}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              indices.nasdaq.change >= 0 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {formatChange(indices.nasdaq.change)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Market Selector */}
        <Select 
          value={localStorage.getItem('aa-region') || 'USA'} 
          onValueChange={(value) => localStorage.setItem('aa-region', value)}
        >
          <SelectTrigger className="w-24 h-9 bg-secondary/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USA">USA</SelectItem>
            <SelectItem value="EU">EU</SelectItem>
            <SelectItem value="APAC">APAC</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-9 w-9 p-0 bg-secondary/50 hover:bg-secondary border border-border/50"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>

        {/* User Avatar */}
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 bg-secondary/50 hover:bg-secondary border border-border/50">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}