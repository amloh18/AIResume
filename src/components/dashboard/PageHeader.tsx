import React from 'react';
import GreetingHeader from '@/components/dashboard/GreetingHeader';

interface PageHeaderProps {
  title?: string;
  description?: string;
  user?: {
    name?: string;
    email?: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
    subscription?: any;
    isEmailVerified?: boolean;
  };
  showSettings?: boolean;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  rightContent?: React.ReactNode;
}

export default function PageHeader(props: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between">
        <GreetingHeader />
      </div>
    </div>
  );
}
