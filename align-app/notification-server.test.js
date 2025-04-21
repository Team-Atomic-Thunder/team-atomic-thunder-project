const request = require('supertest');
const express = require('express');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// mock dependencies
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    add: jest.fn()
  }),
  FieldValue: {
    serverTimestamp: jest.fn()
  }
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback) => callback(null, true)),
    sendMail: jest.fn().mockResolvedValue(true)
  })
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

// Import server after mocking dependencies
// Note: You'd need to modify the server code to export the Express app separately from starting it
// For testing purposes, we're mocking a simple version here
const app = express();
app.use(express.json());

// Mock the /api/register-notifications endpoint
app.post('/api/register-notifications', async (req, res) => {
  try {
    const { userId, email, settings } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Mock storing notification settings
    await admin.firestore().collection('notificationSubscribers').doc(userId).set({
      email,
      settings,
      createdAt: admin.FieldValue.serverTimestamp(),
      updatedAt: admin.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    res.status(200).json({ message: 'Notification preferences saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error registering for notifications' });
  }
});

// Mock the /api/test-notification endpoint
app.post('/api/test-notification', async (req, res) => {
  try {
    const { userId, eventType } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Mock getting user data
    const userRef = admin.firestore().collection('notificationSubscribers').doc(userId);
    const userDoc = { 
      exists: true,
      data: () => ({
        email: 'test@example.com',
        settings: {
          emailNotifications: true
        }
      })
    };
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found in notification system' });
    }
    
    const userData = userDoc.data();
    
    // Check if user has email notifications enabled
    if (!userData.settings.emailNotifications) {
      return res.status(400).json({ error: 'User has email notifications disabled' });
    }
    
    // Mock sending email
    await nodemailer.createTransport().sendMail({
      from: 'test@system.com',
      to: userData.email,
      subject: 'Test Notification',
      html: 'Test email content'
    });
    
    res.status(200).json({ message: 'Test notification sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error sending test notification' });
  }
});

// Tests
describe('Notification Server API', () => {
  // Test 1: Registering for notifications
  test('POST /api/register-notifications - success path', async () => {
    const mockRequestBody = {
      userId: 'user123',
      email: 'user@example.com',
      settings: {
        emailNotifications: true,
        notifyDaysBefore: 3,
        dailyDigest: true,
        weeklyDigest: false,
        notificationTypes: {
          assignments: true,
          exams: true,
          quizzes: false,
          papers: true,
          labs: false
        }
      }
    };
    
    const response = await request(app)
      .post('/api/register-notifications')
      .send(mockRequestBody)
      .set('Accept', 'application/json');
      
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Notification preferences saved successfully');
    
    // Verify Firestore was called correctly
    expect(admin.firestore().collection).toHaveBeenCalledWith('notificationSubscribers');
    expect(admin.firestore().doc).toHaveBeenCalledWith('user123');
    expect(admin.firestore().set).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        settings: mockRequestBody.settings
      }),
      { merge: true }
    );
  });
  
  // Test 2: Missing fields validation
  test('POST /api/register-notifications - missing fields', async () => {
    const response = await request(app)
      .post('/api/register-notifications')
      .send({ userId: 'user123' }) // Missing email
      .set('Accept', 'application/json');
      
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields');
  });
  
  // Test 3: Test notification success
  test('POST /api/test-notification - success path', async () => {
    const response = await request(app)
      .post('/api/test-notification')
      .send({ userId: 'user123', eventType: 'Assignment' })
      .set('Accept', 'application/json');
      
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Test notification sent successfully');
    
    // Verify email was sent
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Notification'
      })
    );
  });
  
  // Test 4: User ID validation
  test('POST /api/test-notification - missing user ID', async () => {
    const response = await request(app)
      .post('/api/test-notification')
      .send({ eventType: 'Assignment' }) // Missing userId
      .set('Accept', 'application/json');
      
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('User ID is required');
  });
});