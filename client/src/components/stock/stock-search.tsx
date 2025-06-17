import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Stock } from "@shared/schema";

interface StockSearchProps {
  onSearch: (query: string) => void;
  searchResults: Stock[];
  onStockSelect?: (stock: Stock) => void;
  placeholder?: string;
}

export function StockSearch({ 
  onSearch, 
  searchResults, 
  onStockSelect,
  placeholder = "Search stocks, ETFs, or companies..."
}: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const addRecentSearchMutation = useMutation({
    mutationFn: async (data: { symbol: string; name: string }) => {
      const response = await apiRequest("POST", "/api/recent-searches", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-searches"] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Focus search input when "/" is pressed
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.target?.matches?.("input, textarea")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new timeout for 300ms debounce
    const timeout = setTimeout(() => {
      onSearch(value);
      setIsOpen(value.length > 0);
    }, 300);

    setDebounceTimeout(timeout);
  };

  const handleStockSelect = (stock: Stock) => {
    setQuery("");
    setIsOpen(false);
    onSearch("");
    
    // Add to recent searches
    addRecentSearchMutation.mutate({
      symbol: stock.symbol,
      name: stock.name,
    });

    onStockSelect?.(stock);
  };

  const displayResults = searchResults?.slice(0, 10) || []; // Max 10 results

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          className="pl-14 pr-16 py-6 text-lg bg-chartreuse/5 dark:bg-card/50 backdrop-blur-sm border border-chartreuse/20 dark:border-border/50 rounded-2xl focus:ring-2 focus:ring-chartreuse/30 focus:border-chartreuse/50 transition-all duration-200 placeholder:text-muted-foreground/60"
        />
        <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
          <kbd className="px-3 py-1.5 text-xs bg-secondary/80 rounded-lg border border-border/50 text-muted-foreground font-mono backdrop-blur-sm">
            /
          </kbd>
        </div>
      </div>

      {/* Search Dropdown */}
      {isOpen && displayResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
          <div className="max-h-80 overflow-y-auto">
            {displayResults.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => handleStockSelect(stock)}
                className="w-full flex items-center space-x-4 px-6 py-4 hover:bg-secondary/50 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
                  {stock.logo ? (
                    <img
                      src={stock.logo}
                      alt={`${stock.name} logo`}
                      className="w-full h-full object-cover rounded-xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {stock.symbol.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{stock.symbol}</div>
                  <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">${stock.price}</div>
                  <div className={cn(
                    "text-sm font-medium px-2 py-0.5 rounded-full",
                    parseFloat(stock.changePercent) >= 0 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : "bg-red-500/10 text-red-500"
                  )}>
                    {parseFloat(stock.changePercent) >= 0 ? '+' : ''}{stock.changePercent}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results State */}
      {isOpen && query.length > 0 && displayResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 p-6 text-center">
          <div className="text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No stocks found for "<span className="font-medium text-foreground">{query}</span>"</p>
          </div>
        </div>
      )}
    </div>
  );
}
