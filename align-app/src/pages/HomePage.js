import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

const HomePage = () => {
  return (
    <Container className="py-5 text-center">
      <Row className="justify-content-center mb-5">
        <Col md={10} lg={8}>
          <h1 className="display-4 fw-bold mb-3">Welcome to Align</h1>
          <p className="lead mb-4">
            A website planner that gives students the chance to sync their tasks with their goals.
            Upload your syllabus, and we'll extract all important dates and deadlines automatically.
          </p>
          
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 mb-5">
            <Link to="/upload">
              <Button variant="primary" size="lg">Upload Syllabus</Button>
            </Link>
            
            <Link to="/dashboard">
              <Button variant="outline-secondary" size="lg">View Dashboard</Button>
            </Link>
          </div>
        </Col>
      </Row>
      
      <Row className="g-4">
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
};

export default HomePage;