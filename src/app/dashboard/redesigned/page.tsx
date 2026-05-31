'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import SidebarNav from '@/components/dashboard/SidebarNav';
import GreetingHeader from '@/components/dashboard/GreetingHeader';
import RedesignedDashboardView from '@/components/dashboard/redesigned/RedesignedDashboardView';
import { UserTier } from '@/types/dashboard-widgets';
import { motion, AnimatePresence } from 'framer-motion';

export default function RedesignedDashboard() {
  const { data: session } = useSession();
  const [tier, setTier] = useState<UserTier>('starter');

  const userRole = (session?.user as any)?.role || 'user';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-[#f3f2ee] dark:bg-black text-[#0f172a] dark:text-gray-150 font-sans">
        {/* Sidebar */}
        <SidebarNav />

        {/* Main Content Area */}
        <div className="lg:ml-[84px] transition-all duration-300">
          <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-12 pt-16 lg:pt-12">
            
            {/* Greeting Header */}
            <div className="mb-10">
              <GreetingHeader />
              <p className="text-slate-500 font-bold mt-2 text-sm">
                Explore the redesigned {tier} dashboard experience.
              </p>
            </div>

            {/* Dashboard View */}
            <RedesignedDashboardView tier={tier} />

          </div>
        </div>

        {/* Tier Switcher (Admin/Demo only) - Hidden until hover in corner */}
        {isAdmin && (
          <div className="fixed bottom-0 right-0 z-[60] group">
            {/* Trigger Area - Small but accessible */}
            <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-auto" />

            <div className="relative mb-6 mr-6 flex gap-2 bg-white/90 dark:bg-black/90 p-2 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto transform translate-y-4 group-hover:translate-y-0 translate-x-4 group-hover:translate-x-0">
              {(['starter', 'focused', 'smart'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setTier(t)}
                  className={`px-4 h-10 rounded-xl font-black text-[10px] uppercase transition-all ${tier === t ? 'bg-[#83d60d] text-slate-900 shadow-lg' : 'bg-slate-100 dark:bg-gray-800 text-slate-400 hover:bg-slate-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
