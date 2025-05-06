import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebase-config';
import * as pdfjsLib from 'pdfjs-dist';
import '../../App.css';
import { parseSyllabusWithAI } from '../../services/openaiService';

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

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  // File selection handler
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  // Process the uploaded syllabus
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

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

  // Extract dates from the processed syllabus
  const handleExtractDates = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsParsing(true);
    setError('');
    setSuccess('');

    try {
      console.log('Starting date extraction process...');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Convert PDF to image
      console.log('Converting PDF to image...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log('PDF loaded successfully. Number of pages:', pdf.numPages);
      
      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
        console.log(`Page ${i} text length:`, pageText.length);
      }
      
      console.log('Total extracted text length:', fullText.length);
      console.log('First 1000 characters:', fullText.substring(0, 1000));
      
      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF. Please try a different PDF file.');
      }
      
      // Parse the text using OpenAI
      console.log('Sending text to AI for parsing...');
      const events = await parseSyllabusWithAI(fullText);
      console.log('AI parsed events:', events);
      
      if (!events || events.length === 0) {
        throw new Error('No events found in the syllabus. Please make sure the PDF contains assignment dates.');
      }

      // Save events to Firestore
      console.log('Saving events to Firestore...');
      const eventsRef = collection(db, 'calendarEvents');
      const savePromises = events.map(async (event) => {
        console.log('Processing event:', event);
        
        // Validate required fields
        if (!event.title || !event.start) {
          console.error('Invalid event data:', event);
          throw new Error('Event is missing required fields (title or start date)');
        }

        // Ensure start date is a valid ISO string
        let startDate;
        try {
          startDate = new Date(event.start).toISOString();
          if (isNaN(new Date(startDate).getTime())) {
            throw new Error('Invalid date format');
          }
        } catch (error) {
          console.error('Invalid date format:', event.start);
          throw new Error('Invalid date format in event');
        }

        try {
          const eventData = {
            title: event.title,
            start: startDate,
            description: event.description || '',
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            type: event.type || 'assignment',
            isManual: false
          };

          console.log('Saving event data:', eventData);
          const docRef = await addDoc(eventsRef, eventData);
          console.log('Event saved successfully:', docRef.id);
          return docRef;
        } catch (error) {
          console.error('Error saving event:', error);
          throw error;
        }
      });

      await Promise.all(savePromises);
      
      setSuccess(`Successfully extracted ${events.length} events from the syllabus`);
      setIsUploaded(true);
    } catch (err) {
      console.error('Error in handleExtractDates:', err);
      setError('Error extracting dates: ' + err.message);
    } finally {
      setIsParsing(false);
    }
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