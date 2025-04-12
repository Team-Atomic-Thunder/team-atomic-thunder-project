import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock react-router-dom components
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ children }) => <div>{children}</div>,
  Link: ({ children }) => <div>{children}</div>,
  Navigate: ({ to }) => <div>Navigate to: {to}</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { events: [] } }),
}));

// Mock firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
}));

// Mock firebase config
jest.mock('./firebase-config', () => ({
  app: {},
  db: {},
}));

test('renders without crashing', () => {
  render(<App />);
  // This just tests that the component renders without throwing any errors
  expect(true).toBe(true);
});