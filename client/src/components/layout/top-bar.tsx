import { useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/simple-auth-offline";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, User, Menu, UserCircle, HelpCircle, LogOut } from "lucide-react";

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
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
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileMenuToggle}
            className="h-9 w-9 p-0 bg-secondary/50 hover:bg-secondary border border-border/50 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
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

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-full flex items-center justify-center"
            >
              <div className="h-9 w-9 rounded-full bg-chartreuse/20 flex items-center justify-center text-chartreuse font-medium text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-zinc-950 border-zinc-800 text-zinc-100"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || 'António Francisco'}</p>
                <p className="text-xs text-zinc-500">Account Management</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              onClick={() => setLocation('/profile')}
              className="hover:bg-chartreuse/10 hover:text-chartreuse cursor-pointer"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>My Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLocation('/help')}
              className="hover:bg-zinc-800 cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              onClick={async () => {
                await signOut();
                setLocation('/');
              }}
              className="hover:bg-red-500/10 hover:text-red-500 cursor-pointer text-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}