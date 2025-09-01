'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, CreditCard, Shield, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Logo size="md" className="text-white" />
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/privacy-policy" className="text-white/60 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/cookie-policy" className="text-white/60 hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Title */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-lime-400 mr-3" />
              <h1 className="text-4xl font-bold">Terms of Service</h1>
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
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Scale className="w-6 h-6 text-lime-400 mr-2" />
              Agreement to Terms
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              By accessing and using CVCircle.io ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
            <p className="text-white/80 leading-relaxed">
              These Terms of Service ("Terms") govern your use of our website and services operated by CVCircle.io ("Company," "we," "us," or "our").
            </p>
          </div>

          {/* Service Description */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <CheckCircle className="w-6 h-6 text-lime-400 mr-2" />
              Service Description
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              CVCircle.io provides a comprehensive CV creation and management platform that includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>AI-powered CV creation and optimization</li>
              <li>Professional CV templates and designs</li>
              <li>Cover letter creation and management</li>
              <li>Job application tracking and analytics</li>
              <li>ATS (Applicant Tracking System) optimization</li>
              <li>Career insights and recommendations</li>
            </ul>
          </div>

          {/* User Accounts */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Users className="w-6 h-6 text-lime-400 mr-2" />
              User Accounts and Registration
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Account Creation</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>You must be at least 13 years old to create an account</li>
                  <li>You must provide accurate and complete information</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You must notify us immediately of any unauthorized use</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Account Responsibilities</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>You are responsible for all activities under your account</li>
                  <li>You must not share your account credentials with others</li>
                  <li>You must not use the service for any illegal or unauthorized purpose</li>
                  <li>You must comply with all applicable laws and regulations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Subscription and Payment */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <CreditCard className="w-6 h-6 text-lime-400 mr-2" />
              Subscription Plans and Payment
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Available Plans</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li><strong>Free Plan:</strong> Basic CV creation with limited templates</li>
                  <li><strong>Pro Plan:</strong> Advanced features, unlimited CVs, AI optimization</li>
                  <li><strong>Enterprise Plan:</strong> Team collaboration and advanced analytics</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Payment Terms</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>All fees are charged in advance on a recurring basis</li>
                  <li>Prices are subject to change with 30 days notice</li>
                  <li>Failed payments may result in service suspension</li>
                  <li>Refunds are subject to our refund policy</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Cancellation</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>You may cancel your subscription at any time</li>
                  <li>Cancellation takes effect at the end of the current billing period</li>
                  <li>No refunds for partial billing periods</li>
                  <li>Your data will be retained according to our data retention policy</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 7-Day Return Policy */}
          <div className="bg-gradient-to-r from-lime-500/10 to-green-500/10 backdrop-blur-sm rounded-xl p-8 mb-8 border border-lime-500/20">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Clock className="w-6 h-6 text-lime-400 mr-2" />
              7-Day Return Policy for Pro Plans
            </h2>
            
            <div className="bg-white/5 rounded-lg p-6 mb-4">
              <h3 className="text-xl font-medium mb-4 text-lime-400">Return Policy Overview</h3>
              <p className="text-white/80 mb-4">
                We offer a 7-day money-back guarantee for Pro plan subscriptions, subject to the following conditions:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-medium mb-3 text-lime-400">Eligibility Requirements</h4>
                  <ul className="list-disc list-inside space-y-2 text-white/80">
                    <li>Request must be made within 7 days of initial purchase</li>
                    <li>No CV or cover letter documents have been exported/downloaded</li>
                    <li>Account must be in good standing</li>
                    <li>First-time Pro plan subscribers only</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg font-medium mb-3 text-lime-400">Non-Eligible Cases</h4>
                  <ul className="list-disc list-inside space-y-2 text-white/80">
                    <li>Any CV or cover letter has been exported</li>
                    <li>More than 7 days have passed since purchase</li>
                    <li>Previous refund requests for the same account</li>
                    <li>Violation of our Terms of Service</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-6">
              <h3 className="text-xl font-medium mb-4 text-lime-400">How to Request a Refund</h3>
              <ol className="list-decimal list-inside space-y-2 text-white/80">
                <li>Contact our support team at support@cvcircle.io</li>
                <li>Include your account email and reason for refund</li>
                <li>Provide the date of your Pro plan purchase</li>
                <li>Confirm that no documents have been exported</li>
                <li>We will review your request within 48 hours</li>
                <li>If approved, refund will be processed within 5-7 business days</li>
              </ol>
            </div>
          </div>

          {/* Acceptable Use */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Shield className="w-6 h-6 text-lime-400 mr-2" />
              Acceptable Use Policy
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Permitted Uses</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Creating and managing your own CV and cover letters</li>
                  <li>Using our templates and tools for legitimate job applications</li>
                  <li>Sharing your CV with potential employers</li>
                  <li>Using our analytics and tracking features</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Prohibited Uses</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Creating false or misleading information</li>
                  <li>Violating any applicable laws or regulations</li>
                  <li>Attempting to gain unauthorized access to our systems</li>
                  <li>Using the service for spam or harassment</li>
                  <li>Reselling or redistributing our content</li>
                  <li>Reverse engineering or copying our technology</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Intellectual Property */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Intellectual Property Rights</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Our Rights</h3>
                <p className="text-white/80 leading-relaxed">
                  The Service and its original content, features, and functionality are and will remain the exclusive property of CVCircle.io and its licensors. The Service is protected by copyright, trademark, and other laws.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Your Rights</h3>
                <p className="text-white/80 leading-relaxed">
                  You retain ownership of the content you create using our service. You grant us a limited license to use your content solely for the purpose of providing our services to you.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Templates and Designs</h3>
                <p className="text-white/80 leading-relaxed">
                  Our CV templates and designs are licensed for your personal use. You may not redistribute, sell, or modify our templates for commercial purposes without our written permission.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy and Data */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">Privacy and Data Protection</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Your privacy is important to us. Please review our{' '}
              <Link href="/privacy-policy" className="text-lime-400 hover:text-lime-300 underline">
                Privacy Policy
              </Link>{' '}
              which also governs your use of the Service, to understand our practices.
            </p>
          </div>

          {/* Disclaimers */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <AlertTriangle className="w-6 h-6 text-lime-400 mr-2" />
              Disclaimers and Limitations
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Service Availability</h3>
                <p className="text-white/80 leading-relaxed">
                  We strive to maintain high service availability but cannot guarantee uninterrupted access. We may temporarily suspend the service for maintenance or updates.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Job Application Success</h3>
                <p className="text-white/80 leading-relaxed">
                  While our tools are designed to improve your chances of success, we cannot guarantee job offers or interview invitations. Success depends on various factors beyond our control.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Limitation of Liability</h3>
                <p className="text-white/80 leading-relaxed">
                  In no event shall CVCircle.io be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                </p>
              </div>
            </div>
          </div>

          {/* Termination */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>
            <p className="text-white/80 leading-relaxed">
              If you wish to terminate your account, you may simply discontinue using the Service or contact us to delete your account.
            </p>
          </div>

          {/* Changes to Terms */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>
            <p className="text-white/80 leading-relaxed">
              What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
            <p className="text-white/80 mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2 text-white/80">
              <p><strong>Email:</strong> legal@cvcircle.io</p>
              <p><strong>Support:</strong> support@cvcircle.io</p>
              <p><strong>Address:</strong> CVCircle.io, Legal Department</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;
