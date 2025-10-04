import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Filter, X, DollarSign, Percent, TrendingUp, Building2, Globe, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOptions {
  sectors: string[];
  minPrice?: number;
  maxPrice?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPE?: number;
  maxPE?: number;
  minChangePercent?: number;
  maxChangePercent?: number;
  showOnlyGainers?: boolean;
  showOnlyLosers?: boolean;
  minVolume?: number;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  availableSectors: string[];
  className?: string;
}

export function AdvancedFilters({ 
  onFiltersChange, 
  availableSectors,
  className 
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    sectors: [],
    showOnlyGainers: false,
    showOnlyLosers: false
  });
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [marketCapRange, setMarketCapRange] = useState<[number, number]>([0, 1000]);
  const [peRange, setPeRange] = useState<[number, number]>([0, 50]);
  const [changeRange, setChangeRange] = useState<[number, number]>([-10, 10]);
  const [minVolume, setMinVolume] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleSectorToggle = (sector: string) => {
    const newSectors = filters.sectors.includes(sector)
      ? filters.sectors.filter(s => s !== sector)
      : [...filters.sectors, sector];
    
    const newFilters = { ...filters, sectors: newSectors };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
    const newFilters = {
      ...filters,
      minPrice: value[0] > 0 ? value[0] : undefined,
      maxPrice: value[1] < 1000 ? value[1] : undefined
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleMarketCapChange = (value: number[]) => {
    setMarketCapRange([value[0], value[1]]);
    const newFilters = {
      ...filters,
      minMarketCap: value[0] > 0 ? value[0] * 1e9 : undefined,
      maxMarketCap: value[1] < 1000 ? value[1] * 1e9 : undefined
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePEChange = (value: number[]) => {
    setPeRange([value[0], value[1]]);
    const newFilters = {
      ...filters,
      minPE: value[0] > 0 ? value[0] : undefined,
      maxPE: value[1] < 50 ? value[1] : undefined
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleChangePercentChange = (value: number[]) => {
    setChangeRange([value[0], value[1]]);
    const newFilters = {
      ...filters,
      minChangePercent: value[0] > -10 ? value[0] : undefined,
      maxChangePercent: value[1] < 10 ? value[1] : undefined
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleVolumeChange = (value: number[]) => {
    setMinVolume(value[0]);
    const newFilters = {
      ...filters,
      minVolume: value[0] > 0 ? value[0] * 1e6 : undefined
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleGainersToggle = (checked: boolean) => {
    const newFilters = {
      ...filters,
      showOnlyGainers: checked,
      showOnlyLosers: checked ? false : filters.showOnlyLosers
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleLosersToggle = (checked: boolean) => {
    const newFilters = {
      ...filters,
      showOnlyLosers: checked,
      showOnlyGainers: checked ? false : filters.showOnlyGainers
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const newFilters: FilterOptions = { sectors: [] };
    setFilters(newFilters);
    setPriceRange([0, 1000]);
    setMarketCapRange([0, 1000]);
    setPeRange([0, 50]);
    setChangeRange([-10, 10]);
    setMinVolume(0);
    onFiltersChange(newFilters);
  };

  const activeFiltersCount = 
    filters.sectors.length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.minMarketCap ? 1 : 0) +
    (filters.maxMarketCap ? 1 : 0) +
    (filters.minPE ? 1 : 0) +
    (filters.maxPE ? 1 : 0) +
    (filters.minChangePercent ? 1 : 0) +
    (filters.maxChangePercent ? 1 : 0) +
    (filters.showOnlyGainers ? 1 : 0) +
    (filters.showOnlyLosers ? 1 : 0) +
    (filters.minVolume ? 1 : 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("gap-2", className)}
        >
          <Filter className="w-4 h-4" />
          Filtros Avançados
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filtros Avançados</h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-foreground hover:bg-secondary/60 border border-border/50"
              >
                Limpar tudo
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Sectors */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4" />
                Sectors
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableSectors.map(sector => (
                  <Badge
                    key={sector}
                    variant={filters.sectors.includes(sector) ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-colors",
                      filters.sectors.includes(sector)
                        ? "bg-teya-green text-black hover:bg-teya-green-dark"
                        : "hover:bg-teya-green/10"
                    )}
                    onClick={() => handleSectorToggle(sector)}
                  >
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Price Range */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4" />
                Price Range: ${priceRange[0]} - ${priceRange[1]}
              </Label>
              <Slider
                value={priceRange}
                onValueChange={handlePriceChange}
                min={0}
                max={1000}
                step={10}
                className="mt-2"
              />
            </div>

            {/* Market Cap Range */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" />
                Market Cap: ${marketCapRange[0]}B - ${marketCapRange[1]}B
              </Label>
              <Slider
                value={marketCapRange}
                onValueChange={handleMarketCapChange}
                min={0}
                max={1000}
                step={10}
                className="mt-2"
              />
            </div>

            {/* P/E Ratio Range */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4" />
                P/E Ratio: {peRange[0]} - {peRange[1]}
              </Label>
              <Slider
                value={peRange}
                onValueChange={handlePEChange}
                min={0}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Change Percent Range */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" />
                Daily Change: {changeRange[0]}% to {changeRange[1]}%
              </Label>
              <Slider
                value={changeRange}
                onValueChange={handleChangePercentChange}
                min={-10}
                max={10}
                step={0.5}
                className="mt-2"
              />
            </div>

            {/* Minimum Volume */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" />
                Min Volume: {minVolume}M shares
              </Label>
              <Slider
                value={[minVolume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <Separator />

            {/* Quick Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="gainers" className="text-sm font-medium">
                  Show Only Gainers
                </Label>
                <Switch
                  id="gainers"
                  checked={filters.showOnlyGainers || false}
                  onCheckedChange={handleGainersToggle}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="losers" className="text-sm font-medium">
                  Show Only Losers
                </Label>
                <Switch
                  id="losers"
                  checked={filters.showOnlyLosers || false}
                  onCheckedChange={handleLosersToggle}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-teya-green hover:bg-teya-green-dark text-black"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
