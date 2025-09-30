'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquare } from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

const QuillboxPage: React.FC = () => {
  const { data: session } = useSession();
  const { toggleSidebar, isMobileMenuOpen } = useMobileSidebar();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Quillbox"
        description="Your content library for reusable text snippets and templates"
        user={{
          name: session?.user?.name || session?.user?.firstName || 'User',
          email: session?.user?.email || '',
          username: session?.user?.username,
          profilePhoto: session?.user?.image,
          designation: 'Software Developer'
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Content */}
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={24} className="text-lime-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Snippets</h2>
        <p className="text-gray-600 dark:text-white/60">Your content library for reusable text snippets and templates</p>
        <p className="text-gray-500 dark:text-white/40 text-sm mt-4">Coming soon...</p>
      </div>
    </div>
  );
};

export default QuillboxPage;
