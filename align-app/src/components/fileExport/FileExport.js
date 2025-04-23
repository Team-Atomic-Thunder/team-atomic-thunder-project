import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { createEvents } from 'ics';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebase-config';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

export const handleExportToICS = async (setError, setSuccess) => {
    console.log('handleExportToICS called'); // Debugging log
    const db = getFirestore(app);
    const auth = getAuth(app);
  
    try {
      console.log('Fetching events from Firestore...');
      const eventsRef = collection(db, 'calendarEvents');
      const q = query(eventsRef, where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        throw new Error('No events found to export');
      }
  
      const events = querySnapshot.docs.map(doc => doc.data());
      console.log('Events fetched:', events); // Debugging log
  
      // Map events to ICS format
      const icsEvents = events.map(event => {
        const startDate = new Date(event.start); // Convert ISO string to Date object
        if (isNaN(startDate.getTime())) {
          console.warn('Invalid date for event:', event);
          return null; // Skip invalid events
        }
  
        // Map Firestore status to valid ICS status
        const validStatus = {
          active: 'CONFIRMED',
          cancelled: 'CANCELLED',
          tentative: 'TENTATIVE',
        };
  
        return {
          Begin: [
            startDate.getFullYear(),
            startDate.getMonth() + 1, // Months are 0-indexed in JavaScript
            startDate.getDate(),
            startDate.getHours(),
            startDate.getMinutes(),
          ],
          Summary: String(event.title || 'Untitled Event'), // Ensure title is a string
          Description: String(event.description || ''), // Ensure description is a string
          Status: validStatus[event.status?.toLowerCase()] || 'TENTATIVE', // Default to TENTATIVE
        };
      }).filter(event => event !== null); // Remove null entries
  
      console.log('ICS events:', icsEvents); // Debugging log
  
      // Generate the ICS file
      const {value } = createEvents(icsEvents);
  
      console.log('Generated ICS file content:', value); // Debugging log
  
      // Save the file
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      saveAs(blob, 'calendar-events.ics');
      if (setSuccess) setSuccess('Events exported successfully!');
    } catch (error) {
      console.error('Error exporting events:', error);
      if (setError) setError(`Error exporting events: ${error.message}`);
    }
  };
