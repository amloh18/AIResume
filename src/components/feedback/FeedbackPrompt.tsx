'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import FeedbackModal from './FeedbackModal';

export function FeedbackPrompt() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const handlePrompt = useCallback(() => {
    if (session?.user) {
      toast({
        title: 'Are you enjoying the platform?',
        description: 'Consider letting us know.',
        action: (
          <button
            onClick={() => {
              setShowModal(true);
            }}
            className="text-sm font-medium text-lime-500 hover:text-lime-600 dark:text-[rgb(129,255,0)] dark:hover:text-[rgb(110,230,0)] transition-colors underline"
          >
            Share Feedback
          </button>
        ),
        duration: 15000, // Show for 15 seconds
      });
    }
  }, [session, toast, setShowModal]);

  useSessionTimer({
    onPrompt: handlePrompt,
    enabled: !!session?.user,
  });

  const userName = session?.user?.name || 
    (session?.user?.firstName 
      ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim()
      : 'User');
  const userEmail = session?.user?.email || '';

  return (
    <FeedbackModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      userName={userName || 'User'}
      userEmail={userEmail}
    />
  );
}

