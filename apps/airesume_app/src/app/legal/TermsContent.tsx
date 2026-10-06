'use client';

import React from 'react';
import { 
  FileText, 
  Scale, 
  CheckCircle2, 
  Shield, 
  AlertTriangle, 
  Clock, 
  Ban, 
  DollarSign, 
  Briefcase, 
  Zap, 
  Key, 
  ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

export default function TermsContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 text-white/85 leading-relaxed">
      {/* Title */}
      <div className="text-center pb-6 border-b border-white/10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 text-lime-400">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Terms of Service</h2>
        <p className="text-white/50 text-sm mt-2">
          Last Updated: October 6, 2026 · Morigrid Labs (AIResume) · buildairesume.com
        </p>
      </div>

      {/* 1. Agreement to Terms */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-lime-400 shrink-0" />
          1. Acceptance of Terms
        </h3>
        <p>
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;Candidate,&quot; or &quot;you&quot;) and <strong>Morigrid Labs</strong> (&quot;Company,&quot; &quot;AIResume,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) regarding your access to and use of the <strong>AIResume</strong> website (<a href="https://buildairesume.com" className="text-lime-400 underline hover:text-lime-300">buildairesume.com</a>), applications, AI resume creation tools, job search engines, third-party authentication services, and automated application workflows (collectively, the &quot;Platform&quot;).
        </p>
        <p>
          By creating an account, authenticating via Google Sign-In or email, accessing, or using the Platform, you affirm that you are at least 18 years of age and agree to be bound by these Terms and our <Link href="/privacy-policy" className="text-lime-400 underline hover:text-lime-300">Privacy Policy</Link>. If you do not agree to these Terms, you must immediately discontinue using AIResume.
        </p>
      </div>

      {/* 2. Platform Services & Capabilities */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-lime-400 shrink-0" />
          2. Platform Services & Core Capabilities
        </h3>
        <p>AIResume provides an integrated career acceleration workspace comprising:</p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li><strong>AI-Powered Resume & Cover Letter Suite:</strong> Master CV management, job-tailored resume generation, ATS scoring, metric-driven bullet point enhancements, and modern PDF formatting.</li>
          <li><strong>Job Discovery & Matching Engine:</strong> Aggregation and matching of career opportunities across thousands of employer career pages and supported job search portals.</li>
          <li><strong>Application Automation & Career Agent:</strong> Automated and semi-automated job application submission workflows designed to save time while strictly adhering to user preferences.</li>
          <li><strong>Application Journey Tracker:</strong> Real-time stage management, interview tracking, and candidate analytics.</li>
        </ul>
      </div>

      {/* 3. Third-Party Authentication & Google OAuth Services */}
      <div className="bg-gradient-to-br from-lime-950/20 via-white/[0.02] to-emerald-950/15 border border-lime-400/30 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Key className="w-5 h-5 text-lime-400 shrink-0" />
          3. Third-Party Authentication & Google OAuth Compliance
        </h3>
        <div className="space-y-3 text-sm sm:text-base text-white/80">
          <p>
            <strong>A. Google Sign-In Integration:</strong> Users may register or sign in to AIResume using Google OAuth 2.0 services. When using Google Sign-In, you authorize AIResume to access basic identity scopes (<code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">openid</code>, <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">profile</code>, and <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-lime-300">email</code>) strictly to verify your identity, provision your account, and manage communications.
          </p>
          <p>
            <strong>B. Google API Limited Use Adherence:</strong> AIResume expressly agrees to and complies with the{' '}
            <a 
              href="https://developers.google.com/terms/api-services-user-data-policy" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-lime-400 underline font-medium hover:text-lime-300 inline-flex items-center gap-1"
            >
              Google API Services User Data Policy <ExternalLink className="w-3.5 h-3.5 inline" />
            </a>
            , including the Limited Use requirements. Information received from Google APIs is never sold, never transferred to advertising networks, and <strong>never used to train, retrain, or improve generalized Artificial Intelligence (AI) or Machine Learning (ML) models</strong>.
          </p>
          <p>
            <strong>C. Account Ownership & Revocation:</strong> You represent that you are the lawful owner of any Google account used to access AIResume. You may revoke AIResume&apos;s access to your Google account at any time via{' '}
            <a 
              href="https://myaccount.google.com/permissions" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-lime-400 underline hover:text-lime-300 inline-flex items-center gap-1"
            >
              Google Account Permissions <ExternalLink className="w-3 h-3 inline" />
            </a>
            . For full details on Google user data collection, storage, and deletion, refer to Section 4 of our <Link href="/privacy-policy" className="text-lime-400 underline hover:text-lime-300">Privacy Policy</Link>.
          </p>
        </div>
      </div>

      {/* 4. Job Finding & Search Clauses */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-lime-400 shrink-0" />
          4. Job Discovery & Listings Clauses
        </h3>
        <div className="space-y-4 text-sm sm:text-base">
          <p>
            <strong>A. Nature of Listings:</strong> AIResume discovers and indexes employment opportunities published by third-party hiring organizations and job boards. AIResume is not an employer, recruiter, or staffing agency, and does not control the content, accuracy, requirements, compensation details, or hiring timelines of third-party job listings.
          </p>
          <p>
            <strong>B. Matching Algorithms:</strong> Our matching algorithms score job listings based on candidate-provided job titles, target locations, salary expectations, experience levels, and skills. Matches and compatibility scores are informational tools designed to assist prioritization and do not guarantee an interview or job offer.
          </p>
          <p>
            <strong>C. Employer Independence:</strong> Employers reserve the right to modify job requirements, alter compensation ranges, pause hiring, or close positions without prior notice. AIResume makes reasonable efforts to keep listings updated but does not warrant that all displayed listings remain actively open.
          </p>
        </div>
      </div>

      {/* 5. Application Automation & Auto-Apply Clauses */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-lime-400 shrink-0" />
          5. Application Automation & Auto-Apply Terms
        </h3>
        <div className="space-y-4 text-sm sm:text-base">
          <p>
            <strong>A. Candidate Authorization:</strong> When you enable Auto-Apply or use 1-Click Application features, you explicitly authorize AIResume to act as your authorized agent to: (i) format and tailor your resume and cover letter for the targeted position, (ii) populate required application fields using your provided career profile, and (iii) submit your application directly to the designated employer or job board on your behalf.
          </p>
          <p>
            <strong>B. Candidate Responsibility for Information Accuracy:</strong> You represent and warrant that all career history, qualifications, contact information, work authorizations, education, and credentials provided in your AIResume profile are accurate, truthful, and up to date. You are solely responsible for all information submitted to employers in your name.
          </p>
          <p>
            <strong>C. Application Modes & Control:</strong> You maintain full control over automation settings. You may select between:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-white/75 ml-4 text-sm">
            <li><em>Manual Review Mode:</em> AI prepares and stages tailored applications for your preview and manual approval before submission.</li>
            <li><em>Active Auto-Apply Mode:</em> AI automatically submits applications to matching roles within your explicit daily or monthly application limits.</li>
          </ul>
          <p>
            <strong>D. Plan Quotas & Rate Limiting:</strong> To safeguard candidate reputation and avoid automated spamming, application submissions are subject to plan entitlements (such as Starter plan limits of 10 applications per month, or Focused plan daily limits of up to 50 automated applications per day). Rate limits are strictly enforced.
          </p>
          <p>
            <strong>E. Connected Accounts & Portal Guidelines:</strong> If you connect external accounts (such as Naukri, Indeed, or LinkedIn), you represent that you hold valid credentials for those accounts and agree to comply with the respective terms of service of each platform.
          </p>
          <p>
            <strong>F. No Hiring Outcome Guarantee:</strong> AIResume provides productivity, optimization, and submission tools. We do not guarantee interview callbacks, assessments, or employment offers, as all hiring decisions are made exclusively by independent employers.
          </p>
        </div>
      </div>

      {/* 6. Subscriptions, Billing, Quotas & Cancellation */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <DollarSign className="w-5 h-5 text-lime-400 shrink-0" />
          6. Subscriptions, Billing & Cancellation
        </h3>
        <div className="space-y-3 text-sm sm:text-base">
          <p>
            <strong>A. Plan Tiers & Billing Cadences:</strong> AIResume offers free tier access and premium paid subscriptions (such as Starter and Focused plans) billed on either a monthly or annual cadence. Paid plans unlock higher application quotas, advanced AI tailoring, and automated submission features.
          </p>
          <p>
            <strong>B. Recurring Billing:</strong> Paid subscriptions automatically renew at the conclusion of each billing period unless cancelled prior to the renewal date. Payments are processed securely through certified third-party billing providers.
          </p>
          <p>
            <strong>C. Self-Service Cancellation:</strong> You may cancel your subscription at any time through your account Settings under Billing. Upon cancellation, you retain access to paid features until the end of your current prepaid billing cycle.
          </p>
          <p>
            <strong>D. Refund Policy:</strong> Except where required by applicable consumer protection laws, subscription fees are non-refundable once the billing cycle begins.
          </p>
        </div>
      </div>

      {/* 7. User Conduct & Prohibited Activities */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <Ban className="w-5 h-5 text-lime-400 shrink-0" />
          7. User Conduct & Prohibited Uses
        </h3>
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-2 text-white/75 ml-2 text-sm sm:text-base">
          <li>Submit fraudulent, forged, or misleading employment credentials or identities.</li>
          <li>Use the platform to distribute unsolicited spam, abusive content, or malicious scripts to employers.</li>
          <li>Attempt to reverse-engineer, decompile, or disrupt the security infrastructure of the Platform.</li>
          <li>Resell, sublicense, or commercialize AIResume services to third parties without prior written consent.</li>
        </ul>
      </div>

      {/* 8. Limitation of Liability & Disclaimers */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-lime-400 shrink-0" />
          8. Disclaimers & Limitation of Liability
        </h3>
        <p className="text-sm sm:text-base">
          AIResume is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. To the maximum extent permitted by law, Morigrid Labs disclaims all warranties, express or implied. In no event shall Morigrid Labs be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Platform or hiring outcomes.
        </p>
      </div>

      {/* 9. Contact Information */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0" />
          9. Contact & Legal Inquiries
        </h3>
        <p className="text-sm sm:text-base">
          For legal notices or questions regarding these Terms or our third-party authentication policies, please contact:
        </p>
        <div className="pt-2 text-sm text-white/80 space-y-1">
          <p><strong>Entity:</strong> Morigrid Labs (AIResume Legal)</p>
          <p><strong>Email:</strong> legal@buildairesume.com</p>
          <p><strong>Privacy & Compliance:</strong> privacy@buildairesume.com</p>
          <p><strong>Support:</strong> <Link href="/legal#support" className="text-lime-400 underline hover:text-lime-300">Support Desk</Link></p>
        </div>
      </div>
    </div>
  );
}
