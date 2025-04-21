import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebase-config';
import * as pdfjsLib from 'pdfjs-dist';
import '../../App.css';

// Set the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Main component for uploading and processing syllabi
const SyllabusUpload = () => {
  // State management
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize Firebase services
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Test Firestore connection on component mount
  useEffect(() => {
    const testFirestoreConnection = async () => {
      try {
        console.log('Testing Firestore connection...');
        console.log('Current user:', auth.currentUser?.uid || 'Not logged in');
        
        if (!auth.currentUser) {
          throw new Error('User not authenticated');
        }

        // Try to write a test document
        console.log('Attempting to write test document...');
        const testDoc = await addDoc(collection(db, 'test_connection'), {
          userId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
          test: true
        });
        
        console.log('Successfully wrote test document:', testDoc.id);
        
        // Try to read it back
        console.log('Attempting to read test document...');
        const testQuery = query(
          collection(db, 'test_connection'), 
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(testQuery);
        
        if (querySnapshot.empty) {
          throw new Error('Could not read back test document');
        }
        
        console.log('Successfully read test document');
        setDbConnected(true);
        
      } catch (error) {
        console.error('Firestore connection test failed:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        setError(`Database connection failed: ${error.message}`);
        setDbConnected(false);
      }
    };

    // Only test connection if user is authenticated
    if (auth.currentUser) {
      testFirestoreConnection();
    } else {
      setError('Please log in to access the database');
      setDbConnected(false);
    }
  }, [db, auth.currentUser]);

  // Bunch of drag and drop event handlers
  // Tried to consolidate these but it caused bugs so keeping them separate for now
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true); // highlight the drop zone
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false); // remove highlight
  };

  const handleDragOver = (e) => {
    // Not much to do here but we need this to allow dropping
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Get the file from the drop event
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // Validate and set the selected file
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    // Make sure it's a PDF - students kept trying to upload Word docs
    if (!selectedFile.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    // Check size - had some massive files causing issues before
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    // All good, set the file
    setFile(selectedFile);
    // Clear any previous messages
    setError('');
    setSuccess('');
  };

  // Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    // Verify user is authenticated
    if (!auth.currentUser) {
      setError('You must be logged in to upload files');
      return;
    }

    setIsParsing(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting PDF processing for user:', auth.currentUser.uid);
      
      // Read the PDF file
      console.log('Reading file as array buffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('File read successfully');
      
      // Load the PDF document
      console.log('Loading PDF document...');
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log('PDF loaded successfully, number of pages:', pdf.numPages);
      
      let fullText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += '\n' + pageText;
        console.log(`Page ${i} processed successfully`);
      }
      
      console.log('PDF text extracted successfully');
      
      // Store the text content in Firestore
      console.log('Storing text content in Firestore...');
      const docRef = await addDoc(collection(db, 'syllabi'), {
        userId: auth.currentUser.uid,
        originalName: file.name,
        content: fullText,
        uploadedAt: serverTimestamp(),
        status: 'uploaded',
        fileSize: file.size,
        lastModified: file.lastModified
      });

      console.log('Text content stored in Firestore successfully:', docRef.id);
      
      setSuccess('Syllabus processed successfully');
      setIsUploaded(true);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError(`Error processing PDF: ${error.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExtractDates = async () => {
    if (!isUploaded) return;
    
    // Verify user is authenticated
    if (!auth.currentUser) {
      setError('You must be logged in to extract dates');
      return;
    }
    
    setIsParsing(true);
    setError('');
    
    try {
      console.log('Starting date extraction for user:', auth.currentUser.uid);
      
      // Get the latest uploaded syllabus
      const syllabiRef = collection(db, 'syllabi');
      const q = query(syllabiRef, 
        where('userId', '==', auth.currentUser.uid),
        orderBy('uploadedAt', 'desc'),
        limit(1)
      );
      
      console.log('Querying Firestore for latest syllabus...');
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('No syllabus found for your account');
      }
      
      const syllabusDoc = querySnapshot.docs[0];
      const syllabusData = syllabusDoc.data();

      // Double-check the syllabus belongs to the current user
      if (syllabusData.userId !== auth.currentUser.uid) {
        throw new Error('Unauthorized access to syllabus');
      }

      console.log('Retrieved syllabus data:', syllabusData.originalName);
      console.log('Syllabus content preview:', syllabusData.content.substring(0, 500));

      // Extract events from the text
      const events = extractEvents(syllabusData.content);
      
      if (events.length === 0) {
        throw new Error('No events found in the syllabus');
      }
      
      console.log('Extracted events:', events);
      
      // Store events in calendarEvents collection
      const eventsRef = collection(db, 'calendarEvents');
      const batch = [];
      
      for (const event of events) {
        console.log('Processing event:', event);
        const date = new Date(event.date);
        console.log('Parsed date:', date);
        if (!isNaN(date.getTime())) {
        batch.push(addDoc(eventsRef, {
          userId: auth.currentUser.uid,
            syllabusId: syllabusDoc.id,
            title: event.name,
            type: event.type,
            start: date.toISOString(),
            description: event.time || '',
            createdAt: serverTimestamp(),
            status: 'active'
        }));
        } else {
          console.warn('Invalid date format:', event.date, 'for event:', event.name);
        }
      }
      
      await Promise.all(batch);
      
      setSuccess(`Successfully extracted ${events.length} events and added them to your calendar!`);
      
    } catch (error) {
      console.error('Error extracting dates:', error);
      setError(`Error extracting dates: ${error.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Use regex to find quizzes, assignments, and exams with dates/times
  const extractEvents = text => {
    const results = [];
    console.log('Starting event extraction from text...');
    console.log('Full text being processed:', text);

    // More flexible event patterns that indicate actual events
    const eventPatterns = {
      quiz: [
        /quiz\s+#?\d+/i,                    // Quiz 1, Quiz #1
        /quiz\s+on\s+[a-zA-Z]+\s+\d+/i,    // Quiz on January 15
        /chapter\s+\d+\s+quiz/i,           // Chapter 1 Quiz
        /weekly\s+quiz/i,                   // Weekly Quiz
        /quiz\s+review/i,                   // Quiz Review
        /quiz\s+[a-zA-Z]+/i,               // Quiz Introduction, Quiz Review
        /\bquiz\b/i                         // Just the word quiz (with context)
      ],
      exam: [
        /(?:midterm|final)\s+exam/i,       // Midterm Exam, Final Exam
        /exam\s+#?\d+/i,                   // Exam 1, Exam #1
        /exam\s+on\s+[a-zA-Z]+\s+\d+/i,    // Exam on January 15
        /chapter\s+\d+\s+exam/i,           // Chapter 1 Exam
        /comprehensive\s+exam/i,            // Comprehensive Exam
        /exam\s+[a-zA-Z]+/i,               // Exam Review, Exam Preparation
        /\bexam\b/i,                       // Just the word exam (with context)
        /\bmidterm\b/i,                    // Just the word midterm (with context)
        /\bfinal\b/i                       // Just the word final (with context)
      ],
      assignment: [
        /assignment\s+#?\d+/i,             // Assignment 1, Assignment #1
        /hw\s+#?\d+/i,                     // HW 1, HW #1
        /homework\s+#?\d+/i,               // Homework 1, Homework #1
        /project\s+#?\d+/i,                // Project 1, Project #1
        /lab\s+#?\d+/i,                    // Lab 1, Lab #1
        /due\s+[a-zA-Z]+\s+\d+/i,          // Due January 15
        /chapter\s+\d+\s+assignment/i,     // Chapter 1 Assignment
        /weekly\s+assignment/i,            // Weekly Assignment
        /assignment\s+[a-zA-Z]+/i,         // Assignment Review, Assignment Submission
        /\bassignment\b/i,                 // Just the word assignment (with context)
        /\bhomework\b/i,                   // Just the word homework (with context)
        /\bhw\b/i,                         // Just the word hw (with context)
        /\bproject\b/i,                    // Just the word project (with context)
        /\blab\b/i                         // Just the word lab (with context)
      ]
    };

    // Patterns to exclude (section headers, course descriptions, etc.)
    const excludePatterns = [
      /schedule/i,
      /overview/i,
      /description/i,
      /introduction/i,
      /syllabus/i,
      /course\s+description/i,
      /course\s+overview/i,
      /course\s+objectives/i,
      /learning\s+outcomes/i,
      /grading\s+policy/i,
      /policies/i,
      /requirements/i,
      /textbook/i,
      /resources/i,
      /calendar/i,
      /schedule\s+of\s+topics/i,
      /tentative\s+schedule/i,
      /weekly\s+schedule/i,
      /class\s+schedule/i,
      /course\s+schedule/i,
      /important\s+dates/i,
      /key\s+dates/i,
      /deadlines/i,
      /due\s+dates/i,
      /assignment\s+schedule/i,
      /quiz\s+schedule/i,
      /exam\s+schedule/i,
      /project\s+schedule/i,
      /lab\s+schedule/i,
      /homework\s+schedule/i,
      /tentative\s+calendar/i,
      /weekly\s+calendar/i,
      /class\s+calendar/i,
      /course\s+calendar/i
    ];

    // Date patterns
    const datePatterns = [
      // Common date formats
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi,
      /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi,  // MM/DD or MM/DD/YYYY
      /\b\d{1,2}-\d{1,2}(?:-\d{2,4})?\b/gi,   // MM-DD or MM-DD-YYYY
      /\b\d{4}-\d{1,2}-\d{1,2}\b/gi,         // YYYY-MM-DD
      /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/gi, // DD Month YYYY
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/gi  // Month DD (assuming current year)
    ];

    const lines = text.split('\n');
    console.log(`Processing ${lines.length} lines of text`);
    
    // Process within a window of +/- lines for context
    const contextWindow = 2;
    
    // First pass: Look for lines with event patterns
    const eventLines = [];
    lines.forEach((line, index) => {
      // Skip empty lines or very short lines
      if (line.trim().length < 3) {
        console.log(`Skipping short line ${index}: "${line}"`);
        return;
      }
      
      const lowerLine = line.toLowerCase();
      
      // Skip lines that match exclude patterns
      if (excludePatterns.some(pattern => pattern.test(lowerLine))) {
        console.log(`Skipping excluded line ${index}: "${line}"`);
        return;
      }
      
      // Check for each event type
      for (const [type, patterns] of Object.entries(eventPatterns)) {
        patterns.forEach(pattern => {
          if (pattern.test(lowerLine)) {
            console.log(`Found potential ${type} event in line ${index}: "${line}"`);
            console.log(`Matching pattern: ${pattern}`);
            eventLines.push({ index, type, line });
          }
        });
      }
    });
    
    console.log(`Found ${eventLines.length} lines with event patterns`);
    
    // Helper function to clean and format event title
    const formatTitle = (title, type) => {
      // Remove any dates from the title
      title = title.replace(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b/gi, '');
      title = title.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gi, '');
      title = title.replace(/\b\d{1,2}-\d{1,2}(?:-\d{2,4})?\b/gi, '');
      
      // Remove common prefixes and suffixes
      title = title.replace(/^(?:due|submit|turn in|deadline|by|on|at)\s+/i, '');
      title = title.replace(/\s+(?:due|submit|turn in|deadline|by|on|at)$/i, '');
      
      // Remove extra whitespace
      title = title.replace(/\s+/g, ' ').trim();
      
      // If title is still too long, truncate it
      if (title.length > 50) {
        title = title.substring(0, 50) + '...';
      }
      
      // If title is empty or too short, use a default based on type
      if (title.length < 3) {
        switch (type) {
          case 'quiz': return 'Quiz';
          case 'exam': return 'Exam';
          case 'assignment': return 'Assignment';
          default: return 'Event';
        }
      }
      
      return title;
    };

    // Helper function to check if events are duplicates
    const isDuplicateEvent = (event, existingEvents) => {
      return existingEvents.some(existing => {
        // Check if same date
        if (existing.date !== event.date) return false;
        
        // Check if same type
        if (existing.type !== event.type) return false;
        
        // Check if titles are similar (using Levenshtein distance)
        const title1 = existing.name.toLowerCase();
        const title2 = event.name.toLowerCase();
        
        // If one title is contained within the other, they're likely duplicates
        if (title1.includes(title2) || title2.includes(title1)) return true;
        
        // If titles are very similar (e.g., "Quiz 1" vs "Quiz #1")
        const normalized1 = title1.replace(/[#\s]/g, '');
        const normalized2 = title2.replace(/[#\s]/g, '');
        if (normalized1 === normalized2) return true;
        
        return false;
      });
    };

    // Helper function to validate event title
    const isValidEventTitle = (title) => {
      const lowerTitle = title.toLowerCase();
      
      // Skip if title is too short or too long
      if (title.length < 3 || title.length > 100) {
        console.log(`Invalid title length: "${title}"`);
        return false;
      }
      
      // Skip if title matches exclude patterns
      if (excludePatterns.some(pattern => pattern.test(lowerTitle))) {
        console.log(`Title matches exclude pattern: "${title}"`);
        return false;
      }
      
      // Skip if title is just a date or number
      if (/^\d+$/.test(title) || /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(title)) {
        console.log(`Title is just a date/number: "${title}"`);
        return false;
      }
      
      // Skip if title is just a month or day
      if (/^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)$/i.test(title)) {
        console.log(`Title is just a month: "${title}"`);
        return false;
      }
      
      return true;
    };
    
    // Second pass: Examine event lines and surrounding context
    eventLines.forEach(({ index, type, line }) => {
      // Check the line with the event and surrounding lines
      const startIdx = Math.max(0, index - contextWindow);
      const endIdx = Math.min(lines.length - 1, index + contextWindow);
      
      // Extract the context block
      const contextBlock = lines.slice(startIdx, endIdx + 1).join(' ');
      console.log(`Checking context around line ${index}:`, contextBlock);
      
      // Look for dates in the context block
      datePatterns.forEach(pattern => {
        const matches = contextBlock.match(pattern);
        if (matches) {
          console.log(`Found date matches in context around line ${index}:`, matches);
          
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
                  // Try numeric formats
                  const parts = match.split(/[/-]/);
                  if (parts.length >= 2) {
                    month = parseInt(parts[0]) - 1;  // JS months are 0-indexed
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
              
              // Validate the date
              if (!isNaN(dateObj.getTime())) {
                // Get the line with the actual event for context
                let title = line.trim();
                
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
                
                // Format the title
                title = formatTitle(title, type);
                
                // Validate the title
                if (!isValidEventTitle(title)) {
                  console.log(`Skipping invalid event title: ${title}`);
                  return;
                }
                
                const event = {
                  name: title,
                  type: type,
                  date: match,
                  time: ''
                };
                
                // Check for duplicates before adding
                if (!isDuplicateEvent(event, results)) {
                  results.push(event);
                  console.log(`Added event: ${JSON.stringify(event)}`);
                } else {
                  console.log('Skipping duplicate event:', event);
                }
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

    console.log('Total events found:', results.length);
    console.log('Final events:', results);
    return results;
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Upload Syllabus</h2>
              
              {/* Database connection status */}
              {!dbConnected && (
                <Alert variant="warning" className="mb-4">
                  Connecting to database...
                </Alert>
              )}

              {/* Error message */}
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              {/* Success message */}
              {success && (
                <Alert variant="success" className="mb-4">
                  {success}
                </Alert>
              )}

              {/* Drag and drop area */}
              <div
                className={`file-input-container ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  accept=".pdf"
                  className="d-none"
                />
                <div className="text-center">
                  <i className="bi bi-cloud-upload fs-1 mb-3"></i>
                  <p className="mb-0">Drag and drop your syllabus here</p>
                  <p className="text-muted">or click to browse</p>
                </div>
              </div>

              {/* File info */}
              {file && (
                <div className="file-info mt-3">
                  <p className="mb-0">
                    <strong>Selected file:</strong> {file.name}
                  </p>
                  <p className="text-muted mb-0">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* Upload button */}
              {file && !isUploaded && !isParsing && (
                <div className="mt-3 text-center">
                <Button 
                  variant="primary" 
                  onClick={handleSubmit} 
                    disabled={isParsing}
                >
                    Process Syllabus
                </Button>
              </div>
              )}

              {/* Extract button */}
              {isUploaded && !isParsing && (
                <div className="mt-3 text-center">
                  <Button 
                    variant="success" 
                    onClick={handleExtractDates}
                    disabled={isParsing}
                  >
                    Extract Dates
                  </Button>
                      </div>
              )}

              {/* Loading indicator */}
              {isParsing && (
                <div className="text-center mt-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Processing syllabus...</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SyllabusUpload;