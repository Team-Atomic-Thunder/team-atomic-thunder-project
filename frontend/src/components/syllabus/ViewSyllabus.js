import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Alert } from 'react-bootstrap';
import './ViewSyllabus.css';

const ViewSyllabus = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/files');
      const data = await response.json();
      setFiles(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to load files');
      setLoading(false);
    }
  };

  const handleViewFile = (filename) => {
    window.open(`http://localhost:3002/uploads/${filename}`, '_blank');
  };

  const handleDeleteFile = async (filename) => {
    try {
      const response = await fetch(`http://localhost:3002/api/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      setSuccess('File deleted successfully');
      setError('');
      // Refresh the file list
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error.message || 'Failed to delete file');
      setSuccess('');
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Uploaded Syllabi</h2>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="mb-4">
                  {success}
                </Alert>
              )}

              {loading ? (
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center text-muted">
                  No files uploaded yet
                </div>
              ) : (
                <ListGroup>
                  {files.map((file, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <span className="file-name">{file}</span>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleViewFile(file)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleDeleteFile(file)}
                        >
                          Delete
                        </Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ViewSyllabus; 