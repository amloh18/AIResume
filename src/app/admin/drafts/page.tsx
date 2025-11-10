'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DraftManagement from '@/components/admin/DraftManagement';

export default function AdminDraftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const response = await fetch('/api/admin/verify');
        const data = await response.json();

        if (data.success) {
          setIsAdmin(true);
        } else {
          router.push('/admin/signin');
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        router.push('/admin/signin');
      } finally {
        setLoading(false);
      }
    };

    verifyAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <DraftManagement />
      </div>
    </div>
  );
}

