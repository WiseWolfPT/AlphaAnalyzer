import { MainLayout } from "@/components/layout/main-layout";
import { RealTimeWatchlist } from "@/components/stock/real-time-watchlist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function WatchlistTest() {
  return (
    <MainLayout>
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-chartreuse/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Watchlist Test</h1>
              <p className="text-muted-foreground">Testing real-time watchlist with live API data</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Real-Time Watchlist Test</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This component should show live prices from the /api/stocks/realtime endpoint. 
                AAPL should show approximately $201.00 instead of the old mock price of $175.43.
              </p>
              <RealTimeWatchlist
                title="Live Stock Prices"
                maxItems={5}
                updateInterval={5000}
                onStockClick={(symbol) => {
                  console.log(`Clicked stock: ${symbol}`);
                  window.location.href = `/stock/${symbol}/charts`;
                }}
                onToggleWatch={(symbol) => {
                  console.log(`Toggled watch for: ${symbol}`);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}