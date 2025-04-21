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

    // Check if user is authenticated
    if (!auth.currentUser) {
      setError('You must be logged in to upload files');
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      console.log('Starting PDF processing...');
      
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
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
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
      
      setSuccess('Syllabus processed and stored successfully');
      setIsUploaded(true);
      setIsParsing(false);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setError(`Error processing PDF: ${error.message}`);
      setIsParsing(false);
    }
  };

  const handleExtractDates = async () => {
    if (!isUploaded) return;
    
    setIsParsing(true);
    setError('');
    
    try {
      console.log('Starting date extraction...');
      
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
        throw new Error('No syllabus found');
      }
      
      const syllabusDoc = querySnapshot.docs[0];
      const syllabusData = syllabusDoc.data();
      console.log('Retrieved syllabus data:', syllabusData.originalName);
      
      // Extract dates from the text
      const text = syllabusData.content;
      const dates = extractDatesFromText(text);
      
      if (dates.length === 0) {
        throw new Error('No dates found in the syllabus');
      }
      
      // Store dates in calendarEvents collection
      const eventsRef = collection(db, 'calendarEvents');
      const batch = [];
      
      for (const event of dates) {
        batch.push(addDoc(eventsRef, {
          userId: auth.currentUser.uid,
          syllabusId: syllabusDoc.id,
          title: event.title,
          start: event.start,
          end: event.end || event.start, // If no end date, use start date
          description: event.description || '',
          createdAt: serverTimestamp()
        }));
      }
      
      await Promise.all(batch);
      
      setSuccess(`Successfully extracted ${dates.length} dates and added them to your calendar!`);
      
    } catch (error) {
      console.error('Error extracting dates:', error);
      setError(`Error extracting dates: ${error.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Helper function to extract dates from text
  const extractDatesFromText = (text) => {
    const dates = [];
    
    // Common date patterns in syllabi
    const datePatterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/g,
      // Month DD, YYYY
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi,
      // DD Month YYYY
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi
    ];
    
    // Look for assignment or event titles near dates
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Check each date pattern
      for (const pattern of datePatterns) {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const dateStr = match[0];
          let date;
          
          try {
            // Try to parse the date
            date = new Date(dateStr);
            if (isNaN(date.getTime())) continue;
            
            // Look for a title in the line or previous line
            let title = line.trim();
            if (title.length > 50) {
              // If line is too long, try to find a shorter title
              const words = title.split(' ');
              title = words.slice(0, 5).join(' '); // Take first 5 words
            }
            
            // Add the date to our list
            dates.push({
              title: title || 'Untitled Event',
              start: date.toISOString(),
              description: line.trim()
            });
          } catch (e) {
            console.warn('Failed to parse date:', dateStr, e);
          }
        }
      }
    }
    
    return dates;
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