import React, { useState } from 'react';
import { StockHeader } from './stock-header';

// Mock data for testing StockHeader component
const mockStockData = {
  symbol: 'AAPL',
  company: {
    name: 'Apple Inc.',
    sector: 'Technology',
    price: 175.43,
    change: 2.15,
    changePercent: 1.24,
    afterHoursPrice: 176.20,
    afterHoursChange: 0.77,
    afterHoursChangePercent: 0.44,
    earningsDate: 'Feb 1, 2024',
    logo: 'https://logo.clearbit.com/apple.com'
  }
};

// Alternative mock data for negative values testing
const mockStockDataNegative = {
  symbol: 'TSLA',
  company: {
    name: 'Tesla, Inc.',
    sector: 'Automotive',
    price: 243.84,
    change: -5.67,
    changePercent: -2.27,
    afterHoursPrice: 242.10,
    afterHoursChange: -1.74,
    afterHoursChangePercent: -0.71,
    earningsDate: 'Jan 24, 2024',
    logo: 'https://logo.clearbit.com/tesla.com'
  }
};

// Mock data with invalid logo to test error handling
const mockStockDataInvalidLogo = {
  symbol: 'TEST',
  company: {
    name: 'Test Company Ltd.',
    sector: 'Testing',
    price: 50.00,
    change: 1.25,
    changePercent: 2.56,
    afterHoursPrice: 50.50,
    afterHoursChange: 0.50,
    afterHoursChangePercent: 1.00,
    earningsDate: 'Dec 15, 2024',
    logo: 'https://invalid-logo-url.com/test.png'
  }
};

export function StockHeaderTest() {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [currentDataSet, setCurrentDataSet] = useState<'positive' | 'negative' | 'invalid-logo'>('positive');

  const getCurrentData = () => {
    switch (currentDataSet) {
      case 'positive':
        return mockStockData;
      case 'negative':
        return mockStockDataNegative;
      case 'invalid-logo':
        return mockStockDataInvalidLogo;
      default:
        return mockStockData;
    }
  };

  const currentData = getCurrentData();

  const handleAddToWatchlist = () => {
    setIsInWatchlist(!isInWatchlist);
    console.log(`${isInWatchlist ? 'Removed from' : 'Added to'} watchlist:`, currentData.symbol);
  };

  const handleShare = () => {
    console.log('Share clicked for:', currentData.symbol);
    alert(`Sharing ${currentData.symbol} - ${currentData.company.name}`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold mb-4">StockHeader Component Test</h1>
        
        {/* Test Controls */}
        <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold">Test Controls</h2>
          
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentDataSet('positive')}
              className={`px-4 py-2 rounded ${
                currentDataSet === 'positive' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Positive Change (AAPL)
            </button>
            
            <button
              onClick={() => setCurrentDataSet('negative')}
              className={`px-4 py-2 rounded ${
                currentDataSet === 'negative' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Negative Change (TSLA)
            </button>
            
            <button
              onClick={() => setCurrentDataSet('invalid-logo')}
              className={`px-4 py-2 rounded ${
                currentDataSet === 'invalid-logo' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Invalid Logo (TEST)
            </button>
          </div>

          <div className="space-y-2">
            <p><strong>Current Dataset:</strong> {currentDataSet}</p>
            <p><strong>Watchlist Status:</strong> {isInWatchlist ? 'In Watchlist' : 'Not in Watchlist'}</p>
          </div>
        </div>

        {/* Component Test Area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">StockHeader Component Output</h2>
          
          <StockHeader
            symbol={currentData.symbol}
            company={currentData.company}
            isInWatchlist={isInWatchlist}
            onAddToWatchlist={handleAddToWatchlist}
            onShare={handleShare}
          />
        </div>

        {/* Data Display for Verification */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Current Mock Data</h2>
          <pre className="text-sm overflow-auto bg-white dark:bg-gray-800 p-4 rounded border">
            {JSON.stringify(currentData, null, 2)}
          </pre>
        </div>

        {/* Expected Layout Description */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Expected 3-Line Layout</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li><strong>Line 1:</strong> Logo + Ticker Symbol + Current Price + Daily Change (with colors)</li>
            <li><strong>Line 2:</strong> Company Name (left) + After Hours Price & Change (right)</li>
            <li><strong>Line 3:</strong> Sector Badge (left) + Earnings Date (right)</li>
            <li><strong>Line 4:</strong> Action Buttons (Add to Watchlist + Share)</li>
          </ol>
        </div>

        {/* Test Results Section */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Manual Test Checklist</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Logo displays correctly (or shows fallback letter)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Ticker symbol shows in correct size and weight</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Price displays with 2 decimal places</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Daily change shows correct color (green for positive, red for negative)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Company name displays on left side of line 2</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>After hours data displays on right side of line 2</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Sector badge displays with correct styling</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Earnings date displays on right side of line 3</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Watchlist button toggles correctly</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Share button triggers alert</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" />
              <span>Logo error handling works (shows first letter of symbol)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockHeaderTest;