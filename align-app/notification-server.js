const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK (for accessing Firestore from the server)
// You'll need to download your service account key from Firebase console
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

// Configure Nodemailer (email sending)
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Or another service like SendGrid
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Test email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// API endpoint to register user for notifications
app.post('/api/register-notifications', async (req, res) => {
  try {
    const { userId, email, settings } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store notification settings in our own collection
    await db.collection('notificationSubscribers').doc(userId).set({
      email,
      settings,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    res.status(200).json({ message: 'Notification preferences saved successfully' });
  } catch (error) {
    console.error('Error registering for notifications:', error);
    res.status(500).json({ error: 'Server error registering for notifications' });
  }
});

// API endpoint to manually trigger notification for testing
app.post('/api/test-notification', async (req, res) => {
  try {
    const { userId, eventType } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const userSnapshot = await db.collection('notificationSubscribers').doc(userId).get();
    
    if (!userSnapshot.exists) {
      return res.status(404).json({ error: 'User not found in notification system' });
    }
    
    const userData = userSnapshot.data();
    
    // Check if user has email notifications enabled
    if (!userData.settings.emailNotifications) {
      return res.status(400).json({ error: 'User has email notifications disabled' });
    }
    
    // Send a test email
    const mailOptions = {
      from: `"Align App" <${process.env.EMAIL_USER}>`,
      to: userData.email,
      subject: 'Align App: Test Notification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9F5255;">Test Notification from Align</h2>
          <p>This is a test notification to confirm your email settings are working correctly.</p>
          <p>You received this because you requested a test notification for: <strong>${eventType || 'All notifications'}</strong></p>
          <hr style="border: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            You're receiving this email because you enabled notifications in your Align account.
            To change your notification settings, visit the notifications page in your account.
          </p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: 'Test notification sent successfully' });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Server error sending test notification' });
  }
});

// CRON job for daily check of upcoming deadlines
// This runs at 8am every day
cron.schedule('0 8 * * *', async () => {
  console.log('Running daily deadline check...');
  await checkUpcomingDeadlines();
});

// CRON job for weekly digest
// This runs at 9am every Monday
cron.schedule('0 9 * * 1', async () => {
  console.log('Sending weekly digests...');
  await sendWeeklyDigests();
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT}`);
});

// Function to check for upcoming deadlines
async function checkUpcomingDeadlines() {
  try {
    // Get all users who have enabled notifications
    const subscribersSnapshot = await db.collection('notificationSubscribers')
      .where('settings.emailNotifications', '==', true)
      .get();
    
    if (subscribersSnapshot.empty) {
      console.log('No users with notifications enabled');
      return;
    }
    
    // For each user, check their upcoming events
    for (const userDoc of subscribersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Get notification settings
      const notifyDaysBefore = parseInt(userData.settings.notifyDaysBefore) || 3;
      
      // Get user's events
      const eventsSnapshot = await db.collection('events')
        .where('userId', '==', userId)
        .get();
      
      if (eventsSnapshot.empty) {
        continue;
      }
      
      // Calculate target date (today + notifyDaysBefore)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + notifyDaysBefore);
      const targetDateStr = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Filter for events due on the target date
      const relevantEvents = eventsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(event => {
          // Format event date as YYYY-MM-DD for comparison
          const eventDateStr = new Date(event.date).toISOString().split('T')[0];
          return eventDateStr === targetDateStr;
        });
      
      // Send notifications for each relevant event
      for (const event of relevantEvents) {
        await sendDeadlineNotification(userId, event);
      }
      
      // Send daily digest if enabled
      if (userData.settings.dailyDigest) {
        await sendDailyDigest(userId);
      }
    }
  } catch (error) {
    console.error('Error checking upcoming deadlines:', error);
  }
}

// Function to send weekly digests
async function sendWeeklyDigests() {
  try {
    // Get all users who have enabled weekly digests
    const subscribersSnapshot = await db.collection('notificationSubscribers')
      .where('settings.emailNotifications', '==', true)
      .where('settings.weeklyDigest', '==', true)
      .get();
    
    if (subscribersSnapshot.empty) {
      console.log('No users with weekly digests enabled');
      return;
    }
    
    // For each user, collect upcoming events for the next 14 days
    for (const userDoc of subscribersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Get user's events
      const eventsSnapshot = await db.collection('events')
        .where('userId', '==', userId)
        .get();
      
      if (eventsSnapshot.empty) {
        continue;
      }
      
      // Calculate date range for the next 14 days
      const now = new Date();
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(now.getDate() + 14);
      
      // Filter for events in the next two weeks
      const upcomingEvents = eventsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= now && eventDate <= twoWeeksLater;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (upcomingEvents.length > 0) {
        await sendWeeklyDigestEmail(userId, userData.email, upcomingEvents);
      }
    }
  } catch (error) {
    console.error('Error sending weekly digests:', error);
  }
}

// Function to send daily digest email
async function sendDailyDigest(userId) {
  try {
    // Get user's notification settings and email
    const userSnapshot = await db.collection('notificationSubscribers').doc(userId).get();
    
    if (!userSnapshot.exists) {
      console.log(`User ${userId} not found in notification system`);
      return;
    }
    
    const userData = userSnapshot.data();
    
    // Get user's events for the next 3 days
    const now = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(now.getDate() + 3);
    
    const eventsSnapshot = await db.collection('events')
      .where('userId', '==', userId)
      .get();
    
    if (eventsSnapshot.empty) {
      return; // No events to notify about
    }
    
    // Filter for events in the next 3 days
    const upcomingEvents = eventsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= threeDaysLater;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (upcomingEvents.length === 0) {
      return; // No upcoming events to notify about
    }
    
    // Build the email HTML
    let eventsHtml = '';
    for (const event of upcomingEvents) {
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      
      const daysRemaining = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
      let daysText = daysRemaining === 0 ? 'Today' : 
                     daysRemaining === 1 ? 'Tomorrow' : 
                     `In ${daysRemaining} days`;
      
      eventsHtml += `
        <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #9F5255; background-color: #f9f9f9;">
          <h3 style="margin-top: 0; color: #333;">${event.title}</h3>
          <p><strong>Due:</strong> ${formattedDate} (${daysText})</p>
          <p><strong>Course:</strong> ${event.course} | <strong>Type:</strong> ${event.type}</p>
        </div>
      `;
    }
    
    // Send the email
    const mailOptions = {
      from: `"Align App" <${process.env.EMAIL_USER}>`,
      to: userData.email,
      subject: `Daily Digest: ${upcomingEvents.length} upcoming deadlines`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9F5255;">Your Daily Deadline Summary</h2>
          <p>Here are your upcoming deadlines for the next 3 days:</p>
          
          ${eventsHtml}
          
          <a href="${process.env.APP_URL}/calendar" style="background-color: #9F5255; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Full Calendar</a>
          
          <hr style="border: 1px solid #eee; margin-top: 20px;">
          <p style="color: #666; font-size: 14px;">
            You're receiving this daily digest because you enabled this feature in your Align account.
            To change your notification settings, <a href="${process.env.APP_URL}/notifications">click here</a>.
          </p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Daily digest sent to ${userData.email}`);
    
    // Log the notification in Firestore
    await db.collection('notificationHistory').add({
      userId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      type: 'dailyDigest',
      eventsCount: upcomingEvents.length,
    });
    
  } catch (error) {
    console.error(`Error sending daily digest to user ${userId}:`, error);
  }
}

// Function to send weekly digest email
async function sendWeeklyDigestEmail(userId, email, events) {
  try {
    if (events.length === 0) {
      return;
    }
    
    // Group events by week
    const now = new Date();
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(now.getDate() + (7 - now.getDay()));
    
    const thisWeekEvents = events.filter(event => new Date(event.date) <= thisWeekEnd);
    const nextWeekEvents = events.filter(event => new Date(event.date) > thisWeekEnd);
    
    // Build the email HTML
    let thisWeekHtml = '';
    if (thisWeekEvents.length > 0) {
      thisWeekHtml = '<h3 style="margin-top: 20px; color: #333;">This Week</h3>';
      for (const event of thisWeekEvents) {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const daysRemaining = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
        let daysText = daysRemaining === 0 ? 'Today' : 
                       daysRemaining === 1 ? 'Tomorrow' : 
                       `In ${daysRemaining} days`;
        
        thisWeekHtml += `
          <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #9F5255; background-color: #f9f9f9;">
            <h3 style="margin-top: 0; color: #333;">${event.title}</h3>
            <p><strong>Due:</strong> ${formattedDate} (${daysText})</p>
            <p><strong>Course:</strong> ${event.course} | <strong>Type:</strong> ${event.type}</p>
          </div>
        `;
      }
    }
    
    let nextWeekHtml = '';
    if (nextWeekEvents.length > 0) {
      nextWeekHtml = '<h3 style="margin-top: 20px; color: #333;">Next Week</h3>';
      for (const event of nextWeekEvents) {
        const eventDate = new Date(event.date);
        const formattedDate = eventDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        
        const daysRemaining = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
        
        nextWeekHtml += `
          <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #E16A54; background-color: #f9f9f9;">
            <h3 style="margin-top: 0; color: #333;">${event.title}</h3>
            <p><strong>Due:</strong> ${formattedDate} (In ${daysRemaining} days)</p>
            <p><strong>Course:</strong> ${event.course} | <strong>Type:</strong> ${event.type}</p>
          </div>
        `;
      }
    }
    
    // Send the email
    const mailOptions = {
      from: `"Align App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Weekly Digest: ${events.length} upcoming deadlines`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9F5255;">Your Weekly Deadline Summary</h2>
          <p>Here are your upcoming deadlines for the next two weeks:</p>
          
          ${thisWeekHtml}
          ${nextWeekHtml}
          
          <a href="${process.env.APP_URL}/calendar" style="background-color: #9F5255; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Full Calendar</a>
          
          <hr style="border: 1px solid #eee; margin-top: 20px;">
          <p style="color: #666; font-size: 14px;">
            You're receiving this weekly digest because you enabled this feature in your Align account.
            To change your notification settings, <a href="${process.env.APP_URL}/notifications">click here</a>.
          </p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Weekly digest sent to ${email}`);
    
    // Log the notification in Firestore
    await db.collection('notificationHistory').add({
      userId,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      type: 'weeklyDigest',
      eventsCount: events.length,
    });
    
  } catch (error) {
    console.error(`Error sending weekly digest to user ${userId}:`, error);
  }
}

// Function to send deadline notification
async function sendDeadlineNotification(userId, event) {
  try {
    // Get user's notification settings
    const userSnapshot = await db.collection('notificationSubscribers').doc(userId).get();
    
    if (!userSnapshot.exists) {
      console.log(`User ${userId} not found in notification system`);
      return;
    }
    
    const userData = userSnapshot.data();
    
    // Check if notifications are enabled and this event type is enabled
    if (!userData.settings.emailNotifications || 
        !userData.settings.notificationTypes[event.type.toLowerCase()]) {
      return;
    }
    
    let priorityText = '';
    switch (event.priority) {
      case 'high':
        priorityText = 'High priority';
        break;
      case 'medium':
        priorityText = 'Medium priority';
        break;
      case 'low':
        priorityText = 'Low priority';
        break;
      default:
        priorityText = '';
    }
    
    // Format the date
    const eventDate = new Date(event.date);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = eventDate.toLocaleDateString('en-US', dateOptions);
    
    // Calculate days remaining
    const daysRemaining = Math.floor((eventDate - new Date()) / (1000 * 60 * 60 * 24));
    
    // Send the notification email
    const mailOptions = {
      from: `"Align App" <${process.env.EMAIL_USER}>`,
      to: userData.email,
      subject: `Upcoming Deadline: ${event.title} (${daysRemaining} days left)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #9F5255;">Upcoming Deadline Reminder</h2>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0;">${event.title}</h3>
            <p><strong>Course:</strong> ${event.course}</p>
            <p><strong>Type:</strong> ${event.type}</p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
            <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
            ${priorityText ? `<p><strong>Priority:</strong> ${priorityText}</p>` : ''}
          </div>
          <a href="${process.env.APP_URL}/calendar" style="background-color: #9F5255; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Calendar</a>
          <hr style="border: 1px solid #eee; margin-top: 20px;">
          <p style="color: #666; font-size: 14px;">
            You're receiving this email because you enabled notifications in your Align account.
            To change your notification settings, <a href="${process.env.APP_URL}/notifications">click here</a>.
          </p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Notification sent to ${userData.email} for event ${event.title}`);
    
    // Log the notification in Firestore
    await db.collection('notificationHistory').add({
      userId,
      eventId: event.id,
      eventTitle: event.title,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      type: 'deadline',
    });
    
  } catch (error) {
    console.error(`Error sending notification for event ${event.title} to user ${userId}:`, error);
  }
}