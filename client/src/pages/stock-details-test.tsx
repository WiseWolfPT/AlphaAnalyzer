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
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Stock Details Test - {symbol}</h1>
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
        <h2>Real Stock Data</h2>
        <p><strong>Symbol:</strong> {stockData.symbol}</p>
        <p><strong>Name:</strong> {stockData.name}</p>
        <p><strong>Price:</strong> ${stockData.price}</p>
        <p><strong>Change:</strong> {stockData.change}</p>
        <p><strong>Change %:</strong> {stockData.changePercent}%</p>
        <p><strong>Source:</strong> {stockData.source}</p>
        <p><strong>Last Updated:</strong> {new Date(stockData.lastUpdated).toLocaleString()}</p>
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