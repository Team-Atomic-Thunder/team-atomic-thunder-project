import React, { useState } from 'react';
import { Container, Form, Row, Col, Button, Card, ProgressBar, Alert } from 'react-bootstrap';

const SyllabusUpload = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setIsUploading(true);
    setError('');
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prevProgress) => {
        if (prevProgress >= 95) {
          clearInterval(interval);
          return prevProgress;
        }
        return prevProgress + 5;
      });
    }, 200);
    
    try {
      // In a real application, you would send the file to your server here
      // For now, we're just simulating the upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(interval);
      setUploadProgress(100);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect or show success message
      alert('Syllabus uploaded successfully! In a real app, you would be redirected to review extracted dates.');
      
    } catch (error) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setFile(null);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Upload Your Syllabus</h2>
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label>Select PDF File</Form.Label>
                  
                  <div className="border border-2 border-dashed rounded p-4 text-center">
                    <Form.Control
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      id="syllabus-upload"
                    />
                    <label htmlFor="syllabus-upload" className="d-block cursor-pointer">
                      <div className="text-center">
                        <i className="bi bi-cloud-arrow-up fs-1 text-secondary mb-3"></i>
                        <p className="text-muted">
                          {file ? file.name : 'Drag and drop your syllabus PDF here, or click to browse'}
                        </p>
                        <p className="text-muted small">
                          (PDF files only, max 50MB)
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  {error && (
                    <Alert variant="danger" className="mt-2 py-2 small">
                      {error}
                    </Alert>
                  )}
                  
                  {file && (
                    <Alert variant="success" className="mt-2 py-2 small">
                      File selected: {file.name}
                    </Alert>
                  )}
                </Form.Group>
                
                {isUploading && (
                  <div className="mb-3">
                    <ProgressBar 
                      now={uploadProgress} 
                      animated={uploadProgress < 100} 
                      variant="primary" 
                    />
                    <p className="text-muted small text-center mt-2">
                      {uploadProgress < 100 ? 'Uploading...' : 'Processing syllabus...'}
                    </p>
                  </div>
                )}
                
                <div className="d-grid">
                  <Button
                    type="submit"
                    disabled={!file || isUploading}
                    variant="primary"
                    size="lg"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Syllabus'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SyllabusUpload;