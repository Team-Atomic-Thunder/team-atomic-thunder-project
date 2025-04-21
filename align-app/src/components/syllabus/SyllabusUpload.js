import React, { useState, useRef } from 'react';
import { Container, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebase-config';
import '../../App.css';

// Main component for uploading and processing syllabi
const SyllabusUpload = () => {
  // State management
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedDates, setParsedDates] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize Firebase services
  const storage = getStorage(app);
  const db = getFirestore(app);
  const auth = getAuth(app);

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

    setIsParsing(true);
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${file.name}`;
      
      // Create a reference to the file location in Firebase Storage
      const storageRef = ref(storage, `syllabi/${auth.currentUser.uid}/${filename}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Store file metadata in Firestore
      await addDoc(collection(db, 'syllabi'), {
        userId: auth.currentUser.uid,
        filename: filename,
        originalName: file.name,
        downloadURL: downloadURL,
        uploadedAt: serverTimestamp(),
        status: 'pending_parse'
      });

      setSuccess('File uploaded successfully');
      setError('');
      
      // Start parsing the file
      handleParseAndAddToCalendar(filename, downloadURL);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error uploading file. Please try again.');
      setIsParsing(false);
    }
  };

  // Extract dates from the uploaded syllabus and add to calendar
  const handleParseAndAddToCalendar = async (filename, downloadURL) => {
    setIsParsing(true);
    setError('');
    
    try {
      // Set a timeout for the parsing process
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Parsing timed out after 30 seconds')), 30000);
      });

      // Step 1: Parse the PDF to extract dates
      const parsePromise = fetch('http://localhost:3002/api/parse-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          filename: filename,
          downloadURL: downloadURL 
        }),
      });

      // Race between the fetch and timeout
      const parseResponse = await Promise.race([parsePromise, timeoutPromise]);
      
      if (!parseResponse.ok) {
        throw new Error('Failed to parse syllabus');
      }

      const parseData = await parseResponse.json();

      // Check if we found any dates
      if (!parseData.dates || parseData.dates.length === 0) {
        setError('No dates were found in the syllabus. Please check if the PDF contains assignment dates.');
        setIsParsing(false);
        return;
      }

      // Update the UI with found dates
      setParsedDates(parseData.dates);
      
      // Step 2: Save the dates to Firestore
      const eventsRef = collection(db, 'calendarEvents');
      const batch = [];
      
      for (const event of parseData.dates) {
        batch.push(addDoc(eventsRef, {
          userId: auth.currentUser.uid,
          title: event.title,
          start: event.start,
          end: event.end,
          description: event.description || '',
          syllabusId: filename,
          createdAt: serverTimestamp()
        }));
      }
      
      await Promise.all(batch);
      
      // Update the syllabus document to mark it as parsed
      const syllabusRef = collection(db, 'syllabi');
      await addDoc(syllabusRef, {
        userId: auth.currentUser.uid,
        filename: filename,
        status: 'parsed',
        parsedAt: serverTimestamp(),
        eventCount: parseData.dates.length
      });
      
      setSuccess(`Success! Found ${parseData.dates.length} dates and added them to your calendar.`);
    } catch (error) {
      console.error('Error processing syllabus:', error);
      setError(`Error: ${error.message}. Please try again with a different file or contact support if the problem persists.`);
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
              
              {/* Show error message if there is one */}
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              {/* Show success message if operation succeeded */}
              {success && (
                <Alert variant="success" className="mb-4">
                  {success}
                </Alert>
              )}

              {/* Drag & drop area - this was tricky to get right */}
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

              {/* Show file info if a file is selected */}
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
              <div className="mt-4">
                <Button 
                  variant="primary" 
                  onClick={handleSubmit} 
                  className="w-100"
                  disabled={!file || isParsing}
                >
                  {isParsing ? 'Uploading and Processing...' : 'Upload Syllabus'}
                </Button>
              </div>

              {/* Show parsed dates if any */}
              {parsedDates && parsedDates.length > 0 && (
                <div className="mt-4">
                  <h5>Extracted Dates ({parsedDates.length})</h5>
                  <div className="parsed-dates-container">
                    {parsedDates.map((date, index) => (
                      <div key={index} className="parsed-date-item">
                        <div className="date-title">{date.title}</div>
                        <div className="date-value">{new Date(date.start).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
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