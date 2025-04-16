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

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// File upload configuration
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
    console.log('Reading PDF file:', filePath);
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    console.log('PDF parsed successfully, text length:', data.text.length);
    
    // Save extracted text to database
    console.log('Saving parsed text to database...');
    const parsedTextResult = await query(
      'INSERT INTO parsed_text (syllabus_upload_id, extracted_text) VALUES ($1, $2) RETURNING *',
      [upload.id, data.text]
    );
    console.log('Parsed text saved with ID:', parsedTextResult.rows[0].id);

    // Extract dates from text
    console.log('Extracting dates from text...');
    const dates = extractDatesFromText(data.text);
    console.log('Found dates:', dates);

    // Save parsed dates to database with proper date formatting
    console.log('Saving dates to calendar_events table...');
    for (const date of dates) {
      const eventDate = new Date(date.date);
      if (isNaN(eventDate.getTime())) {
        console.error('Invalid date format:', date.date);
        continue;
      }

      console.log('Inserting event:', {
        userId: req.user.id,
        uploadId: upload.id,
        date: eventDate.toISOString(),
        title: date.title,
        description: date.description
      });

      const eventResult = await query(
        'INSERT INTO calendar_events (user_id, syllabus_upload_id, event_date, event_title, event_description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, upload.id, eventDate.toISOString(), date.title, date.description]
      );
      console.log('Event inserted with ID:', eventResult.rows[0].id);
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
    
    // First check if we have any events in the database
    const checkResult = await query(
      'SELECT COUNT(*) FROM calendar_events WHERE user_id = $1',
      [req.user.id]
    );
    console.log('Total events in database:', checkResult.rows[0].count);

    // Check if user exists
    const userResult = await query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    console.log('User found:', userResult.rows[0] ? 'Yes' : 'No');

    const result = await query(
      'SELECT id, event_title as title, event_date as start, event_description as description FROM calendar_events WHERE user_id = $1 ORDER BY event_date',
      [req.user.id]
    );

    console.log('Raw events from database:', result.rows);

    // Format the dates to ISO string
    const formattedEvents = result.rows.map(event => {
      console.log('Processing event:', event);
      const formattedEvent = {
        ...event,
        start: new Date(event.start).toISOString(),
        allDay: true
      };
      console.log('Formatted event:', formattedEvent);
      return formattedEvent;
    });

    console.log('Found calendar events:', formattedEvents.length);
    console.log('Sending events to client:', formattedEvents);
    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ error: 'Error fetching calendar events' });
  }
});

// Delete a specific calendar event
app.delete('/api/calendar-events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const result = await query(
      'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING *',
      [eventId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: 'Error deleting calendar event' });
  }
});

// Delete all calendar events for a user
app.delete('/api/calendar-events', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM calendar_events WHERE user_id = $1 RETURNING *',
      [req.user.id]
    );

    res.json({ 
      message: 'All calendar events deleted successfully',
      deletedCount: result.rows.length
    });
  } catch (error) {
    console.error('Error deleting all calendar events:', error);
    res.status(500).json({ error: 'Error deleting all calendar events' });
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

// Delete a syllabus upload
app.delete('/api/syllabus-uploads/:uploadId', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.params;
    console.log('Delete request received for upload:', uploadId);
    console.log('User ID:', req.user.id);
    
    // First, get the file information
    const fileResult = await query(
      'SELECT * FROM syllabus_uploads WHERE id = $1 AND user_id = $2',
      [uploadId, req.user.id]
    );

    if (fileResult.rows.length === 0) {
      console.log('File not found in database:', uploadId);
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];
    console.log('Found file:', file);
    const filePath = path.join(uploadsDir, file.file_name);
    console.log('File path:', filePath);

    // Delete the file from the filesystem
    if (fs.existsSync(filePath)) {
      console.log('Deleting file from filesystem:', filePath);
      fs.unlinkSync(filePath);
    } else {
      console.log('File not found in filesystem:', filePath);
    }

    // Delete associated calendar events
    console.log('Deleting associated calendar events');
    await query(
      'DELETE FROM calendar_events WHERE syllabus_upload_id = $1',
      [uploadId]
    );

    // Delete the upload record
    console.log('Deleting upload record from database');
    await query(
      'DELETE FROM syllabus_uploads WHERE id = $1 AND user_id = $2',
      [uploadId, req.user.id]
    );

    console.log('File deleted successfully');
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting syllabus upload:', error);
    res.status(500).json({ error: 'Error deleting syllabus upload' });
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

// Test endpoint for DELETE requests
app.delete('/api/test', (req, res) => {
  console.log('Test DELETE request received');
  res.json({ message: 'DELETE request successful' });
});

// Helper function to extract dates from text
function extractDatesFromText(text) {
  console.log('Extracting dates from text...');
  const dates = [];
  
  // Common date patterns
  const datePatterns = [
    // Full dates with month names
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/g,
    // Month abbreviations
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/g,
    // MM/DD/YYYY or MM-DD-YYYY
    /\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/g,
    // YYYY/MM/DD or YYYY-MM-DD
    /\d{4}[\/-]\d{1,2}[\/-]\d{1,2}/g,
    // Weekday dates (e.g., "Monday, January 15, 2024")
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/g,
    // Weekday abbreviations (e.g., "Mon, Jan 15, 2024")
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/g
  ];

  // Assignment patterns to look for
  const assignmentPatterns = [
    // Assignment with due date
    /Assignment\s+#?\d*\s*[:\-]\s*([^\.]+?)\s*(?:due|by|on)\s*([^\.]+?)(?:\.|$)/gi,
    // Homework with due date
    /Homework\s+#?\d*\s*[:\-]\s*([^\.]+?)\s*(?:due|by|on)\s*([^\.]+?)(?:\.|$)/gi,
    // Project with due date
    /Project\s+#?\d*\s*[:\-]\s*([^\.]+?)\s*(?:due|by|on)\s*([^\.]+?)(?:\.|$)/gi,
    // Quiz/Exam with date
    /(?:Quiz|Exam|Test)\s+#?\d*\s*[:\-]\s*([^\.]+?)\s*(?:on|scheduled for)\s*([^\.]+?)(?:\.|$)/gi,
    // Lab with due date
    /Lab\s+#?\d*\s*[:\-]\s*([^\.]+?)\s*(?:due|by|on)\s*([^\.]+?)(?:\.|$)/gi
  ];

  // First, look for structured assignments
  for (const pattern of assignmentPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const [, title, dateStr] = match;
      try {
        const date = new Date(dateStr.trim());
        if (!isNaN(date.getTime())) {
          dates.push({
            date: date.toISOString(),
            title: `Assignment: ${title.trim()}`,
            description: `Due: ${dateStr.trim()}`
          });
          console.log('Found assignment:', {
            title: title.trim(),
            date: date.toISOString()
          });
        }
      } catch (err) {
        console.error('Error parsing assignment date:', dateStr, err);
      }
    }
  }

  // Then look for dates in the text
  const lines = text.split('\n');
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Skip lines that are too short or don't contain relevant keywords
    if (line.length < 10 || !/(?:due|by|on|assignment|homework|project|quiz|exam|test|lab)/i.test(line)) {
      continue;
    }

    // Check for dates in the line
    for (const pattern of datePatterns) {
      const matches = line.match(pattern);
      if (matches) {
        for (const match of matches) {
          try {
            const date = new Date(match);
            if (isNaN(date.getTime())) continue;

            // Create a meaningful title
            const title = line.trim()
              .replace(/^(?:Assignment|Homework|Project|Quiz|Exam|Test|Lab)\s*#?\d*\s*[:\-]\s*/i, '')
              .replace(/\s*(?:due|by|on)\s*[^\.]+\.?$/, '')
              .trim();

            if (title.length > 0) {
              dates.push({
                date: date.toISOString(),
                title: title,
                description: line.trim()
              });

              console.log('Found date:', {
                original: match,
                parsed: date.toISOString(),
                title: title
              });
            }
          } catch (err) {
            console.error('Error parsing date:', match, err);
          }
        }
      }
    }
  }

  // Remove duplicates based on date and title
  const uniqueDates = dates.filter((date, index, self) =>
    index === self.findIndex(d => 
      d.date === date.date && d.title === date.title
    )
  );

  console.log('Total unique dates found:', uniqueDates.length);
  return uniqueDates;
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 