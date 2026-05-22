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
          By accessing and using CVCircle ("Service"), you accept and agree to be bound by the terms and provision of this agreement. CVCircle is a product of <strong>Morigrid Labs</strong>. If you do not agree to abide by the above, please do not use this service.
        </p>
        <p className="text-white/80 leading-relaxed">
          These Terms of Service ("Terms") govern your use of our AI-powered CV creation and job application management platform operated by <strong>Morigrid Labs</strong> ("Company," "we," "us," or "our"). These Terms constitute a legally binding agreement between you and Morigrid Labs.
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
              <li>Prices are displayed in your local currency based on regional pricing</li>
              <li>Prices are subject to change with 30 days written notice to existing subscribers</li>
              <li>Failed payments may result in service suspension until payment is resolved</li>
              <li>Payment processing is handled securely by Polar.sh</li>
              <li>Refunds are subject to our Refund and Cancellation Policy</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Cancellation</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>You may cancel your subscription at any time from your account settings</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>No refunds for partial billing periods</li>
              <li>Day Pass cannot be cancelled once activated</li>
              <li>Your data will be retained for 30 days after cancellation</li>
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
            Morigrid Labs offers a 7-day money-back guarantee for Pro plan subscriptions (Monthly, Quarterly, Yearly), subject to the following conditions:
          </p>
          
          <div className="grid tablet:grid-cols-2 gap-6">
            <div>
              <h5 className="text-lg font-medium mb-3 text-lime-400">Eligibility Requirements</h5>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li>Request must be made within 7 days of initial purchase</li>
                <li>No CV or cover letter documents have been exported/downloaded</li>
                <li>Account must be in good standing</li>
                <li>First-time Pro plan subscribers only</li>
              </ul>
            </div>

            <div>
              <h5 className="text-lg font-medium mb-3 text-lime-400">Non-Eligible Cases</h5>
              <ul className="list-disc list-inside space-y-2 text-white/80">
                <li>Any CV or cover letter has been exported</li>
                <li>More than 7 days have passed since purchase</li>
                <li>Previous refund requests for the same account</li>
                <li>Day Pass purchases are non-refundable</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-6">
          <h4 className="text-xl font-medium mb-4 text-lime-400">How to Request a Refund</h4>
          <ol className="list-decimal list-inside space-y-2 text-white/80 ml-4">
            <li>Contact our support team at <strong>support@cvcircle.io</strong></li>
            <li>Include your account email and reason for refund</li>
            <li>Provide the date of your Pro plan purchase</li>
            <li>Refund will be issued to the original payment method within 7-10 business days</li>
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
              <li>Creating and managing your own professional documents</li>
              <li>Using tools for legitimate career development</li>
              <li>Sharing CVs with recruiters and employers</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Prohibited Uses</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Creating fraudulent information</li>
              <li>Attempting to hack or scrap the platform</li>
              <li>Reselling templates or proprietary content</li>
              <li>Reverse engineering the AI models or software</li>
            </ul>
          </div>

          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <h5 className="text-lg font-medium mb-2 text-red-400 flex items-center">
              <Ban className="w-5 h-5 mr-2" />
              Account Termination
            </h5>
            <p className="text-white/80 text-sm">
              Violation of these terms may result in immediate termination of access by Morigrid Labs without refund.
            </p>
          </div>
        </div>
      </div>

      {/* Intellectual Property */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 text-lime-400">Intellectual Property Rights</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          All Service content, templates, designs, algorithms, and software are the exclusive property of <strong>Morigrid Labs</strong>.
        </p>
        <p className="text-white/80 leading-relaxed">
          You retain ownership of the personal content you input. You grant Morigrid Labs a license to process this data solely to provide the Service.
        </p>
      </div>

      {/* Disclaimers */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center text-lime-400">
          <AlertTriangle className="w-6 h-6 mr-2" />
          Disclaimers and Limitations
        </h3>
        <div className="space-y-4 text-white/80">
          <p><strong>No Guarantee of Employment:</strong> We do not guarantee job offers or interviews.</p>
          <p><strong>AI Content:</strong> Users must review and verify all AI-generated suggestions.</p>
          <p><strong>Limitation of Liability:</strong> Morigrid Labs is not liable for indirect or consequential damages arising from Service use.</p>
        </div>
      </div>

      {/* Governing Law */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4 text-lime-400">Governing Law</h3>
        <p className="text-white/80 leading-relaxed">
          These Terms are governed by the laws of <strong>England and Wales</strong>. Any disputes shall be subject to the exclusive jurisdiction of the courts in London, England.
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 text-lime-400">Contact Information</h3>
        <div className="space-y-2 text-white/80">
          <p><strong>Legal Inquiries:</strong> <a href="mailto:legal@cvcircle.io" className="text-lime-400 underline">legal@cvcircle.io</a></p>
          <p><strong>Support:</strong> <a href="mailto:support@cvcircle.io" className="text-lime-400 underline">support@cvcircle.io</a></p>
          <p><strong>Parent Company:</strong> Morigrid Labs</p>
        </div>

        <div className="mt-8 p-6 bg-lime-500/10 rounded-2xl border border-lime-500/20 text-center">
          <p className="text-lime-400 font-bold mb-2">© 2026 CVCircle by Morigrid Labs</p>
          <p className="text-white/60 text-sm italic">All rights reserved. Made with heart pulsing.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsContent;
