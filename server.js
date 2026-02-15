const express = require('express');
const path = require('path');
const app = express();

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-portal routes
app.use('/client-portal', express.static(path.join(__dirname, 'dist/client-portal')));

// SPA fallback for root app - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Don't serve index.html for client-portal routes
  if (req.path.startsWith('/client-portal')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// SPA fallback for client-portal
app.get('/client-portal/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/client-portal/index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});