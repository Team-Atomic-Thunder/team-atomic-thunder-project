const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/server');

// Configure how files are stored
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure upload directory exists
    if (!fs.existsSync(config.uploadsDir)) {
      fs.mkdirSync(config.uploadsDir, { recursive: true });
    }
    cb(null, config.uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create the multer instance
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.maxFileSize
  }
});

module.exports = upload; 