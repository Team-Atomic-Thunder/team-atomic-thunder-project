import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase-config';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

const DatesReview = ({ extractedDates, courseInfo }) => {
  const [dates, setDates] = useState(extractedDates);
  const [course, setCourse] = useState(courseInfo);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // handle changes to course info
  const handleCourseChange = (e) => {
    const { name, value } = e.target;
    setCourse(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // handle changes to extracted dates
  const handleDateChange = (index, field, value) => {
    const updatedDates = [...dates];
    updatedDates[index] = {
      ...updatedDates[index],
      [field]: value
    };
    setDates(updatedDates);
  };
  
  // handle removing a date
  const handleRemoveDate = (index) => {
    const updatedDates = dates.filter((_, i) => i !== index);
    setDates(updatedDates);
  };
  
  // saving all data to Firebase
  const handleSave = async () => {
    try {
      // save course info
      const coursesRef = collection(db, 'courses');
      const courseDocRef = await addDoc(coursesRef, {
        ...course,
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      
      // save each event
      const eventsPromises = dates.map(dateItem => {
        return addDoc(collection(db, 'events'), {
          title: dateItem.title,
          date: dateItem.date.toISOString().split('T')[0],
          type: dateItem.type,
          priority: dateItem.priority,
          course: course.code,
          courseId: courseDocRef.id,
          userId: currentUser.uid,
          createdAt: new Date().toISOString(),
          rawText: dateItem.rawText
        });
      });
      
      await Promise.all(eventsPromises);
      
      // Nnvigate to calendar with the new events
      navigate('/calendar', { state: { events: dates.map(d => ({
        ...d,
        date: d.date.toISOString().split('T')[0],
        course: course.code
      }))}});
      
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Failed to save data. Please try again.');
    }
  };
  
  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];
  
  const typeOptions = [
    { value: 'assignment', label: 'Assignment' },
    { value: 'exam', label: 'Exam' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'project', label: 'Project' },
    { value: 'paper', label: 'Paper' },
    { value: 'presentation', label: 'Presentation' },
    { value: 'other', label: 'Other' }
  ];
  
  // get badge color based on priority
  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'secondary';
    }
  };
  
  // get badge color based on type
  const getTypeBadgeVariant = (type) => {
    switch (type) {
      case 'exam':
        return 'danger';
      case 'quiz':
        return 'info';
      case 'assignment':
        return 'primary';
      case 'project':
        return 'success';
      case 'paper':
        return 'secondary';
      case 'presentation':
        return 'dark';
      default:
        return 'light';
    }
  };
  
  return (
    <Container className="py-4">
      <h2 className="mb-4">Review Extracted Information</h2>
      
      <Card className="mb-4">
        <Card.Header>
          <h4 className="mb-0">Course Information</h4>
        </Card.Header>
        <Card.Body>
          <Form>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Course Code</Form.Label>
                  <Form.Control
                    type="text"
                    name="code"
                    value={course.code}
                    onChange={handleCourseChange}
                  />
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group className="mb-3">
                  <Form.Label>Course Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={course.name}
                    onChange={handleCourseChange}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Instructor</Form.Label>
                  <Form.Control
                    type="text"
                    name="instructor"
                    value={course.instructor}
                    onChange={handleCourseChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Important Dates</h4>
          <div>
            <span className="me-2">Total: {dates.length} date{dates.length !== 1 ? 's' : ''}</span>
          </div>
        </Card.Header>
        <Card.Body>
          {dates.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Context</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dates.map((dateItem, index) => (
                  <tr key={index}>
                    <td>
                      <Form.Control
                        type="date"
                        value={dateItem.date.toISOString().split('T')[0]}
                        onChange={(e) => handleDateChange(index, 'date', new Date(e.target.value))}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        value={dateItem.title}
                        onChange={(e) => handleDateChange(index, 'title', e.target.value)}
                      />
                    </td>
                    <td>
                      <Form.Select
                        value={dateItem.type}
                        onChange={(e) => handleDateChange(index, 'type', e.target.value)}
                      >
                        {typeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <Form.Select
                        value={dateItem.priority}
                        onChange={(e) => handleDateChange(index, 'priority', e.target.value)}
                      >
                        {priorityOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td className="text-muted small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dateItem.rawText}
                    </td>
                    <td>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveDate(index)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <p>No dates were found in the uploaded syllabus.</p>
              <p>You can manually add dates or try uploading another document.</p>
            </div>
          )}
          
          <div className="d-flex justify-content-between mt-4">
            <Button variant="outline-secondary" onClick={() => navigate('/upload')}>
              Upload Another Syllabus
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSave}
              disabled={dates.length === 0}
            >
              Save & View Calendar
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DatesReview;