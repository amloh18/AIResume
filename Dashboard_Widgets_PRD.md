# Circle CV Dashboard Widgets - Product Requirements Document (PRD)

## Overview
This document outlines all the widgets and components available in the Circle CV dashboard, their functionality, features, and technical specifications.

## Dashboard Structure
The dashboard is organized into 4 main sections:
1. **Analytics** - Data visualization and insights
2. **Application Tracker** - Job application management
3. **Application Journey** - Guided application process
4. **CV Studio (Canvas)** - CV and cover letter management

---

## 1. ANALYTICS SECTION WIDGETS

### 1.1 Application Stats Widget
**Purpose**: Provides comprehensive statistics about job applications and performance metrics.

**Features**:
- Total applications count
- Applied vs Created ratio
- Application success rate
- Interview rate calculation
- Offer rate tracking
- Time-based filtering (7d, 30d, 90d)
- Interactive pie chart visualization
- Performance indicators with color coding

**Technical Details**:
- Fetches data from `/api/analytics/applications`
- Supports mock data fallback
- Real-time statistics calculation
- Responsive design with glass morphism UI

### 1.2 Progress Tracking Widget
**Purpose**: Visualizes user activity trends over time with interactive charts.

**Features**:
- Line and area charts for activity tracking
- Multi-metric filtering (jobs, CVs, cover letters)
- Time range selection (7d, 30d, 90d)
- Interactive data points
- Trend analysis
- Responsive chart rendering

**Technical Details**:
- Uses Recharts library for visualization
- Fetches from `/api/analytics/progress`
- Supports multiple data series
- Real-time data updates

### 1.3 Intelligence Dashboard Widget
**Purpose**: AI-powered insights and market intelligence for job applications.

**Features**:
- Monthly goal setting and tracking
- Competitive analysis metrics
- Industry benchmarks comparison
- Market intelligence data
- User profile extraction from Master CV
- Experience level analysis
- Skills and industry matching
- Performance percentile calculations

**Key Metrics**:
- Application volume vs benchmark
- Response rate performance
- Interview rate comparison
- Time to offer analysis
- Industry-specific insights

### 1.4 Performance Insights Widget
**Purpose**: Comprehensive performance analysis with conversion funnel and actionable insights.

**Features**:
- Application conversion funnel visualization
- Performance metrics dashboard
- Time-based performance analysis
- Response time tracking
- Success rate calculations
- Actionable improvement suggestions
- Period filtering (Day, Week, Month)

**Conversion Funnel Metrics**:
- Applied → Screening conversion rate
- Screening → Interview conversion rate
- Interview → Offer conversion rate
- Overall success rate

### 1.5 Recent Jobs Widget
**Purpose**: Displays recent job applications with timeline and status distribution.

**Features**:
- Recent job applications list
- Application timeline view
- Status distribution analysis
- Job status icons and color coding
- Quick job navigation
- Date formatting and relative time display

### 1.6 Analytics Journey Widget
**Purpose**: Manages and displays CV application journeys with progress tracking.

**Features**:
- Journey list display
- Journey progress tracking
- Resume/delete journey actions
- Live progress updates
- Journey status indicators
- Integration with Application Journey page

---

## 2. APPLICATION TRACKER SECTION WIDGETS

### 2.1 Job Application Management
**Purpose**: Comprehensive job application tracking and management system.

**Features**:
- Job application CRUD operations
- Advanced search and filtering
- Status management (created, applied, screening, interview, offer, rejected, accepted, withdrawn)
- Priority setting (low, medium, high)
- Job details management
- Application date tracking
- Notes and comments system

**Job Data Structure**:
- Job title and company
- Location and salary information
- Job type and source
- Application and deadline dates
- Status and priority levels
- Custom notes and metadata

### 2.2 Journey Timeline Cards
**Purpose**: Visual timeline representation of application progress.

**Features**:
- Step-by-step progress visualization
- Status indicators for each step
- Timeline navigation
- Progress percentage display
- Step completion tracking
- Interactive timeline elements

### 2.3 Application Journey Modal
**Purpose**: Guided application process with step-by-step workflow.

**Features**:
- Multi-step application process
- Progress tracking through steps
- CV and cover letter integration
- ATS scoring integration
- Step completion validation
- Journey resume functionality

---

## 3. CV STUDIO (CANVAS) SECTION WIDGETS

### 3.1 CV Management System
**Purpose**: Complete CV creation, editing, and management system.

**Features**:
- CV CRUD operations
- CV preview and editing
- Template selection
- CV versioning
- Star/favorite system
- Archive functionality
- CV sharing and download
- Completion percentage tracking

**CV Data Structure**:
- Personal information
- Work experience
- Education history
- Skills and competencies
- Projects and achievements
- Custom sections

### 3.2 Cover Letter Management
**Purpose**: Cover letter creation and management system.

**Features**:
- Cover letter CRUD operations
- Template-based creation
- Job-specific customization
- Content editing and formatting
- Version control
- Integration with job applications

### 3.3 Master CV System
**Purpose**: Centralized CV management with Master CV concept.

**Features**:
- Master CV designation
- Master CV badge display
- CV relationship management
- Master CV overlay system
- CV relationship tracking
- Master CV sharing capabilities

### 3.4 CV Card Overlays
**Purpose**: Interactive CV cards with overlay functionality.

**Features**:
- CV preview overlays
- Quick action buttons
- CV metadata display
- Status indicators
- Quick edit access
- Share and download options

---

## 4. SHARED WIDGETS AND COMPONENTS

### 4.1 Recent Activity Widget
**Purpose**: Real-time activity feed showing user actions and updates.

**Features**:
- Recent activity timeline
- Activity type categorization
- Timestamp formatting
- Activity icons and colors
- Refresh functionality
- Activity filtering
- Real-time updates

**Activity Types**:
- CV creation/editing
- Job applications
- Cover letter creation
- Application status changes
- System notifications

### 4.2 Page Header Component
**Purpose**: Consistent page header with navigation and user information.

**Features**:
- Page title and description
- User avatar and information
- Navigation breadcrumbs
- Action buttons
- Responsive design
- Theme consistency

### 4.3 Master CV Badge
**Purpose**: Visual indicator for Master CV designation.

**Features**:
- Multiple badge variants (default, compact, large)
- Animated badge effects
- Color-coded design
- Responsive sizing
- Hover effects

### 4.4 Loading Skeletons
**Purpose**: Optimized loading states for better user experience.

**Features**:
- Analytics skeleton
- Application tracker skeleton
- Canvas skeleton
- Optimized loading animations
- Performance monitoring

---

## 5. TECHNICAL SPECIFICATIONS

### 5.1 Data Fetching
- **API Integration**: RESTful API endpoints
- **Authentication**: Unified authentication system
- **Caching**: Optimized data fetching with caching
- **Error Handling**: Graceful fallback to mock data
- **Performance**: Parallel data fetching for optimization

### 5.2 State Management
- **Context Providers**: React Context for global state
- **Local State**: useState and useEffect hooks
- **Data Persistence**: Local storage integration
- **Real-time Updates**: WebSocket integration for live data

### 5.3 UI/UX Features
- **Responsive Design**: Mobile-first approach
- **Glass Morphism**: Modern glass widget design
- **Animations**: Framer Motion for smooth transitions
- **Accessibility**: WCAG compliance
- **Dark Mode**: Theme switching capability

### 5.4 Performance Optimization
- **Lazy Loading**: Dynamic component loading
- **Code Splitting**: Route-based code splitting
- **Memoization**: React.memo and useMemo optimization
- **Bundle Optimization**: Tree shaking and minification

---

## 6. INTEGRATION POINTS

### 6.1 External Services
- **CV Parsing**: AI-powered CV analysis
- **ATS Scoring**: Applicant Tracking System integration
- **Email Integration**: Application tracking via email
- **Calendar Integration**: Interview scheduling

### 6.2 Internal Services
- **User Management**: Authentication and authorization
- **File Storage**: CV and document storage
- **Analytics Engine**: Performance tracking and insights
- **Notification System**: Real-time user notifications

---

## 7. FUTURE ENHANCEMENTS

### 7.1 Planned Features
- **AI Recommendations**: Smart job matching
- **Advanced Analytics**: Machine learning insights
- **Collaboration Tools**: Team application management
- **Mobile App**: Native mobile application
- **API Integrations**: LinkedIn, Indeed, Glassdoor integration

### 7.2 Scalability Considerations
- **Microservices Architecture**: Service decomposition
- **Database Optimization**: Query optimization and indexing
- **CDN Integration**: Global content delivery
- **Caching Strategy**: Redis and CDN caching

---

## 8. SUCCESS METRICS

### 8.1 User Engagement
- **Widget Usage**: Most used widgets and features
- **Session Duration**: Time spent in dashboard
- **Feature Adoption**: New feature usage rates
- **User Retention**: Monthly active users

### 8.2 Performance Metrics
- **Load Times**: Widget rendering performance
- **API Response Times**: Backend service performance
- **Error Rates**: System reliability metrics
- **User Satisfaction**: Feedback and ratings

---

This PRD serves as a comprehensive guide for understanding, developing, and maintaining the Circle CV dashboard widgets. Each widget is designed to provide specific value to users while maintaining consistency in design and functionality across the entire dashboard system.
