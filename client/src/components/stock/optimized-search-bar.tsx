import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
}

interface OptimizedSearchBarProps {
  allStocks: Stock[];
  onStockSelect?: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

export function OptimizedSearchBar({ 
  allStocks, 
  onStockSelect,
  placeholder = "Search stocks by symbol or name (e.g., AAPL, Apple)...",
  className
}: OptimizedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Stock[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']);
  const [, setLocation] = useLocation();
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('alfalyzer-recent-searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save to recent searches
  const saveToRecentSearches = (symbol: string) => {
    const updated = [symbol, ...recentSearches.filter(s => s !== symbol)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('alfalyzer-recent-searches', JSON.stringify(updated));
  };

  // Debounced search with 300ms delay
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const upperQuery = searchQuery.toUpperCase();
    
    // Filter and sort by relevance
    const filtered = allStocks
      .filter(stock => 
        stock.symbol.toUpperCase().includes(upperQuery) ||
        stock.name.toUpperCase().includes(upperQuery)
      )
      .sort((a, b) => {
        // 1. Exact symbol match
        if (a.symbol.toUpperCase() === upperQuery) return -1;
        if (b.symbol.toUpperCase() === upperQuery) return 1;
        
        // 2. Symbol starts with query
        const aStartsWithSymbol = a.symbol.toUpperCase().startsWith(upperQuery);
        const bStartsWithSymbol = b.symbol.toUpperCase().startsWith(upperQuery);
        if (aStartsWithSymbol && !bStartsWithSymbol) return -1;
        if (!aStartsWithSymbol && bStartsWithSymbol) return 1;
        
        // 3. Symbol contains query
        const aContainsSymbol = a.symbol.toUpperCase().includes(upperQuery);
        const bContainsSymbol = b.symbol.toUpperCase().includes(upperQuery);
        if (aContainsSymbol && !bContainsSymbol) return -1;
        if (!aContainsSymbol && bContainsSymbol) return 1;
        
        // 4. Name starts with query
        const aStartsWithName = a.name.toUpperCase().startsWith(upperQuery);
        const bStartsWithName = b.name.toUpperCase().startsWith(upperQuery);
        if (aStartsWithName && !bStartsWithName) return -1;
        if (!aStartsWithName && bStartsWithName) return 1;
        
        // 5. Alphabetical by symbol
        return a.symbol.localeCompare(b.symbol);
      })
      .slice(0, 10); // Show top 10 results
    
    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [allStocks]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout for 300ms
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectStock(suggestions[selectedIndex].symbol);
        } else if (suggestions.length > 0) {
          selectStock(suggestions[0].symbol);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle stock selection
  const selectStock = (symbol: string) => {
    saveToRecentSearches(symbol);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    if (onStockSelect) {
      onStockSelect(symbol);
    } else {
      setLocation(`/stock/${symbol}/charts`);
    }
  };

  // Handle clear button
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-teya-green/20 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-teya-green/50 focus:border-teya-green"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <Card 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 max-h-[400px] overflow-y-auto shadow-lg border-teya-green/20"
        >
          {/* Search results */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-muted-foreground px-2 py-1">Search Results</div>
              {suggestions.map((stock, index) => (
                <div
                  key={stock.symbol}
                  className={cn(
                    "px-3 py-2 cursor-pointer rounded-md transition-colors",
                    "hover:bg-teya-green/10",
                    selectedIndex === index && "bg-teya-green/20"
                  )}
                  onClick={() => selectStock(stock.symbol)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{stock.symbol}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {stock.name}
                        </span>
                      </div>
                      {stock.sector && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {stock.sector}
                        </Badge>
                      )}
                    </div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {query && suggestions.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              No stocks found for "{query}"
            </div>
          )}

          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent Searches
              </div>
              {recentSearches.map(symbol => (
                <div
                  key={symbol}
                  className="px-3 py-2 cursor-pointer rounded-md hover:bg-teya-green/10 transition-colors"
                  onClick={() => selectStock(symbol)}
                >
                  <span className="font-medium">{symbol}</span>
                </div>
              ))}
            </div>
          )}

          {/* Popular searches */}
          {!query && (
            <div className="p-2 border-t">
              <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Popular Searches
              </div>
              <div className="flex flex-wrap gap-2 p-2">
                {popularSearches.map(symbol => (
                  <Badge
                    key={symbol}
                    variant="outline"
                    className="cursor-pointer hover:bg-teya-green/10 transition-colors"
                    onClick={() => selectStock(symbol)}
                  >
                    {symbol}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}