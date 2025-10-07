const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true
}));

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Catch all handler: send back index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

const PORT = 80;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend served from ${path.join(__dirname, 'frontend/dist')}`);
  console.log(`API proxied to http://localhost:3003`);
});