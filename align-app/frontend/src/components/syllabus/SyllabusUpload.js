import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './SyllabusUpload.css';

function SyllabusUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a PDF file');
      setSelectedFile(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please upload a PDF file');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to upload files');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Uploading file:', selectedFile.name);
      const uploadResponse = await axios.post('http://localhost:3002/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Upload response:', uploadResponse.data);

      if (!uploadResponse.data || !uploadResponse.data.upload) {
        throw new Error('Invalid response from server');
      }

      const { upload } = uploadResponse.data;
      console.log('Upload data:', upload);
      setUploadedFileId(upload.id);
      setSuccessMessage('File uploaded successfully! Click "Extract Dates" to process the syllabus.');
      onUploadSuccess?.();
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(error.message || 'Error uploading file');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractDates = async () => {
    if (!uploadedFileId) {
      setError('No file uploaded to extract from');
      return;
    }

    setExtracting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post('http://localhost:3002/api/parse-syllabus', 
        { uploadId: uploadedFileId },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('Parse response:', response.data);
      setSuccessMessage('Dates extracted successfully! Check your calendar.');
      setSelectedFile(null);
      setUploadedFileId(null);
      onUploadSuccess?.();
    } catch (error) {
      console.error('Error extracting dates:', error);
      setError(error.response?.data?.error || 'Failed to extract dates');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="syllabus-upload-container">
      <h2>Upload Syllabus</h2>
      
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-content">
          <i className="fas fa-cloud-upload-alt"></i>
          <p>Drag and drop your syllabus here</p>
          <p className="or-text">or</p>
          <button 
            className="browse-button"
            onClick={() => fileInputRef.current.click()}
          >
            Browse Files
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {selectedFile && (
        <div className="selected-file">
          <i className="fas fa-file-pdf"></i>
          <span>{selectedFile.name}</span>
          <button 
            className="remove-file"
            onClick={() => {
              setSelectedFile(null);
              setUploadedFileId(null);
              setSuccessMessage('');
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="button-group">
        <button 
          className="upload-button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading || uploadedFileId}
        >
          {isUploading ? 'Uploading...' : 'Upload Syllabus'}
        </button>

        {uploadedFileId && (
          <button 
            className="extract-button"
            onClick={handleExtractDates}
            disabled={extracting}
          >
            {extracting ? 'Extracting...' : 'Extract Dates'}
          </button>
        )}
      </div>
    </div>
  );
}

export default SyllabusUpload;