'use client';

import Link from 'next/link';
import { CreditCard, Shield, Users, ArrowRight, Settings } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>AIResume Administration</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">System &amp; Administration Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Central management portal for application controls, runtime settings, and payment infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Controls Card */}
          <Link
            href="/admin/payments"
            className="group block p-6 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
              <span>Payment Gateway Settings</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Hot-switch runtime payment providers between Stripe and Cashfree Payments, validate credentials, and monitor webhook health.
            </p>
          </Link>

          {/* Account Settings Shortcut */}
          <Link
            href="/dashboard/settings"
            className="group block p-6 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Settings className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center justify-between">
              <span>User &amp; System Settings</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              View account profiles, user roles, security preferences, and membership details.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
