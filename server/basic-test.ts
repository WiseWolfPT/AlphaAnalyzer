import express from 'express';
import { createServer } from 'http';

const app = express();
const port = 8080;

app.get('/', (req, res) => {
  res.send('Basic test server working!');
});

const server = createServer(app);

server.listen(port, '127.0.0.1', () => {
  console.log(`Server running on http://127.0.0.1:${port}`);
});