const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const pdf = require('pdf-parse');
const { query } = require('./config/database');
require('dotenv').config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3002;

// CORS setup
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3003',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user from database
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const result = await query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, passwordHash, firstName, lastName]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// File upload endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Save file info to database
    const result = await query(
      'INSERT INTO syllabus_uploads (user_id, file_name, file_url, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, req.file.filename, `/uploads/${req.file.filename}`, 'pending_parse']
    );

    res.status(200).json({
      message: 'File uploaded successfully',
      upload: result.rows[0]
    });
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    res.status(500).json({ error: 'Error uploading file' });
  }
});

// Parse syllabus endpoint
app.post('/api/parse-syllabus', authenticateToken, async (req, res) => {
  try {
    const { filename, uploadId } = req.body;
    
    if (!filename && !uploadId) {
      return res.status(400).json({ error: 'Either filename or uploadId is required' });
    }

    // Get upload info using either filename or uploadId
    let uploadResult;
    if (uploadId) {
      uploadResult = await query(
        'SELECT * FROM syllabus_uploads WHERE id = $1 AND user_id = $2',
        [uploadId, req.user.id]
      );
    } else {
      uploadResult = await query(
        'SELECT * FROM syllabus_uploads WHERE file_name = $1 AND user_id = $2',
        [filename, req.user.id]
      );
    }

    if (uploadResult.rows.length === 0) {
      console.error('Upload not found:', { filename, uploadId, userId: req.user.id });
      return res.status(404).json({ error: 'Upload not found' });
    }

    const upload = uploadResult.rows[0];
    const filePath = path.join(uploadsDir, upload.file_name);

    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    // Save extracted text to database
    const parsedTextResult = await query(
      'INSERT INTO parsed_text (syllabus_upload_id, extracted_text) VALUES ($1, $2) RETURNING *',
      [upload.id, data.text]
    );

    const dates = extractDatesFromText(data.text);

    // Save parsed dates to database
    for (const date of dates) {
      await query(
        'INSERT INTO calendar_events (user_id, syllabus_upload_id, event_date, event_title, event_description) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, upload.id, date.date, date.title, date.description]
      );
    }

    // Update upload status
    await query(
      'UPDATE syllabus_uploads SET status = $1 WHERE id = $2',
      ['parsed', upload.id]
    );

    res.json({
      message: 'Syllabus parsed successfully',
      dates,
      uploadId: upload.id
    });
  } catch (error) {
    console.error('Error parsing syllabus:', error);
    res.status(500).json({ error: 'Error parsing syllabus' });
  }
});

// Get user's calendar events
app.get('/api/calendar-events', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching calendar events for user:', req.user.id);
    const result = await query(
      'SELECT * FROM calendar_events WHERE user_id = $1 ORDER BY event_date',
      [req.user.id]
    );

    console.log('Found calendar events:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Error fetching calendar events' });
  }
});

// Get user's syllabus uploads
app.get('/api/syllabus-uploads', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching syllabus uploads for user:', req.user.id);
    const result = await query(
      'SELECT * FROM syllabus_uploads WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [req.user.id]
    );

    console.log('Found syllabus uploads:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching syllabus uploads:', error);
    res.status(500).json({ error: 'Error fetching syllabus uploads' });
  }
});

// Get parsed text for a syllabus
app.get('/api/parsed-text/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;

    const result = await query(
      'SELECT * FROM parsed_text WHERE syllabus_upload_id = $1',
      [uploadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parsed text not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching parsed text:', error);
    res.status(500).json({ error: 'Error fetching parsed text' });
  }
});

// Helper function to extract dates from text
function extractDatesFromText(text) {
  // Your existing date extraction logic here
  // This is just a placeholder - use your actual implementation
  return [];
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 