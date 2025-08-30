import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 8080;

// Serve static files from dist/public
app.use(express.static(path.join(__dirname, 'dist/public')));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Simple server running at http://localhost:${PORT}`);
  console.log(`📂 Serving files from: ${path.join(__dirname, 'dist/public')}`);
  console.log(`\n⚠️  Configure your app to use API URL: http://localhost:3001`);
});