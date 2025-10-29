const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routes/admin');
const cafeRoutes = require('./routes/cafe');
const statisticsRoutes = require('./routes/statistics');
const behaviorsRoutes = require('./routes/behaviors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/cafe', cafeRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/behaviors', behaviorsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ReturnMeCup API Server',
    version: '1.0.0',
    endpoints: {
      admin: '/api/admin',
      cafe: '/api/cafe',
      statistics: '/api/statistics',
      behaviors: '/api/behaviors',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
