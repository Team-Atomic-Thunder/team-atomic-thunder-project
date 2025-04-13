import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

function HomePage({ currentUser }) {
  const navigate = useNavigate();
  
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-4">Welcome to Align</h1>
          <p className="lead mb-5">
            A website planner that gives students the chance to sync their tasks with their goals.
            Upload your syllabus, and we'll extract all important dates and deadlines automatically.
          </p>
          
          <div className="d-flex justify-content-center gap-3">
            {currentUser ? (
              <>
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/upload')}
                  className="px-4"
                >
                  Upload Syllabus
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => navigate('/dashboard')}
                  className="px-4"
                >
                  View Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline-primary" 
                  as={Link} 
                  to="/signup"
                  style={{ width: '90px' }}
                >
                  Sign Up
                </Button>
                <Button 
                  variant="outline-primary" 
                  as={Link} 
                  to="/login"
                  style={{ width: '80px' }}
                >
                  Log In
                </Button>
              </>
            )}
          </div>
        </Col>
      </Row>

      <Row className="g-4 mt-5">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="mb-3">Automatic Date Extraction</Card.Title>
              <Card.Text>
                Our system automatically extracts all important dates and deadlines from your course syllabi.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="mb-3">Calendar Integration</Card.Title>
              <Card.Text>
                Seamlessly sync with Google Calendar, Apple Calendar, or Microsoft Outlook.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title className="mb-3">Smart Scheduling</Card.Title>
              <Card.Text>
                Get intelligent suggestions for when to start assignments based on your workload.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;