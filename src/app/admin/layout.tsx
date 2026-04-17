import React from 'react';
import AdminThemeEnforcer from '@/components/admin/AdminThemeEnforcer';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeEnforcer>
      <div className={`min-h-screen ${ADMIN_THEME.page.background} ${ADMIN_THEME.text.primary}`}>
        {children}
      </div>
    </AdminThemeEnforcer>
  );
}

