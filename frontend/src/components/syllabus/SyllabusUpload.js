import React, { useState, useRef } from 'react';
import { Container, Form, Row, Col, Button, Card, Alert } from 'react-bootstrap';
import './SyllabusUpload.css';

// Main component for uploading and processing syllabi
const SyllabusUpload = () => {
  // State management
  const [file, setFile] = useState(null); // the actual file
  const [uploadProgress, setUploadProgress] = useState(0); // not used yet but could be for progress bar
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false); // drag and drop visual feedback
  const [parsedDates, setParsedDates] = useState(null); // dates extracted from pdf
  const [isParsing, setIsParsing] = useState(false); // loading state
  const [serverFileName, setServerFileName] = useState(''); // filename on server after upload
  const fileInputRef = useRef(null); // ref for the hidden file input

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

    // Prepare file for upload
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Send to server
      const response = await fetch('http://localhost:3002/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      // Parse response
      const data = await response.json();
      console.log("Upload response:", data); // for debugging
      
      // Store filename for later use with the parsing API
      setServerFileName(data.filename);
      setSuccess('File uploaded successfully');
      
      // If server already sent back parsed dates, show them
      if (data.parsedDates) {
        setParsedDates(data.parsedDates);
      }
      
      setError('');
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error uploading file. Check your connection and try again.');
    }
  };

  // Extract dates from the uploaded syllabus and add to calendar
  // This is a 2-step process: parse PDF, then save dates to calendar
  const handleParseAndAddToCalendar = async () => {
    if (!serverFileName) {
      setError('No file has been uploaded successfully');
      return;
    }
    
    setIsParsing(true);
    setError('');
    
    try {
      // Step 1: Parse the PDF to extract dates
      const parseResponse = await fetch('http://localhost:3002/api/parse-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: serverFileName }),
      });

      const parseData = await parseResponse.json();

      if (!parseResponse.ok) {
        throw new Error(parseData.error || 'Failed to parse syllabus');
      }

      // Check if we found any dates
      if (!parseData.dates || parseData.dates.length === 0) {
        setError('No dates were found in the syllabus. Please check if the PDF contains assignment dates.');
        return;
      }

      // Update the UI with found dates
      setParsedDates(parseData.dates);
      
      // Step 2: Save the dates to the calendar
      const saveResponse = await fetch('http://localhost:3002/api/save-calendar-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: parseData.dates }),
      });
      
      const saveData = await saveResponse.json();
      
      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Failed to save events to calendar');
      }
      
      // Success - let the user know!
      setSuccess(`Success! Found ${parseData.dates.length} dates and added them to your calendar.`);
    } catch (error) {
      // Something went wrong
      console.error('Error processing syllabus:', error);
      setError(`Error: ${error.message}. Please make sure the PDF is readable and contains text.`);
    } finally {
      // Always stop loading indicator even if there was an error
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
                  disabled={!file}
                >
                  Upload Syllabus
                </Button>
              </div>

              {/* Parse button - only show if file uploaded successfully */}
              {serverFileName && (
                <div className="mt-3">
                  <Button 
                    variant="outline-primary" 
                    onClick={handleParseAndAddToCalendar} 
                    className="w-100"
                    disabled={isParsing}
                  >
                    {isParsing ? 'Processing...' : 'Extract Dates & Add to Calendar'}
                  </Button>
                </div>
              )}

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