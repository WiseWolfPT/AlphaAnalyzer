import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectorTabsProps {
  selectedSector: string;
  onSectorChange: (sector: string) => void;
}

const mainSectors = [
  "S&P 500",
  "Most Trending", 
  "Growth",
  "Dividend Growth"
];

const additionalSectors = [
  "Technology",
  "Healthcare", 
  "Financial Services",
  "Consumer Discretionary",
  "Communication Services",
  "Industrials",
  "Consumer Staples",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials"
];

export function SectorTabs({ selectedSector, onSectorChange }: SectorTabsProps) {
  return (
    <div className="flex items-center space-x-3 overflow-x-auto pb-2">
      {mainSectors.map((sector) => (
        <Button
          key={sector}
          variant={selectedSector === sector ? "default" : "outline"}
          size="sm"
          onClick={() => onSectorChange(sector)}
          className={cn(
            "whitespace-nowrap transition-all duration-200 px-4 py-2 rounded-xl font-medium",
            selectedSector === sector 
              ? "bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse text-rich-black font-semibold shadow-lg shadow-chartreuse/30 border-0" 
              : "border-border/50 hover:bg-secondary/80 hover:text-foreground hover:border-border bg-card/50 backdrop-blur-sm"
          )}
        >
          {sector}
        </Button>
      ))}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="border-border/50 hover:bg-secondary/80 hover:text-foreground bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2"
          >
            More
            <ChevronDown className="ml-2 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/50">
          {additionalSectors.map((sector) => (
            <DropdownMenuItem
              key={sector}
              onClick={() => onSectorChange(sector)}
              className={cn(
                "cursor-pointer rounded-lg mx-1 my-0.5",
                selectedSector === sector && "bg-chartreuse/20 text-rich-black font-semibold"
              )}
            >
              {sector}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
