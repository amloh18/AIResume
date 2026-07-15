import React from 'react';
import AdminThemeEnforcer from '@/components/admin/AdminThemeEnforcer';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Check if user is authenticated and is an admin
  const authResult = await getAuthenticatedUser();
  const isAdmin = authResult?.user?.role === 'admin' || authResult?.user?.role === 'superadmin';
  console.log('AdminLayout Check:', { user: authResult?.user, role: authResult?.user?.role, isAdmin });

  return (
    <AdminThemeEnforcer>
      <div className={`min-h-screen ${ADMIN_THEME.page.background} ${ADMIN_THEME.text.primary}`}>
        <AdminLayoutClient isAdmin={isAdmin}>
          {children}
        </AdminLayoutClient>
      </div>
    </AdminThemeEnforcer>
  );
}


