import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth-config';
import AdminThemeEnforcer from '@/components/admin/AdminThemeEnforcer';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Add server-side protection to the layout
  const session = await getServerSession(authConfig);
  
  if (!session) {
    redirect('/admin/login');
  }
  
  const user = session.user as any;
  const isAdmin = user?.type === 'admin' || user?.role === 'admin' || user?.role === 'superadmin';
  
  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <AdminThemeEnforcer>
      <div className={`min-h-screen ${ADMIN_THEME.page.background} ${ADMIN_THEME.text.primary}`}>
        {children}
      </div>
    </AdminThemeEnforcer>
  );
}

