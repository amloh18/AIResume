'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, Users, Globe, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Logo from '@/components/ui/Logo';
import UserIcon from '@/components/ui/UserIcon';

const PrivacyPolicy: React.FC = () => {
  const { data: session, status } = useSession();

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
              <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookie-policy" className="text-white/60 hover:text-white transition-colors">
                Cookie Policy
              </Link>
              
              {/* User Authentication Section */}
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-white/20">
                {status === 'loading' ? (
                  <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
                ) : session?.user ? (
                  <UserIcon user={{
                    name: session.user.name || '',
                    email: session.user.email || '',
                    username: undefined,
                    profilePhoto: session.user.image
                  }} />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/sign-in"
                      className="px-4 py-2 text-white/80 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
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
              <Shield className="w-12 h-12 text-lime-400 mr-3" />
              <h1 className="text-4xl font-bold">Privacy Policy</h1>
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
              <Lock className="w-6 h-6 text-lime-400 mr-2" />
              Introduction
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              At CVCircle.io ("we," "our," or "us"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our CV creation and management platform.
            </p>
            <p className="text-white/80 leading-relaxed">
              By using CVCircle.io, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
            </p>
          </div>

          {/* Information We Collect */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Database className="w-6 h-6 text-lime-400 mr-2" />
              Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Personal Information</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Name, email address, and contact information</li>
                  <li>Professional information (work experience, education, skills)</li>
                  <li>CV content and cover letter data</li>
                  <li>Job application tracking information</li>
                  <li>Payment and billing information (for premium plans)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Usage Information</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent on our platform</li>
                  <li>Features used and interactions with our service</li>
                  <li>Error logs and performance data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Cookies and Tracking</h3>
                <p className="text-white/80 mb-3">
                  We use cookies and similar tracking technologies to enhance your experience and analyze usage patterns. For detailed information about our cookie usage, please see our{' '}
                  <Link href="/cookie-policy" className="text-lime-400 hover:text-lime-300 underline">
                    Cookie Policy
                  </Link>.
                </p>
              </div>
            </div>
          </div>

          {/* How We Use Your Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Eye className="w-6 h-6 text-lime-400 mr-2" />
              How We Use Your Information
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-lime-400">Service Provision</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Create and manage your CV and cover letters</li>
                  <li>Provide AI-powered CV optimization suggestions</li>
                  <li>Track job applications and provide analytics</li>
                  <li>Process payments and manage subscriptions</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-medium text-lime-400">Improvement & Analytics</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Improve our platform and user experience</li>
                  <li>Analyze usage patterns and trends</li>
                  <li>Develop new features and services</li>
                  <li>Provide customer support and assistance</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Information Sharing */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Users className="w-6 h-6 text-lime-400 mr-2" />
              Information Sharing and Disclosure
            </h2>
            
            <p className="text-white/80 mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>

            <ul className="list-disc list-inside space-y-3 text-white/80">
              <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform, processing payments, or providing customer support.</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government regulation.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</li>
              <li><strong>Safety and Security:</strong> We may share information to protect the safety and security of our users, platform, or the public.</li>
            </ul>
          </div>

          {/* Data Security */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Shield className="w-6 h-6 text-lime-400 mr-2" />
              Data Security
            </h2>
            
            <p className="text-white/80 mb-4">
              We implement industry-standard security measures to protect your personal information:
            </p>

            <ul className="list-disc list-inside space-y-3 text-white/80">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure data centers with physical and digital security</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>

            <p className="text-white/80 mt-4">
              However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </div>

          {/* Your Rights */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Globe className="w-6 h-6 text-lime-400 mr-2" />
              Your Rights and Choices
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-lime-400">Access and Control</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Access and update your personal information</li>
                  <li>Download your data in a portable format</li>
                  <li>Delete your account and associated data</li>
                  <li>Opt-out of marketing communications</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-medium text-lime-400">Data Retention</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>We retain your data as long as your account is active</li>
                  <li>Data is deleted within 30 days of account deletion</li>
                  <li>Some information may be retained for legal compliance</li>
                  <li>You can request data deletion at any time</li>
                </ul>
              </div>
            </div>
          </div>

          {/* International Transfers */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
            <p className="text-white/80 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
            </p>
          </div>

          {/* Children's Privacy */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-white/80 leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </p>
          </div>

          {/* Changes to Policy */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
            <p className="text-white/80 leading-relaxed">
              Your continued use of our service after any changes constitutes acceptance of the updated Privacy Policy.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Mail className="w-6 h-6 text-lime-400 mr-2" />
              Contact Us
            </h2>
            
            <p className="text-white/80 mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>

            <div className="space-y-2 text-white/80">
              <p><strong>Email:</strong> privacy@cvcircle.io</p>
              <p><strong>Address:</strong> CVCircle.io, Privacy Team</p>
              <p><strong>Response Time:</strong> We aim to respond to all privacy-related inquiries within 48 hours.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
