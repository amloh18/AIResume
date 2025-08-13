# Authentication, Navigation, and Session Management System

## Overview

This document describes the comprehensive authentication, navigation, and session management system implemented for the Circle CV App. The system ensures secure access control, prevents unwanted navigation, and manages user sessions with automatic timeout.

## Architecture

### Core Components

1. **SessionManager** (`src/lib/utils/sessionManager.ts`)
   - Manages user activity tracking
   - Handles 5-minute inactivity timeout
   - Tracks last authenticated route
   - Provides session validation

2. **NavigationManager** (`src/lib/utils/navigationManager.ts`)
   - Prevents back navigation to public routes while authenticated
   - Manages browser history
   - Classifies routes as public/protected
   - Handles navigation guards

3. **RouteGuard** (`src/components/auth/RouteGuard.tsx`)
   - Protects routes based on authentication status
   - Redirects unauthenticated users to login
   - Redirects authenticated users away from landing page
   - Provides loading states

4. **SessionManagerProvider** (`src/components/providers/SessionManagerProvider.tsx`)
   - Initializes session and navigation managers
   - Sets up global event listeners
   - Manages session timeout notifications

5. **SessionTimeoutNotification** (`src/components/ui/SessionTimeoutNotification.tsx`)
   - Shows 1-minute warning before session timeout
   - Allows users to extend session
   - Handles automatic logout

## Route Classification

### Public Routes (No Authentication Required)
- `/` - Landing page
- `/auth/signin` - Login page
- `/auth/signup` - Registration page
- `/cv-onboarding` - CV onboarding flow

### Protected Routes (Authentication Required)
- `/dashboard` - Main dashboard
- `/studio` - CV editor
- All sub-routes of protected routes

### API Routes (Always Allowed)
- `/api/auth/*` - Authentication endpoints
- `/api/parse-job` - Job parsing
- `/api/jobs/parsed` - Parsed jobs
- `/api/templates` - CV templates
- `/api/snippets` - Code snippets
- `/api/health` - Health checks
- `/api/cv/parse` - CV parsing
- `/api/test-*` - Test endpoints

## Session Management

### Inactivity Timeout
- **Timeout Duration**: 5 minutes of inactivity
- **Warning**: 1 minute before timeout
- **Activity Detection**: Mouse movement, clicks, keypresses, scroll, touch events
- **Automatic Logout**: Clears session data and redirects to login

### Session State Tracking
- Last activity timestamp
- Last authenticated route
- Session validity status
- User authentication state

## Navigation Behavior

### Authenticated Users
- **Landing Page Access**: Automatically redirected to dashboard
- **Back Navigation**: Prevented from reaching public routes
- **Route History**: Cleaned to prevent public route entries
- **Default Route**: Dashboard > Analytics (if no prior route)

### Unauthenticated Users
- **Protected Route Access**: Redirected to login with callback URL
- **Public Route Access**: Allowed
- **Login Flow**: Preserves intended destination

### Browser Navigation
- **Back Button**: Intercepted to prevent public route access
- **Forward Button**: Handled with same restrictions
- **Refresh**: Preserves current route and state
- **Direct URL Access**: Handled by middleware and route guards

## Implementation Details

### Middleware (`src/middleware.ts`)
```typescript
// Handles server-side route protection
// Redirects authenticated users away from landing page
// Redirects unauthenticated users to login
```

### Route Guards
```typescript
// Client-side route protection
// Provides loading states
// Handles authentication checks
```

### Session Tracking
```typescript
// Activity monitoring
// Route history management
// Timeout handling
```

## Usage Examples

### Protecting a Route
```tsx
import RouteGuard from '@/components/auth/RouteGuard';

export default function ProtectedPage() {
  return (
    <RouteGuard requireAuth={true}>
      <div>Protected content</div>
    </RouteGuard>
  );
}
```

### Public Route with Authentication Check
```tsx
import RouteGuard from '@/components/auth/RouteGuard';

export default function LandingPage() {
  return (
    <RouteGuard requireAuth={false}>
      <div>Public content</div>
    </RouteGuard>
  );
}
```

### Custom Navigation
```tsx
import { useNavigationGuard } from '@/lib/hooks/useNavigationGuard';

function MyComponent() {
  const { navigateTo } = useNavigationGuard();
  
  const handleClick = () => {
    navigateTo('/dashboard'); // Respects navigation guards
  };
}
```

## Testing

### Manual Testing
1. **Login Flow**: Sign in and verify redirect to dashboard
2. **Landing Page Access**: Try accessing `/` while logged in
3. **Back Navigation**: Use browser back button from dashboard
4. **Session Timeout**: Wait 5 minutes without activity
5. **Route Protection**: Try accessing `/dashboard` without login

### Automated Testing
```typescript
import { testAuthSystem, testSessionTimeout, testRouteGuards } from '@/lib/utils/testAuthSystem';

// Run tests
testAuthSystem();
testSessionTimeout();
testRouteGuards();
```

## Security Considerations

### Session Security
- JWT tokens with expiration
- Secure cookie storage
- Automatic session cleanup
- CSRF protection via NextAuth

### Navigation Security
- Server-side middleware protection
- Client-side route guards
- History manipulation prevention
- URL validation

### Data Protection
- Secure API endpoints
- Input validation
- Error handling
- Logging and monitoring

## Error Handling

### Common Scenarios
1. **Session Expired**: Redirect to login with message
2. **Invalid Route**: Redirect to dashboard
3. **Network Error**: Retry with exponential backoff
4. **Authentication Error**: Clear session and redirect

### User Feedback
- Loading states during authentication checks
- Error messages for failed operations
- Success confirmations for actions
- Session timeout warnings

## Performance Optimizations

### Code Splitting
- Route-based code splitting
- Component lazy loading
- Dynamic imports for heavy components

### Caching
- Session data caching
- Route state persistence
- API response caching

### Bundle Optimization
- Tree shaking for unused code
- Minification and compression
- CDN delivery for static assets

## Monitoring and Analytics

### Session Metrics
- Login/logout events
- Session duration
- Timeout frequency
- Route access patterns

### Error Tracking
- Authentication failures
- Navigation errors
- Session timeouts
- API errors

## Future Enhancements

### Planned Features
- Multi-factor authentication
- Social login providers
- Remember me functionality
- Session sharing across tabs
- Advanced analytics dashboard

### Technical Improvements
- Service worker for offline support
- Progressive web app features
- Advanced caching strategies
- Real-time session synchronization

## Troubleshooting

### Common Issues
1. **Session not persisting**: Check cookie settings
2. **Navigation loops**: Verify route guard logic
3. **Timeout not working**: Check activity listeners
4. **Redirect issues**: Verify middleware configuration

### Debug Mode
```typescript
// Enable debug logging
localStorage.setItem('debug', 'auth:*');
```

## Support

For issues or questions about the authentication system:
1. Check the browser console for error messages
2. Review the network tab for API failures
3. Verify environment variables are set correctly
4. Test with different browsers and devices
