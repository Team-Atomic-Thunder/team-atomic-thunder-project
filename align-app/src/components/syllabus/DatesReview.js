import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';

const DatesReview = ({ extractedDates, courseInfo, rawText }) => {
  const [dates, setDates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    // Initialize with extracted dates
    if (extractedDates && extractedDates.length > 0) {
      setDates(extractedDates.map(date => ({
        ...date,
        // Convert date objects to strings for form inputs
        date: date.date instanceof Date 
          ? date.date.toISOString().split('T')[0]
          : new Date(date.date).toISOString().split('T')[0],
        selected: true // Default all dates to be selected
      })));
    }
  }, [extractedDates]);
  
  const handleInputChange = (index, field, value) => {
    const updatedDates = [...dates];
    updatedDates[index][field] = value;
    setDates(updatedDates);
  };

  const handleCheckboxChange = (index) => {
    const updatedDates = [...dates];
    updatedDates[index].selected = !updatedDates[index].selected;
    setDates(updatedDates);
  };
  
  const handleTypeChange = (index, value) => {
    const updatedDates = [...dates];
    updatedDates[index].type = value;
    
    // Update priority based on type
    if (value === 'exam' || value === 'project' || value === 'paper') {
      updatedDates[index].priority = 'high';
    } else if (value === 'assignment' || value === 'lab') {
      updatedDates[index].priority = 'medium';
    } else {
      updatedDates[index].priority = 'low';
    }
    
    setDates(updatedDates);
  };
  
  const handlePriorityChange = (index, value) => {
    const updatedDates = [...dates];
    updatedDates[index].priority = value;
    setDates(updatedDates);
  };
  
  const handleSaveToCalendar = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const db = getFirestore();
      
      // First, save or update course info
      const coursesRef = collection(db, 'courses');
      const courseData = {
        ...courseInfo,
        updatedAt: new Date().toISOString()
      };
      
      // Check if course already exists
      let courseDocRef;
      const existingCourseRef = doc(db, 'courses', courseInfo.code);
      const existingCourseSnap = await getDoc(existingCourseRef);
      
      if (existingCourseSnap.exists()) {
        // Update existing course
        await updateDoc(existingCourseRef, courseData);
        courseDocRef = existingCourseRef;
      } else {
        // Create new course
        const newCourseRef = await addDoc(coursesRef, courseData);
        courseDocRef = newCourseRef;
      }
      
      // Next, save selected dates as events
      const eventsRef = collection(db, 'events');
      const selectedDates = dates.filter(date => date.selected);
      
      // Add each date as an event
      const savePromises = selectedDates.map(date => {
        const eventData = {
          title: date.title,
          date: date.date, // ISO date string
          type: date.type,
          priority: date.priority,
          course: courseInfo.code,
          courseRef: courseDocRef.id,
          rawText: date.rawText,
          createdAt: new Date().toISOString()
        };
        
        return addDoc(eventsRef, eventData);
      });
      
      await Promise.all(savePromises);
      
      // Show success message
      setSuccess(`Successfully added ${selectedDates.length} events to your calendar!`);
      
      // Redirect to calendar after 2 seconds
      setTimeout(() => {
        navigate('/calendar', { 
          state: { 
            events: selectedDates.map(date => ({
              ...date,
              date: date.date, // Keep ISO date string
            })) 
          } 
        });
      }, 2000);
      
    } catch (error) {
      console.error('Error saving events:', error);
      setError('Failed to save events. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Map event types to Bootstrap variants
  const getTypeVariant = (type) => {
    const variants = {
      'assignment': 'primary',
      'exam': 'danger',
      'quiz': 'info',
      'project': 'dark',
      'paper': 'secondary',
      'reading': 'light',
      'discussion': 'info',
      'lab': 'success',
      'deadline': 'warning',
      'other': 'secondary'
    };
    
    return variants[type] || 'secondary';
  };
  
  // Map priorities to Bootstrap variants
  const getPriorityVariant = (priority) => {
    const variants = {
      'high': 'danger',
      'medium': 'warning',
      'low': 'success'
    };
    
    return variants[priority] || 'secondary';
  };
  
  return (
    <Container className="py-4">
      <Card className="shadow mb-4">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Review Extracted Dates</h4>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col lg={6}>
              <h5>Course Information</h5>
              <p>
                <strong>Code:</strong> {courseInfo.code}<br />
                <strong>Name:</strong> {courseInfo.name}<br />
                <strong>Instructor:</strong> {courseInfo.instructor}
              </p>
            </Col>
            <Col lg={6}>
              <h5>Next Steps</h5>
              <p>
                Review the extracted dates below. You can edit details, change event types, 
                and select which dates to add to your calendar.
              </p>
            </Col>
          </Row>
          
          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" onClose={() => setSuccess('')} dismissible>
              {success}
            </Alert>
          )}
          
          {dates.length === 0 ? (
            <Alert variant="info">
              No dates were found in this syllabus. This could happen if the PDF doesn't contain 
              recognizable date formats or if the file couldn't be properly processed.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table striped hover>
                <thead>
                  <tr>
                    <th style={{width: '50px'}}>Add</th>
                    <th style={{width: '120px'}}>Date</th>
                    <th>Title/Description</th>
                    <th style={{width: '130px'}}>Type</th>
                    <th style={{width: '130px'}}>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {dates.map((date, index) => (
                    <tr key={index}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={date.selected}
                          onChange={() => handleCheckboxChange(index)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="date"
                          value={date.date || ''}
                          onChange={(e) => handleInputChange(index, 'date', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="text"
                          value={date.title || ''}
                          onChange={(e) => handleInputChange(index, 'title', e.target.value)}
                        />
                      </td>
                      <td>
                        <Form.Select
                          value={date.type || 'other'}
                          onChange={(e) => handleTypeChange(index, e.target.value)}
                        >
                          <option value="assignment">Assignment</option>
                          <option value="exam">Exam</option>
                          <option value="quiz">Quiz</option>
                          <option value="project">Project</option>
                          <option value="paper">Paper</option>
                          <option value="reading">Reading</option>
                          <option value="discussion">Discussion</option>
                          <option value="lab">Lab</option>
                          <option value="deadline">Deadline</option>
                          <option value="other">Other</option>
                        </Form.Select>
                        <Badge bg={getTypeVariant(date.type)} className="mt-1">
                          {date.type?.charAt(0).toUpperCase() + date.type?.slice(1) || 'Other'}
                        </Badge>
                      </td>
                      <td>
                        <Form.Select
                          value={date.priority || 'medium'}
                          onChange={(e) => handlePriorityChange(index, e.target.value)}
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </Form.Select>
                        <Badge bg={getPriorityVariant(date.priority)} className="mt-1">
                          {date.priority?.charAt(0).toUpperCase() + date.priority?.slice(1) || 'Medium'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          
          <div className="d-flex justify-content-between mt-4">
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/upload')}
            >
              Upload Another Syllabus
            </Button>
            
            <Button
              variant="primary"
              disabled={dates.filter(d => d.selected).length === 0 || saving}
              onClick={handleSaveToCalendar}
            >
              {saving ? 'Saving...' : `Save ${dates.filter(d => d.selected).length} Events to Calendar`}
            </Button>
          </div>
        </Card.Body>
      </Card>
      
      {/* Raw text preview for debugging (can be removed in production) */}
      {rawText && (
        <Card className="shadow">
          <Card.Header>
            <h5 className="mb-0">Extracted Text (For Debugging)</h5>
            <small className="text-muted">This section can be removed in production</small>
          </Card.Header>
          <Card.Body>
            <div style={{ maxHeight: '300px', overflow: 'auto' }}>
              <pre className="text-muted" style={{ fontSize: '0.8rem' }}>
                {rawText}
              </pre>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default DatesReview;