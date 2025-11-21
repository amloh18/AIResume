'use client';

import React from 'react';
import { HelpCircle, Mail, MessageCircle, Book, Search, Clock, CheckCircle, AlertCircle, FileText, CreditCard, Shield, Settings, Users, Zap } from 'lucide-react';
import Link from 'next/link';

const SupportContent: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <HelpCircle className="w-12 h-12 text-lime-400 mr-3" />
          <h2 className="text-4xl font-bold">Support Center</h2>
        </div>
        <p className="text-white/60 text-lg">
          Get help, find answers, and contact our support team
        </p>
      </div>

      {/* Quick Help */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Zap className="w-6 h-6 text-lime-400 mr-2" />
          Quick Help
        </h3>
        
        <div className="grid tablet:grid-cols-2 gap-4">
          <Link 
            href="/legal#terms" 
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all"
          >
            <FileText className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-1">Terms & Conditions</h4>
            <p className="text-white/60 text-sm">Read our terms of service</p>
          </Link>
          
          <Link 
            href="/legal#privacy" 
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all"
          >
            <Shield className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-1">Privacy Policy</h4>
            <p className="text-white/60 text-sm">Learn about data protection</p>
          </Link>
          
          <Link 
            href="/legal#cookies" 
            className="bg-white/5 hover:bg-white/10 rounded-lg p-4 border border-white/10 transition-all"
          >
            <Settings className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-1">Cookie Policy</h4>
            <p className="text-white/60 text-sm">Understand cookie usage</p>
          </Link>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <CreditCard className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-1">Billing & Subscriptions</h4>
            <p className="text-white/60 text-sm">Manage your subscription</p>
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Mail className="w-6 h-6 text-lime-400 mr-2" />
          Contact Support
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Email Support</h4>
            <p className="text-white/80 mb-4">
              For general inquiries, technical support, billing questions, or account assistance, please email us:
            </p>
            <div className="bg-lime-500/10 rounded-lg p-4 border border-lime-500/20">
              <p className="text-lime-400 font-medium mb-2">Primary Support Email:</p>
              <a 
                href="mailto:support@cvcircle.io" 
                className="text-2xl text-lime-400 hover:text-lime-300 underline"
              >
                support@cvcircle.io
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Response Times</h4>
            <div className="grid tablet:grid-cols-3 gap-4">
              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                <h5 className="font-medium mb-1 text-green-400">General Inquiries</h5>
                <p className="text-white/60 text-sm">Within 48 hours</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400 mb-2" />
                <h5 className="font-medium mb-1 text-blue-400">Technical Issues</h5>
                <p className="text-white/60 text-sm">Within 24 hours</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <AlertCircle className="w-5 h-5 text-amber-400 mb-2" />
                <h5 className="font-medium mb-1 text-amber-400">Urgent Matters</h5>
                <p className="text-white/60 text-sm">Within 12 hours</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">What to Include in Your Email</h4>
            <p className="text-white/80 mb-3">To help us assist you quickly, please include:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Your account email address</li>
              <li>Description of the issue or question</li>
              <li>Steps to reproduce the problem (if applicable)</li>
              <li>Screenshots or error messages (if applicable)</li>
              <li>Browser and device information (if technical issue)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Specialized Support */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Users className="w-6 h-6 text-lime-400 mr-2" />
          Specialized Support
        </h3>
        
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-medium mb-2 text-lime-400">Privacy & Data Protection</h4>
            <p className="text-white/80 mb-2">For privacy-related inquiries, data access requests, or GDPR/CCPA/DPDP Act questions:</p>
            <a href="mailto:privacy@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              privacy@cvcircle.io
            </a>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-medium mb-2 text-lime-400">Legal & Terms</h4>
            <p className="text-white/80 mb-2">For legal inquiries, terms of service questions, or dispute resolution:</p>
            <a href="mailto:legal@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              legal@cvcircle.io
            </a>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-medium mb-2 text-lime-400">Billing & Payments</h4>
            <p className="text-white/80 mb-2">For subscription questions, refund requests, or payment issues:</p>
            <a href="mailto:support@cvcircle.io?subject=Billing Inquiry" className="text-lime-400 hover:text-lime-300 underline">
              support@cvcircle.io
            </a>
            <p className="text-white/60 text-sm mt-2">(Subject: Billing Inquiry)</p>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-medium mb-2 text-lime-400">Business & Partnerships</h4>
            <p className="text-white/80 mb-2">For enterprise inquiries, partnerships, or business opportunities:</p>
            <a href="mailto:business@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              business@cvcircle.io
            </a>
          </div>
        </div>
      </div>

      {/* Common Questions */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Search className="w-6 h-6 text-lime-400 mr-2" />
          Frequently Asked Questions
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">How do I create a CV?</h4>
            <p className="text-white/80">
              After signing up, you'll be guided through our Master CV onboarding process. You can add your work experience, education, skills, and more. Our AI will help optimize your content for ATS compatibility.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">What subscription plans are available?</h4>
            <p className="text-white/80">
              We offer Free, Day Pass (24-hour access), Pro Monthly, Pro Quarterly, and Pro Yearly plans. Each plan includes different features and limits. Visit your dashboard settings to view and upgrade your plan.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">How do I cancel my subscription?</h4>
            <p className="text-white/80">
              You can cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. You'll retain access until the period ends.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Can I get a refund?</h4>
            <p className="text-white/80">
              We offer a 7-day money-back guarantee for Pro plans (Monthly, Quarterly, Yearly) if no documents have been exported. EU customers have a 14-day cooling-off period. Day Pass purchases are non-refundable once activated. Contact support@cvcircle.io for refund requests.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">How do I export my CV?</h4>
            <p className="text-white/80">
              In the CV Studio, click the "Export" button to download your CV in PDF, Word, or Web format. Export limits depend on your subscription plan.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Is my data secure?</h4>
            <p className="text-white/80">
              Yes, we use industry-standard encryption, secure authentication, and follow GDPR, CCPA, and India's DPDP Act 2023 compliance standards. Your data is encrypted in transit and at rest. See our Privacy Policy for more details.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">How does the ATS analyzer work?</h4>
            <p className="text-white/80">
              Our ATS analyzer evaluates your CV against job requirements, checking keyword matches, format compatibility, and content quality. It provides a score and actionable recommendations to improve your CV's ATS compatibility.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Can I delete my account?</h4>
            <p className="text-white/80">
              Yes, you can delete your account from your account settings. Your data will be permanently deleted within 30 days. You can export your data before deletion if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Resources */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Book className="w-6 h-6 text-lime-400 mr-2" />
          Helpful Resources
        </h3>
        
        <div className="grid tablet:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <FileText className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-2">Documentation</h4>
            <p className="text-white/60 text-sm mb-3">User guides and tutorials</p>
            <p className="text-white/40 text-xs">Coming soon</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <MessageCircle className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-2">Community Forum</h4>
            <p className="text-white/60 text-sm mb-3">Connect with other users</p>
            <p className="text-white/40 text-xs">Coming soon</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <Book className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-2">Video Tutorials</h4>
            <p className="text-white/60 text-sm mb-3">Step-by-step video guides</p>
            <p className="text-white/40 text-xs">Coming soon</p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <Search className="w-5 h-5 text-lime-400 mb-2" />
            <h4 className="font-medium mb-2">Knowledge Base</h4>
            <p className="text-white/60 text-sm mb-3">Searchable help articles</p>
            <p className="text-white/40 text-xs">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Settings className="w-6 h-6 text-lime-400 mr-2" />
          Account Management
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Access Your Account Settings</h4>
            <p className="text-white/80 mb-3">
              Manage your account, subscription, privacy settings, and preferences from your dashboard:
            </p>
            <Link 
              href="/dashboard/settings" 
              className="inline-flex items-center text-lime-400 hover:text-lime-300 underline"
            >
              Go to Settings →
            </Link>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Data Export</h4>
            <p className="text-white/80">
              You can export your CV data in JSON or PDF format. Contact support if you need assistance with data export.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Password Reset</h4>
            <p className="text-white/80">
              If you've forgotten your password, use the "Forgot Password" link on the sign-in page. You'll receive an email with reset instructions.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Mail className="w-6 h-6 text-lime-400 mr-2" />
          Get in Touch
        </h3>
        
        <div className="space-y-4 text-white/80">
          <div>
            <p className="mb-2"><strong>General Support:</strong></p>
            <a href="mailto:support@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              support@cvcircle.io
            </a>
          </div>

          <div>
            <p className="mb-2"><strong>Privacy & Data Protection:</strong></p>
            <a href="mailto:privacy@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              privacy@cvcircle.io
            </a>
          </div>

          <div>
            <p className="mb-2"><strong>Legal Inquiries:</strong></p>
            <a href="mailto:legal@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              legal@cvcircle.io
            </a>
          </div>

          <div>
            <p className="mb-2"><strong>Business & Partnerships:</strong></p>
            <a href="mailto:business@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">
              business@cvcircle.io
            </a>
          </div>

          <div className="mt-6 p-4 bg-lime-500/10 rounded-lg border border-lime-500/20">
            <p className="text-lime-400 text-sm">
              <Clock className="w-4 h-4 inline mr-2" />
              <strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours. For urgent matters, please mark your email as "Urgent" in the subject line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportContent;

