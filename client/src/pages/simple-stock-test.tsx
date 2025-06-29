export default function SimpleStockTest() {
  const testAPI = async () => {
    try {
      const response = await fetch('/api/stocks/realtime/AAPL');
      const data = await response.json();
      
      const resultDiv = document.getElementById('result');
      if (resultDiv) {
        resultDiv.innerHTML = `
          <h2>✅ API Test Successful!</h2>
          <p><strong>Symbol:</strong> ${data.AAPL.symbol}</p>
          <p><strong>Price:</strong> $${data.AAPL.price}</p>
          <p><strong>Change:</strong> ${data.AAPL.change}</p>
          <p><strong>Source:</strong> ${data.AAPL.source}</p>
          <p><strong>Last Updated:</strong> ${data.AAPL.lastUpdated}</p>
          <hr/>
          <p><strong>🎯 Expected:</strong> AAPL should show $201.00 with source: "real"</p>
          <p><strong>🎯 Result:</strong> ${data.AAPL.price === "201.00" && data.AAPL.source === "real" ? "✅ PASS - Real data working!" : "❌ FAIL - Still using mock data"}</p>
        `;
      }
    } catch (error) {
      const resultDiv = document.getElementById('result');
      if (resultDiv) {
        resultDiv.innerHTML = `<h2>❌ API Test Failed</h2><p>Error: ${error}</p>`;
      }
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Simple Stock API Test</h1>
      <p>This page tests if the real stock API is working correctly.</p>
      
      <button 
        onClick={testAPI}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '6px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        🚀 Test AAPL Real Price API
      </button>
      
      <div 
        id="result" 
        style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginTop: '20px'
        }}
      >
        Click the button to test the API...
      </div>
      
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
        <h3>📋 Instructions:</h3>
        <ol>
          <li>Click the "Test AAPL Real Price API" button above</li>
          <li>If working correctly, you should see AAPL price as $201.00 with source: "real"</li>
          <li>If you see different prices or source: "mock", there's still an issue</li>
        </ol>
        
        <p><strong>Direct API Test:</strong></p>
        <p>You can also test directly: <code>http://localhost:8080/api/stocks/realtime/AAPL</code></p>
      </div>
    </div>
  );
}