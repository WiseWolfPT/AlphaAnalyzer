/**
 * Mobile Menu Component - Wave 3 Implementation
 * 
 * Collapsible off-canvas menu for mobile devices (telemóvel)
 * Implements Portuguese UI with international markets focus
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTheme } from "@/hooks/use-theme";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { useCurrency } from '@/contexts/currency-context';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Home,
  PieChart,
  FileText,
  TrendingUp,
  Settings,
  User,
  LogOut,
  HelpCircle,
  Moon,
  Sun,
  Globe,
  DollarSign,
  X,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

interface NavigationItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: string;
}

interface MarketIndex {
  name: string;
  value: number;
  change: number;
  currency: 'USD' | 'EUR';
}

export function MobileMenu({ isOpen, onOpenChange, trigger }: MobileMenuProps) {
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const { user, userProfile, signOut } = useSupabaseAuth();
  const { t, i18n } = useTranslation(['common', 'markets', 'currencies']);
  const { currentCurrency, setCurrency, formatCurrency, convertCurrency } = useCurrency();

  const displayName =
    userProfile?.name ||
    (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : undefined) ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Investidor';

  // Smart market indices based on currency selection
  const getMarketIndices = (): MarketIndex[] => {
    const baseIndices = {
      USD: [
        { name: 'S&P 500', value: 5088.80, change: 0.39, currency: 'USD' as const },
        { name: 'Dow Jones', value: 39131.53, change: 0.52, currency: 'USD' as const },
        { name: 'Nasdaq', value: 15996.82, change: 0.17, currency: 'USD' as const },
      ],
      EUR: [
        { name: 'Euro Stoxx 50', value: 4989.21, change: -0.15, currency: 'EUR' as const },
        { name: 'DAX', value: 17234.67, change: 0.67, currency: 'EUR' as const },
        { name: 'FTSE 100', value: 8132.74, change: 0.31, currency: 'EUR' as const },
      ]
    };

    return currentCurrency === 'EUR' ? baseIndices.EUR : baseIndices.USD;
  };

  const navigationItems: NavigationItem[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: t('navigation.dashboard'),
      href: '/find-stocks'
    },
    {
      icon: <PieChart className="h-5 w-5" />,
      label: t('navigation.portfolio'),
      href: '/portfolios'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: t('navigation.transcripts'),
      href: '/transcripts',
      badge: 'NEW'
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: t('navigation.markets'),
      href: '/markets'
    }
  ];

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    // Auto-set currency and region based on language
    if (lng === 'pt') {
      setCurrency('EUR');
      localStorage.setItem('aa-region', 'EU');
    } else if (lng === 'en') {
      setCurrency('USD');
      localStorage.setItem('aa-region', 'USA');
    }
  };

  const handleNavigation = (href: string) => {
    setLocation(href);
    onOpenChange(false); // Close menu after navigation
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Erro no logout:', error.message);
    }
    setLocation('/');
    onOpenChange(false);
  };

  const formatIndexValue = (index: MarketIndex) => {
    const convertedValue = convertCurrency(index.value, index.currency, currentCurrency);
    return formatCurrency(convertedValue);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      
      <SheetContent 
        side="left" 
        className="w-80 p-0 bg-background border-r border-border"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">
                Alfalyzer
              </SheetTitle>
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                {currentCurrency === 'EUR' ? '🇪🇺 Europa' : '🇺🇸 USA'}
              </Badge>
            </div>
          </SheetHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Navigation Section */}
            <div className="p-6 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('navigation.main_navigation')}
              </h3>
              {navigationItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      {item.icon}
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>

            <Separator />

            {/* Market Indices Section */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('markets.indices_title')}
              </h3>
              <div className="space-y-3">
                {getMarketIndices().map((index) => (
                  <div 
                    key={index.name}
                    className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">{index.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {index.currency === 'EUR' ? 'Europa' : 'EUA'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">
                        {formatIndexValue(index)}
                      </div>
                      <div className={cn(
                        "text-xs font-medium",
                        index.change >= 0 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {formatChange(index.change)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* App Settings Section */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('settings.app_preferences')} 
              </h3>
              <div className="space-y-4">
                {/* Language Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('settings.language')}
                  </label>
                  <Select 
                    value={i18n.language} 
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="h-11"> {/* 44px touch target */}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                      <SelectItem value="pt">🇵🇹 Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('settings.currency')}
                  </label>
                  <Select 
                    value={currentCurrency} 
                    onValueChange={(value) => setCurrency(value as 'USD' | 'EUR')}
                  >
                    <SelectTrigger className="h-11"> {/* 44px touch target */}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4" />
                          <span>{t('usd', { ns: 'currencies' })}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="EUR">
                        <div className="flex items-center space-x-2">
                          <span>€</span>
                          <span>{t('eur', { ns: 'currencies' })}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Theme Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('settings.theme')}
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-full h-11 justify-start" // 44px touch target
                  >
                    {theme === "light" ? (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        {t('settings.dark_mode')}
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        {t('settings.light_mode')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Account Section */}
            <div className="p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {t('account.title')}
              </h3>
              
              {/* User Info */}
              <div className="flex items-center space-x-3 p-3 bg-secondary/20 rounded-lg mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {displayName.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {displayName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('account.investor_status')}
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('account.my_profile')}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>

                <button
                  onClick={() => handleNavigation('/settings')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('account.account_settings')}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>

                <button
                  onClick={() => handleNavigation('/help')}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('account.help_support')}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer with Logout */}
          <div className="p-6 border-t border-border">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">{t('account.sign_out')}</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
