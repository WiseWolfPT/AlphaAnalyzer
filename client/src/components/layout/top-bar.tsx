import { useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/temp-auth";
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
import NotificationCenter from "@/components/alerts/notification-center";

// i18n and Currency imports
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/contexts/currency-context';

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  
  // i18n and Currency hooks
  const { t, i18n } = useTranslation(['common', 'markets', 'currencies']);
  const { currentCurrency, setCurrency, formatCurrency, convertCurrency } = useCurrency();

  // Mock data instead of API call
  const indices = {
    dow: { value: 39131.53, change: 0.52 },
    sp500: { value: 5088.80, change: 0.39 },
    nasdaq: { value: 15996.82, change: 0.17 }
  };

  // Updated formatting function using currency context
  const formatIndexValue = (num: number) => {
    // Convert from USD base currency to current display currency
    const convertedValue = convertCurrency(num, 'USD', currentCurrency);
    return formatCurrency(convertedValue);
  };

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    // Update currency and region based on language preference
    if (lng === 'pt') {
      setCurrency('EUR');
      localStorage.setItem('aa-region', 'EU');
    } else if (lng === 'en') {
      setCurrency('USD');
      localStorage.setItem('aa-region', 'USA');
    }
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <header className="bg-teya-green/20 backdrop-blur-xl border-b border-teya-green/30 px-6 py-4 flex items-center justify-between sticky top-0 z-10 pt-[env(safe-area-inset-top)] pl-[calc(1.5rem+env(safe-area-inset-left))] pr-[calc(1.5rem+env(safe-area-inset-right))]">
      <div className="flex items-center space-x-8">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileMenuToggle}
            className="h-11 w-11 p-0 bg-secondary/50 hover:bg-secondary border border-border/50 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        {/* Market Indices */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('indices.dow', { ns: 'markets' })}</span>
            <span className="font-bold text-sm">{formatIndexValue(indices.dow.value)}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              indices.dow.change >= 0 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {formatChange(indices.dow.change)}
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('indices.sp500', { ns: 'markets' })}</span>
            <span className="font-bold text-sm">{formatIndexValue(indices.sp500.value)}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              indices.sp500.change >= 0 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'bg-red-500/10 text-red-500'
            }`}>
              {formatChange(indices.sp500.change)}
            </span>
          </div>
          <div className="flex items-center space-x-3 bg-secondary/30 px-3 py-2 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('indices.nasdaq', { ns: 'markets' })}</span>
            <span className="font-bold text-sm">{formatIndexValue(indices.nasdaq.value)}</span>
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
        {/* Language, Currency, and Market Selectors - Hidden on mobile, available in MobileMenu */}
        {!isMobile && (
          <>
            {/* Language Switcher */}
            <Select 
              value={i18n.language} 
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-24 h-11 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 EN</SelectItem>
                <SelectItem value="pt">🇵🇹 PT</SelectItem>
              </SelectContent>
            </Select>

            {/* Currency Selector */}
            <Select 
              value={currentCurrency} 
              onValueChange={(value) => setCurrency(value as 'USD' | 'EUR')}
            >
              <SelectTrigger className="w-24 h-11 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">{t('usd', { ns: 'currencies' })}</SelectItem>
                <SelectItem value="EUR">{t('eur', { ns: 'currencies' })}</SelectItem>
              </SelectContent>
            </Select>

            {/* Market Selector */}
            <Select 
              value={localStorage.getItem('aa-region') || 'USA'} 
              onValueChange={(value) => localStorage.setItem('aa-region', value)}
            >
              <SelectTrigger className="w-24 h-11 bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USA">{t('regions.usa', { ns: 'markets' })}</SelectItem>
                <SelectItem value="EU">{t('regions.eu', { ns: 'markets' })}</SelectItem>
                <SelectItem value="APAC">{t('regions.apac', { ns: 'markets' })}</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        {/* Notification Center */}
        <NotificationCenter />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-11 w-11 p-0 bg-secondary/50 hover:bg-secondary border border-border/50"
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
              className="h-11 w-11 p-0 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-full flex items-center justify-center"
            >
              <div className="h-9 w-9 rounded-full bg-teya-green/20 flex items-center justify-center text-teya-green font-medium text-sm">
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
                <p className="text-xs text-zinc-500">{t('general.account_management')}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem 
              onClick={() => setLocation('/profile')}
              className="hover:bg-teya-green/10 hover:text-teya-green cursor-pointer"
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t('navigation.my_account')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLocation('/help')}
              className="hover:bg-zinc-800 cursor-pointer"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>{t('navigation.help')}</span>
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
              <span>{t('navigation.log_out')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}