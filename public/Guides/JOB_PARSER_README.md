# Job Parser Feature

## Overview

The Job Parser is a powerful feature that allows users to automatically parse job postings from Indeed URLs and add them to their job tracker. It extracts key information including job title, company name, description, salary, and sponsorship availability.

## Features

- **Indeed URL Parsing**: Automatically extracts job data from Indeed job postings
- **Smart Data Extraction**: Uses multiple CSS selectors to ensure reliable data extraction
- **Salary Parsing**: Automatically detects and parses salary ranges
- **Sponsorship Detection**: Identifies visa sponsorship availability in job descriptions
- **Duplicate Prevention**: Prevents adding the same job multiple times
- **Seamless Integration**: Directly adds parsed jobs to the job tracker

## API Endpoints

### POST /api/parse-job

Parses an Indeed job URL and stores the data in MongoDB.

**Request Body:**
```json
{
  "url": "https://www.indeed.com/viewjob?jk=...",
  "userId": "optional_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job parsed and stored successfully",
  "data": {
    "jobid": "unique_job_id",
    "title": "Software Engineer",
    "company": "Tech Company",
    "description": "Job description...",
    "sourceUrl": "https://www.indeed.com/viewjob?jk=...",
    "salary": {
      "min": 80000,
      "max": 120000,
      "currency": "USD",
      "period": "yearly"
    },
    "sponsorship": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/jobs/parsed

Retrieves all parsed jobs with pagination support.

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `limit` (optional): Number of jobs per page (default: 50)
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

## Database Schema

The parsed jobs are stored in a `jobs` collection with the following schema:

```typescript
interface Job {
  jobid: string;           // Unique job identifier
  title: string;           // Job title
  company: string;         // Company name
  description: string;     // Job description
  sourceUrl: string;       // Original Indeed URL
  createdAt: Date;         // When the job was parsed
  deadline?: Date;         // Application deadline (if available)
  salary?: {               // Salary information
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  sponsorship: boolean;    // Visa sponsorship availability
  userId?: ObjectId;       // Associated user (optional)
}
```

## Usage

### In the Job Tracker

1. Click the "Parse Job" button in the Job Tracker header
2. Enter an Indeed job URL in the modal
3. Click "Parse Job" to extract the data
4. Review the parsed information
5. Click "Add to Tracker" to add it to your job applications

### Programmatic Usage

```javascript
// Parse a job
const response = await fetch('/api/parse-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://www.indeed.com/viewjob?jk=...' })
});

// Get parsed jobs
const jobs = await fetch('/api/jobs/parsed?limit=10&page=1');
```

## Technical Details

### Data Extraction

The parser uses Cheerio to extract data from Indeed's HTML structure with multiple fallback selectors:

- **Job Title**: `[data-testid="jobsearch-JobInfoHeader-title"] h1`
- **Company**: `[data-testid="jobsearch-JobInfoHeader-companyName"]`
- **Description**: `[data-testid="jobDescriptionText"]`
- **Salary**: `[data-testid="attribute_snippet_compensation"]`

### Error Handling

- Validates that URLs are from Indeed
- Handles network errors and timeouts
- Provides meaningful error messages
- Prevents duplicate job entries

### CORS Support

The API includes CORS headers for frontend access and cross-origin requests.

## Deployment

### Railway

1. Connect your repository to Railway
2. Set environment variables:
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
3. Deploy automatically

### Render

1. Connect your repository to Render
2. Configure as a Web Service
3. Set environment variables
4. Deploy with automatic builds

## Testing

Run the job parser tests:

```bash
npm run test-job-parser
```

## Limitations

- **Indeed Only**: Currently only supports Indeed URLs
- **Rate Limiting**: Respect Indeed's terms of service
- **HTML Structure**: May break if Indeed changes their HTML structure
- **Geographic Restrictions**: Some job postings may be region-specific

## Future Enhancements

- Support for other job sites (LinkedIn, Glassdoor, etc.)
- Enhanced salary parsing with currency detection
- Job requirements extraction
- Skills matching
- Application deadline detection
- Company information enrichment 