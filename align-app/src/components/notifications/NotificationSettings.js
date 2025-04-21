import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../../firebase-config';

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    notifyDaysBefore: 3,
    dailyDigest: false,
    weeklyDigest: true,
    notificationTypes: {
      assignments: true,
      exams: true,
      quizzes: true,
      papers: true,
      labs: true
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  // Load user's notification settings from Firestore
  useEffect(() => {
    const fetchSettings = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().notificationSettings) {
          setSettings(userDoc.data().notificationSettings);
        }
      } catch (err) {
        console.error("Error fetching notification settings:", err);
        setError("Failed to load your notification settings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [auth.currentUser, db]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('notificationTypes.')) {
      // Handle nested notification types
      const typeKey = name.split('.')[1];
      setSettings(prevSettings => ({
        ...prevSettings,
        notificationTypes: {
          ...prevSettings.notificationTypes,
          [typeKey]: checked
        }
      }));
    } else {
      // Handle regular inputs
      setSettings(prevSettings => ({
        ...prevSettings,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  // Save settings to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setError("You must be logged in to save settings.");
      return;
    }
    
    setSaving(true);
    setSuccess('');
    setError('');
    
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      
      // Get current user data first
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Update with new notification settings
      await setDoc(userRef, {
        ...userData,
        notificationSettings: settings
      }, { merge: true });
      
      // Also register with the notification server
      const response = await fetch('http://localhost:3002/api/register-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          email: auth.currentUser.email,
          settings: settings
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to register with notification server');
      }
      
      setSuccess("Your notification settings have been saved successfully.");
    } catch (err) {
      console.error("Error saving notification settings:", err);
      setError("Failed to save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="text-center py-5">Loading your notification preferences...</div>;
  }
  
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="mb-4">Notification Settings</h2>
              
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Check 
                    type="switch"
                    id="emailNotifications"
                    name="emailNotifications"
                    label="Enable Email Notifications"
                    checked={settings.emailNotifications}
                    onChange={handleChange}
                  />
                  <Form.Text className="text-muted">
                    Receive notifications about upcoming deadlines via email.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Notify me about deadlines</Form.Label>
                  <Form.Select
                    name="notifyDaysBefore"
                    value={settings.notifyDaysBefore}
                    onChange={handleChange}
                    disabled={!settings.emailNotifications}
                  >
                    <option value="1">1 day before</option>
                    <option value="2">2 days before</option>
                    <option value="3">3 days before</option>
                    <option value="5">5 days before</option>
                    <option value="7">1 week before</option>
                  </Form.Select>
                </Form.Group>
                
                <h5 className="mb-3">Digest Emails</h5>
                <Form.Group className="mb-3">
                  <Form.Check 
                    type="checkbox"
                    id="dailyDigest"
                    name="dailyDigest"
                    label="Daily summary of upcoming deadlines"
                    checked={settings.dailyDigest}
                    onChange={handleChange}
                    disabled={!settings.emailNotifications}
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Check 
                    type="checkbox"
                    id="weeklyDigest"
                    name="weeklyDigest"
                    label="Weekly summary of all upcoming deadlines"
                    checked={settings.weeklyDigest}
                    onChange={handleChange}
                    disabled={!settings.emailNotifications}
                  />
                </Form.Group>
                
                <h5 className="mb-3">Notification Types</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="assignmentsNotify"
                        name="notificationTypes.assignments"
                        label="Assignments"
                        checked={settings.notificationTypes.assignments}
                        onChange={handleChange}
                        disabled={!settings.emailNotifications}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="examsNotify"
                        name="notificationTypes.exams"
                        label="Exams"
                        checked={settings.notificationTypes.exams}
                        onChange={handleChange}
                        disabled={!settings.emailNotifications}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="quizzesNotify"
                        name="notificationTypes.quizzes"
                        label="Quizzes"
                        checked={settings.notificationTypes.quizzes}
                        onChange={handleChange}
                        disabled={!settings.emailNotifications}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check 
                        type="checkbox"
                        id="papersNotify"
                        name="notificationTypes.papers"
                        label="Papers"
                        checked={settings.notificationTypes.papers}
                        onChange={handleChange}
                        disabled={!settings.emailNotifications}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Form.Group className="mb-4">
                  <Form.Check 
                    type="checkbox"
                    id="labsNotify"
                    name="notificationTypes.labs"
                    label="Labs"
                    checked={settings.notificationTypes.labs}
                    onChange={handleChange}
                    disabled={!settings.emailNotifications}
                  />
                </Form.Group>
                
                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    size="lg"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default NotificationSettings;