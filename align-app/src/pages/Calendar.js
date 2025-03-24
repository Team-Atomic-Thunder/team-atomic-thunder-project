import React from 'react';
import { useLocation, Link } from 'react-router-dom'; // Import useLocation and Link
import { Container, Row, Col, Card, ListGroup, Badge } from 'react-bootstrap';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

function CalendarPage() {
  const location = useLocation(); // Access location to get passed state
  const events = location.state?.events || []; // Retrieve events from state or default to an empty array

  // Map events to FullCalendar format
  const calendarEvents = events.map(event => ({
    title: event.title,
    date: event.date,
    extendedProps: {
      type: event.type,
      course: event.course,
      priority: event.priority,
    },
  }));

  // Helper function to render event content
  const renderEventContent = (eventInfo) => (
    <div>
      <strong>{eventInfo.event.title}</strong>
      <div className="text-muted small">
        {eventInfo.event.extendedProps.course} - {eventInfo.event.extendedProps.type}
      </div>
    </div>
  );

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
                events={calendarEvents} // Pass the mapped events
                eventContent={renderEventContent}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,dayGridWeek',
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
              <ListGroup.Item action as={Link} to="/calendar">
                View Full Calendar
              </ListGroup.Item>
              <ListGroup.Item action>
                Configure Notifications
              </ListGroup.Item>
              <ListGroup.Item action>
                Export Calendar
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default CalendarPage;