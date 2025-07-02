import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockHeaderProps {
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

export function StockHeader({ 
  symbol, 
  company, 
  isInWatchlist, 
  onAddToWatchlist, 
  onShare 
}: StockHeaderProps) {
  const isPositive = company.change >= 0;
  const isAfterHoursPositive = company.afterHoursChange >= 0;

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

      {/* Line 2: Company Name + After Hours */}
      <div className="flex items-center justify-between">
        <p className="text-lg font-medium text-muted-foreground">{company.name}</p>
        <span className="text-base font-medium">
          After Hours ${company.afterHoursPrice.toFixed(2)} 
          <span className={cn("ml-2", isAfterHoursPositive ? "text-green-500" : "text-red-500")}>
            {isAfterHoursPositive ? "+" : ""}${company.afterHoursChange.toFixed(2)} ({isAfterHoursPositive ? "+" : ""}{company.afterHoursChangePercent.toFixed(2)}%)
          </span>
        </span>
      </div>

      {/* Line 3: Sector + Earnings */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="border-chartreuse/30 text-chartreuse w-fit text-sm">
          {company.sector}
        </Badge>
        <Badge variant="outline" className="border-chartreuse/30 text-chartreuse text-sm">
          Earnings: {company.earningsDate}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddToWatchlist}
          className={cn(
            "gap-2",
            isInWatchlist 
              ? "bg-chartreuse/10 border-chartreuse/30 text-chartreuse" 
              : "border-chartreuse/20 hover:bg-chartreuse/10"
          )}
        >
          {isInWatchlist ? <Star className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onShare}>
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>
    </div>
  );
}