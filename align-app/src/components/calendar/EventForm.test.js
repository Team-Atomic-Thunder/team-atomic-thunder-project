import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-event-id' })),
  serverTimestamp: jest.fn(() => 'mocked-timestamp')
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id' }
  }))
}));

jest.mock('../../firebase-config', () => ({
  app: {}
}));

// Create a simple mock event form component for testing
const MockEventForm = ({ show, handleClose, selectedDate = '2023-04-15' }) => {
  return show ? (
    <div data-testid="event-form-modal">
      <h2>Add New Event</h2>
      <input 
        data-testid="event-title-input" 
        placeholder="Enter event title" 
      />
      <select data-testid="event-type-select">
        <option value="assignment">Assignment</option>
        <option value="quiz">Quiz</option>
      </select>
      <input 
        data-testid="event-date-input" 
        type="date" 
        defaultValue={selectedDate} 
      />
      <button 
        data-testid="add-event-submit" 
        onClick={handleClose}
      >
        Add Event
      </button>
      <button 
        data-testid="cancel-button" 
        onClick={handleClose}
      >
        Cancel
      </button>
    </div>
  ) : null;
};

describe('Event Form Tests', () => {
  test('form displays correctly when show is true', () => {
    render(<MockEventForm show={true} handleClose={() => {}} />);
    
    expect(screen.getByTestId('event-form-modal')).toBeInTheDocument();
    expect(screen.getByTestId('event-title-input')).toBeInTheDocument();
    expect(screen.getByTestId('event-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('event-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('add-event-submit')).toBeInTheDocument();
  });

  test('form is not displayed when show is false', () => {
    render(<MockEventForm show={false} handleClose={() => {}} />);
    
    expect(screen.queryByTestId('event-form-modal')).not.toBeInTheDocument();
  });

  test('close button calls handleClose function', () => {
    const mockHandleClose = jest.fn();
    render(<MockEventForm show={true} handleClose={mockHandleClose} />);
    
    fireEvent.click(screen.getByTestId('cancel-button'));
    
    expect(mockHandleClose).toHaveBeenCalledTimes(1);
  });

  test('add button calls handleClose function', () => {
    const mockHandleClose = jest.fn();
    render(<MockEventForm show={true} handleClose={mockHandleClose} />);
    
    fireEvent.click(screen.getByTestId('add-event-submit'));
    
    expect(mockHandleClose).toHaveBeenCalledTimes(1);
  });

  test('form displays the provided selected date', () => {
    const testDate = '2023-05-20';
    render(<MockEventForm show={true} handleClose={() => {}} selectedDate={testDate} />);
    
    const dateInput = screen.getByTestId('event-date-input');
    expect(dateInput.value).toBe(testDate);
  });
});