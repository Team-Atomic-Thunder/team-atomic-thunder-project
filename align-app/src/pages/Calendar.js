import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, ListGroup, Badge, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getFirestore, collection, query, where, onSnapshot, deleteDoc, getDocs, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase-config';
import EventForm from '../components/calendar/EventForm'; // Import the EventForm component

import { handleExportToICS } from '../components/fileExport/FileExport';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const auth = getAuth(app);
  const db = getFirestore(app);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [success,setSuccess] = useState('');

  // Load events from Firestore
    // Load events from Firestore using useCallback
    const loadEvents = useCallback(() => {
      if (!auth.currentUser) return;
  
      // Create a query for the user's events
      const eventsQuery = query(
        collection(db, 'calendarEvents'),
        where('userId', '==', auth.currentUser.uid)
      );
  
      // Set up a real-time listener for events
      const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        setEvents(eventsData);
        setLoading(false);
      });
  
      // Return the unsubscribe function
      return unsubscribe;
    }, [auth.currentUser, db]);
  
    useEffect(() => {
      const unsubscribe = loadEvents();
      
      // Clean up the listener when component unmounts
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [loadEvents]);

  // Helper function to get event color based on type
  const getEventColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'exam':
        return '#dc3545'; // Bright red for exams
      case 'quiz':
        return '#28a745'; // Green for quizzes
      case 'assignment':
        return '#17a2b8'; // Cyan for assignments
      case 'meeting':
        return '#6610f2'; // Purple for meetings
      default:
        return '#6c757d'; // Gray for other events
    }
  };

  // Map events to FullCalendar format
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end || event.start, // If no end date, use start date
    description: event.description,
    backgroundColor: getEventColor(event.type),
    borderColor: getEventColor(event.type),
    textColor: '#ffffff',
    allDay: !event.time, // If time is specified, it's not an all-day event
    extendedProps: {
      syllabusId: event.syllabusId,
      type: event.type,
      description: event.description,
      isManual: event.isManual
    },
  }));

  // Helper function to render event content
  const renderEventContent = (eventInfo) => (
    <div className="calendar-event">
      <div className="event-title">{eventInfo.event.title}</div>
      {eventInfo.event.extendedProps.description && (
        <div className="event-description">
          {eventInfo.event.extendedProps.description}
        </div>
      )}
      <div className="event-type">
        {eventInfo.event.extendedProps.type}
      </div>
    </div>
  );

  // Add custom styles for calendar events
  const calendarStyles = `
    .calendar-event {
      padding: 4px;
      font-size: 0.85em;
      line-height: 1.2;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .event-title {
      font-weight: bold;
      margin-bottom: 2px;
      font-size: 0.9em;
    }
    .event-description {
      font-size: 0.8em;
      opacity: 0.9;
      margin-bottom: 2px;
    }
    .event-type {
      font-size: 0.7em;
      text-transform: uppercase;
      margin-top: auto;
    }
    .fc-event {
      cursor: pointer;
      padding: 4px;
      height: 100%;
      min-height: 50px;
      display: flex;
      align-items: center;
      transition: all 0.2s ease;
    }
    .fc-event:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    .fc-daygrid-event {
      margin: 2px 0;
    }
    .fc-daygrid-day-events {
      margin: 0;
    }
    .fc-daygrid-day-frame {
      min-height: 100px;
    }
  `;

  // Handle event click
  const handleEventClick = (info) => {
    const event = info.event;
    setSelectedEvent({
      id: event.id,
      title: event.title,
      type: event.extendedProps.type,
      date: new Date(event.start).toLocaleDateString(),
      description: event.extendedProps.description || 'No description available',
      isManual: event.extendedProps.isManual
    });
    setShowEventModal(true);
  };

  // Handle date click to add a new event
  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    setShowAddModal(true);
  };

  // Handle deleting a single event
  const handleDeleteEvent = async (eventId) => {
    try {
      // Delete the event from Firestore
      await deleteDoc(doc(db, 'calendarEvents', eventId));
      
      // Close the modal
      setShowEventModal(false);
      setSelectedEvent(null);
      
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
    }
  };

  // Function to handle deleting all events
  const handleDeleteAllEvents = async () => {
    try {
      // Get all events for the current user
      const eventsQuery = query(
        collection(db, 'calendarEvents'),
        where('userId', '==', auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      
      // Delete each event
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      // Close the modal
      setShowDeleteModal(false);
      
      // Show success message
      alert('All events have been deleted successfully!');
    } catch (error) {
      console.error('Error deleting events:', error);
      alert('Error deleting events. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading calendar events...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <style>{calendarStyles}</style>
      <h1 className="mb-4">Calendar</h1>

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Calendar</h5>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                Add Event
              </Button>
            </Card.Header>
            <Card.Body>
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
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                height="auto"
                eventDisplay="block"
                eventTimeFormat={{
                  hour: 'numeric',
                  minute: '2-digit',
                  meridiem: 'short'
                }}
                dayMaxEvents={true}
                moreLinkText="more"
                eventMinHeight={50}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item action as={Link} to="/upload">
                Upload New Syllabus
              </ListGroup.Item>
              <ListGroup.Item action onClick={() => setShowAddModal(true)}>
                Add Event Manually
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
              <ListGroup.Item>
                <Button 
                  variant="danger" 
                  className="w-100"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete All Events
                </Button>
              </ListGroup.Item>
            </ListGroup>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">Upcoming Events</h5>
            </Card.Header>
            <ListGroup variant="flush">
              {events
                .filter(event => new Date(event.start) > new Date())
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .slice(0, 5)
                .map(event => (
                  <ListGroup.Item key={event.id} action onClick={() => {
                    setSelectedEvent({
                      id: event.id,
                      title: event.title,
                      type: event.type,
                      date: new Date(event.start).toLocaleDateString(),
                      description: event.description || 'No description available',
                      isManual: event.isManual
                    });
                    setShowEventModal(true);
                  }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{event.title}</strong>
                        <div className="text-muted small">
                          {new Date(event.start).toLocaleDateString()}
                          {event.description && (
                            <div>{event.description}</div>
                          )}
                        </div>
                      </div>
                      <Badge bg={getEventColor(event.type)}>
                        {event.type}
                      </Badge>
                    </div>
                  </ListGroup.Item>
                ))}
              {events.filter(event => new Date(event.start) > new Date()).length === 0 && (
                <ListGroup.Item className="text-center text-muted">
                  No upcoming events
                </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        </Col>
      </Row>

      {/* Event Detail Modal */}
      <Modal show={showEventModal} onHide={() => setShowEventModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Event Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvent && (
            <div>
              <h4>{selectedEvent.title}</h4>
              <p><strong>Type:</strong> {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}</p>
              <p><strong>Date:</strong> {selectedEvent.date}</p>
              <p><strong>Description:</strong> {selectedEvent.description}</p>
              {selectedEvent.isManual && (
                <Badge bg="info" className="mb-3">Manually Added</Badge>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEventModal(false)}>
            Close
          </Button>
          {selectedEvent && selectedEvent.isManual && (
            <Button 
              variant="danger" 
              onClick={() => handleDeleteEvent(selectedEvent.id)}
            >
              Delete Event
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Add Event Modal */}
      <EventForm 
        show={showAddModal}
        handleClose={() => setShowAddModal(false)}
        refreshEvents={loadEvents}
        selectedDate={selectedDate}
      />

      {/* Delete All Events Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete All Events</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete all events? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAllEvents}>
            Delete All Events
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CalendarPage;