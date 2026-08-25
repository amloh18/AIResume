'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, LogOut, Lock } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function AdminUnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 blur-[140px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-[#0a0a0a] border border-red-500/20 rounded-3xl p-8 relative z-10 shadow-2xl shadow-red-500/5 text-center space-y-6"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center shadow-lg shadow-red-500/10">
          <ShieldX className="w-8 h-8" />
        </div>

        {/* Title & Info */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest">
            <Lock className="w-3 h-3" />
            403 Forbidden · Access Denied
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Administrator Access Required
          </h1>
          <p className="text-xs text-white/50 leading-relaxed">
            The authenticated account{' '}
            <span className="text-white font-mono font-bold">
              {session?.user?.email || 'Current Session'}
            </span>{' '}
            does not have administrator privileges to view this portal.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Return to User Dashboard
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="w-full py-3.5 px-5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out & Switch Account
          </button>
        </div>

        {/* Security Footer Note */}
        <p className="text-[10px] text-white/30 tracking-wider uppercase font-mono">
          Security Event Logged · BuildAIResume Admin Gateway
        </p>
      </motion.div>
    </div>
  );
}
