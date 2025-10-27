'use client';

import React from 'react';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { Archive } from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

const VaultPage: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { toggleSidebar, isMobileMenuOpen } = useMobileSidebar();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vault"
        description="Store and manage your saved forms and reusable data"
        user={{
          name: user?.name || 'User',
          email: user?.email || '',
          username: user?.username,
          profilePhoto: user?.image,
          designation: 'Software Developer'
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Content */}
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Archive size={24} className="text-lime-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Saved Forms</h2>
        <p className="text-gray-600 dark:text-white/60">Store and manage your saved forms and reusable data</p>
        <p className="text-gray-500 dark:text-white/40 text-sm mt-4">Coming soon...</p>
      </div>
    </div>
  );
};

export default VaultPage;
