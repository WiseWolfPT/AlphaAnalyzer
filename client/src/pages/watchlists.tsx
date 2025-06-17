import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Watchlist, WatchlistStock, Stock } from "@shared/schema";

export default function Watchlists() {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: watchlists, isLoading: watchlistsLoading } = useQuery<Watchlist[]>({
    queryKey: ["/api/watchlists"],
  });

  const { data: watchlistStocks } = useQuery<WatchlistStock[]>({
    queryKey: [`/api/watchlists/${selectedWatchlistId}/stocks`],
    enabled: !!selectedWatchlistId,
  });


  const createWatchlistMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/watchlists", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
      setNewWatchlistName("");
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Watchlist created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create watchlist",
        variant: "destructive",
      });
    },
  });

  const deleteWatchlistMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/watchlists/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlists"] });
      if (selectedWatchlistId === watchlists?.find(w => w.id === selectedWatchlistId)?.id) {
        setSelectedWatchlistId(null);
      }
      toast({
        title: "Success",
        description: "Watchlist deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete watchlist",
        variant: "destructive",
      });
    },
  });

  const selectedWatchlist = watchlists?.find(w => w.id === selectedWatchlistId);

  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Watchlists</h1>
                <p className="text-muted-foreground">Track and organize your favorite stocks</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Watchlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Watchlist Name</Label>
                      <Input
                        id="name"
                        value={newWatchlistName}
                        onChange={(e) => setNewWatchlistName(e.target.value)}
                        placeholder="Enter watchlist name"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => createWatchlistMutation.mutate(newWatchlistName)}
                        disabled={!newWatchlistName.trim() || createWatchlistMutation.isPending}
                        className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0"
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Watchlists Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Your Watchlists</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {watchlistsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  ) : watchlists?.length ? (
                    watchlists.map((watchlist) => (
                      <div
                        key={watchlist.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedWatchlistId === watchlist.id
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedWatchlistId(watchlist.id)}
                      >
                        <span className="text-sm font-medium">{watchlist.name}</span>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement edit functionality
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWatchlistMutation.mutate(watchlist.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No watchlists created yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {selectedWatchlist ? (
                <>
                      {/* Stocks List */}
                      <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Stocks in {selectedWatchlist.name}</CardTitle>
                      <Button size="sm" className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Stock
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {watchlistStocks?.length ? (
                        <div className="space-y-3">
                          {watchlistStocks.map((ws) => (
                            <div key={ws.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                  <span className="text-sm font-medium">{ws.stockSymbol.charAt(0)}</span>
                                </div>
                                <div>
                                  <div className="font-medium">{ws.stockSymbol}</div>
                                  <div className="text-sm text-muted-foreground">Stock Name</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">$175.43</div>
                                <div className="text-sm text-positive">+2.34%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No stocks in this watchlist</p>
                          <Button size="sm" className="mt-2 bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">Add your first stock</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dip Finder Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingDown className="h-5 w-5 text-negative" />
                        <span>Dip Finder</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Stocks trading below their moving averages
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>AAPL</span>
                          <span className="text-negative">-5.2% from 50D SMA</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>MSFT</span>
                          <span className="text-negative">-3.1% from 10D SMA</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Upcoming Earnings Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-chart-1" />
                        <span>Upcoming Earnings</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">AAPL</div>
                            <div className="text-sm text-muted-foreground">Jan 25, After Close</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">Est. EPS: $2.11</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">MSFT</div>
                            <div className="text-sm text-muted-foreground">Jan 26, After Close</div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">Est. EPS: $2.78</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* News Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Latest News</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex space-x-3">
                          <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0"></div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1">Apple Reports Strong Q4 Earnings</h4>
                            <p className="text-xs text-muted-foreground mb-1">
                              Apple Inc. reported quarterly earnings that beat analyst expectations...
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>Reuters</span>
                              <span>•</span>
                              <span>2 hours ago</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <h3 className="text-lg font-medium mb-2">Select a Watchlist</h3>
                    <p className="text-muted-foreground mb-4">
                      Choose a watchlist from the sidebar to view its contents
                    </p>
                    {!watchlists?.length && (
                      <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-chartreuse via-chartreuse-dark to-chartreuse hover:from-chartreuse-dark hover:via-chartreuse hover:to-chartreuse-dark text-rich-black font-semibold shadow-lg shadow-chartreuse/30 hover:shadow-chartreuse/50 hover:scale-105 transition-all duration-300 border-0">
                        Create Your First Watchlist
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
      </div>
    </MainLayout>
  );
}
