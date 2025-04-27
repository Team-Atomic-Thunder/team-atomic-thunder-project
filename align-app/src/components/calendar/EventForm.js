import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase-config';

function EventForm({ show, handleClose, refreshEvents, selectedDate }) {
  const db = getFirestore(app);
  const auth = getAuth(app);
  
  // state for form data
  const [formData, setFormData] = useState({
    title: '',
    type: 'assignment', // Default value
    date: selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    time: '',
    description: '',
  });
  
  // state for validation and submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    
    if (!formData.title.trim()) {
      setError('Event title is required');
      return;
    }
    
    if (!auth.currentUser) {
      setError('You must be logged in to add events');
      return;
    }
    
    setLoading(true);
    
    try {
      const eventDate = new Date(formData.date);
      
      if (formData.time) {
        const [hours, minutes] = formData.time.split(':');
        eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      }
      
      // create event object
      const eventData = {
        userId: auth.currentUser.uid,
        title: formData.title.trim(),
        type: formData.type,
        start: eventDate.toISOString(),
        description: formData.description.trim(),
        createdAt: serverTimestamp(),
        status: 'active',
        isManual: true // flag to show this was manually added
      };
      
      await addDoc(collection(db, 'calendarEvents'), eventData);
      setSuccess('Event added successfully!');
      
      // reset form
      setFormData({
        title: '',
        type: 'assignment',
        date: new Date().toISOString().split('T')[0],
        time: '',
        description: '',
      });
      
      if (refreshEvents) refreshEvents();
      
      // close modal after a delay
      setTimeout(() => {
        handleClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error adding event:', error);
      setError(`Failed to add event: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Event</Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mb-3">
              {success}
            </Alert>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Event Title</Form.Label>
            <Form.Control
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Event Type</Form.Label>
            <Form.Select
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="assignment">Assignment</option>
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </Form.Select>
          </Form.Group>
          
          <Row>
            <Col md={7}>
              <Form.Group className="mb-3">
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            
            <Col md={5}>
              <Form.Group className="mb-3">
                <Form.Label>Time (optional)</Form.Label>
                <Form.Control
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>
          
          <Form.Group className="mb-3">
            <Form.Label>Description (optional)</Form.Label>
            <Form.Control
              as="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Add details about the event"
            />
          </Form.Group>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Event'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default EventForm;