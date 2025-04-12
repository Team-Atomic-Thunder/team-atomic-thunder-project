import React from 'react';
import { render, screen } from '@testing-library/react';
import TestComponent from './TestComponent';

describe('TestComponent', () => {
  test('renders the test component correctly', () => {
    render(<TestComponent />);
    const componentElement = screen.getByTestId('test-component');
    expect(componentElement).toBeInTheDocument();
    
    const headingElement = screen.getByText(/Test Component/i);
    expect(headingElement).toBeInTheDocument();
  });
});