const path = require('path');
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3002,
  corsOptions: {
    origin: ['http://localhost:3003', 'http://127.0.0.1:3003'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
  },
  uploadsDir: path.join(__dirname, '..', '..', 'uploads'),
  maxFileSize: 50 * 1024 * 1024 // 50MB
}; 