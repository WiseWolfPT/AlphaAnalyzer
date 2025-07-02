import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper function to check if market is open (US Eastern Time)
function isMarketOpen(): boolean {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = easternTime.getHours();
  const minute = easternTime.getMinutes();
  const currentTime = hour * 60 + minute; // Convert to minutes since midnight
  
  // Market is closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM Eastern Time
  const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
  const marketClose = 16 * 60; // 4:00 PM in minutes
  
  return currentTime >= marketOpen && currentTime < marketClose;
}

interface StockHeaderV2Props {
  symbol: string;
  company: {
    name: string;
    sector: string;
    price: number;
    change: number;
    changePercent: number;
    afterHoursPrice: number;
    afterHoursChange: number;
    afterHoursChangePercent: number;
    earningsDate: string;
    logo: string;
  };
  isInWatchlist: boolean;
  onAddToWatchlist: () => void;
  onShare?: () => void;
}

export function StockHeaderV2({ 
  symbol, 
  company, 
  isInWatchlist, 
  onAddToWatchlist, 
  onShare 
}: StockHeaderV2Props) {
  const isPositive = company.change >= 0;
  const isAfterHoursPositive = company.afterHoursChange >= 0;
  const marketOpen = isMarketOpen();
  
  // Only show after hours when market is closed AND there's after hours data
  const showAfterHours = !marketOpen && company.afterHoursPrice > 0;

  return (
    <div className="space-y-3">
      {/* Line 1: Logo + Ticker + Current Price + Daily Change */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
          <img 
            src={company.logo} 
            alt={`${symbol} logo`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `<div class="text-xl font-bold text-chartreuse">${symbol[0]}</div>`;
            }}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{symbol}</h1>
        <span className="text-2xl sm:text-3xl font-bold">${company.price.toFixed(2)}</span>
        <span className={cn("text-lg sm:text-xl font-medium", isPositive ? "text-green-500" : "text-red-500")}>
          {isPositive ? "+" : ""}${company.change.toFixed(2)} ({isPositive ? "+" : ""}{company.changePercent.toFixed(2)}%)
        </span>
      </div>

      {/* Line 2: Company Name + Market Status/After Hours */}
      <div className="flex items-center gap-6">
        <p className="text-lg font-medium text-muted-foreground">{company.name}</p>
        
        {marketOpen ? (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            Market Open
          </Badge>
        ) : showAfterHours ? (
          <span className="text-base font-medium">
            After Hours ${company.afterHoursPrice.toFixed(2)} 
            <span className={cn("ml-2", isAfterHoursPositive ? "text-green-500" : "text-red-500")}>
              {isAfterHoursPositive ? "+" : ""}${company.afterHoursChange.toFixed(2)} ({isAfterHoursPositive ? "+" : ""}{company.afterHoursChangePercent.toFixed(2)}%)
            </span>
          </span>
        ) : (
          <Badge variant="outline" className="text-gray-600 border-gray-200">
            Market Closed
          </Badge>
        )}
      </div>

      {/* Line 3: Sector + Earnings */}
      <div className="flex items-center gap-6">
        <Badge variant="outline" className="border-chartreuse/30 text-chartreuse w-fit text-sm">
          {company.sector}
        </Badge>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium border border-amber-500/20">
          <span>Earnings: {company.earningsDate}</span>
        </div>
      </div>

    </div>
  );
}