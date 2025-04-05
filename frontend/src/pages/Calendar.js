import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Container, Row, Col, Card, ListGroup, Badge, Spinner, Alert, Button, Modal, Toast } from 'react-bootstrap';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import './Calendar.css';

function CalendarPage() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch calendar events from the server
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3002/api/calendar-events');
      
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      
      const data = await response.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError('Failed to load calendar events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle deleting an event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      setDeleting(true);
      
      const response = await fetch(`http://localhost:3002/api/calendar-events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to delete event');
      }
      
      // Show success message
      setToastMessage(`Event "${selectedEvent.title.substring(0, 30)}${selectedEvent.title.length > 30 ? '...' : ''}" was deleted successfully`);
      setShowToast(true);
      
      // Refresh events after deletion
      await fetchEvents();
      setShowDeleteModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(`Failed to delete event: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };
  
  // Handle deleting all events
  const handleDeleteAllEvents = async () => {
    try {
      setDeleting(true);
      
      const response = await fetch('http://localhost:3002/api/calendar-events', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete all events');
      }
      
      // Show success message
      setToastMessage('All calendar events have been deleted');
      setShowToast(true);
      
      // Refresh events after deletion
      await fetchEvents();
      setShowDeleteAllModal(false);
    } catch (err) {
      console.error('Error deleting all events:', err);
      setError(`Failed to delete all events: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Handle clicking an event
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    
    // Store all relevant information
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start,
      extendedProps: event.extendedProps || {}
    });
    setShowDeleteModal(true);
  };

  // Map events to FullCalendar format (ensuring they have proper properties)
  const calendarEvents = events.map(event => {
    // Add robust date handling
    let startDate;
    try {
      // Try to parse the date string
      startDate = new Date(event.start);
      
      // Validate the date is valid
      if (isNaN(startDate.getTime())) {
        console.error('Invalid date format:', event.start);
        // Fallback to current date if invalid
        startDate = new Date(); 
      }
    } catch (err) {
      console.error('Error parsing date:', err);
      startDate = new Date();
    }
    
    return {
      id: event.id, // Use the exact ID from the backend 
      title: event.title || 'Untitled Event',
      start: startDate.toISOString(), // Ensure consistent ISO string format
      allDay: true, // Force all-day events for better display
      backgroundColor: getEventColor(event),
      borderColor: getEventColor(event),
      extendedProps: {
        description: event.description || '',
        course: event.course || 'General',
        priority: event.priority || 'medium',
        original: event.original || ''
      }
    };
  });

  useEffect(() => {
    if (events.length > 0) {
      console.log('Calendar events loaded:', events.length);
      // Don't reference calendarEvents here to avoid dependency cycles
    }
  }, [events]);

  // Helper function to determine event color based on content
  function getEventColor(event) {
    const title = event.title?.toLowerCase() || '';
    
    if (title.includes('exam') || title.includes('test') || title.includes('final')) {
      return '#dc3545'; // Red for exams/tests
    } else if (title.includes('quiz')) {
      return '#fd7e14'; // Orange for quizzes
    } else if (title.includes('project')) {
      return '#6f42c1'; // Purple for projects
    } else if (title.includes('paper') || title.includes('essay')) {
      return '#20c997'; // Teal for papers
    } else if (title.includes('homework') || title.includes('assignment')) {
      return '#0d6efd'; // Blue for homework
    } else {
      return '#6c757d'; // Gray for other events
    }
  }

  // Helper function to render event content
  const renderEventContent = (eventInfo) => (
    <div>
      <strong>{eventInfo.event.title}</strong>
      {eventInfo.event.extendedProps.course && (
        <div className="text-light small">
          {eventInfo.event.extendedProps.course}
        </div>
      )}
    </div>
  );

  return (
    <Container className="py-4">
      <h1 className="mb-4">Calendar</h1>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <Card className="mb-4 shadow">
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status" variant="primary" />
                  <p className="mt-3">Loading calendar events...</p>
                </div>
              ) : (
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  eventContent={renderEventContent}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek',
                  }}
                  height="auto"
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                  }}
                  eventDidMount={(info) => {
                    // Add tooltip with full event title
                    const tooltip = document.createElement('div');
                    tooltip.className = 'event-tooltip';
                    tooltip.innerHTML = `
                      <div class="tooltip-title">${info.event.title}</div>
                      <div class="tooltip-date">${new Date(info.event.start).toLocaleDateString()}</div>
                    `;
                    
                    const eventEl = info.el;
                    eventEl.title = info.event.title;
                  }}
                  dayMaxEvents={3}
                  displayEventTime={false}
                  nowIndicator={true}
                  aspectRatio={1.5}
                  fixedWeekCount={false}
                  eventClick={handleEventClick}
                />
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4 shadow">
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item action as={Link} to="/upload">
                Upload New Syllabus
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/view">
                View Uploaded Files
              </ListGroup.Item>
              <ListGroup.Item action>
                Export Calendar
              </ListGroup.Item>
              {events.length > 0 && (
                <ListGroup.Item 
                  action 
                  className="text-danger"
                  onClick={() => setShowDeleteAllModal(true)}
                >
                  Delete All Events
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>

          {!loading && events.length > 0 && (
            <Card className="shadow">
              <Card.Header>
                <h5 className="mb-0">Upcoming Events</h5>
              </Card.Header>
              <ListGroup variant="flush">
                {events
                  .filter(event => {
                    try {
                      const eventDate = new Date(event.start);
                      return !isNaN(eventDate.getTime()) && eventDate >= new Date();
                    } catch {
                      return false; // Filter out events with invalid dates
                    }
                  })
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .slice(0, 5)
                  .map((event, index) => (
                    <ListGroup.Item key={event.id || index}>
                      <div className="fw-bold">{event.title}</div>
                      <div className="small text-muted">
                        {new Date(event.start).toLocaleDateString()}
                      </div>
                    </ListGroup.Item>
                  ))
                }
              </ListGroup>
            </Card>
          )}
        </Col>
      </Row>

      {/* Delete Event Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <>
              <p>Are you sure you want to delete this <strong>specific</strong> event?</p>
              <div className="event-details p-3 bg-light rounded mb-3">
                <div className="fw-bold">{selectedEvent.title}</div>
                <div className="text-muted">
                  Date: {new Date(selectedEvent.start).toLocaleDateString()}
                </div>
                {selectedEvent.extendedProps?.original && (
                  <div className="text-muted">
                    Original Date Text: {selectedEvent.extendedProps.original}
                  </div>
                )}
                <div className="mt-2 small text-secondary">
                  ID: {selectedEvent.id}
                </div>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteEvent}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete This Event Only'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete All Events Modal */}
      <Modal show={showDeleteAllModal} onHide={() => setShowDeleteAllModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete All Events</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete all events?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteAllModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteAllEvents}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete All Events'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <div 
        style={{ 
          position: 'fixed', 
          top: 20, 
          right: 20, 
          zIndex: 9999 
        }}
      >
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
        >
          <Toast.Header>
            <strong className="me-auto">Success</strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </div>
    </Container>
  );
}

export default CalendarPage;