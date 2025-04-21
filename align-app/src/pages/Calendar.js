import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase-config';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
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

    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, [auth.currentUser, db]);

  // Map events to FullCalendar format
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    description: event.description,
    extendedProps: {
      syllabusId: event.syllabusId,
    },
  }));

  // Helper function to render event content
  const renderEventContent = (eventInfo) => (
    <div>
      <strong>{eventInfo.event.title}</strong>
      {eventInfo.event.extendedProps.description && (
        <div className="text-muted small">
          {eventInfo.event.extendedProps.description}
        </div>
      )}
    </div>
  );

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
      <h1 className="mb-4">Calendar</h1>

      <Row>
        <Col lg={8}>
          <Card className="mb-4">
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
                eventClick={(info) => {
                  // You can add event click handling here
                  console.log('Event clicked:', info.event);
                }}
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
              <ListGroup.Item action>
                Configure Notifications
              </ListGroup.Item>
              <ListGroup.Item action>
                Export Calendar
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
                  <ListGroup.Item key={event.id}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{event.title}</strong>
                        <div className="text-muted small">
                          {new Date(event.start).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default CalendarPage;