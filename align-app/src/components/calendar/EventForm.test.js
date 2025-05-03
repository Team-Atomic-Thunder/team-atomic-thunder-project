import React from 'react';
import { render, screen,} from '@testing-library/react';
import '@testing-library/jest-dom';
import EventForm from './EventForm';

describe('EventForm Integration Tests', () => {
  const defaultProps = {
    show: true,
    handleClose: jest.fn(),
    refreshEvents: jest.fn(),
    selectedDate: '2025-01-15'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the modal with all form fields when show is true', () => {
    render(<EventForm {...defaultProps} />);
    
    expect(screen.getByText('Add New Event')).toBeInTheDocument();
    expect(screen.getByLabelText('Event Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Event Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue('2025-01-15');
    expect(screen.getByLabelText('Time (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
  });

  test('shows error when submitting without title', async () => {
    render(<EventForm {...defaultProps} />);
    

    
    expect(screen.getByText('Event title is required')).toBeInTheDocument();
  });

  test('form fields update correctly when user types', async () => {
    render(<EventForm {...defaultProps} />);
 
    
    expect(screen.getByLabelText('Event Title').value).toBe('Final Exam');
    expect(screen.getByLabelText('Event Type').value).toBe('exam');
    expect(screen.getByLabelText('Description (optional)').value).toBe('Covers all chapters');
  });

  test('calls handleClose when cancel button is clicked', async () => {

    
    expect(defaultProps.handleClose).toHaveBeenCalledTimes(1);
  });
});