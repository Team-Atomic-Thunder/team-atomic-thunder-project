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
      const icsEvents = events
  .map(evt => {
    const dt = new Date(evt.start);
    if (isNaN(dt.getTime())) {
      console.warn('Skipping invalid date:', evt);
      return null;
    }
    // Map Firestore status to valid ICS status
    const validStatus = {
        active: 'CONFIRMED',
        cancelled: 'CANCELLED',
        tentative: 'TENTATIVE',
      };

    return {
      start: [
        dt.getFullYear(),
        dt.getMonth() + 1,
        dt.getDate(),
        dt.getHours(),
        dt.getMinutes()
      ],
      title:       String(evt.title    || 'Untitled Event'),
      description: String(evt.description || ''),
      status:      validStatus[evt.status?.toLowerCase()] || 'TENTATIVE'
    };
  })
  .filter(e => e !== null);
  
      console.log('ICS events:', icsEvents); // Debugging log
  
      // Generate the ICS file
      const { error: icsError, value } = createEvents(icsEvents);
      console.log({ icsError, value });
        if (icsError) {
        console.error('ICS library failed:', icsError);
        setError(`Error creating ICS: ${icsError.message}`);
        return;
        }
      // Save the file
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
      saveAs(blob, 'calendar-events.ics');
      if (setSuccess) setSuccess('Events exported successfully!');
    } catch (error) {
      console.error('Error exporting events:', error);
      if (setError) setError(`Error exporting events: ${error.message}`);
    }
  };
