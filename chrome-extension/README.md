# CVCircle Job Tracker Chrome Extension

A modern Chrome extension that integrates with CVCircle to help users track and manage their job applications directly from job sites.

## Features

### 🔐 Session Authentication
- Automatically detects user session from CVCircle website (supports both localhost:3000 and www.cvcircle.io)
- Uses NextAuth session cookies for seamless authentication
- No need for separate login - works with existing CVCircle account

### 📊 KPI Dashboard
- **Total Jobs**: Shows total number of saved jobs
- **Applied**: Number of jobs with 'applied' status or higher
- **Interviews**: Number of jobs in interview stage
- **Success Rate**: Percentage of jobs that resulted in offers

### 💼 Job Management
- **Job Cards**: Beautiful mobile-style job cards with company logos
- **Job Details**: Expandable job details with full descriptions
- **Time Tracking**: Shows "time ago" format for when jobs were saved
- **Company Logos**: Auto-generated colored logos based on company type

### 🎨 Modern UI
- Mobile app-style interface matching the design mockups
- Clean, professional design with smooth animations
- Responsive layout that works on different screen sizes
- Dark mode support

### 🔄 Real-time Sync
- Jobs are saved directly to CVCircle database
- Automatic refresh of job list
- Real-time KPI updates
- Cross-device synchronization

## How It Works

### 1. Authentication Flow
```
Extension loads → Check for CVCircle session cookies → Verify with API → Load user data
```

### 2. Job Saving Flow
```
User clicks save on job site → Extract job data → Send to CVCircle API → Show success notification
```

### 3. Data Display Flow
```
Load jobs from API → Calculate KPIs → Display in mobile-style cards → Allow job details view
```

## File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.css             # Mobile-style styling
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── content.js            # Content script for job sites
├── content.css           # Content script styles
└── icons/               # Extension icons
```

## API Integration

### Endpoints Used
- `GET /api/auth/session` - Verify user session
- `GET /api/jobs?userId={userId}` - Fetch user's jobs
- `POST /api/jobs` - Save new job application

### Data Flow
1. Extension checks for session cookies
2. Verifies session with CVCircle API
3. Fetches user's job applications
4. Calculates KPIs from job data
5. Displays in modern mobile interface

## Environment Support

### Development (localhost:3000)
- Automatically detected when localhost cookies are present
- Uses `http://localhost:3000` API endpoints
- Shows development indicator in UI

### Production (www.cvcircle.io)
- Automatically detected when production cookies are present
- Uses `https://www.cvcircle.io` API endpoints
- Full production functionality

## Installation

1. Load the extension in Chrome Developer Mode
2. Navigate to CVCircle website and log in
3. Visit any supported job site (LinkedIn, Indeed, etc.)
4. Click the extension icon to view your saved jobs

## Supported Job Sites

- LinkedIn
- Indeed
- Glassdoor
- ZipRecruiter
- Monster
- CareerBuilder
- SimplyHired
- FlexJobs
- Dice
- AngelList
- Wellfound
- And more...

## Technical Details

### Authentication
- Uses NextAuth session cookies
- Supports both secure and non-secure cookies
- Automatic session verification
- Graceful fallback for expired sessions

### Job Data Structure
```javascript
{
  jobTitle: "Software Engineer",
  company: "Tech Corp",
  location: "San Francisco, CA",
  jobDescription: "Full job description...",
  jobUrl: "https://linkedin.com/jobs/123",
  status: "created",
  priority: "medium",
  source: "extension",
  tags: ["extension-saved"]
}
```

### KPI Calculations
- **Total Jobs**: Count of all job applications
- **Applied**: Jobs with status 'applied' or higher
- **Interviews**: Jobs with status 'interview' or higher
- **Success Rate**: (Offers / Total Jobs) * 100

## Browser Compatibility

- Chrome 88+
- Manifest V3
- Modern JavaScript features
- CSS Grid and Flexbox

## Security

- All API calls use HTTPS in production
- Session cookies are handled securely
- No sensitive data stored locally
- Automatic session expiration handling

## Performance

- Lazy loading of job details
- Efficient DOM updates
- Minimal memory footprint
- Fast job data fetching

## Future Enhancements

- [ ] Bulk job operations
- [ ] Job search and filtering
- [ ] Export functionality
- [ ] Advanced analytics
- [ ] Job application reminders
- [ ] Integration with calendar apps
