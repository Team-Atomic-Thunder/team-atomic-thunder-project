import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
  // This test simply checks if the component renders without throwing an error
  // No specific text content is being checked
  expect(document.body).toBeInTheDocument();
});