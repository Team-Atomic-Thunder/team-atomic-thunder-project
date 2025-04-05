import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, ProgressBar, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

import './Dashboard.css';

// This is the main dashboard page component
function DashboardPage() {
  // Fake course data - we'll replace this with API data later
  // For now just using this for the UI layout
  const [courses] = useState([
    { id: 1, code: 'CS101', name: 'Introduction to Computer Science', instructor: 'Dr. Smith', progress: 65 },
    { id: 2, code: 'MATH201', name: 'Calculus II', instructor: 'Prof. Johnson', progress: 42 },
    { id: 3, code: 'ENG105', name: 'College Writing', instructor: 'Dr. Williams', progress: 85 },
    { id: 4, code: 'PHY150', name: 'Physics I', instructor: 'Prof. Brown', progress: 30 },
  ]);
  
  // Calendar event states
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState(null);

  // Get calendar events from the server when component loads
  useEffect(() => {
    let isMounted = true; // for cleanup
    
    async function fetchEvents() {
      try {
        setLoadingEvents(true);
        // make the API call
        const response = await fetch('http://localhost:3002/api/calendar-events');
        
        // Check if we got a good response
        if (!response.ok) {
          throw new Error('Server returned an error: ' + response.status);
        }
        
        // Parse the JSON
        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          console.log('Got calendar data:', data.length, 'events'); // for debugging
          setCalendarEvents(data);
          setError(null);
        }
      } catch (err) {
        console.error('Problem loading calendar events:', err);
        // Only update state if component is still mounted
        if (isMounted) {
          setError('Could not load your events. Try refreshing the page.');
        }
      } finally {
        // Either way, we're done loading
        if (isMounted) {
          setLoadingEvents(false);
        }
      }
    }

    // Run our fetch function
    fetchEvents();
    
    // Cleanup function to prevent state updates if component unmounts during request
    return () => {
      isMounted = false;
    };
  }, []); // Empty array means this runs only once when component mounts

  // Process the events to add metadata like event type and priority
  const mappedEvents = calendarEvents.map(event => {
    // Figure out what kind of event this is based on keywords in the title
    let eventType = 'Other';
    const title = event.title.toLowerCase();
    
    // This could be more sophisticated, but it works for now
    if (title.includes('exam') || title.includes('final')) {
      eventType = 'Exam';
    } else if (title.includes('quiz')) {
      eventType = 'Quiz';
    } else if (title.includes('assignment') || title.includes('homework')) {
      eventType = 'Assignment';
    } else if (title.includes('paper') || title.includes('essay')) {
      eventType = 'Paper';
    } else if (title.includes('lab') || title.includes('report')) {
      eventType = 'Lab';
    }
    
    // Set priority based on type - exams are high priority!
    let priority = 'medium'; // default
    if (eventType === 'Exam') {
      priority = 'high';
    } else if (eventType === 'Quiz') {
      priority = 'medium';
    } else if (eventType === 'Assignment') {
      priority = 'medium';
    }
    
    // Try to extract course code using regex - not always reliable
    let course = 'General';
    const courseMatch = event.title.match(/([A-Z]{2,4})\s*\d{3}/);
    if (courseMatch) {
      course = courseMatch[0];
    }
    
    // Return the enhanced event object
    return {
      id: event.id,
      title: event.title,
      date: event.start,
      type: eventType,
      course: course,
      priority: priority
    };
  });
  
  // Only show future events, sorted by date, max 10
  // TODO: Maybe add a "Show all" option later
  const sortedEvents = [...mappedEvents]
    .filter(event => new Date(event.date) >= new Date()) 
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10);
  
  // Get the right color for the progress bar
  const getProgressVariant = (progress) => {
    if (progress < 30) return 'danger';
    if (progress < 70) return 'warning';
    return 'success';
  };
  
  // Create a badge for priority level
  const getPriorityBadge = (priority) => {
    // Map priority to a bootstrap color
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
  
  // Create a badge for event type
  const getEventTypeBadge = (type) => {
    // Map event types to colors
    const variants = {
      'Assignment': 'primary',
      'Quiz': 'info',
      'Exam': 'danger',
      'Paper': 'secondary',
      'Lab': 'success',
      'Other': 'dark'
    };
    
    return (
      <Badge bg={variants[type] || 'secondary'}>
        {type}
      </Badge>
    );
  };
  
  // Format date to readable string like "Mon, Jan 1"
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Calculate how many days until the deadline
  const getDaysLeft = (dateString) => {
    const diff = Math.floor((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24));
    
    // Special cases for today/tomorrow  
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    
    return `${diff} days left`;
  };
  
  // function to count event types for the summary card
  function getEventCounts(events) {
    // initialize counters
    let counts = {
      'Exam': 0,
      'Quiz': 0,
      'Assignment': 0,
      'Paper': 0
    };
    
    // count each type
    events.forEach(event => {
      if (counts[event.type] !== undefined) {
        counts[event.type]++;
      }
    });
    
    return counts;
  }
  
  // get the counts for the summary card
  const eventCounts = getEventCounts(mappedEvents);
  
  // get count of future events
  const upcomingCount = mappedEvents.filter(e => new Date(e.date) >= new Date()).length;
  
  return (
    <Container>
      <h1 className="mb-4">Dashboard</h1>
      
      <Row>
        <Col lg={8}>
          {/* Event list card */}
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Upcoming Deadlines</h5>
              <Link to="/calendar">
                <Button variant="outline-primary" size="sm">View Calendar</Button>
              </Link>
            </Card.Header>
            
            {/* Show loading spinner while fetching data */}
            {loadingEvents ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status" variant="primary" />
                <p className="mt-3">Loading events...</p>
              </div>
            ) : error ? (
              // Show error message if something went wrong
              <div className="text-center py-4 text-danger">
                {error}
              </div>
            ) : sortedEvents.length === 0 ? (
              // Show this if no events found
              <div className="text-center py-4 text-muted">
                <p>No upcoming events found</p>
                <Link to="/upload">
                  <Button variant="primary" size="sm">Upload a Syllabus</Button>
                </Link>
              </div>
            ) : (
              // List the events
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
                        {getDaysLeft(event.date)}
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
          
          {/* Mini calendar card */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Calendar Overview</h5>
            </Card.Header>
            <Card.Body>
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: '',
                  center: 'title',
                  right: ''
                }}
                height={300}
                events={calendarEvents.map(event => ({
                  title: event.title,
                  date: event.start
                }))}
              />
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          {/* Calendar summary card */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Calendar Summary</h5>
            </Card.Header>
            <Card.Body>
              {loadingEvents ? (
                <div className="text-center">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : error ? (
                <p className="text-danger">{error}</p>
              ) : (
                <>
                  <p>
                    <strong>Total Events:</strong> {mappedEvents.length}
                  </p>
                  <p>
                    <strong>Upcoming Events:</strong> {upcomingCount}
                  </p>
                  <hr />
                  <h6>Event Types:</h6>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {eventCounts.Exam > 0 && (
                      <Badge bg="danger" className="p-2">
                        Exams: {eventCounts.Exam}
                      </Badge>
                    )}
                    {eventCounts.Quiz > 0 && (
                      <Badge bg="info" className="p-2">
                        Quizzes: {eventCounts.Quiz}
                      </Badge>
                    )}
                    {eventCounts.Assignment > 0 && (
                      <Badge bg="primary" className="p-2">
                        Assignments: {eventCounts.Assignment}
                      </Badge>
                    )}
                    {eventCounts.Paper > 0 && (
                      <Badge bg="secondary" className="p-2">
                        Papers: {eventCounts.Paper}
                      </Badge>
                    )}
                  </div>
                  <div className="text-center mt-3">
                    <Link to="/calendar">
                      <Button variant="outline-primary" size="sm">
                        View Full Calendar
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
          
          {/* Course progress card */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Course Progress</h5>
            </Card.Header>
            <ListGroup variant="flush">
              {courses.map(course => (
                <ListGroup.Item key={course.id}>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div className="fw-bold">{course.code}</div>
                    <small>{course.progress}%</small>
                  </div>
                  <div className="text-muted small mb-2">{course.name}</div>
                  <ProgressBar 
                    now={course.progress} 
                    variant={getProgressVariant(course.progress)} 
                  />
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardPage;