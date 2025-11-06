'use client';

import React from 'react';
import { FileText, Scale, CreditCard, Shield, Users, AlertTriangle, CheckCircle, Clock, XCircle, Ban } from 'lucide-react';
import Link from 'next/link';

const TermsContent: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <FileText className="w-12 h-12 text-lime-400 mr-3" />
          <h2 className="text-4xl font-bold">Terms of Service</h2>
        </div>
        <p className="text-white/60 text-lg">
          Last updated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Scale className="w-6 h-6 text-lime-400 mr-2" />
          Agreement to Terms
        </h3>
        <p className="text-white/80 leading-relaxed mb-4">
          By accessing and using CVCircle ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
        </p>
        <p className="text-white/80 leading-relaxed">
          These Terms of Service ("Terms") govern your use of our AI-powered CV creation and job application management platform operated by CVCircle ("Company," "we," "us," or "our"). These Terms constitute a legally binding agreement between you and CVCircle.
        </p>
      </div>

      {/* Service Description */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <CheckCircle className="w-6 h-6 text-lime-400 mr-2" />
          Service Description
        </h3>
        <p className="text-white/80 leading-relaxed mb-4">
          CVCircle provides a comprehensive CV creation and management platform that includes:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
          <li>AI-powered CV creation and optimization using OpenAI technology</li>
          <li>Professional CV templates with real-time editing capabilities</li>
          <li>Cover letter creation and management with AI assistance</li>
          <li>Job application tracking and career journey analytics</li>
          <li>ATS (Applicant Tracking System) optimization and scoring</li>
          <li>Email verification and secure user authentication systems</li>
          <li>Multi-format CV export (PDF, Word, Web formats)</li>
          <li>Version control and CV revision tracking</li>
          <li>Career insights and job matching recommendations</li>
          <li>Chrome extension for job board integration</li>
        </ul>
      </div>

      {/* User Accounts */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Users className="w-6 h-6 text-lime-400 mr-2" />
          User Accounts and Registration
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Account Creation</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>You must be at least 13 years old (or 16 in the EU) to create an account</li>
              <li>You must provide accurate, current, and complete information during registration</li>
              <li>You are responsible for maintaining the security and confidentiality of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access or use of your account</li>
              <li>You may not create multiple accounts to circumvent subscription limits</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Account Responsibilities</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must not share your account credentials with others</li>
              <li>You must not use the service for any illegal or unauthorized purpose</li>
              <li>You must comply with all applicable laws and regulations in your jurisdiction</li>
              <li>You must ensure the accuracy of information in your CVs and cover letters</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Subscription and Payment */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <CreditCard className="w-6 h-6 text-lime-400 mr-2" />
          Subscription Plans and Payment
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Available Plans</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Free Plan:</strong> Basic CV creation with limited templates and features</li>
              <li><strong>Day Pass:</strong> 24-hour access to all Pro features (one-time payment)</li>
              <li><strong>Pro Monthly:</strong> Full access to all features with monthly billing</li>
              <li><strong>Pro Quarterly:</strong> Full access with quarterly billing (discounted rate)</li>
              <li><strong>Pro Yearly:</strong> Full access with annual billing (best value)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Payment Terms</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>All fees are charged in advance on a recurring basis (for monthly/quarterly/yearly plans)</li>
              <li>Day Pass is a one-time payment valid for 24 hours from activation</li>
              <li>Prices are displayed in your local currency (INR, USD, EUR, GBP) based on regional pricing</li>
              <li>Prices are subject to change with 30 days written notice to existing subscribers</li>
              <li>Failed payments may result in service suspension until payment is resolved</li>
              <li>Payment processing is handled securely by Stripe (international) and Razorpay (India)</li>
              <li>Refunds are subject to our Refund and Cancellation Policy (see below)</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Cancellation</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>You may cancel your subscription at any time from your account settings</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds for partial billing periods (you retain access until period ends)</li>
              <li>Day Pass cannot be cancelled once activated</li>
              <li>Your data will be retained according to our data retention policy (30 days after cancellation)</li>
              <li>You can export your data before cancellation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refund Policy */}
      <div className="bg-gradient-to-r from-lime-500/10 to-green-500/10 backdrop-blur-sm rounded-xl p-8 mb-8 border border-lime-500/20">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Clock className="w-6 h-6 text-lime-400 mr-2" />
          Refund and Cancellation Policy
        </h3>
        
        <div className="bg-white/5 rounded-lg p-6 mb-4">
          <h4 className="text-xl font-medium mb-4 text-lime-400">7-Day Money-Back Guarantee (Pro Plans Only)</h4>
          <p className="text-white/80 mb-4">
            We offer a 7-day money-back guarantee for Pro plan subscriptions (Monthly, Quarterly, Yearly), subject to the following conditions:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-lg font-medium mb-3 text-lime-400">Eligibility Requirements</h5>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li>Request must be made within 7 days of initial purchase</li>
                <li>No CV or cover letter documents have been exported/downloaded</li>
                <li>Account must be in good standing (no Terms violations)</li>
                <li>First-time Pro plan subscribers only (one refund per user)</li>
              </ul>
            </div>

            <div>
              <h5 className="text-lg font-medium mb-3 text-lime-400">Non-Eligible Cases</h5>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li>Any CV or cover letter has been exported</li>
                <li>More than 7 days have passed since purchase</li>
                <li>Previous refund requests for the same account</li>
                <li>Violation of our Terms of Service</li>
                <li>Day Pass purchases (non-refundable once activated)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-6 mb-4">
          <h4 className="text-xl font-medium mb-4 text-lime-400">EU Consumer Rights (14-Day Cooling-Off Period)</h4>
          <p className="text-white/80 mb-3">
            For customers in the European Union, you have the right to cancel your subscription within 14 days of purchase without giving any reason, in accordance with the EU Consumer Rights Directive.
          </p>
          <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
            <li>14-day cooling-off period applies to EU customers</li>
            <li>Refund will be processed within 14 business days</li>
            <li>Same eligibility requirements apply (no exports, good standing)</li>
          </ul>
        </div>

        <div className="bg-white/5 rounded-lg p-6">
          <h4 className="text-xl font-medium mb-4 text-lime-400">How to Request a Refund</h4>
          <ol className="list-decimal list-inside space-y-2 text-white/80 ml-4">
            <li>Contact our support team at <strong>support@cvcircle.io</strong></li>
            <li>Include your account email and reason for refund</li>
            <li>Provide the date of your Pro plan purchase</li>
            <li>Confirm that no documents have been exported</li>
            <li>We will review your request within 48 hours</li>
            <li>If approved, refund will be processed within 5-7 business days (14 days for EU customers)</li>
            <li>Refund will be issued to the original payment method</li>
          </ol>
        </div>
      </div>

      {/* Acceptable Use */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Shield className="w-6 h-6 text-lime-400 mr-2" />
          Acceptable Use Policy
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Permitted Uses</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Creating and managing your own CV and cover letters for legitimate job applications</li>
              <li>Using our templates and tools for personal career development</li>
              <li>Sharing your CV with potential employers and recruiters</li>
              <li>Using our analytics and tracking features to manage job applications</li>
              <li>Exporting CVs in supported formats (PDF, Word, Web) for job applications</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Prohibited Uses</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Creating false, misleading, or fraudulent information in CVs</li>
              <li>Violating any applicable laws, regulations, or third-party rights</li>
              <li>Attempting to gain unauthorized access to our systems, databases, or other users' accounts</li>
              <li>Using the service for spam, harassment, or any malicious activities</li>
              <li>Reselling, redistributing, or commercializing our templates, designs, or content</li>
              <li>Reverse engineering, copying, or attempting to extract our proprietary technology</li>
              <li>Using automated scripts, bots, or scrapers to access our service</li>
              <li>Circumventing subscription limits or payment systems</li>
              <li>Uploading malicious code, viruses, or harmful content</li>
            </ul>
          </div>

          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <h5 className="text-lg font-medium mb-2 text-red-400 flex items-center">
              <Ban className="w-5 h-5 mr-2" />
              Account Termination
            </h5>
            <p className="text-white/80 text-sm">
              Violation of these prohibited uses may result in immediate account suspension or termination without refund. We reserve the right to investigate and take legal action against any misuse of our service.
            </p>
          </div>
        </div>
      </div>

      {/* Intellectual Property */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6">Intellectual Property Rights</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Our Rights</h4>
            <p className="text-white/80 leading-relaxed mb-3">
              The Service and its original content, features, and functionality are and will remain the exclusive property of CVCircle and its licensors. The Service is protected by copyright, trademark, and other laws. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>CV templates, designs, and layouts</li>
              <li>Software code, algorithms, and AI models</li>
              <li>Brand names, logos, and trademarks</li>
              <li>Documentation, guides, and educational content</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Your Rights</h4>
            <p className="text-white/80 leading-relaxed mb-3">
              You retain full ownership of the content you create using our service (your CV data, work experience, education, etc.). You grant us a limited, non-exclusive license to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Use your content solely for the purpose of providing our services to you</li>
              <li>Store and process your content on our secure servers</li>
              <li>Generate AI-powered suggestions and optimizations based on your content</li>
            </ul>
            <p className="text-white/80 leading-relaxed mt-3">
              You may export, download, and use your CVs for any legitimate purpose, including job applications.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Templates and Designs</h4>
            <p className="text-white/80 leading-relaxed">
              Our CV templates and designs are licensed for your personal use only. You may not redistribute, sell, modify for commercial purposes, or create derivative works based on our templates without our written permission. You may use the templates to create your own CVs for job applications.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy and Data */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Privacy and Data Protection</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          Your privacy is important to us. Please review our{' '}
          <Link href="/legal#privacy" className="text-lime-400 hover:text-lime-300 underline">
            Privacy Policy
          </Link>{' '}
          which also governs your use of the Service, to understand our data collection, use, and protection practices.
        </p>
        <p className="text-white/80 leading-relaxed">
          By using our Service, you consent to the collection and use of your information as described in our Privacy Policy, which complies with GDPR, CCPA, and India's DPDP Act 2023.
        </p>
      </div>

      {/* Disclaimers */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <AlertTriangle className="w-6 h-6 text-lime-400 mr-2" />
          Disclaimers and Limitations
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Service Availability</h4>
            <p className="text-white/80 leading-relaxed">
              We strive to maintain high service availability (target: 99.9% uptime) but cannot guarantee uninterrupted access. We may temporarily suspend the service for maintenance, updates, or due to circumstances beyond our control. We are not liable for any downtime or service interruptions.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Job Application Success</h4>
            <p className="text-white/80 leading-relaxed mb-3">
              While our tools are designed to improve your chances of success through ATS optimization and professional formatting, we cannot guarantee:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Job offers or interview invitations</li>
              <li>Specific ATS scores or compatibility with all ATS systems</li>
              <li>Job placement or career advancement</li>
            </ul>
            <p className="text-white/80 leading-relaxed mt-3">
              Success depends on various factors beyond our control, including job market conditions, employer preferences, and your qualifications.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">ATS Scores</h4>
            <p className="text-white/80 leading-relaxed">
              Our ATS scores are estimates based on industry-standard algorithms and are not guarantees of compatibility. Different ATS systems use different parsing methods, and actual results may vary. You are responsible for reviewing and verifying your CV content before submission.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">AI-Generated Content</h4>
            <p className="text-white/80 leading-relaxed">
              AI-generated content, suggestions, and optimizations should be reviewed and verified by you before use. We are not responsible for inaccuracies, errors, or inappropriate content generated by AI. You are responsible for ensuring the accuracy and truthfulness of all information in your CVs.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Limitation of Liability</h4>
            <p className="text-white/80 leading-relaxed">
              To the maximum extent permitted by law, CVCircle shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use or inability to use the Service.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Third-Party Content</h4>
            <p className="text-white/80 leading-relaxed">
              We are not responsible for the content, accuracy, or availability of third-party job boards, websites, or services that you may access through our platform or Chrome extension.
            </p>
          </div>
        </div>
      </div>

      {/* Termination */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Termination</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Termination by Us</h4>
            <p className="text-white/80 leading-relaxed mb-3">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Breach of these Terms of Service</li>
              <li>Violation of our Acceptable Use Policy</li>
              <li>Fraudulent or illegal activity</li>
              <li>Non-payment of subscription fees</li>
              <li>Extended period of account inactivity</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Termination by You</h4>
            <p className="text-white/80 leading-relaxed">
              If you wish to terminate your account, you may simply discontinue using the Service or contact us at <strong>support@cvcircle.io</strong> to request account deletion. Your data will be retained for 30 days after deletion request, after which it will be permanently removed.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Effect of Termination</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Your right to use the Service will immediately cease</li>
              <li>All outstanding fees remain due and payable</li>
              <li>You may export your data before termination</li>
              <li>We will delete your data according to our data retention policy</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Changes to Terms */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Changes to Terms</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect by:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
          <li>Posting the updated Terms on this page with an updated "Last updated" date</li>
          <li>Sending an email notification to registered users</li>
          <li>Displaying a notice on our platform</li>
        </ul>
        <p className="text-white/80 leading-relaxed mt-4">
          What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree with the changes, you may terminate your account.
        </p>
      </div>

      {/* Governing Law */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Governing Law and Dispute Resolution</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Governing Law</h4>
            <p className="text-white/80 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. For users in the European Union, local consumer protection laws may also apply.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Dispute Resolution</h4>
            <p className="text-white/80 leading-relaxed mb-3">
              Any disputes arising out of or relating to these Terms or the Service shall be resolved through:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Informal Resolution:</strong> Contact us at <strong>legal@cvcircle.io</strong> to attempt to resolve the dispute amicably</li>
              <li><strong>Mediation:</strong> If informal resolution fails, disputes may be resolved through mediation</li>
              <li><strong>Arbitration:</strong> Disputes may be subject to binding arbitration in accordance with Indian arbitration laws</li>
              <li><strong>Court Proceedings:</strong> As a last resort, disputes may be brought before courts in India</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6">Contact Information</h3>
        <p className="text-white/80 mb-4">
          If you have any questions about these Terms of Service, please contact us:
        </p>
        <div className="space-y-2 text-white/80">
          <p><strong>Legal Inquiries:</strong> <a href="mailto:legal@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">legal@cvcircle.io</a></p>
          <p><strong>Support:</strong> <a href="mailto:support@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">support@cvcircle.io</a></p>
          <p><strong>General Inquiries:</strong> <a href="mailto:info@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">info@cvcircle.io</a></p>
          <p><strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours</p>
        </div>
      </div>
    </div>
  );
};

export default TermsContent;

