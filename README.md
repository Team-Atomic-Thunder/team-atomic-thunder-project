# ALIGN - Academic Learning and Information Navigator

ALIGN is a comprehensive academic management system designed to help students organize their coursework, track assignments, and manage their academic schedule efficiently.

## Features

### 1. Syllabus Management
- **Upload and Parse**: Upload PDF syllabi and automatically extract important dates and assignments
- **Smart Date Extraction**: Automatically identifies and categorizes:
  - Assignments and their due dates
  - Quizzes and exams
  - Projects and homework
  - Lab sessions and deadlines
- **View and Manage**: Easily view and manage all uploaded syllabi in one place

### 2. Calendar Integration
- **Automatic Event Creation**: Converts syllabus dates into calendar events
- **Smart Event Categorization**: Events are automatically categorized by type (assignment, quiz, exam, etc.)
- **Interactive Calendar**: View all academic events in a user-friendly calendar interface
- **Event Management**: Add, edit, and delete calendar events as needed

### 3. User Management
- **Secure Authentication**: User registration and login system
- **Personalized Dashboard**: Each user has their own dashboard with their courses and events
- **Profile Management**: Update personal information and preferences

## Technical Stack

### Frontend
- React.js
- CSS3 for styling
- Axios for API calls
- React Calendar for event display

### Backend
- Node.js with Express
- PostgreSQL (Neon) for database
- JWT for authentication
- PDF parsing for syllabus extraction
- Multer for file uploads

### Database Schema
- Users: Stores user information
- Syllabus_uploads: Tracks uploaded syllabi
- Calendar_events: Stores extracted events
- Parsed_text: Stores extracted text from PDFs

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (or Neon database)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/6iaka/501-Lop.git
cd team-atomic-thunder-project
```

2. Install dependencies:
```bash
# Install backend dependencies
cd align-app/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
Create a `.env` file in the backend directory with:
```
PORT=3002
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:3003
```

4. Start the development servers:
```bash
# Start backend server
cd align-app/backend
npm start

# Start frontend server
cd ../frontend
npm start
```

## Usage

1. **Registration and Login**
   - Create a new account or log in to your existing account
   - Access your personalized dashboard

2. **Syllabus Management**
   - Click "Upload Syllabus" to add a new syllabus
   - The system will automatically parse the PDF and extract dates
   - View your uploaded syllabi in the dashboard

3. **Calendar View**
   - Access the calendar to see all your academic events
   - Events are color-coded by type
   - Click on events to view details

4. **Event Management**
   - Add new events manually
   - Edit existing events
   - Delete events as needed

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Team Atomic Thunder for development
- Neon for database hosting
- All contributors and supporters of the project
