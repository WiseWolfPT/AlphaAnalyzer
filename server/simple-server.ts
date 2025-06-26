import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Serve static files from client/dist/public
app.use(express.static(path.join(__dirname, '..', 'client', 'dist', 'public')));

// API routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working' });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'public', 'index.html'));
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});