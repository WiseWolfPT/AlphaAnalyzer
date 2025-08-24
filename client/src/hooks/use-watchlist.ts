import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WATCHLISTS_KEY = 'alfalyzer-watchlists';
const DEFAULT_WATCHLIST_ID = 'default';

export function useWatchlists() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load watchlists from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WATCHLISTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWatchlists(parsed.map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt)
        })));
      } else {
        // Create default watchlist if none exists
        const defaultWatchlist: Watchlist = {
          id: DEFAULT_WATCHLIST_ID,
          name: 'My Watchlist',
          symbols: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setWatchlists([defaultWatchlist]);
        localStorage.setItem(WATCHLISTS_KEY, JSON.stringify([defaultWatchlist]));
      }
    } catch (error) {
      console.error('Failed to load watchlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load watchlists',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save watchlists to localStorage
  const saveWatchlists = useCallback((lists: Watchlist[]) => {
    try {
      localStorage.setItem(WATCHLISTS_KEY, JSON.stringify(lists));
      setWatchlists(lists);
    } catch (error) {
      console.error('Failed to save watchlists:', error);
      toast({
        title: 'Error',
        description: 'Failed to save watchlists',
        variant: 'destructive'
      });
    }
  }, []);

  // Create a new watchlist
  const createWatchlist = useCallback((name: string) => {
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name,
      symbols: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updated = [...watchlists, newWatchlist];
    saveWatchlists(updated);
    
    toast({
      title: 'Success',
      description: `Watchlist "${name}" created`,
    });
    
    return newWatchlist;
  }, [watchlists, saveWatchlists]);

  // Rename a watchlist
  const renameWatchlist = useCallback((id: string, newName: string) => {
    const updated = watchlists.map(w => 
      w.id === id 
        ? { ...w, name: newName, updatedAt: new Date() }
        : w
    );
    saveWatchlists(updated);
    
    toast({
      title: 'Success',
      description: 'Watchlist renamed',
    });
  }, [watchlists, saveWatchlists]);

  // Delete a watchlist
  const deleteWatchlist = useCallback((id: string) => {
    if (id === DEFAULT_WATCHLIST_ID) {
      toast({
        title: 'Error',
        description: 'Cannot delete the default watchlist',
        variant: 'destructive'
      });
      return;
    }
    
    const watchlist = watchlists.find(w => w.id === id);
    const updated = watchlists.filter(w => w.id !== id);
    saveWatchlists(updated);
    
    toast({
      title: 'Success',
      description: `Watchlist "${watchlist?.name}" deleted`,
    });
  }, [watchlists, saveWatchlists]);

  // Add symbol to watchlist
  const addSymbolToWatchlist = useCallback((watchlistId: string, symbol: string) => {
    const updated = watchlists.map(w => {
      if (w.id === watchlistId) {
        if (w.symbols.includes(symbol)) {
          toast({
            title: 'Info',
            description: `${symbol} is already in this watchlist`,
          });
          return w;
        }
        return {
          ...w,
          symbols: [...w.symbols, symbol],
          updatedAt: new Date()
        };
      }
      return w;
    });
    
    saveWatchlists(updated);
    
    toast({
      title: 'Success',
      description: `${symbol} added to watchlist`,
    });
  }, [watchlists, saveWatchlists]);

  // Remove symbol from watchlist
  const removeSymbolFromWatchlist = useCallback((watchlistId: string, symbol: string) => {
    const updated = watchlists.map(w => {
      if (w.id === watchlistId) {
        return {
          ...w,
          symbols: w.symbols.filter(s => s !== symbol),
          updatedAt: new Date()
        };
      }
      return w;
    });
    
    saveWatchlists(updated);
    
    toast({
      title: 'Success',
      description: `${symbol} removed from watchlist`,
    });
  }, [watchlists, saveWatchlists]);

  // Reorder symbols in watchlist (for drag & drop)
  const reorderSymbols = useCallback((watchlistId: string, newOrder: string[]) => {
    const updated = watchlists.map(w => {
      if (w.id === watchlistId) {
        return {
          ...w,
          symbols: newOrder,
          updatedAt: new Date()
        };
      }
      return w;
    });
    
    saveWatchlists(updated);
  }, [watchlists, saveWatchlists]);

  // Check if symbol is in any watchlist
  const isSymbolInWatchlist = useCallback((symbol: string, watchlistId?: string) => {
    if (watchlistId) {
      const watchlist = watchlists.find(w => w.id === watchlistId);
      return watchlist?.symbols.includes(symbol) || false;
    }
    return watchlists.some(w => w.symbols.includes(symbol));
  }, [watchlists]);

  // Get default watchlist
  const getDefaultWatchlist = useCallback(() => {
    return watchlists.find(w => w.id === DEFAULT_WATCHLIST_ID) || watchlists[0];
  }, [watchlists]);

  return {
    watchlists,
    isLoading,
    createWatchlist,
    renameWatchlist,
    deleteWatchlist,
    addSymbolToWatchlist,
    removeSymbolFromWatchlist,
    reorderSymbols,
    isSymbolInWatchlist,
    getDefaultWatchlist
  };
}