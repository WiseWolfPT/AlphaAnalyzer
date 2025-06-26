import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarIcon, DollarSign, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PortfolioService, type TransactionInput } from "@/services/portfolio-service";
import type { MockStock } from "@/lib/mock-api";

interface TransactionFormProps {
  portfolioId: number;
  onTransactionAdded: (transaction: TransactionInput) => void;
  onCancel: () => void;
}

export function TransactionForm({ portfolioId, onTransactionAdded, onCancel }: TransactionFormProps) {
  const [formData, setFormData] = useState<Partial<TransactionInput>>({
    portfolioId,
    type: 'buy',
    quantity: 0,
    price: 0,
    fees: 0,
    executedAt: new Date(),
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStock, setSelectedStock] = useState<MockStock | null>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  const portfolioService = new PortfolioService();

  // Search for stocks
  const { data: searchResults, isLoading: isSearching } = useQuery<MockStock[]>({
    queryKey: ["/api/stocks/search", stockSearch],
    enabled: stockSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  // Get current stock price when symbol is selected
  const { data: currentStock } = useQuery<MockStock>({
    queryKey: ["/api/stocks", formData.stockSymbol],
    enabled: !!formData.stockSymbol,
    staleTime: 60 * 1000,
  });

  const handleStockSelect = (stock: MockStock) => {
    setSelectedStock(stock);
    setFormData(prev => ({
      ...prev,
      stockSymbol: stock.symbol,
      price: parseFloat(stock.price)
    }));
    setStockSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    try {
      const transaction: TransactionInput = {
        portfolioId,
        stockSymbol: formData.stockSymbol || '',
        type: formData.type as 'buy' | 'sell' | 'dividend',
        quantity: formData.quantity || 0,
        price: formData.price || 0,
        fees: formData.fees || 0,
        notes: formData.notes,
        executedAt: formData.executedAt || new Date(),
      };

      const validationErrors = portfolioService.validateTransaction(transaction);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      onTransactionAdded(transaction);
    } catch (error) {
      setErrors(['Failed to add transaction. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = (formData.quantity || 0) * (formData.price || 0) + (formData.fees || 0);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Add Transaction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Stock Symbol Search */}
          <div className="space-y-2">
            <Label htmlFor="stock-search">Stock Symbol</Label>
            <div className="relative">
              <Input
                id="stock-search"
                placeholder="Search for a stock (e.g., AAPL, MSFT)"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className={selectedStock ? "bg-green-50 border-green-200" : ""}
              />
              {selectedStock && (
                <div className="mt-2 p-3 bg-secondary/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{selectedStock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{selectedStock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${selectedStock.price}</div>
                      <div className={cn(
                        "text-sm",
                        parseFloat(selectedStock.changePercent) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {parseFloat(selectedStock.changePercent) >= 0 ? '+' : ''}{selectedStock.changePercent}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              
              {searchResults && searchResults.length > 0 && stockSearch.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((stock) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => handleStockSelect(stock)}
                      className="w-full px-4 py-3 text-left hover:bg-secondary/50 border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{stock.symbol}</div>
                          <div className="text-sm text-muted-foreground truncate">{stock.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${stock.price}</div>
                          <div className={cn(
                            "text-sm",
                            parseFloat(stock.changePercent) >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {parseFloat(stock.changePercent) >= 0 ? '+' : ''}{stock.changePercent}%
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'buy' | 'sell' | 'dividend') => 
                setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0"
                value={formData.quantity || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  quantity: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price per Share</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  price: parseFloat(e.target.value) || 0 
                }))}
              />
              {currentStock && (
                <div className="text-sm text-muted-foreground">
                  Current price: ${currentStock.price}
                </div>
              )}
            </div>
          </div>

          {/* Fees */}
          <div className="space-y-2">
            <Label htmlFor="fees">Fees (Optional)</Label>
            <Input
              id="fees"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.fees || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                fees: parseFloat(e.target.value) || 0 
              }))}
            />
          </div>

          {/* Execution Date */}
          <div className="space-y-2">
            <Label>Execution Date</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.executedAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.executedAt ? format(formData.executedAt, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.executedAt}
                  onSelect={(date) => {
                    setFormData(prev => ({ ...prev, executedAt: date || new Date() }));
                    setShowCalendar(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this transaction..."
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Transaction Summary */}
          {formData.quantity && formData.price && (
            <div className="p-4 bg-secondary/20 rounded-lg">
              <h4 className="font-semibold mb-2">Transaction Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Shares:</span>
                  <span>{formData.quantity?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price per share:</span>
                  <span>${formData.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${((formData.quantity || 0) * (formData.price || 0)).toFixed(2)}</span>
                </div>
                {formData.fees && formData.fees > 0 && (
                  <div className="flex justify-between">
                    <span>Fees:</span>
                    <span>${formData.fees.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>${totalValue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !selectedStock}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Transaction
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}