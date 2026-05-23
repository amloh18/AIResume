import React from 'react';
import GreetingHeader from '@/components/dashboard/GreetingHeader';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function PageHeader() {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between">
        <GreetingHeader />
        {/* The NotificationCenter is already inside GreetingHeader in the new design */}
      </div>
    </div>
  );
}
