// Example React component showing Supabase client usage
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  supabase, 
  auth, 
  db, 
  realtime, 
  helpers,
  type Watchlist,
  type WatchlistItem,
  type Portfolio,
  type Holding
} from '@/lib/supabase';
import { TransactionType } from '@/shared/types/enums';

export function SupabaseExample() {
  const [user, setUser] = useState<any>(null);
  const queryClient = useQueryClient();

  // Auth state listener
  useEffect(() => {
    // Get initial session
    auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's watchlists
  const { data: watchlists, isLoading: watchlistsLoading } = useQuery({
    queryKey: ['watchlists', user?.id],
    queryFn: () => db.getUserWatchlists(user!.id),
    enabled: !!user
  });

  // Fetch user's portfolios
  const { data: portfolios } = useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: () => db.getUserPortfolios(user!.id),
    enabled: !!user
  });

  // Create watchlist mutation
  const createWatchlistMutation = useMutation({
    mutationFn: async (name: string) => {
      return db.createWatchlist({
        user_id: user!.id,
        name,
        description: 'Created from example',
        is_default: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists', user?.id] });
    }
  });

  // Add stock to watchlist mutation
  const addStockMutation = useMutation({
    mutationFn: async ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) => {
      return db.addWatchlistItem({
        watchlist_id: watchlistId,
        symbol,
        notes: 'Added from example'
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items', variables.watchlistId] });
    }
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async ({ portfolioId, symbol, quantity, price }: any) => {
      return db.createTransaction({
        portfolio_id: portfolioId,
        symbol,
        type: TransactionType.BUY,
        quantity,
        price,
        fees: 0,
        date: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['holdings', variables.portfolioId] });
    }
  });

  // Real-time subscription example
  useEffect(() => {
    if (!user) return;

    const channel = realtime.subscribeToWatchlists(user.id, (payload) => {
      console.log('Watchlist change:', payload);
      // Refetch watchlists when they change
      queryClient.invalidateQueries({ queryKey: ['watchlists', user.id] });
    });

    return () => {
      realtime.unsubscribe(channel);
    };
  }, [user, queryClient]);

  // Example: Get watchlist items for a specific watchlist
  const WatchlistItems: React.FC<{ watchlistId: string }> = ({ watchlistId }) => {
    const { data: items, isLoading } = useQuery({
      queryKey: ['watchlist-items', watchlistId],
      queryFn: () => db.getWatchlistItems(watchlistId)
    });

    if (isLoading) return <div>Loading items...</div>;

    return (
      <ul>
        {items?.map(item => (
          <li key={item.id}>
            {item.symbol} - Added: {new Date(item.added_at).toLocaleDateString()}
            {item.notes && <span> ({item.notes})</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Example: Portfolio holdings display
  const PortfolioHoldings: React.FC<{ portfolioId: string }> = ({ portfolioId }) => {
    const { data: holdings } = useQuery({
      queryKey: ['holdings', portfolioId],
      queryFn: () => db.getPortfolioHoldings(portfolioId)
    });

    const totalValue = holdings?.reduce((sum, h) => sum + (h.current_value || 0), 0) || 0;

    return (
      <div>
        <h4>Holdings (Total: ${totalValue.toFixed(2)})</h4>
        <ul>
          {holdings?.map(holding => (
            <li key={holding.id}>
              {holding.symbol}: {holding.quantity} shares @ ${holding.current_price || 'N/A'}
              {holding.unrealized_pnl && (
                <span style={{ color: holding.unrealized_pnl > 0 ? 'green' : 'red' }}>
                  {' '}({holding.unrealized_pnl > 0 ? '+' : ''}{holding.unrealized_pnl.toFixed(2)})
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Sign in form
  if (!user) {
    return (
      <div>
        <h2>Sign In</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const email = formData.get('email') as string;
          const password = formData.get('password') as string;
          
          const { error } = await auth.signIn(email, password);
          if (error) alert(error.message);
        }}>
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
          <button type="submit">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>Supabase Example</h1>
      <p>Logged in as: {user.email}</p>
      <button onClick={() => auth.signOut()}>Sign Out</button>

      <section>
        <h2>Watchlists</h2>
        {watchlistsLoading ? (
          <p>Loading watchlists...</p>
        ) : (
          <>
            <button onClick={() => {
              const name = prompt('Watchlist name:');
              if (name) createWatchlistMutation.mutate(name);
            }}>
              Create Watchlist
            </button>
            
            {watchlists?.map(watchlist => (
              <div key={watchlist.id}>
                <h3>{watchlist.name}</h3>
                <p>{watchlist.description}</p>
                <button onClick={() => {
                  const symbol = prompt('Stock symbol:');
                  if (symbol) {
                    addStockMutation.mutate({ 
                      watchlistId: watchlist.id, 
                      symbol 
                    });
                  }
                }}>
                  Add Stock
                </button>
                <WatchlistItems watchlistId={watchlist.id} />
              </div>
            ))}
          </>
        )}
      </section>

      <section>
        <h2>Portfolios</h2>
        {portfolios?.map(portfolio => (
          <div key={portfolio.id}>
            <h3>{portfolio.name} ({portfolio.currency})</h3>
            <button onClick={() => {
              const symbol = prompt('Stock symbol:');
              const quantity = prompt('Quantity:');
              const price = prompt('Price per share:');
              
              if (symbol && quantity && price) {
                createTransactionMutation.mutate({
                  portfolioId: portfolio.id,
                  symbol,
                  quantity: parseFloat(quantity),
                  price: parseFloat(price)
                });
              }
            }}>
              Buy Stock
            </button>
            <PortfolioHoldings portfolioId={portfolio.id} />
          </div>
        ))}
      </section>

      <section>
        <h2>Quick Actions</h2>
        <button onClick={async () => {
          const hasSubscription = await helpers.hasActiveSubscription(user.id);
          alert(`Active subscription: ${hasSubscription}`);
        }}>
          Check Subscription
        </button>
        
        <button onClick={async () => {
          const userData = await helpers.getUserData(user.id);
          console.log('All user data:', userData);
          alert('Check console for user data');
        }}>
          Get All User Data
        </button>
      </section>
    </div>
  );
}