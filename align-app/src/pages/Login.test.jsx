import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from 'Login';
import { BrowserRouter } from 'react-router-dom';

import { signInWithEmailAndPassword } from 'firebase/auth';

// --- MOCKS ---

// Mock Firebase auth functions
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
}));

// Create a mock for useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Helper to wrap component in BrowserRouter
const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

// --- TESTS ---
describe('Login Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  test('renders login form elements', () => {
    renderLogin();

    // Check page title
    expect(screen.getByText(/Log In/i)).toBeInTheDocument();

    // Check input fields
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

    // Check links
    expect(screen.getByText(/Forgot Password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign up/i)).toBeInTheDocument();

    // Check submit button
    expect(screen.getByRole('button', { name: /Log In/i })).toBeInTheDocument();
  });

  test('shows error message when email and password are empty', async () => {
    renderLogin();

    // Submit the form without filling inputs.
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect error message to be displayed.
    expect(await screen.findByText(/Email and password are required/i)).toBeInTheDocument();
  });

  test('successful login navigates to /dashboard', async () => {
    // Simulate a successful Firebase login.
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: '123' } });

    renderLogin();

    // Fill in the form fields.
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    // Submit the form.
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Check that the button displays a loading state.
    expect(screen.getByRole('button', { name: /Logging In\.\.\./i })).toBeDisabled();

    // Ensure the Firebase sign-in function was called with the correct credentials.
    await waitFor(() =>
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(), // the Firebase auth object
        'test@example.com',
        'password123'
      )
    );

    // Verify navigation to the dashboard.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  test('displays specific error for invalid email format', async () => {
    // Simulate a Firebase error for invalid email.
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/invalid-email' });

    renderLogin();

    // Fill in the inputs with an invalid email.
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    // Submit the form.
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect the error message for invalid email to appear.
    const errorMessage = await screen.findByText(/Invalid email format/i);
    expect(errorMessage).toBeInTheDocument();
  });

  test('displays specific error for wrong credentials', async () => {
    // Simulate a Firebase error for wrong password/user not found.
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/wrong-password' });

    renderLogin();

    // Fill in the inputs.
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'wrongpassword' },
    });

    // Submit the form.
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect the error message for invalid credentials to appear.
    const errorMessage = await screen.findByText(/Invalid email or password/i);
    expect(errorMessage).toBeInTheDocument();
  });

  test('displays default error for unhandled error code', async () => {
    // Simulate an unrecognized Firebase error code.
    signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/some-unknown-error' });

    renderLogin();

    // Fill in the inputs.
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });

    // Submit the form.
    fireEvent.click(screen.getByRole('button', { name: /Log In/i }));

    // Expect the default error message to be shown.
    const errorMessage = await screen.findByText(/Failed to log in/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
