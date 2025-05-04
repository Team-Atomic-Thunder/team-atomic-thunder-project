import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CalendarPage from './Calendar';

describe('CalendarPage Integration Tests', () => {
  const renderCalendarPage = () => {
    return render(
      <BrowserRouter>
        <CalendarPage />
      </BrowserRouter>
    );
  };

  test('renders loading state initially and then calendar page', async () => {
    renderCalendarPage();
    
    expect(screen.getByText('Loading calendar events...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar events...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
  });

  test('opens add event modal when clicking add event button', async () => {
    renderCalendarPage();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar events...')).not.toBeInTheDocument();
    });
    
    const addEventButton = screen.getByRole('button', { name: /add event/i });
    await userEvent.click(addEventButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add New Event')).toBeInTheDocument();
    });
  });

  test('opens delete confirmation modal when clicking delete all events', async () => {
    renderCalendarPage();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar events...')).not.toBeInTheDocument();
    });
    
    const deleteAllButton = screen.getByRole('button', { name: /delete all events/i });
    await userEvent.click(deleteAllButton);
    
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete all events? This action cannot be undone.')).toBeInTheDocument();
    });
  });

  test('renders quick actions with proper navigation links', async () => {
    renderCalendarPage();
    
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar events...')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Upload New Syllabus')).toBeInTheDocument();
    expect(screen.getByText('Add Event Manually')).toBeInTheDocument();
    expect(screen.getByText('Configure Notifications')).toBeInTheDocument();
    expect(screen.getByText('Export Calendar')).toBeInTheDocument();
    
    const uploadLink = screen.getByRole('link', { name: /upload new syllabus/i });
    expect(uploadLink).toHaveAttribute('href', '/upload');
  });
});