'use client';

import React from 'react';
import { Cookie, Settings, Shield, Eye, BarChart3, CheckCircle2, Globe, Clock, Mail } from 'lucide-react';
import Link from 'next/link';

export default function CookiePolicyContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 text-white/85 leading-relaxed">
      {/* Title */}
      <div className="text-center pb-6 border-b border-white/10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 text-lime-400">
          <Cookie className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Cookie Policy</h2>
        <p className="text-white/50 text-sm mt-2">
          Effective Date: August 25, 2026 · AIResume (Morigrid Labs)
        </p>
      </div>

      {/* 1. What Are Cookies? */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-lime-400 shrink-0" />
          1. What Are Cookies & Tracking Technologies?
        </h3>
        <p>
          Cookies are small text files placed on your computer, smartphone, or browser when you visit websites. They allow web platforms to remember your actions, keep you securely authenticated, remember your user preferences, and help us understand how you interact with our resume tools and job matching platform.
        </p>
        <p>
          This Cookie Policy explains how AIResume uses cookies, local storage, and similar technologies to deliver a fast, reliable, and secure candidate experience.
        </p>
      </div>

      {/* 2. Categories of Cookies We Use */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Cookie className="w-5 h-5 text-lime-400 shrink-0" />
          2. Categories of Cookies We Use
        </h3>

        <div className="space-y-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-2">
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-lime-400" />
              Essential & Authentication Cookies (Strictly Necessary)
            </h4>
            <p className="text-sm text-white/75">
              These cookies are essential for you to log in, access your private dashboard, protect your account against unauthorized access, and prevent cross-site request forgery. These cannot be switched off because the platform cannot function securely without them.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-2">
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-lime-400" />
              Functional & Preference Cookies
            </h4>
            <p className="text-sm text-white/75">
              These cookies remember your customization preferences, including your dark/light theme choice, active sidebar state, currency selection (e.g. INR, USD, GBP, EUR), and recently viewed CV template settings.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-2">
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-lime-400" />
              Performance & Diagnostics Cookies
            </h4>
            <p className="text-sm text-white/75">
              These cookies collect anonymous diagnostic and telemetry data regarding page load times, editor rendering speeds, and platform error rates, allowing us to fix issues quickly and optimize system performance.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Managing Your Cookie Preferences */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-lime-400 shrink-0" />
          3. How to Control and Manage Cookies
        </h3>
        <p>
          You have full control over non-essential cookies. You can adjust your browser settings at any time to block or delete cookies:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li><strong>Browser Settings:</strong> Most modern browsers (Chrome, Edge, Safari, Firefox) permit you to manage or clear stored cookies in their Privacy & Security settings.</li>
          <li><strong>Cookie Consent Banner:</strong> You can review and update your consent choices via our on-site cookie consent banner.</li>
        </ul>
        <p className="text-xs text-white/60 pt-2">
          Note: Blocking essential cookies may impact your ability to log in or use the interactive CV editor and job tracking features.
        </p>
      </div>

      {/* 4. Contact Us */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-lime-400 shrink-0" />
          4. Questions & Feedback
        </h3>
        <p className="text-sm sm:text-base">
          If you have questions about our cookie usage, please reach out:
        </p>
        <div className="pt-2 text-sm text-white/80 space-y-1">
          <p><strong>Email:</strong> privacy@buildairesume.com</p>
          <p><strong>Related Policies:</strong> <Link href="/legal#privacy" className="text-lime-400 underline hover:text-lime-300">Privacy Policy</Link> · <Link href="/legal#terms" className="text-lime-400 underline hover:text-lime-300">Terms of Service</Link></p>
        </div>
      </div>
    </div>
  );
}
