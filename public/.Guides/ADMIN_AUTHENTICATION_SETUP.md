# Admin Authentication Setup

This document describes the separate admin panel authentication system implemented using NextAuth's Credentials Provider and a dedicated `AdminAuth` schema.

## Overview

The admin authentication system provides:
- **Separate login flow** for administrators
- **Secure password hashing** with bcryptjs
- **Role-based access control** (superadmin, admin, editor)
- **Middleware protection** for admin routes
- **Dedicated admin dashboard**

## Architecture

### 1. AdminAuth Schema (`src/models/AdminAuth.ts`)

The `AdminAuth` model handles admin authentication with:
- **Email/password authentication**
- **Password hashing** with bcryptjs (salt rounds: 12)
- **Role management** (superadmin, admin, editor)
- **Login tracking** (lastLogin timestamp)
- **Secure password storage** (select: false)

### 2. NextAuth Configuration (`src/lib/auth.ts`)

Added a second Credentials Provider specifically for admin login:
- **Provider ID**: `admin-credentials`
- **Admin user lookup** in AdminAuth collection
- **Password verification** using schema method
- **Session token enhancement** with role and type fields

### 3. Admin Sign-In Page (`/admin/signin`)

Dedicated admin login page with:
- **Clean, professional UI** with admin branding
- **Form validation** and error handling
- **Loading states** and user feedback
- **Redirect to admin dashboard** on success

### 4. Middleware Protection (`src/middleware.ts`)

Enhanced route protection with:
- **Admin route detection** (`/admin/*`)
- **Type-based authorization** (type: 'admin')
- **Role-based access** (admin, superadmin, editor)
- **Automatic redirects** to admin sign-in

### 5. Admin Dashboard (`/admin/dashboard`)

Protected admin interface featuring:
- **Session validation** and type checking
- **Role display** and user information
- **Admin-specific navigation**
- **Secure sign-out** functionality

## Setup Instructions

### 1. Initial Admin User Creation

Run the setup script to create the first admin user:

```bash
node scripts/create-admin-user.js
```

This creates:
- **Email**: admin@cvcircle.io
- **Password**: admin123
- **Role**: superadmin

### 2. Access Admin Panel

1. Navigate to `/admin/signin`
2. Enter admin credentials
3. Access admin dashboard at `/admin/dashboard`

### 3. Creating Additional Admin Users

You can create additional admin users by:

```javascript
const AdminAuth = require('./src/models/AdminAuth');

const newAdmin = new AdminAuth({
  email: 'newadmin@cvcircle.io',
  password: 'securepassword',
  role: 'admin' // or 'editor'
});

await newAdmin.save();
```

## Security Features

### Password Security
- **bcryptjs hashing** with 12 salt rounds
- **Password never returned** in queries (select: false)
- **Secure comparison method** for authentication

### Route Protection
- **Middleware-level protection** for all `/admin/*` routes
- **Type-based authorization** (admin vs user sessions)
- **Role-based access control** within admin panel
- **Automatic redirects** for unauthorized access

### Session Management
- **Separate session types** (admin vs user)
- **Role persistence** in JWT tokens
- **Secure session validation** on each request

## File Structure

```
src/
├── models/
│   └── AdminAuth.ts              # Admin authentication schema
├── lib/
│   └── auth.ts                   # NextAuth config with admin provider
├── app/
│   └── admin/
│       ├── signin/
│       │   └── page.tsx          # Admin login page
│       └── dashboard/
│           └── page.tsx          # Admin dashboard
├── middleware.ts                     # Route protection
└── scripts/
    └── create-admin-user.js     # Admin user creation script
```

## Usage Examples

### Admin Login Flow

```typescript
// Client-side admin login
import { signIn } from 'next-auth/react';

const handleAdminLogin = async (email: string, password: string) => {
  const result = await signIn('admin-credentials', {
    email,
    password,
    redirect: false,
  });
  
  if (result?.ok) {
    router.push('/admin/dashboard');
  }
};
```

### Server-side Admin Check

```typescript
// API route with admin authorization
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.type !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Admin-only logic here
}
```

### Middleware Authorization

```typescript
// Check admin access in middleware
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

if (token?.type !== 'admin' || !['admin', 'superadmin', 'editor'].includes(token.role)) {
  return NextResponse.redirect(new URL('/admin/signin', req.url));
}
```

## Role Hierarchy

1. **superadmin**: Full system access
2. **admin**: Administrative access
3. **editor**: Limited administrative access

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXTAUTH_SECRET=your-secret-key
MONGODB_URI=your-mongodb-connection-string
```

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify admin user exists in database
   - Check password is correct
   - Ensure AdminAuth model is properly imported

2. **"Access denied" redirects**
   - Verify user has admin type in session
   - Check role is in allowed roles array
   - Ensure middleware is properly configured

3. **Database connection errors**
   - Verify MONGODB_URI is correct
   - Check database connectivity
   - Ensure AdminAuth collection exists

### Debug Mode

Enable debug logging in development:

```typescript
// In auth.ts
debug: process.env.NODE_ENV === 'development',
```

## Security Best Practices

1. **Change default admin password** immediately
2. **Use strong passwords** for admin accounts
3. **Regularly rotate admin credentials**
4. **Monitor admin access logs**
5. **Implement session timeouts** for admin sessions
6. **Use HTTPS** in production
7. **Restrict admin access** by IP if needed

## Next Steps

1. **Customize admin dashboard** with your specific features
2. **Add admin user management** interface
3. **Implement audit logging** for admin actions
4. **Add two-factor authentication** for enhanced security
5. **Create admin role management** system
