const express = require('express');
const path = require('path');
const app = express();

// __dirname is /home/site/wwwroot (where dist contents are deployed)
// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Handle client-portal routes - serve static files
app.use('/client-portal', express.static(path.join(__dirname, 'client-portal')));

// SPA fallback for root app - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Don't serve index.html for client-portal routes
  if (req.path.startsWith('/client-portal')) {
    return next();
  }
  // Serve root app's index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

// SPA fallback for client-portal
app.get('/client-portal/*', (req, res) => {
  // Serve client-portal's index.html
  res.sendFile(path.join(__dirname, 'client-portal', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving from: ${__dirname}`);
});