import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Helper to wrap the component in BrowserRouter
const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

describe('Login Component', () => {
  test('renders login form elements', () => {
    renderLogin();

    // Check form elements
    expect(screen.getByText(/Log In/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
  });

  test('shows error message when email and password are empty', async () => {
    renderLogin();

    // Submit the form without filling inputs
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect error message to be displayed
    expect(await screen.findByText(/Email and password are required/i)).toBeInTheDocument();
  });

  test('shows error message for invalid email format', async () => {
    renderLogin();

    // Fill in an invalid email and a valid password
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect error message for invalid email format
    expect(await screen.findByText(/Invalid email format/i)).toBeInTheDocument();
  });

  test('shows error message for incorrect credentials', async () => {
    renderLogin();

    // Fill in incorrect credentials
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect error message for invalid credentials
    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument();
  });

  test('navigates to /dashboard on successful login', async () => {
    renderLogin();

    // Fill in correct credentials
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Wait for navigation to occur
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });
});
