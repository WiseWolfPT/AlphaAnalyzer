import { useState, useEffect } from "react";
import { useParams } from "wouter";

export default function StockDetailsTest() {
  const params = useParams();
  const symbol = params.symbol || 'AAPL';
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log(`🔍 Testing stock details for ${symbol}...`);
        const response = await fetch(`/api/stocks/realtime/${symbol}`);
        const data = await response.json();
        setStockData(data[symbol]);
        console.log('✅ Stock data received:', data[symbol]);
      } catch (error) {
        console.error('❌ Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  if (loading) {
    return <div>Loading {symbol}...</div>;
  }

  if (!stockData) {
    return <div>No data for {symbol}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="heading-section mb-6">Stock Details Test - {symbol}</h1>
      <div className="bg-card border border-border p-6 rounded-lg mt-6">
        <h2 className="heading-subsection mb-4">Real Stock Data</h2>
        <p className="text-body mb-2"><span className="text-label">Symbol:</span> {stockData.symbol}</p>
        <p className="text-body mb-2"><span className="text-label">Name:</span> {stockData.name}</p>
        <p className="text-body mb-2"><span className="text-label">Price:</span> <span className="text-metric">${stockData.price}</span></p>
        <p className="text-body mb-2"><span className="text-label">Change:</span> {stockData.change}</p>
        <p className="text-body mb-2"><span className="text-label">Change %:</span> {stockData.changePercent}%</p>
        <p className="text-body mb-2"><span className="text-label">Source:</span> {stockData.source}</p>
        <p className="text-caption"><span className="text-label">Last Updated:</span> {new Date(stockData.lastUpdated).toLocaleString()}</p>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test Other Symbols:</h3>
        <a href="/stock-test/AAPL" style={{ marginRight: '10px' }}>AAPL</a>
        <a href="/stock-test/MSFT" style={{ marginRight: '10px' }}>MSFT</a>
        <a href="/stock-test/GOOGL" style={{ marginRight: '10px' }}>GOOGL</a>
        <a href="/stock-test/TSLA">TSLA</a>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
        <p><strong>✅ Success!</strong> Real API data is working correctly.</p>
        <p>The main stock details page at <code>/stock/{symbol}/charts</code> should now show this real price: <strong>${stockData.price}</strong></p>
      </div>
    </div>
  );
}