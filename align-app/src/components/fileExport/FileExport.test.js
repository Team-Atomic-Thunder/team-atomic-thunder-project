import { handleExportToICS } from './FileExport';
import { getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { createEvents } from 'ics';
import { saveAs } from 'file-saver';

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id' }, // Mock currentUser with a test UID
  })),
}));

jest.mock('ics', () => ({
  createEvents: jest.fn(),
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

describe('handleExportToICS', () => {
  let setError, setSuccess;

  beforeEach(() => {
    setError = jest.fn();
    setSuccess = jest.fn();
    jest.clearAllMocks();

    // Ensure getAuth mock always returns a valid currentUser
    getAuth.mockReturnValue({
      currentUser: { uid: 'test-user-id' },
    });
  });

  it('should handle no events found', async () => {
    getDocs.mockResolvedValueOnce({ empty: true });

    await handleExportToICS(setError, setSuccess);

    expect(setError).toHaveBeenCalledWith('Error exporting events: No events found to export');
    expect(setSuccess).not.toHaveBeenCalled();
  });

  it('should handle invalid event dates', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ start: 'invalid-date', title: 'Test Event' }) },
      ],
    });

    createEvents.mockReturnValueOnce({ error: null, value: 'ICS_DATA' });

    await handleExportToICS(setError, setSuccess);

    expect(setError).not.toHaveBeenCalled();
    expect(setSuccess).toHaveBeenCalledWith('Events exported successfully!');
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'calendar-events.ics');
  });

  it('should handle ICS library errors', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ start: '2025-04-27T10:00:00Z', title: 'Test Event' }) },
      ],
    });

    createEvents.mockReturnValueOnce({ error: new Error('ICS Error'), value: null });

    await handleExportToICS(setError, setSuccess);

    expect(setError).toHaveBeenCalledWith('Error creating ICS: ICS Error');
    expect(setSuccess).not.toHaveBeenCalled();
  });

  it('should export events successfully', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ start: '2025-04-27T10:00:00Z', title: 'Test Event' }) },
      ],
    });

    createEvents.mockReturnValueOnce({ error: null, value: 'ICS_DATA' });

    await handleExportToICS(setError, setSuccess);

    expect(setError).not.toHaveBeenCalled();
    expect(setSuccess).toHaveBeenCalledWith('Events exported successfully!');
    expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'calendar-events.ics');
  });

  it('should handle Firestore errors', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore Error'));

    await handleExportToICS(setError, setSuccess);

    expect(setError).toHaveBeenCalledWith('Error exporting events: Firestore Error');
    expect(setSuccess).not.toHaveBeenCalled();
  });
});
