'use client';

import React from 'react';
import { 
  Shield, 
  Lock, 
  Eye, 
  Database, 
  Users, 
  Globe, 
  Mail, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Key, 
  Trash2, 
  ExternalLink,
  Cpu,
  RefreshCw
} from 'lucide-react';
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
          Effective Date: October 6, 2026 · Product of Morigrid Labs · buildairesume.com
        </p>
      </div>

      {/* 1. Introduction & Overview */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-lime-400 shrink-0" />
          1. Introduction & Our Privacy Commitment
        </h3>
        <p>
          At <strong>AIResume</strong> (a product of <strong>Morigrid Labs</strong>, &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), we respect your privacy and are committed to protecting the personal and professional data you entrust to us.
        </p>
        <p>
          This Privacy Policy explains in detail how we collect, use, store, process, transfer, and safeguard your personal information when you access or use our website (<a href="https://buildairesume.com" className="text-lime-400 underline hover:text-lime-300">buildairesume.com</a>), our AI-assisted resume builder, job discovery engine, connected account services, Google Sign-In / OAuth integrations, and application automation features (collectively, the &quot;Service&quot;).
        </p>
        <p>
          By creating an account, authenticating via Google or email, or accessing the Service, you acknowledge that you have read, understood, and agreed to the practices described in this policy. We comply with international data protection standards, including the EU/UK General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA/CPRA), the Indian Digital Personal Data Protection Act (DPDP), and Google&apos;s API Services User Data Policy.
        </p>
      </div>

      {/* 2. Information We Collect */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Database className="w-5 h-5 text-lime-400 shrink-0" />
          2. Information We Collect & Sources of Data
        </h3>
        <p>
          We only collect personal information that is strictly necessary to provide, optimize, and secure our career acceleration services. We categorize collected information as follows:
        </p>

        {/* A. Direct */}
        <div className="space-y-3 bg-white/[0.01] border border-white/5 rounded-xl p-5">
          <h4 className="text-base font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
            A. Information You Directly Provide to Us
          </h4>
          <ul className="list-disc list-inside space-y-2 text-white/75 text-sm sm:text-base ml-2">
            <li>
              <strong>Account & Profile Details:</strong> Your name, email address, password hash (when using credentials sign-in), phone number, profile location, and account preferences.
            </li>
            <li>
              <strong>Resume & Professional Credentials:</strong> Work experience, job titles, employer histories, education, degrees, skills, technical proficiencies, professional certifications, portfolio/website links, summary statements, and cover letters.
            </li>
            <li>
              <strong>Job Search Preferences:</strong> Target job titles, preferred workplace types (Remote, Hybrid, On-site), geographic location targets, salary expectations, notice period availability, and active search intensity.
            </li>
            <li>
              <strong>Job Account Credentials (Optional):</strong> When you explicitly choose to connect job portals (such as Naukri, Indeed, or LinkedIn), we store encrypted portal access tokens or session credentials solely to automate job matching and submit approved applications on your behalf.
            </li>
            <li>
              <strong>Customer Support Communications:</strong> Inquiries, feedback, and support tickets submitted to our customer service desk.
            </li>
          </ul>
        </div>

        {/* B. Google OAuth */}
        <div className="space-y-3 bg-white/[0.01] border border-white/5 rounded-xl p-5">
          <h4 className="text-base font-semibold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-lime-400 shrink-0" />
            B. Information Received from Third-Party Sign-In (Google OAuth)
          </h4>
          <p className="text-sm text-white/75">
            When you choose to authenticate or register using Google Sign-In, we request and receive limited profile information through Google OAuth 2.0 protocols. Specifically:
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/75 text-sm sm:text-base ml-2">
            <li>
              <strong>Google OAuth Scopes Requested:</strong> Basic identity scopes only: <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">openid</code>, <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">https://www.googleapis.com/auth/userinfo.profile</code>, and <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">https://www.googleapis.com/auth/userinfo.email</code>.
            </li>
            <li>
              <strong>Specific Data Elements Collected:</strong> Your verified Google email address, your full name, your profile avatar image URL, and your unique Google account identifier (subject ID).
            </li>
            <li>
              <strong>What We DO NOT Request:</strong> We <em>never</em> request access to, view, or store your Google Drive files, Gmail messages, Google Contacts, Google Calendar, search history, device location, or any other sensitive or restricted Google user data scopes.
            </li>
          </ul>
        </div>

        {/* C. Automatically Collected */}
        <div className="space-y-3 bg-white/[0.01] border border-white/5 rounded-xl p-5">
          <h4 className="text-base font-semibold text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-lime-400 shrink-0" />
            C. Automatically Collected Technical & Diagnostic Information
          </h4>
          <ul className="list-disc list-inside space-y-2 text-white/75 text-sm sm:text-base ml-2">
            <li>
              <strong>Usage Telemetry:</strong> Features accessed, templates selected, ATS scan scores, tailoring actions, and application tracking events.
            </li>
            <li>
              <strong>Device Diagnostics:</strong> Browser type and version, operating system, IP address, device type, language settings, and system error logs.
            </li>
            <li>
              <strong>Secure Cookies & Session Tokens:</strong> Secure HTTP-only authentication cookies and functional session identifiers required to maintain sign-in state and guard against CSRF attacks. (See our Cookie Policy for details).
            </li>
          </ul>
        </div>
      </div>

      {/* 3. How We Use Your Information */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-lime-400 shrink-0" />
          3. How We Use Your Information & Purposes of Processing
        </h3>
        <p>
          We use your personal data strictly for legitimate business and service delivery purposes:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> Authentication & Account Management
            </h5>
            <p className="text-xs text-white/70">
              Verifying your identity, enabling frictionless passwordless login with Google, managing user sessions, and enforcing account security.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> Resume Building & ATS Tailoring
            </h5>
            <p className="text-xs text-white/70">
              Structuring your Master CV, generating tailored resume variants for specific job postings, computing ATS keyword match scores, and formatting exportable PDFs.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> Job Matching & Discovery
            </h5>
            <p className="text-xs text-white/70">
              Comparing your skills and career preferences against job listings from verified employers and connected boards to surface relevant opportunities.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> Application Automation
            </h5>
            <p className="text-xs text-white/70">
              Pre-filling application questions and submitting resumes to employer portals in accordance with your explicit plan limits, automation mode, and user approvals.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> Essential Service Communication
            </h5>
            <p className="text-xs text-white/70">
              Sending transactional notifications, application status updates, interview alerts, security advisories, and billing receipts.
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
            <h5 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" /> Platform Security & Legal Compliance
            </h5>
            <p className="text-xs text-white/70">
              Detecting fraudulent activities, preventing automated platform abuse, enforcing terms, and complying with statutory reporting requirements.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Google API User Data & Limited Use Disclosure (CRITICAL FOR GOOGLE OAUTH COMPLIANCE) */}
      <div className="bg-gradient-to-br from-lime-950/30 via-white/[0.03] to-emerald-950/20 border-2 border-lime-400/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-400 shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              4. Google API User Data Policy & Limited Use Disclosure
            </h3>
            <p className="text-sm text-lime-300/90 mt-1 font-medium">
              Mandatory disclosure for users signing in or interacting with Google OAuth services.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-white/85 text-sm sm:text-base">
          <p className="bg-black/40 border border-lime-400/20 rounded-xl p-4 text-white leading-relaxed">
            <strong>Google API Limited Use Statement:</strong> AIResume&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a 
              href="https://developers.google.com/terms/api-services-user-data-policy" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-lime-400 underline font-semibold hover:text-lime-300 inline-flex items-center gap-1"
            >
              Google API Services User Data Policy <ExternalLink className="w-3.5 h-3.5 inline" />
            </a>
            , including the Limited Use requirements.
          </p>

          <p>
            When you authenticate with Google, we access and store only your Google user ID, verified email address, full name, and avatar image. We treat this data under strict safeguards:
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Strict Purpose Limitation:</strong> Google user data is used solely to authenticate your identity, create your AIResume account, associate your resume content with your email, and transmit transactional account notifications.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Zero Selling or Commercial Transfer:</strong> We <strong>never sell, rent, monetize, or transfer</strong> Google user data to data brokers, advertising networks, or third-party marketing services under any circumstances.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">No Advertising Use:</strong> Data received from Google APIs is never used to serve personalized, targeted, or retargeted advertisements.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">No Generalized AI Model Training on Google Data:</strong> Information received through Google APIs is <strong>never used to train, retrain, fine-tune, or improve generalized Artificial Intelligence (AI) or Machine Learning (ML) models</strong>.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Human Access Restrictions:</strong> No human personnel at AIResume or Morigrid Labs reads or inspects your Google user data unless: (1) you have granted explicit consent for troubleshooting, (2) it is required to investigate security incidents or platform abuse, or (3) required to comply with applicable law.
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2 mt-4">
            <h5 className="font-semibold text-white text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-lime-400" /> Revocation of Google Permissions & Data Deletion
            </h5>
            <p className="text-xs text-white/70">
              You can revoke AIResume&apos;s access to your Google account at any time by visiting{' '}
              <a 
                href="https://myaccount.google.com/permissions" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-lime-400 underline hover:text-lime-300 inline-flex items-center gap-1"
              >
                Google Security & Permissions <ExternalLink className="w-3 h-3 inline" />
              </a>
              . Furthermore, you may request permanent deletion of your account and all associated Google user data at any time via your Account Settings or by emailing{' '}
              <a href="mailto:privacy@buildairesume.com" className="text-lime-400 underline">privacy@buildairesume.com</a>. Upon receipt, all stored Google user data is completely erased from our databases within 30 days.
            </p>
          </div>
        </div>
      </div>

      {/* 5. AI Processing & Generative Content Safeguards */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-lime-400 shrink-0" />
          5. AI Processing & Generative Content Safeguards
        </h3>
        <p>
          AIResume leverages advanced artificial intelligence models to assist you in writing compelling bullet points, analyzing job descriptions, calculating ATS compatibility, and tailoring your credentials.
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li>
            <strong>Zero Public Model Training:</strong> Your private resume content, personal identifiers, Google account details, and application notes are <em>never</em> used to train public generative AI foundation models.
          </li>
          <li>
            <strong>Zero-Data-Retention Enterprise APIs:</strong> AI inference is conducted strictly via enterprise API agreements featuring zero-data-retention compliance policies, meaning models do not retain your data after fulfilling the request.
          </li>
          <li>
            <strong>Candidate Factual Evidence Integrity:</strong> AI tailoring operates as an editor and summarizer of your factual Master CV. It is configured never to fabricate qualifications, employment history, or work authorizations.
          </li>
          <li>
            <strong>Full User Ownership:</strong> You retain complete intellectual property ownership and editorial control over all resume content generated, edited, or exported through the Service.
          </li>
        </ul>
      </div>

      {/* 6. Third-Party Sharing, Subprocessors & Zero-Sale Guarantee */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Users className="w-5 h-5 text-lime-400 shrink-0" />
          6. Third-Party Sharing, Subprocessors & Zero-Sale Guarantee
        </h3>
        <p>
          <strong>We do not sell, rent, or trade your personal data or resume records to data brokers, recruiters, or advertisers.</strong> We share your information only in the limited circumstances described below:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li>
            <strong>Hiring Employers & Job Boards (Upon Your Request):</strong> When you manually trigger or authorize automated job applications, your tailored resume, contact details, and application answers are submitted directly to the employers or job boards hosting that listing.
          </li>
          <li>
            <strong>Cloud Infrastructure & Database Hosting:</strong> Encrypted hosting providers (such as VPS hosting and MongoDB cloud infrastructure) that store data subject to strict confidentiality and security agreements.
          </li>
          <li>
            <strong>Certified Payment Processors:</strong> Subscription payments are processed via certified, PCI-DSS Level 1 compliant gateways (such as Stripe, Razorpay, or Polar). We do not store raw credit card numbers on our servers.
          </li>
          <li>
            <strong>Transactional Email Services:</strong> Encrypted delivery services used exclusively to deliver verification codes, password resets, and critical account notices.
          </li>
          <li>
            <strong>Legal & Regulatory Authorities:</strong> Only when strictly required by a valid court order, subpoena, or applicable statutory law.
          </li>
        </ul>
      </div>

      {/* 7. Connected Job Search Accounts */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-lime-400 shrink-0" />
          7. Connected Job Search Accounts & External Portals
        </h3>
        <p>
          If you choose to link external job search accounts (such as Naukri, Indeed, or LinkedIn), AIResume uses these integrations solely to facilitate job discovery and perform automated application actions that you have explicitly enabled.
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li>
            <strong>Bank-Grade Encryption:</strong> All linked portal credentials and session cookies are secured using bank-grade AES-256-GCM encryption before storage.
          </li>
          <li>
            <strong>One-Click Disconnection:</strong> You can disconnect any linked portal account at any time through your Job Settings. Upon disconnection, stored authentication keys are permanently scrubbed from our active servers.
          </li>
          <li>
            <strong>No Credential Sharing:</strong> Your linked portal credentials are never shared with external recruiters, advertisers, or third parties.
          </li>
        </ul>
      </div>

      {/* 8. Data Security & Cryptographic Safeguards */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-lime-400 shrink-0" />
          8. Data Security & Cryptographic Safeguards
        </h3>
        <p>
          We employ multi-layered technical, physical, and administrative safeguards to protect your personal information against unauthorized access, loss, or alteration:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li>
            <strong>Encryption in Transit:</strong> All web traffic, API calls, and authentication flows are protected using modern Transport Layer Security (TLS 1.3 / HTTPS).
          </li>
          <li>
            <strong>Encryption at Rest:</strong> Sensitive candidate tokens, resume artifacts, and database collections are encrypted at rest with AES-256 algorithms.
          </li>
          <li>
            <strong>Secure Cookie Handling:</strong> Authentication cookies are marked with <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">Secure</code>, <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">HttpOnly</code>, and <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">SameSite=Lax</code> attributes to mitigate session hijacking and cross-site request forgery.
          </li>
          <li>
            <strong>Principle of Least Privilege:</strong> Server access is strictly restricted to authenticated operations staff with multi-factor authentication.
          </li>
        </ul>
      </div>

      {/* 9. Data Retention & Permanent Account Deletion */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Trash2 className="w-5 h-5 text-lime-400 shrink-0" />
          9. Data Retention & Account Deletion (Right to be Forgotten)
        </h3>
        <p>
          We retain your personal information, resumes, and application records only for as long as your account remains active or as required to fulfill the purposes set out in this policy.
        </p>
        <div className="space-y-3 pt-1">
          <h5 className="font-semibold text-white text-sm">How to Request Permanent Account Deletion:</h5>
          <ul className="list-disc list-inside space-y-2 text-white/75 text-sm sm:text-base ml-2">
            <li>
              <strong>Self-Service:</strong> You can initiate account deletion directly within your AIResume Dashboard under <em>Settings &gt; Account &gt; Delete Account</em>.
            </li>
            <li>
              <strong>Direct Request:</strong> You can submit a deletion request by emailing our privacy team at <a href="mailto:privacy@buildairesume.com" className="text-lime-400 underline">privacy@buildairesume.com</a> with the subject line &quot;Delete My Account&quot;.
            </li>
          </ul>
          <p className="text-sm text-white/75">
            <strong>What happens upon deletion:</strong> All personal data, Google account identifiers, tailored resume documents, application histories, and portal credentials are permanently wiped from our active databases within thirty (30) days. Encrypted backups are routinely overwritten in the ordinary course of business.
          </p>
        </div>
      </div>

      {/* 10. Your Rights Under Global Data Laws */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-lime-400 shrink-0" />
          10. Your Rights Under Global Data Protection Laws
        </h3>
        <p>
          Depending on your location (including the European Economic Area, United Kingdom, United States, and India), you hold statutory rights regarding your personal information:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li><strong>Right of Access & Portability:</strong> Obtain a structured, machine-readable export of all your resumes, profile data, and application tracking records.</li>
          <li><strong>Right of Rectification:</strong> Edit, update, or correct incomplete or inaccurate career history at any time.</li>
          <li><strong>Right of Erasure:</strong> Have your account and personal identifiers permanently removed.</li>
          <li><strong>Right to Restrict or Object:</strong> Pause automated job matching or revoke third-party authorizations (such as Google OAuth or job portal keys).</li>
          <li><strong>Non-Discrimination:</strong> We do not discriminate against any user for exercising their privacy rights.</li>
        </ul>
      </div>

      {/* 11. Contact Our Privacy Team */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Mail className="w-5 h-5 text-lime-400 shrink-0" />
          11. Contact Our Data Protection Officer
        </h3>
        <p>
          If you have questions, feedback, or requests regarding this Privacy Policy, our Google OAuth data practices, or would like to exercise your data rights, please contact our Data Protection Officer:
        </p>
        <div className="pt-2 text-sm text-white/80 space-y-1.5 bg-black/30 border border-white/5 rounded-xl p-4">
          <p><strong>Entity:</strong> Morigrid Labs (AIResume)</p>
          <p><strong>Primary Website:</strong> <a href="https://buildairesume.com" className="text-lime-400 underline">buildairesume.com</a></p>
          <p><strong>Privacy Inquiries & DPO Email:</strong> <a href="mailto:privacy@buildairesume.com" className="text-lime-400 underline">privacy@buildairesume.com</a></p>
          <p><strong>Legal & Compliance Desk:</strong> <a href="mailto:legal@buildairesume.com" className="text-lime-400 underline">legal@buildairesume.com</a></p>
          <p><strong>Support Center:</strong> <Link href="/legal#support" className="text-lime-400 underline hover:text-lime-300">Support Desk</Link></p>
        </div>
      </div>
    </div>
  );
}
