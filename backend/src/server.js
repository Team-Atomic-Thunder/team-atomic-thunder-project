const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/server');
const syllabusRoutes = require('./routes/syllabus');

// Initialize express app
const app = express();

// Middleware
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/syllabus', syllabusRoutes);

// Serve static files
app.use('/uploads', express.static(config.uploadsDir));

// Start server
app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port}`);
}); 