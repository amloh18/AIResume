# User Settings Architecture

## Overview

This document outlines the optimal data storage strategy for user settings and profile information in the Circle CV application. The architecture uses a **hybrid approach** that balances performance, security, and maintainability.

## Data Storage Strategy

### **User Table (Core Profile Data)**
**Purpose**: Store frequently accessed, core user information
**Location**: `src/models/User.ts`

**Stored Data**:
- **Authentication**: email, password (optional), firebaseUid, clerkId
- **Core Profile**: firstName, lastName, username, avatar
- **Professional Info**: phone, location, company, jobTitle, industry, experience
- **Social Links**: website, linkedin, github, summary
- **Basic Settings**: theme, basic notifications, timezone, languagePreference
- **Subscription**: plan details, usage tracking
- **System Fields**: createdAt, updatedAt, lastLogin

**Why in User Table**:
- ✅ Frequently accessed (every page load)
- ✅ Small data size
- ✅ Core to user identity
- ✅ Required for authentication
- ✅ Simple queries

### **UserSettings Table (Detailed Preferences)**
**Purpose**: Store detailed preferences, security settings, and complex configurations
**Location**: `src/models/UserSettings.ts`

**Stored Data**:
- **Security**: 2FA settings, trusted devices, security questions, login attempts
- **Detailed Notifications**: granular email/push/SMS preferences
- **Privacy**: profile visibility, data sharing preferences, cookie settings
- **Application Preferences**: dashboard layout, CV settings, job search preferences
- **Communication**: language, timezone, date/time formats, currency
- **Advanced**: API access, integrations, experimental features
- **Audit Trail**: change history for security and compliance

**Why Separate Table**:
- ✅ Large, complex data structures
- ✅ Infrequently changed
- ✅ Security-sensitive information
- ✅ Audit trail requirements
- ✅ Performance optimization

### **Existing Separate Tables**
**Purpose**: Handle complex transactional data

**Tables**:
- **Subscription**: `src/models/Subscription.ts` - Billing cycles, payment status
- **PaymentMethod**: `src/models/PaymentMethod.ts` - Credit cards, payment methods
- **Invoice**: `src/models/Invoice.ts` - Payment history, receipts

**Why Separate**:
- ✅ Complex business logic
- ✅ Transactional data
- ✅ Regulatory compliance
- ✅ Audit requirements
- ✅ Third-party integrations

## API Architecture

### **Main Settings Endpoint**
**Route**: `GET/PUT /api/user/settings`
**Purpose**: Unified access to all user settings

**Features**:
- Combines User and UserSettings data
- Single request for complete settings
- Automatic UserSettings creation if missing
- Audit logging for changes

### **Specialized Endpoints**
**Profile**: `GET/PUT /api/user/settings/profile`
- Handles core profile updates
- Username uniqueness validation
- Email verification status

**Security**: `GET/PUT /api/user/settings/security`
- Password changes
- 2FA management
- Trusted device management
- Security question setup

## Frontend Architecture

### **Settings Page Component**
**Location**: `src/components/settings/SettingsPage.tsx`

**Features**:
- **Tabbed Interface**: Profile, Security, Notifications, Privacy, Preferences
- **Real-time Updates**: Immediate UI feedback
- **Validation**: Client-side validation with server-side verification
- **Error Handling**: Comprehensive error states and messages
- **Loading States**: Proper loading indicators

**Data Management**:
- Single state for all settings
- Optimistic updates
- Automatic save on change
- Conflict resolution

## Security Considerations

### **Data Protection**
- **Sensitive Fields**: Passwords, 2FA secrets, API keys marked as `select: false`
- **Encryption**: Security questions and backup codes hashed
- **Audit Trail**: All changes logged with IP and user agent
- **Access Control**: Session-based authentication required

### **Validation**
- **Input Sanitization**: All inputs validated and sanitized
- **Field Restrictions**: Limited allowed fields for updates
- **Rate Limiting**: Protection against abuse
- **CSRF Protection**: Cross-site request forgery prevention

## Performance Optimizations

### **Database Indexes**
- **User Table**: email (unique), firebaseUid (unique), clerkId (unique)
- **UserSettings Table**: userId (unique), security.twoFactorEnabled
- **Subscription Table**: userId + status, paymentProviderId

### **Query Optimization**
- **Selective Fields**: Only fetch required fields
- **Lazy Loading**: Load detailed settings only when needed
- **Caching**: Basic settings cached in User table
- **Pagination**: Large data sets paginated

### **Frontend Optimization**
- **Debounced Updates**: Prevent excessive API calls
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Graceful error handling
- **Loading States**: Proper user feedback

## Migration Strategy

### **Existing Data**
- **Backward Compatibility**: Existing User.settings fields preserved
- **Gradual Migration**: New fields added to UserSettings
- **Default Values**: Comprehensive defaults for new users
- **Data Validation**: Ensure data integrity during migration

### **New Users**
- **Automatic Creation**: UserSettings created on first access
- **Default Configuration**: Sensible defaults for all settings
- **Onboarding**: Guided setup for important preferences

## Benefits of This Architecture

### **Performance**
- ✅ Fast user profile loading
- ✅ Reduced database queries
- ✅ Optimized for common operations
- ✅ Efficient caching strategy

### **Security**
- ✅ Sensitive data properly protected
- ✅ Comprehensive audit trail
- ✅ Granular access control
- ✅ Secure by default

### **Maintainability**
- ✅ Clear separation of concerns
- ✅ Modular API design
- ✅ Comprehensive error handling
- ✅ Easy to extend and modify

### **User Experience**
- ✅ Fast, responsive interface
- ✅ Intuitive settings organization
- ✅ Real-time updates
- ✅ Comprehensive validation

## Usage Examples

### **Getting All Settings**
```typescript
const response = await fetch('/api/user/settings');
const { profile, settings } = await response.json();
```

### **Updating Profile**
```typescript
await fetch('/api/user/settings/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Corp'
  })
});
```

### **Updating Security Settings**
```typescript
await fetch('/api/user/settings/security', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'changePassword',
    data: {
      currentPassword: 'oldpass',
      newPassword: 'newpass'
    }
  })
});
```

## Conclusion

This hybrid architecture provides the optimal balance between performance, security, and maintainability. By storing frequently accessed data in the User table and complex preferences in a separate UserSettings table, we achieve:

- **Fast Performance**: Core data readily available
- **Strong Security**: Sensitive data properly protected
- **Easy Maintenance**: Clear separation of concerns
- **Great UX**: Responsive, intuitive interface

The architecture is designed to scale with your application and can easily accommodate future requirements while maintaining backward compatibility.
