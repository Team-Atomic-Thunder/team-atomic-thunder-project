import React, { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, ProgressBar, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { handleExportToICS } from '../components/fileExport/FileExport';

function DashboardPage() {
  // eslint-disable-next-line no-unused-vars
    const [error, setError] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [success,setSuccess] = useState('');
  // Mock data for development
  const [courses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science', instructor: 'Dr. Smith', progress: 65 },
    { id: 2, code: 'MATH201', name: 'Calculus II', instructor: 'Prof. Johnson', progress: 42 },
    { id: 3, code: 'ENG105', name: 'College Writing', instructor: 'Dr. Williams', progress: 85 },
    { id: 4, code: 'PHY150', name: 'Physics I', instructor: 'Prof. Brown', progress: 30 },
  ]);
  
  const [upcomingEvents] = useState([
    { id: 1, title: 'CS101 Assignment 2', date: '2025-03-25', type: 'Assignment', course: 'CS101', priority: 'high' },
    { id: 2, title: 'MATH201 Quiz 3', date: '2025-03-26', type: 'Quiz', course: 'MATH201', priority: 'medium' },
    { id: 3, title: 'PHY150 Lab Report', date: '2025-03-27', type: 'Lab', course: 'PHY150', priority: 'high' },
    { id: 4, title: 'ENG105 Essay Draft', date: '2025-03-28', type: 'Paper', course: 'ENG105', priority: 'low' },
    { id: 5, title: 'CS101 Midterm Exam', date: '2025-03-2', type: 'Exam', course: 'CS101', priority: 'high' },
  ]);
<Link
  to={{
    pathname: "/calendar",
    state: { events: upcomingEvents }, // Pass upcomingEvents as state
  }}
>
  <Button variant="outline-primary" size="sm">View Calendar</Button>
</Link>
  // Sort upcoming events by date
  const sortedEvents = [...upcomingEvents].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );
  
  const getProgressVariant = (progress) => {
    if (progress < 30) return 'danger';
    if (progress < 70) return 'warning';
    return 'success';
  };
  
  const getPriorityBadge = (priority) => {
    const variants = {
      'high': 'danger',
      'medium': 'warning',
      'low': 'success'
    };
    
    return (
      <Badge bg={variants[priority]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };
  
  const getEventTypeBadge = (type) => {
    const variants = {
      'Assignment': 'primary',
      'Quiz': 'info',
      'Exam': 'danger',
      'Paper': 'secondary',
      'Lab': 'success'
    };
    
    return (
      <Badge bg={variants[type] || 'secondary'}>
        {type}
      </Badge>
    );
  };
  
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  return (
    <Container>
      <h1 className="mb-4">Dashboard</h1>
      
      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Upcoming Deadlines</h5>
              <Link
                to={{
                  pathname: "/calendar", // Path to the Calendar page
                  state: { events: upcomingEvents }, // Pass upcomingEvents as state
                }}
              >
                <Button variant="outline-primary" size="sm">View Calendar</Button>
              </Link>
            </Card.Header>
            <ListGroup variant="flush">
              {sortedEvents.map(event => (
                <ListGroup.Item key={event.id} className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{event.title}</div>
                    <div className="text-muted small">
                      {getEventTypeBadge(event.type)}{' '}
                      <Badge bg="secondary">{event.course}</Badge>{' '}
                      {getPriorityBadge(event.priority)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">{formatDate(event.date)}</div>
                    <div className="text-muted small">
                      {Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24))} days left
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Course Progress</h5>
            </Card.Header>
            <ListGroup variant="flush">
              {courses.map(course => (
                <ListGroup.Item key={course.id}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="fw-bold">{course.code}</div>
                    <span>{course.progress}%</span>
                  </div>
                  <ProgressBar 
                    variant={getProgressVariant(course.progress)}
                    now={course.progress}
                  />
                  <div className="text-muted small mt-1">{course.name}</div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
          
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item action as={Link} to="/upload">
                Upload New Syllabus
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/calendar">
                View Full Calendar
              </ListGroup.Item>
              <ListGroup.Item action>
                Configure Notifications
              </ListGroup.Item>
              <ListGroup.Item>
                <Button 
                  variant="danger"
                  className="w-100"
                  onClick={() => handleExportToICS(setError, setSuccess)}
                  >
                  Export to .ICS
                </Button>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardPage;