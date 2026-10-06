'use client';

import React from 'react';
import { HelpCircle, Mail, MessageCircle, Book, Search, Clock, CheckCircle2, AlertCircle, FileText, CreditCard, Shield, Settings, Zap } from 'lucide-react';
import Link from 'next/link';

export default function SupportContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 text-white/85 leading-relaxed">
      {/* Title */}
      <div className="text-center pb-6 border-b border-white/10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 text-lime-400">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Support & Help Center</h2>
        <p className="text-white/50 text-sm mt-2">
          We&apos;re here to assist you with resume building, job discovery, application automation, and billing.
        </p>
      </div>

      {/* 1. Quick Assistance Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link 
          href="/legal#terms" 
          className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-lime-500/30 rounded-2xl p-6 transition-all group"
        >
          <FileText className="w-6 h-6 text-lime-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-white text-base mb-1">Terms of Service</h4>
          <p className="text-white/60 text-xs">Review candidate service terms, automation rules, and plan entitlements.</p>
        </Link>
        
        <Link 
          href="/legal#privacy" 
          className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-lime-500/30 rounded-2xl p-6 transition-all group"
        >
          <Shield className="w-6 h-6 text-lime-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-white text-base mb-1">Privacy & Data Security</h4>
          <p className="text-white/60 text-xs">Understand how your career data is encrypted and protected.</p>
        </Link>

        <Link 
          href="/dashboard/settings" 
          className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-lime-500/30 rounded-2xl p-6 transition-all group"
        >
          <CreditCard className="w-6 h-6 text-lime-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-white text-base mb-1">Billing & Subscription</h4>
          <p className="text-white/60 text-xs">Manage plan upgrades, payment methods, receipts, or cancellations.</p>
        </Link>

        <Link 
          href="/dashboard/jobs?tab=settings" 
          className="bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-lime-500/30 rounded-2xl p-6 transition-all group"
        >
          <Zap className="w-6 h-6 text-lime-400 mb-3 group-hover:scale-110 transition-transform" />
          <h4 className="font-semibold text-white text-base mb-1">Job Search & Auto-Apply</h4>
          <p className="text-white/60 text-xs">Configure target roles, locations, salary thresholds, and connected accounts.</p>
        </Link>
      </div>

      {/* 2. Frequently Asked Support Questions */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-lime-400 shrink-0" />
          Frequently Asked Questions
        </h3>

        <div className="space-y-4 divide-y divide-white/5">
          <div className="pt-3 first:pt-0 space-y-1.5">
            <h5 className="font-semibold text-white text-sm">How does the AI Resume Builder customize my resume?</h5>
            <p className="text-xs sm:text-sm text-white/70">
              AIResume keeps you in full control of your career story while offering smart AI enhancements. You can build your Master CV, and then use AI tailoring to align skills, keywords, and metric-focused accomplishments for specific job descriptions in seconds.
            </p>
          </div>

          <div className="pt-4 space-y-1.5">
            <h5 className="font-semibold text-white text-sm">What is the difference between Manual Review and Auto-Apply?</h5>
            <p className="text-xs sm:text-sm text-white/70">
              Under <em>Manual Review</em>, AI finds matching roles and drafts tailored applications for your one-click approval. Under <em>Auto-Apply</em>, the platform automatically submits applications for roles matching your strict location, salary, and title filters within your plan quota.
            </p>
          </div>

          <div className="pt-4 space-y-1.5">
            <h5 className="font-semibold text-white text-sm">What are the monthly and daily application limits?</h5>
            <p className="text-xs sm:text-sm text-white/70">
              Starter plans include 10 applications per month. Focused plans provide up to 50 automated applications per day with unlimited manual applications. These limits ensure application quality and protect candidate reputation with employers.
            </p>
          </div>

          <div className="pt-4 space-y-1.5">
            <h5 className="font-semibold text-white text-sm">How do I cancel my subscription or request billing help?</h5>
            <p className="text-xs sm:text-sm text-white/70">
              You can manage or cancel your subscription at any time via your account Settings under Billing. If you need invoice assistance or billing clarification, email our support desk.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Direct Contact Channels */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-lime-400 shrink-0" />
          Contact Customer Support
        </h3>
        <p className="text-sm sm:text-base">
          Our team is available Monday through Friday to assist you with any inquiries:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-lime-400">General & Candidate Support</span>
            <p className="text-sm text-white font-medium">support@buildairesume.com</p>
            <p className="text-xs text-white/50">Average response time: &lt; 24 hours</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-lime-400">Privacy & Security Desk</span>
            <p className="text-sm text-white font-medium">privacy@buildairesume.com</p>
            <p className="text-xs text-white/50">Data inquiries & compliance requests</p>
          </div>
        </div>
      </div>
    </div>
  );
}
