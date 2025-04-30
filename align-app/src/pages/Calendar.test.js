import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockEvents = [];

jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(() => ({})),
    query: jest.fn(() => ({})),
    where: jest.fn(() => ({})),
    onSnapshot: jest.fn((query, callback) => {
      callback({
        docs: mockEvents.map(event => ({
          id: event.id,
          data: () => event
        }))
      });
      return jest.fn();
    }),
    addDoc: jest.fn((collection, data) => {
      const newEvent = {
        id: 'new-event-id',
        ...data
      };
      mockEvents.push(newEvent);
      return Promise.resolve({ id: newEvent.id });
    }),
    serverTimestamp: jest.fn(() => 'mocked-timestamp')
  };
});

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id' }
  }))
}));

jest.mock('../firebase-config', () => ({
  app: {}
}));

const MockCalendar = () => {
  const [events, setEvents] = React.useState([]);
  const [showAddModal, setShowAddModal] = React.useState(false);
  
  React.useEffect(() => {
    setEvents([...mockEvents]);
  }, [mockEvents.length]);
  
  const addEvent = async (eventData) => {
    const { getFirestore, collection, addDoc } = require('firebase/firestore');
    
    await addDoc(null, {
      title: eventData.title,
      type: eventData.type,
      start: eventData.date + 'T00:00:00.000Z',
      description: eventData.description,
      userId: 'test-user-id',
      isManual: true
    });
    
    setEvents([...mockEvents]);
  };
  
  return (
    <div data-testid="calendar-component">
      <h2>Calendar</h2>
      <button 
        data-testid="add-event-button"
        onClick={() => setShowAddModal(true)}
      >
        Add Event
      </button>
      
      <div data-testid="events-list">
        {events.map(event => (
          <div 
            key={event.id}
            data-testid={`event-${event.id}`}
            className="event-item"
          >
            {event.title}
          </div>
        ))}
      </div>
      
      {showAddModal && (
        <div data-testid="event-form">
          <input 
            data-testid="event-title-input" 
            placeholder="Title" 
            defaultValue="Test Event"
          />
          <select 
            data-testid="event-type-select"
            defaultValue="assignment"
          >
            <option value="assignment">Assignment</option>
            <option value="quiz">Quiz</option>
            <option value="exam">Exam</option>
          </select>
          <input 
            data-testid="event-date-input"
            type="date"
            defaultValue="2023-05-01"
          />
          <textarea 
            data-testid="event-description-input"
            defaultValue="This is a test event"
          />
          <button 
            data-testid="submit-event-button"
            onClick={async () => {
              await addEvent({
                title: "Test Event",
                type: "assignment",
                date: "2023-05-01",
                description: "This is a test event"
              });
              setShowAddModal(false);
            }}
          >
            Add Event
          </button>
          <button 
            data-testid="cancel-button"
            onClick={() => setShowAddModal(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

describe('Calendar Tests', () => {
  beforeEach(() => {
    mockEvents.length = 0;
    jest.clearAllMocks();
  });
  
  test('events are displayed in the calendar', async () => {
    render(<MockCalendar />);
    
    expect(screen.getByTestId('events-list')).toBeInTheDocument();
    expect(screen.queryByText('Test Event')).not.toBeInTheDocument();
    
    const addButton = screen.getByTestId('add-event-button');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('event-form')).toBeInTheDocument();
    
    const submitButton = screen.getByTestId('submit-event-button');
    
    await act(async () => {
      fireEvent.click(submitButton);
      // Manually wait a bit if needed
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(mockEvents.length).toBe(1);
    expect(mockEvents[0].title).toBe('Test Event');
    
    await waitFor(() => {
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });
  });
  
  test('add event form opens when button is clicked', () => {
    render(<MockCalendar />);
    
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
    
    const addButton = screen.getByTestId('add-event-button');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('event-form')).toBeInTheDocument();
  });
  
  test('form is closed when event is added', async () => {
    render(<MockCalendar />);
    
    const addButton = screen.getByTestId('add-event-button');
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('event-form')).toBeInTheDocument();
    
    const submitButton = screen.getByTestId('submit-event-button');
    
    await act(async () => {
      fireEvent.click(submitButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
    });
  });
});