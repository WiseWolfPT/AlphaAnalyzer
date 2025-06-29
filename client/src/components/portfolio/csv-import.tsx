import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Info
} from "lucide-react";
import { PortfolioService, type TransactionInput } from "@/services/portfolio-service";

interface CSVImportProps {
  portfolioId: number;
  onImportComplete: (transactions: TransactionInput[]) => void;
  onCancel: () => void;
}

export function CSVImport({ portfolioId, onImportComplete, onCancel }: CSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<TransactionInput[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const portfolioService = new PortfolioService();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setErrors([]);
      setParsedTransactions([]);
      setShowPreview(false);
    } else {
      setErrors(['Please select a valid CSV file']);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      const fileContent = await file.text();
      const { transactions, errors: parseErrors } = portfolioService.parseCSV(fileContent, portfolioId);
      
      if (parseErrors.length > 0) {
        setErrors(parseErrors);
      } else {
        setParsedTransactions(transactions);
        setShowPreview(true);
      }
    } catch (error) {
      setErrors(['Failed to process file. Please ensure it is a valid CSV file.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (parsedTransactions.length > 0) {
      onImportComplete(parsedTransactions);
    }
  };

  const downloadTemplate = () => {
    const template = portfolioService.generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-transactions-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTransactionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'buy': return 'bg-green-100 text-green-800';
      case 'sell': return 'bg-red-100 text-red-800';
      case 'dividend': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Transactions from CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">Need a template?</div>
              <div className="text-sm text-blue-700">
                Download our CSV template to get started with the correct format
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={downloadTemplate} className="border-blue-300">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="flex-1"
              />
              <Button 
                onClick={processFile} 
                disabled={!file || isProcessing}
                variant="secondary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Process File
                  </>
                )}
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Found {errors.length} error(s):</div>
              <ScrollArea className="h-32">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {showPreview && parsedTransactions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Import Preview</div>
                  <div className="text-sm text-muted-foreground">
                    {parsedTransactions.length} transaction(s) ready to import
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Edit File
                </Button>
                <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import Transactions
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {parsedTransactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="font-bold text-lg">{transaction.stockSymbol}</div>
                            <Badge className={getTransactionTypeColor(transaction.type)}>
                              {formatTransactionType(transaction.type)}
                            </Badge>
                          </div>
                          <Separator orientation="vertical" className="h-12" />
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Quantity:</span>{' '}
                              <span className="font-medium">{transaction.quantity.toLocaleString()}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Price:</span>{' '}
                              <span className="font-medium">${transaction.price.toFixed(2)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Date:</span>{' '}
                              <span className="font-medium">
                                {transaction.executedAt.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${(transaction.quantity * transaction.price + (transaction.fees || 0)).toFixed(2)}
                          </div>
                          {transaction.fees && transaction.fees > 0 && (
                            <div className="text-sm text-muted-foreground">
                              +${transaction.fees.toFixed(2)} fees
                            </div>
                          )}
                          {transaction.notes && (
                            <div className="text-xs text-muted-foreground mt-1 max-w-32 truncate">
                              {transaction.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Import Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {parsedTransactions.filter(t => t.type === 'buy').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Buy Orders</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {parsedTransactions.filter(t => t.type === 'sell').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Sell Orders</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {parsedTransactions.filter(t => t.type === 'dividend').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Dividends</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">
                    ${parsedTransactions
                      .reduce((sum, t) => sum + (t.quantity * t.price + (t.fees || 0)), 0)
                      .toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* CSV Format Instructions */}
        {!showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CSV Format Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="font-medium mb-2">Required Columns:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><strong>symbol</strong>: Stock symbol (e.g., AAPL, MSFT)</li>
                    <li><strong>type</strong>: Transaction type (buy, sell, dividend)</li>
                    <li><strong>quantity</strong>: Number of shares (decimal allowed)</li>
                    <li><strong>price</strong>: Price per share in USD</li>
                    <li><strong>date</strong>: Transaction date (YYYY-MM-DD or MM/DD/YYYY)</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium mb-2">Optional Columns:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li><strong>fees</strong>: Transaction fees in USD</li>
                    <li><strong>notes</strong>: Additional notes about the transaction</li>
                  </ul>
                </div>
                <div className="p-3 bg-secondary/20 rounded-lg">
                  <div className="font-medium mb-2">Example CSV format:</div>
                  <pre className="text-sm text-muted-foreground overflow-x-auto">
{`symbol,type,quantity,price,date,fees,notes
AAPL,buy,10,150.00,2024-01-15,9.99,Initial purchase
MSFT,buy,5,400.00,2024-01-20,9.99,
AAPL,sell,2,175.00,2024-02-01,9.99,Partial sale`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}