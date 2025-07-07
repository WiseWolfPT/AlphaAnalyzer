import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Edit,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Transaction } from "@shared/schema";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transactionId: number) => void;
}

type TransactionType = 'all' | 'buy' | 'sell' | 'dividend';
type SortBy = 'date' | 'symbol' | 'value' | 'type';
type SortOrder = 'asc' | 'desc';

export function TransactionHistory({ 
  transactions, 
  onEditTransaction, 
  onDeleteTransaction 
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<TransactionType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction => 
        transaction.stockSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime();
          break;
        case 'symbol':
          comparison = a.stockSymbol.localeCompare(b.stockSymbol);
          break;
        case 'value':
          const aValue = parseFloat(a.quantity.toString()) * parseFloat(a.price.toString());
          const bValue = parseFloat(b.quantity.toString()) * parseFloat(b.price.toString());
          comparison = aValue - bValue;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [transactions, searchTerm, filterType, sortBy, sortOrder]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const buyTransactions = transactions.filter(t => t.type === 'buy');
    const sellTransactions = transactions.filter(t => t.type === 'sell');
    const dividendsTransactions = transactions.filter(t => t.type === 'dividend');

    const totalBuyValue = buyTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.quantity.toString()) * parseFloat(t.price.toString()) + parseFloat(t.fees?.toString() || '0')), 0
    );

    const totalSellValue = sellTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.quantity.toString()) * parseFloat(t.price.toString()) - parseFloat(t.fees?.toString() || '0')), 0
    );

    const totalDividends = dividendsTransactions.reduce((sum, t) => 
      sum + (parseFloat(t.quantity.toString()) * parseFloat(t.price.toString())), 0
    );

    const totalFees = transactions.reduce((sum, t) => 
      sum + parseFloat(t.fees?.toString() || '0'), 0
    );

    return {
      totalBuyValue,
      totalSellValue,
      totalDividends,
      totalFees,
      buyCount: buyTransactions.length,
      sellCount: sellTransactions.length,
      dividendCount: dividendsTransactions.length
    };
  }, [transactions]);

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'buy': return 'bg-green-100 text-green-800 border-green-200';
      case 'sell': return 'bg-red-100 text-red-800 border-red-200';
      case 'dividend': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy': return <TrendingUp className="h-4 w-4" />;
      case 'sell': return <TrendingDown className="h-4 w-4" />;
      case 'dividend': return <DollarSign className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Fees', 'Total', 'Notes'];
    const csvData = filteredAndSortedTransactions.map(t => [
      format(new Date(t.executedAt), 'yyyy-MM-dd'),
      t.stockSymbol,
      t.type,
      t.quantity,
      t.price,
      t.fees || '0',
      (parseFloat(t.quantity.toString()) * parseFloat(t.price.toString()) + parseFloat(t.fees?.toString() || '0')).toFixed(2),
      t.notes || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Buys</span>
            </div>
            <div className="text-2xl font-bold text-green-600">${summary.totalBuyValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{summary.buyCount} transactions</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Total Sells</span>
            </div>
            <div className="text-2xl font-bold text-red-600">${summary.totalSellValue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{summary.sellCount} transactions</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Dividends</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">${summary.totalDividends.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{summary.dividendCount} payments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Total Fees</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">${summary.totalFees.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{transactions.length} total</div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <Button variant="outline" onClick={exportToCSV} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: TransactionType) => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="symbol">Symbol</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>

          {/* Transaction List */}
          <ScrollArea className="h-96">
            {filteredAndSortedTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="font-medium">No transactions found</div>
                <div className="text-sm">Try adjusting your search or filters</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedTransactions.map((transaction) => {
                  const transactionValue = parseFloat(transaction.quantity.toString()) * parseFloat(transaction.price.toString());
                  const totalWithFees = transactionValue + parseFloat(transaction.fees?.toString() || '0');

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <Badge className={getTransactionTypeColor(transaction.type)}>
                            {transaction.type.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <Separator orientation="vertical" className="h-12" />
                        
                        <div>
                          <div className="font-bold text-lg">{transaction.stockSymbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {parseFloat(transaction.quantity.toString()).toLocaleString()} shares @ ${parseFloat(transaction.price.toString()).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {format(new Date(transaction.executedAt), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold">
                          ${totalWithFees.toFixed(2)}
                        </div>
                        {transaction.fees && parseFloat(transaction.fees.toString()) > 0 && (
                          <div className="text-sm text-muted-foreground">
                            +${parseFloat(transaction.fees.toString()).toFixed(2)} fees
                          </div>
                        )}
                        {transaction.notes && (
                          <div className="text-xs text-muted-foreground mt-1 max-w-32 truncate">
                            {transaction.notes}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {(onEditTransaction || onDeleteTransaction) && (
                        <div className="flex gap-1 ml-4">
                          {onEditTransaction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditTransaction(transaction)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {onDeleteTransaction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteTransaction(transaction.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}