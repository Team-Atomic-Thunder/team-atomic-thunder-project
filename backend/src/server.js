const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');   // for password hashing - not fully implemented yet
const jwt = require('jsonwebtoken');
const fs = require('fs');
const pdf = require('pdf-parse');
require('dotenv').config();

// Initialize express app
const app = express();
const port = process.env.PORT || 3002;  // default to 3002 if no port in .env

// CORS setup - important for local development
app.use(cors({
  // Allow requests only from our frontend
  origin: ['http://localhost:3003', 'http://127.0.0.1:3003'],
  // HTTP methods we want to allow
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Headers that are allowed
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Body parsers for JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up file uploads with multer
// We store files in the 'uploads' directory
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Configure how files are stored
const storage = multer.diskStorage({
  // Where to store the files
  destination: function (req, file, cb) {
    // null is for errors - we're not handling them here
    cb(null, uploadsDir)
  },
  // What to name the files
  filename: function (req, file, cb) {
    // Add timestamp to make filenames unique
    cb(null, Date.now() + '-' + file.originalname)
  }
});

// Create the multer instance with our config
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024  // Limit to 50MB so we don't crash
  }
});

// Make sure our upload directory exists
// Had issues with this before so adding a check
if (!fs.existsSync(uploadsDir)) {
  console.log('Creating uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// DB connection setup
// We tried using a .env file but sometimes had issues
// so adding fallbacks for everything
const pool = new Pool({
  user: process.env.PGUSER || 'siaka_dr',  // your postgres username 
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'align_app',
  password: process.env.PGPASSWORD || '',  // your postgres password
  port: process.env.PGPORT || 5432  // default postgres port
});

// Test DB connection on startup
pool.connect((err, client, release) => {
  if (err) {
    // This isn't fatal, we can still run without DB
    console.error('Database connection failed:', err);
    console.log('Server will start but database features might not work');
    return;
  }
  console.log('Connected to Postgres database successfully');
  release();  // Don't forget to release the client back to the pool
});

// JWT auth middleware - can be added to routes to protect them
// Not using this yet on all routes but it's ready to go
const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];  // Format: "Bearer TOKEN"

  // No token = no access
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key', (err, user) => {
    if (err) {
      // Token invalid or expired
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Token valid - add user to request object
    req.user = user;
    next();  // Continue to the protected route
  });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;

    // For now, accept any email and password
    const mockUser = {
      id: 1,
      email: email || 'test@example.com',
      first_name: 'User',
      last_name: 'Test'
    };

    // Generate JWT token
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '24h' }
    );

    console.log('Login successful, sending response');
    res.json({
      message: 'Login successful',
      user: {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.first_name,
        lastName: mockUser.last_name
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
    console.log('Signup attempt:', req.body);
    const { email, password, firstName, lastName } = req.body;

    // For now, accept any signup without validation
    const mockUser = {
      id: 1,
      email: email || 'test@example.com',
      first_name: firstName || 'User',
      last_name: lastName || 'Test'
    };

    // Generate JWT token
    const token = jwt.sign(
      { id: mockUser.id, email: mockUser.email },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      { expiresIn: '24h' }
    );

    console.log('Signup successful, sending response');
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.first_name,
        lastName: mockUser.last_name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Get list of uploaded files
app.get('/api/files', (req, res) => {
  try {
    console.log('Reading files from directory:', uploadsDir);
    const files = fs.readdirSync(uploadsDir);
    console.log('Found files:', files);
    res.json(files);
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Error reading files' });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('Upload request received');
  console.log('Request headers:', req.headers);
  
  try {
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file);
    console.log('File saved to:', req.file.path);
    
    res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      path: req.file.path
    });
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    res.status(500).json({ 
      error: 'Error uploading file',
      details: error.message 
    });
  }
});

// Delete file endpoint
app.delete('/api/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const filePath = path.join(uploadsDir, filename);

  console.log('Uploads directory:', uploadsDir);
  console.log('Attempting to delete file:', filePath);

  // Ensure we're sending JSON responses
  res.setHeader('Content-Type', 'application/json');

  try {
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('Uploads directory does not exist');
      return res.status(404).json({ error: 'Uploads directory not found' });
    }

    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    console.log('File deleted successfully:', filename);
    return res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ 
      error: 'Error deleting file',
      details: error.message 
    });
  }
});

// PDF parsing endpoint
app.post('/api/parse-syllabus', async (req, res) => {
  try {
    console.log('Parse syllabus request received:', req.body);
    const { filename } = req.body;

    if (!filename) {
      console.error('No filename provided in request');
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', filename);
    console.log('Looking for file at path:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('Reading PDF file...');
    const dataBuffer = fs.readFileSync(filePath);
    
    if (!dataBuffer || dataBuffer.length === 0) {
      console.error('File is empty or could not be read');
      return res.status(400).json({ error: 'File is empty or could not be read' });
    }

    console.log('Parsing PDF content...');
    const data = await pdf(dataBuffer);
    
    if (!data || !data.text) {
      console.error('No text content found in PDF');
      return res.status(400).json({ error: 'No text content found in PDF' });
    }

    console.log('Extracting dates from text...');
    const dates = extractDatesFromText(data.text);
    console.log('Extracted dates:', dates);

    res.json({ dates });
  } catch (error) {
    console.error('Detailed error in PDF parsing:', error);
    res.status(500).json({ 
      error: 'Error parsing PDF',
      details: error.message,
      stack: error.stack
    });
  }
});

// Helper function to extract dates from text
function extractDatesFromText(text) {
  console.log('Starting date extraction from text');
  
  // Output first 500 chars of text for debugging
  console.log('Text sample:', text.substring(0, 500));
  
  // Expanded date patterns
  const datePatterns = [
    // Common date formats
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi,  // MM/DD or MM/DD/YYYY
    /\b\d{1,2}-\d{1,2}(?:-\d{2,4})?\b/gi,   // MM-DD or MM-DD-YYYY
    /\b\d{4}-\d{1,2}-\d{1,2}\b/gi,         // YYYY-MM-DD
    /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/gi, // DD Month YYYY
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/gi  // Month DD (assuming current year)
  ];

  // Expanded keywords
  const assignmentKeywords = [
    'assignment', 'homework', 'project', 'exam', 'test', 'quiz', 
    'due', 'deadline', 'submit', 'submission', 'turn in', 'paper',
    'report', 'presentation', 'task', 'midterm', 'final'
  ];

  const dates = [];
  const lines = text.split('\n');
  console.log(`Processing ${lines.length} lines of text`);
  
  // Process within a window of +/- lines for context
  const contextWindow = 2;
  
  // First pass: Look for lines with assignment keywords
  const keywordLines = [];
  lines.forEach((line, index) => {
    // Skip empty lines or very short lines
    if (line.trim().length < 3) return;
    
    const lowerLine = line.toLowerCase();
    const hasAssignment = assignmentKeywords.some(keyword => lowerLine.includes(keyword));
    
    if (hasAssignment) {
      keywordLines.push(index);
    }
  });
  
  console.log(`Found ${keywordLines.length} lines with assignment keywords`);
  
  // Second pass: Examine keyword lines and surrounding context
  keywordLines.forEach(lineIndex => {
    // Check the line with the keyword and surrounding lines
    const startIdx = Math.max(0, lineIndex - contextWindow);
    const endIdx = Math.min(lines.length - 1, lineIndex + contextWindow);
    
    // Extract the context block
    const contextBlock = lines.slice(startIdx, endIdx + 1).join(' ');
    console.log(`Checking context around line ${lineIndex}:`, contextBlock.substring(0, 100) + '...');
    
    // Look for dates in the context block
    datePatterns.forEach(pattern => {
      const matches = contextBlock.match(pattern);
      if (matches) {
        console.log(`Found date matches in context around line ${lineIndex}:`, matches);
        
        matches.forEach(match => {
          try {
            // Create a date object for validation, use current year if year is missing
            let dateObj;
            if (match.match(/\d{4}/) === null) {
              // Try to extract month and day
              let month, day;
              
              // Handle text month formats (e.g., "January 15")
              const monthMatch = match.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i);
              if (monthMatch) {
                const monthMap = {
                  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                };
                month = monthMap[monthMatch[0].toLowerCase().substring(0, 3)];
                
                // Extract day
                const dayMatch = match.match(/\d{1,2}/);
                day = dayMatch ? parseInt(dayMatch[0]) : 1;
                
                // Create date with current year
                const currentYear = new Date().getFullYear();
                dateObj = new Date(currentYear, month, day);
              } else {
                // Try numeric formats (assuming MM/DD or MM-DD)
                const parts = match.split(/[\/\-]/);
                if (parts.length >= 2) {
                  // Assuming MM/DD format
                  month = parseInt(parts[0]) - 1;  // JS months are 0-indexed
                  day = parseInt(parts[1]);
                  
                  const currentYear = new Date().getFullYear();
                  dateObj = new Date(currentYear, month, day);
                } else {
                  // Can't parse, skip
                  console.warn(`Unable to parse date format: ${match}`);
                  return;
                }
              }
            } else {
              dateObj = new Date(match);
            }
            
            // Validate the date
            if (!isNaN(dateObj.getTime())) {
              // Get the line with the actual keyword for context
              let title = lines[lineIndex].trim();
              
              // Add context if it's very short
              if (title.length < 15) {
                // Combine with the line that has the date
                for (let i = startIdx; i <= endIdx; i++) {
                  if (lines[i].includes(match)) {
                    title = lines[i].trim();
                    break;
                  }
                }
              }
              
              dates.push({
                title: title,
                start: dateObj.toISOString(),
                allDay: true,
                original: match
              });
            } else {
              console.warn(`Invalid date format: ${match}`);
            }
          } catch (dateError) {
            console.error(`Error parsing date ${match}:`, dateError);
          }
        });
      }
    });
  });

  console.log(`Extracted ${dates.length} dates from text`);
  
  // If no dates were found, try a more aggressive approach
  if (dates.length === 0) {
    console.log('No dates found with context approach, trying direct date extraction');
    
    // Just extract all dates from the document
    lines.forEach((line, index) => {
      // Skip very short lines
      if (line.trim().length < 3) return;
      
      datePatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          console.log(`Found date match in line ${index}:`, matches);
          
          matches.forEach(match => {
            try {
              // Use the same date parsing logic as above
              let dateObj;
              if (match.match(/\d{4}/) === null) {
                // Try to extract month and day
                let month, day;
                
                // Handle text month formats
                const monthMatch = match.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i);
                if (monthMatch) {
                  const monthMap = {
                    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
                    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
                  };
                  month = monthMap[monthMatch[0].toLowerCase().substring(0, 3)];
                  
                  // Extract day
                  const dayMatch = match.match(/\d{1,2}/);
                  day = dayMatch ? parseInt(dayMatch[0]) : 1;
                  
                  // Create date with current year
                  const currentYear = new Date().getFullYear();
                  dateObj = new Date(currentYear, month, day);
                } else {
                  // Try numeric formats
                  const parts = match.split(/[\/\-]/);
                  if (parts.length >= 2) {
                    month = parseInt(parts[0]) - 1;
                    day = parseInt(parts[1]);
                    
                    const currentYear = new Date().getFullYear();
                    dateObj = new Date(currentYear, month, day);
                  } else {
                    console.warn(`Unable to parse date format: ${match}`);
                    return;
                  }
                }
              } else {
                dateObj = new Date(match);
              }
              
              if (!isNaN(dateObj.getTime())) {
                dates.push({
                  title: line.trim(),
                  start: dateObj.toISOString(),
                  allDay: true,
                  original: match
                });
              }
            } catch (dateError) {
              console.error(`Error parsing date ${match}:`, dateError);
            }
          });
        }
      });
    });
    
    console.log(`After direct extraction, found ${dates.length} dates`);
  }

  return dates;
}

// Save extracted dates endpoint
app.post('/api/save-calendar-events', async (req, res) => {
  try {
    console.log('Save calendar events request received');
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'No valid events provided' });
    }

    // Create a dedicated directory for calendar data if it doesn't exist
    const calendarDir = path.join(__dirname, '..', 'calendar-data');
    if (!fs.existsSync(calendarDir)) {
      console.log('Creating calendar data directory:', calendarDir);
      fs.mkdirSync(calendarDir, { recursive: true });
    }

    // Generate a unique filename for each save
    const eventsFilePath = path.join(calendarDir, 'calendar-events.json');
    
    // Load existing events if the file exists
    let existingEvents = [];
    if (fs.existsSync(eventsFilePath)) {
      const fileData = fs.readFileSync(eventsFilePath, 'utf8');
      try {
        existingEvents = JSON.parse(fileData);
      } catch (parseError) {
        console.error('Error parsing existing events file:', parseError);
        // If the file is corrupted, we'll just overwrite it
      }
    }

    // Add unique ID to each new event and merge with existing events
    const eventsWithIds = events.map(event => ({
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }));

    // Merge new events with existing events (avoiding duplicates)
    const mergedEvents = [...existingEvents];
    
    // Add only events that don't already exist (based on title and date)
    eventsWithIds.forEach(newEvent => {
      const eventExists = existingEvents.some(existingEvent => 
        existingEvent.title === newEvent.title && 
        existingEvent.start === newEvent.start
      );
      
      if (!eventExists) {
        mergedEvents.push(newEvent);
      }
    });

    // Save the merged events to file
    fs.writeFileSync(eventsFilePath, JSON.stringify(mergedEvents, null, 2));
    
    console.log(`Saved ${eventsWithIds.length} events to calendar`);
    
    res.status(200).json({ 
      message: 'Events saved successfully',
      savedEvents: eventsWithIds
    });
  } catch (error) {
    console.error('Error saving calendar events:', error);
    res.status(500).json({ 
      error: 'Error saving calendar events', 
      details: error.message 
    });
  }
});

// Get calendar events endpoint
app.get('/api/calendar-events', (req, res) => {
  try {
    const eventsFilePath = path.join(__dirname, '..', 'calendar-data', 'calendar-events.json');
    
    if (!fs.existsSync(eventsFilePath)) {
      return res.json([]);
    }
    
    const fileData = fs.readFileSync(eventsFilePath, 'utf8');
    const events = JSON.parse(fileData);
    
    res.json(events);
  } catch (error) {
    console.error('Error retrieving calendar events:', error);
    res.status(500).json({ error: 'Error retrieving calendar events' });
  }
});

// Delete calendar event endpoint
app.delete('/api/calendar-events/:id', (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete event request received for ID:', id);
    console.log('Request headers:', req.headers);
    
    if (!id) {
      console.log('No ID provided in request');
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    const eventsFilePath = path.join(__dirname, '..', 'calendar-data', 'calendar-events.json');
    
    if (!fs.existsSync(eventsFilePath)) {
      console.log('Events file not found');
      return res.status(404).json({ error: 'No events file found' });
    }
    
    // Read the events file
    const fileData = fs.readFileSync(eventsFilePath, 'utf8');
    let events = [];
    
    try {
      events = JSON.parse(fileData);
      console.log(`Loaded ${events.length} events from file`);
      console.log('First few event IDs:', events.slice(0, 3).map(e => e.id));
    } catch (parseError) {
      console.error('Error parsing events file:', parseError);
      return res.status(500).json({ error: 'Error parsing events file' });
    }
    
    // Find the event to delete
    const eventIndex = events.findIndex(event => event.id === id);
    console.log(`Looking for event with ID "${id}", found at index: ${eventIndex}`);
    
    if (eventIndex === -1) {
      console.log('Event not found in the events array');
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Remove the event
    const deletedEvent = events[eventIndex];
    console.log('Deleting event:', deletedEvent);
    events.splice(eventIndex, 1);
    
    // Save the updated events
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2));
    
    console.log(`Deleted event with ID: ${id}, remaining events: ${events.length}`);
    
    res.status(200).json({ 
      message: 'Event deleted successfully',
      deletedEvent
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Error deleting event' });
  }
});

// Delete all calendar events
app.delete('/api/calendar-events', (req, res) => {
  try {
    console.log('Request to delete all calendar events received');
    
    const eventsFilePath = path.join(__dirname, '..', 'calendar-data', 'calendar-events.json');
    
    if (!fs.existsSync(eventsFilePath)) {
      console.log('Events file not found');
      return res.status(404).json({ error: 'No events file found' });
    }
    
    // Create an empty array of events and save it
    fs.writeFileSync(eventsFilePath, JSON.stringify([], null, 2));
    
    console.log('All calendar events deleted');
    
    res.status(200).json({ 
      message: 'All events deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting all events:', error);
    res.status(500).json({ error: 'Error deleting all events' });
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
}); 