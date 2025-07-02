const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Test server working'
  });
});

app.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
  console.log('Try: curl http://localhost:3001/health');
});