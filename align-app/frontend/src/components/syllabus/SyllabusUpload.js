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

      console.log('Uploading file:', selectedFile.name);
      const uploadResponse = await axios.post('http://localhost:3002/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${currentUser.token}`
        }
      });

      console.log('Upload response:', uploadResponse.data);
      const { filename, uploadId } = uploadResponse.data;

      // Start parsing the uploaded file
      console.log('Starting parse for file:', filename);
      const parseResponse = await axios.post('http://localhost:3002/api/parse-syllabus', 
        { filename },
        {
          headers: {
            'Authorization': `Bearer ${currentUser.token}`
          }
        }
      );

      console.log('Parse response:', parseResponse.data);
      setSuccessMessage('File uploaded and parsed successfully!');
      setSelectedFile(null);
      onUploadSuccess?.();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.error || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtract = async () => {
    if (!uploadedFileId) {
      setError('No file uploaded to extract from');
      return;
    }

    setExtracting(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Extract dates from the uploaded file
      console.log('Attempting to extract dates with identifier:', uploadedFileId);
      const extractResponse = await axios.post('http://localhost:3002/api/parse-syllabus', {
        filename: uploadedFileId,
        userId: currentUser.id,
        originalFilename: selectedFile.name // Add original filename to help with lookup
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Extract response:', extractResponse.data);

      if (extractResponse.data && extractResponse.data.success) {
        setSuccessMessage('Dates extracted successfully! They have been added to your calendar.');
        setSelectedFile(null);
        setUploadedFileId(null);
      } else {
        throw new Error('Failed to extract dates: ' + (extractResponse.data?.error || 'Unknown error'));
      }

    } catch (err) {
      console.error('Extract error:', err);
      if (err.response) {
        console.error('Server error response:', err.response.data);
        if (err.response.data.error === 'Upload not found') {
          setError('The server could not find the uploaded file. This might be due to a server issue. Please try uploading again or contact support.');
        } else {
          setError(`Extraction failed: ${err.response.data.error || 'Server error occurred'}`);
        }
      } else {
        setError(`Extraction failed: ${err.message || 'An unexpected error occurred'}`);
      }
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
            onClick={handleExtract}
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