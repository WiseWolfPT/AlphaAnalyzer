import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Search, X, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_STOCKS } from '@/data/stocks';
import { useDebounce } from '@/hooks/use-debounce';

interface Stock {
  symbol: string;
  name: string;
  sector?: string;
  marketCap?: string;
}

interface UniversalSearchProps {
  onSelect?: (stock: Stock) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showRecentSearches?: boolean;
  showPopularStocks?: boolean;
  closeOnSelect?: boolean;
}

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
];

export const UniversalSearch: React.FC<UniversalSearchProps> = ({
  onSelect,
  placeholder = 'Search stocks by symbol or name...',
  className,
  autoFocus = false,
  showRecentSearches = true,
  showPopularStocks = true,
  closeOnSelect = true,
}) => {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Stock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<Stock[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('alfalyzer_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save to recent searches
  const saveToRecent = useCallback((stock: Stock) => {
    const newRecent = [stock, ...recentSearches.filter(s => s.symbol !== stock.symbol)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('alfalyzer_recent_searches', JSON.stringify(newRecent));
  }, [recentSearches]);

  // Search logic with relevance scoring
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const searchTerm = debouncedQuery.toUpperCase();
    
    const filtered = ALL_STOCKS
      .map(stock => {
        let score = 0;
        const upperSymbol = stock.symbol.toUpperCase();
        const upperName = stock.name.toUpperCase();
        
        // Exact symbol match (highest priority)
        if (upperSymbol === searchTerm) {
          score = 1000;
        }
        // Symbol starts with search term (high priority)
        else if (upperSymbol.startsWith(searchTerm)) {
          score = 100 - (upperSymbol.length - searchTerm.length);
        }
        // Symbol contains search term
        else if (upperSymbol.includes(searchTerm)) {
          score = 50;
        }
        // Name starts with search term
        else if (upperName.startsWith(searchTerm)) {
          score = 30;
        }
        // Name contains search term
        else if (upperName.includes(searchTerm)) {
          score = 10;
        }
        
        return { ...stock, score };
      })
      .filter(stock => stock.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const max = suggestions.length - 1;
          return prev < max ? prev + 1 : 0;
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const max = suggestions.length - 1;
          return prev > 0 ? prev - 1 : max;
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectStock(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectStock(suggestions[0]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, suggestions, selectedIndex]);

  // Handle stock selection
  const handleSelectStock = useCallback((stock: Stock) => {
    saveToRecent(stock);
    
    if (onSelect) {
      onSelect(stock);
    } else {
      // Default behavior: navigate to stock detail page
      navigate(`/stock/${stock.symbol}`);
    }
    
    if (closeOnSelect) {
      setQuery('');
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [onSelect, navigate, closeOnSelect, saveToRecent]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown = isOpen && (
    suggestions.length > 0 || 
    (query.length === 0 && (
      (showRecentSearches && recentSearches.length > 0) || 
      showPopularStocks
    ))
  );

  return (
    <div ref={searchRef} className={cn('relative w-full', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-700',
            'rounded-lg text-white placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all duration-200'
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search Results */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider">
                Search Results
              </div>
              {suggestions.map((stock, index) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleSelectStock(stock)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-center justify-between',
                    'hover:bg-slate-700/50 transition-colors',
                    selectedIndex === index && 'bg-slate-700/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-white">{stock.symbol}</div>
                      <div className="text-sm text-gray-400 truncate max-w-[300px]">
                        {stock.name}
                      </div>
                    </div>
                  </div>
                  {stock.sector && (
                    <span className="text-xs text-gray-500">{stock.sector}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No query - show recent and popular */}
          {query.length === 0 && (
            <>
              {/* Recent Searches */}
              {showRecentSearches && recentSearches.length > 0 && (
                <div className="py-2 border-b border-slate-700">
                  <div className="px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Recent Searches
                  </div>
                  {recentSearches.map((stock) => (
                    <button
                      key={`recent-${stock.symbol}`}
                      onClick={() => handleSelectStock(stock)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="font-semibold text-white">{stock.symbol}</div>
                      <div className="text-sm text-gray-400 truncate">{stock.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular Stocks */}
              {showPopularStocks && (
                <div className="py-2">
                  <div className="px-3 py-1.5 text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Popular Stocks
                  </div>
                  {POPULAR_STOCKS.map((stock) => (
                    <button
                      key={`popular-${stock.symbol}`}
                      onClick={() => handleSelectStock(stock)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      <div>
                        <span className="font-semibold text-white">{stock.symbol}</span>
                        <span className="text-gray-400 ml-2">{stock.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-700 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">↑↓</kbd> Navigate
            </span>
            <span className="inline-flex items-center gap-1 ml-3">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Enter</kbd> Select
            </span>
            <span className="inline-flex items-center gap-1 ml-3">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Esc</kbd> Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
};