'use client';

import React from 'react';
import { Shield, Lock, Eye, Database, Users, Globe, Mail, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 text-white/85 leading-relaxed">
      {/* Title */}
      <div className="text-center pb-6 border-b border-white/10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 text-lime-400">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Privacy Policy</h2>
        <p className="text-white/50 text-sm mt-2">
          Effective Date: August 25, 2026 · Product of Morigrid Labs
        </p>
      </div>

      {/* 1. Introduction & Overview */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-lime-400 shrink-0" />
          1. Introduction & Our Privacy Commitment
        </h3>
        <p>
          At <strong>AIResume</strong> (a product of <strong>Morigrid Labs</strong>, "we," "us," or "our"), we respect your privacy and are committed to protecting the personal and professional data you entrust to us.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, store, process, and safeguard your personal information when you use our website, AI-assisted resume builder, job discovery engine, connected account services, and application automation features (collectively, the "Service").
        </p>
        <p>
          By accessing or using AIResume, you acknowledge that you have read, understood, and agreed to the practices described in this policy. We comply with international data protection standards, including the EU/UK General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), and the Indian Digital Personal Data Protection Act (DPDP).
        </p>
      </div>

      {/* 2. Information We Collect */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Database className="w-5 h-5 text-lime-400 shrink-0" />
          2. Information We Collect
        </h3>

        <div className="space-y-4">
          <h4 className="text-base font-semibold text-white">A. Information You Directly Provide</h4>
          <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
            <li><strong>Account & Contact Data:</strong> Your name, email address, phone number, location, and account credentials.</li>
            <li><strong>Resume & Career Information:</strong> Employment history, education, skills, certifications, portfolio links, summary statements, and cover letters.</li>
            <li><strong>Job Search Preferences:</strong> Target job titles, preferred workplace types (Remote, Hybrid, On-site), geographic location targets, salary expectations, notice period availability, and active search intensity.</li>
            <li><strong>Job Account Credentials (Optional):</strong> When you choose to connect job portals (such as Naukri, Indeed, or LinkedIn), we collect and encrypt your portal account access tokens or credentials solely to automate job matching and submit approved applications on your behalf.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold text-white">B. Automatically Collected Information</h4>
          <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
            <li><strong>Platform Usage Data:</strong> Pages visited, features accessed, resume edits made, ATS scan scores, and job application submission statuses.</li>
            <li><strong>Device & Technical Diagnostics:</strong> Browser type, operating system, IP address, device model, time zones, and application error logs.</li>
            <li><strong>Cookies & Identifiers:</strong> Secure session identifiers and functional cookies used to maintain your logged-in session and preserve preferences. (See our Cookie Policy for details).</li>
          </ul>
        </div>
      </div>

      {/* 3. How We Use Your Information */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-lime-400 shrink-0" />
          3. How We Use Your Information
        </h3>
        <p>We use your information exclusively to deliver, enhance, and secure your career acceleration experience:</p>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm">Resume Creation & Tailoring</h5>
            <p className="text-xs text-white/70">Generating professional resume documents, optimizing bullet points, formatting templates, and calculating real-time ATS compatibility scores.</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm">Job Matching & Discovery</h5>
            <p className="text-xs text-white/70">Matching your target job titles, locations, and salary criteria with active openings across thousands of employers and connected portal accounts.</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm">Application Automation</h5>
            <p className="text-xs text-white/70">Preparing tailored resumes and submitting application forms on your behalf according to your chosen plan limits and review settings.</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm">Account & Billing Management</h5>
            <p className="text-xs text-white/70">Processing subscription billing, tracking monthly/daily application quotas, and sending account security notifications.</p>
          </div>
        </div>
      </div>

      {/* 4. AI Processing & Data Privacy */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Users className="w-5 h-5 text-lime-400 shrink-0" />
          4. AI Processing & Content Safeguards
        </h3>
        <p>
          AIResume leverages advanced artificial intelligence models to assist you in writing compelling bullet points, analyzing job descriptions, and tailoring your credentials.
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li><strong>No Public Model Training:</strong> Your private resume content, personal identifiers, and application notes are <em>never</em> used to train public generative AI foundation models.</li>
          <li><strong>Confidential Inference:</strong> AI interactions are processed through enterprise-grade, encrypted application programming interfaces with strict zero-data-retention compliance policies.</li>
          <li><strong>Human Ownership:</strong> You retain complete ownership and editorial control of all content generated, edited, or exported using AIResume.</li>
        </ul>
      </div>

      {/* 5. Job Search Portals & Connected Accounts */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-lime-400 shrink-0" />
          5. Connected Job Search Accounts & Third-Party Portals
        </h3>
        <p>
          If you link external job search accounts (such as Naukri, Indeed, or LinkedIn), AIResume uses these connections solely to personalize job discovery and perform automated application actions that you have explicitly enabled.
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li><strong>Strong Cryptographic Protection:</strong> All connected portal credentials and session keys are secured using bank-grade AES-256-GCM encryption before storage.</li>
          <li><strong>One-Click Disconnection:</strong> You can disconnect any linked portal account at any time directly from your Job Settings. Upon disconnection, stored authentication keys are permanently scrubbed from our active servers.</li>
          <li><strong>No Unauthorized Third-Party Selling:</strong> We do not sell, rent, or trade your connected account information, resumes, or application history to recruiters or data brokers.</li>
        </ul>
      </div>

      {/* 6. Data Retention & Your Rights */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-lime-400 shrink-0" />
          6. Data Retention & Your Rights
        </h3>
        <p>
          We retain your resume data, job application records, and preferences for as long as your account remains active. Depending on your jurisdiction, you have the following rights:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li><strong>Access & Portability:</strong> Request a complete copy of all personal data and resumes associated with your account.</li>
          <li><strong>Rectification:</strong> Correct or update any inaccurate or incomplete career information at any time via your dashboard.</li>
          <li><strong>Deletion (Right to be Forgotten):</strong> Request the permanent deletion of your account, resumes, and connected account data.</li>
          <li><strong>Opt-Out of Automation:</strong> Pause or disable automated job matching and application submission features at any time.</li>
        </ul>
      </div>

      {/* 7. Contact Us */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-lime-400 shrink-0" />
          7. Contact Our Privacy & Data Protection Team
        </h3>
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our Data Protection Officer:
        </p>
        <div className="pt-2 text-sm text-white/80 space-y-1">
          <p><strong>Email:</strong> privacy@buildairesume.com</p>
          <p><strong>Entity:</strong> Morigrid Labs (AIResume)</p>
          <p><strong>Support Desk:</strong> <Link href="/legal#support" className="text-lime-400 underline hover:text-lime-300">Support Center</Link></p>
        </div>
      </div>
    </div>
  );
}
