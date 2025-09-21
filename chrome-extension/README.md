# CVCircle Job Saver Chrome Extension

A Chrome extension that allows users to save jobs from major job sites (LinkedIn, Indeed, Glassdoor, etc.) directly to their CVCircle dashboard.

## Features

- **Multi-Site Support**: Works with LinkedIn, Indeed, Glassdoor, ZipRecruiter, Monster, CareerBuilder, SimplyHired, FlexJobs, Dice, AngelList, and Wellfound
- **Smart Job Detection**: Automatically detects job postings and extracts relevant information
- **Seamless Authentication**: Uses the same Google Auth and NextAuth logic as the main CVCircle app
- **One-Click Saving**: Save jobs with a single click from any supported job site
- **Real-time Status**: Visual feedback for save operations
- **Responsive Design**: Works on all screen sizes with dark mode support

## Installation

### For Development

1. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

2. **Configure API URL**:
   - For local testing: Change `API_BASE_URL` in `background.js` to `http://localhost:3000`
   - For production: Keep `https://cvcircle.io`

3. **Test the Extension**:
   - Visit any supported job site (e.g., LinkedIn, Indeed)
   - Look for the "Save to CVCircle" button
   - Click the extension icon to open the popup

### For Production

1. **Build the Extension**:
   - Zip the `chrome-extension` folder
   - Submit to Chrome Web Store for review

## Usage

### Saving Jobs

1. **Navigate to a Job Posting**:
   - Visit any supported job site
   - Open a job posting

2. **Save the Job**:
   - Click the "Save to Circle CV" button that appears on the page
   - Or use the extension popup to save jobs

3. **View Saved Jobs**:
   - Open your Circle CV dashboard
   - Check the "Created" section for saved jobs

### Authentication

1. **First Time Setup**:
   - Click the extension icon
   - Click "Login to Circle CV"
   - Complete authentication in the opened tab

2. **Automatic Login**:
   - The extension remembers your login
   - No need to re-authenticate unless you logout

## Supported Job Sites

- **LinkedIn** (`linkedin.com`)
- **Indeed** (`indeed.com`)
- **Glassdoor** (`glassdoor.com`)
- **ZipRecruiter** (`ziprecruiter.com`)
- **Monster** (`monster.com`)
- **CareerBuilder** (`careerbuilder.com`)
- **SimplyHired** (`simplyhired.com`)
- **FlexJobs** (`flexjobs.com`)
- **Dice** (`dice.com`)
- **AngelList** (`angel.co`)
- **Wellfound** (`wellfound.com`)

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension API
- **Content Scripts**: Inject into job sites to detect and extract job data
- **Background Service Worker**: Handles API communication and authentication
- **Popup Interface**: Provides user interface and job management

### Job Data Extraction

The extension extracts the following job information:

- **Title**: Job title
- **Company**: Company name
- **Location**: Job location
- **Description**: Job description
- **URL**: Original job posting URL
- **Source**: Job site name
- **Extracted At**: Timestamp of extraction

### API Integration

- **Authentication**: Uses JWT tokens stored in Chrome storage
- **Job Saving**: POST requests to `/api/jobs` endpoint
- **User Verification**: GET requests to `/api/auth/verify` endpoint

## Development

### File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js             # Content script for job sites
├── content.css            # Styles for injected elements
├── popup.html             # Extension popup interface
├── popup.css              # Popup styles
├── popup.js               # Popup functionality
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

### Key Components

1. **manifest.json**: Defines permissions, content scripts, and extension metadata
2. **background.js**: Handles API communication and authentication
3. **content.js**: Detects job sites and extracts job data
4. **popup.js**: Provides user interface for job management

### Customization

- **Add New Job Sites**: Update `JOB_SITES` object in `content.js`
- **Modify Job Extraction**: Update selectors in `content.js`
- **Change API Endpoints**: Update URLs in `background.js`
- **Customize UI**: Modify CSS files and HTML structure

## Troubleshooting

### Common Issues

1. **Extension Not Working**:
   - Check if the extension is enabled in `chrome://extensions/`
   - Verify the API URL is correct
   - Check browser console for errors

2. **Authentication Issues**:
   - Clear extension storage and re-authenticate
   - Verify the Circle CV app is running
   - Check network connectivity

3. **Job Not Saving**:
   - Ensure you're on a supported job site
   - Check if the job data is being extracted correctly
   - Verify API connectivity

### Debug Mode

1. **Enable Debug Logging**:
   - Open Chrome DevTools
   - Go to Console tab
   - Look for Circle CV extension logs

2. **Check Storage**:
   - Go to `chrome://extensions/`
   - Click "Details" on Circle CV extension
   - Click "Extension options"
   - Check stored data

## Security

- **Permissions**: Minimal required permissions
- **Data Storage**: Encrypted storage for sensitive data
- **API Communication**: HTTPS only for production
- **Content Scripts**: Limited to job site domains

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This extension is part of the Circle CV project and follows the same licensing terms.

## Support

For support and questions:
- Check the Circle CV documentation
- Open an issue in the repository
- Contact the development team
