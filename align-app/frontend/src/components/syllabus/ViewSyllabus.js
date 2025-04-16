import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './ViewSyllabus.css';

const ViewSyllabus = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [extracting, setExtracting] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:3002/api/syllabus-uploads', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setFiles(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to load files');
      setLoading(false);
    }
  };

  const handleViewFile = (file) => {
    // Construct the full URL for the file
    const fileUrl = `http://localhost:3002/uploads/${file.file_name}`;
    window.open(fileUrl, '_blank');
  };

  const handleDeleteFile = async (file) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Attempting to delete file:', file.id);
      const response = await axios.delete(`http://localhost:3002/api/syllabus-uploads/${file.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Delete response:', response.data);
      setSuccess('File deleted successfully');
      setError('');
      // Refresh the file list
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.error || 'Failed to delete file');
      setSuccess('');
    }
  };

  const handleExtractDates = async (file) => {
    try {
      setExtracting(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('http://localhost:3002/api/parse-syllabus', 
        { uploadId: file.id },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Parse response:', response.data);
      setSuccess('Dates extracted successfully! Check your calendar.');
    } catch (error) {
      console.error('Error extracting dates:', error);
      setError(error.response?.data?.error || 'Failed to extract dates');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="view-syllabus">
      <h2>Uploaded Syllabi</h2>
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center text-muted">
          No files uploaded yet
        </div>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <span className="file-name">{file.file_name}</span>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleViewFile(file)}
                >
                  View
                </button>
                <button 
                  className="btn btn-success btn-sm"
                  onClick={() => handleExtractDates(file)}
                  disabled={extracting}
                >
                  {extracting ? 'Extracting...' : 'Extract Dates'}
                </button>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteFile(file)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewSyllabus; 