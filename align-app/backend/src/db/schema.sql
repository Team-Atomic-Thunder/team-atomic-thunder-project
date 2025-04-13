-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create syllabus_uploads table
CREATE TABLE IF NOT EXISTS syllabus_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending_parse',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  syllabus_upload_id INTEGER REFERENCES syllabus_uploads(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create parsed_text table for storing extracted text from PDFs
CREATE TABLE IF NOT EXISTS parsed_text (
  id SERIAL PRIMARY KEY,
  syllabus_upload_id INTEGER REFERENCES syllabus_uploads(id) ON DELETE CASCADE,
  extracted_text TEXT NOT NULL,
  parsed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 