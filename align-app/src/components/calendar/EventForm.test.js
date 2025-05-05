import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByText('Event Title')).toBeInTheDocument();
    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-01-15')).toBeInTheDocument();
    expect(screen.getByText('Time (optional)')).toBeInTheDocument();
    expect(screen.getByText('Description (optional)')).toBeInTheDocument();
  });

  test('shows error when submitting without title', async () => {
    render(<EventForm {...defaultProps} />);
    
    const titleInput = screen.getByPlaceholderText('Enter event title');
    await userEvent.clear(titleInput);
    
    const submitButton = screen.getByText('Add Event');
    await userEvent.click(submitButton);
    
    expect(screen.getByText('Event title is required')).toBeInTheDocument();
  });

  test('form fields update correctly when user types', async () => {
    render(<EventForm {...defaultProps} />);
    
    await userEvent.type(screen.getByPlaceholderText('Enter event title'), 'Final Exam');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'exam');
    await userEvent.type(screen.getByPlaceholderText('Add details about the event'), 'Covers all chapters');
    
    expect(screen.getByPlaceholderText('Enter event title').value).toBe('Final Exam');
    expect(screen.getByRole('combobox').value).toBe('exam');
    expect(screen.getByPlaceholderText('Add details about the event').value).toBe('Covers all chapters');
  });

  test('calls handleClose when cancel button is clicked', async () => {
    render(<EventForm {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);
    
    expect(defaultProps.handleClose).toHaveBeenCalledTimes(1);
  });
});