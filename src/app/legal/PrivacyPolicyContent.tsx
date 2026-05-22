'use client';

import React from 'react';
import { Shield, Lock, Eye, Database, Users, Globe, Mail, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';

const PrivacyPolicyContent: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Shield className="w-12 h-12 text-lime-400 mr-3" />
          <h2 className="text-4xl font-bold">Privacy Policy</h2>
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
          <Lock className="w-6 h-6 text-lime-400 mr-2" />
          Introduction
        </h3>
        <p className="text-white/80 leading-relaxed mb-4">
          At CVCircle ("we," "our," or "us"), a product of <strong>Morigrid Labs</strong>, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered CV creation and job application management platform.
        </p>
        <p className="text-white/80 leading-relaxed">
          By using CVCircle, you agree to the collection and use of information in accordance with this policy. This policy complies with global data protection standards, including GDPR (General Data Protection Regulation), CCPA (California Consumer Privacy Act), and India's Digital Personal Data Protection Act 2023. If you do not agree with our policies and practices, please do not use our service.
        </p>
      </div>

      {/* Information We Collect */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Database className="w-6 h-6 text-lime-400 mr-2" />
          Information We Collect
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Personal Information</h4>
            <p className="text-white/80 mb-3">We collect the following personal data when you use our service:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Name, email address, and contact information</li>
              <li>Professional information (work experience, education, skills, certifications)</li>
              <li>CV content, cover letters, and job application data stored in our secure database</li>
              <li>Job application tracking and career journey analytics</li>
              <li>Payment and billing information (processed securely through Polar.sh)</li>
              <li>Authentication data (NextAuth.js session tokens and Firebase authentication)</li>
              <li>User preferences, settings, and template selections</li>
              <li>Email verification status and security tokens</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Usage Information</h4>
            <p className="text-white/80 mb-3">We automatically collect usage data to improve our service:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>IP address, device information, and browser type</li>
              <li>Pages visited, time spent, and features used</li>
              <li>CV creation, editing, and export activities</li>
              <li>AI usage patterns and optimization requests</li>
              <li>Error logs and performance metrics</li>
              <li>Session data and authentication activity</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Cookies and Tracking Technologies</h4>
            <p className="text-white/80 mb-3">
              We use cookies and similar tracking technologies to enhance your experience. For detailed information about our cookie usage, please see our{' '}
              <Link href="/legal#cookies" className="text-lime-400 hover:text-lime-300 underline">
                Cookie Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* How We Use Your Information */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Eye className="w-6 h-6 text-lime-400 mr-2" />
          How We Use Your Information
        </h3>
        
        <div className="grid tablet:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-xl font-medium text-lime-400">Service Provision</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Create, manage, and store your CVs and cover letters</li>
              <li>Provide AI-powered CV optimization and content suggestions</li>
              <li>Track job applications and provide career analytics</li>
              <li>Process payments and manage subscriptions (Day Pass, Monthly, Quarterly, Yearly plans)</li>
              <li>Send email verifications and account notifications</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xl font-medium text-lime-400">Improvement & Analytics</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80">
              <li>Improve our platform functionality and user experience</li>
              <li>Analyze usage patterns and feature adoption</li>
              <li>Develop new features and AI capabilities</li>
              <li>Provide customer support and technical assistance</li>
              <li>Monitor service performance and security</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Information Sharing */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Users className="w-6 h-6 text-lime-400 mr-2" />
          Information Sharing and Disclosure
        </h3>
        
        <p className="text-white/80 mb-4">
          We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
        </p>

        <ul className="list-disc list-inside space-y-3 text-white/80 ml-4">
          <li><strong>Service Providers:</strong> We share information with trusted third-party service providers who assist us in operating our platform:
            <ul className="list-disc list-inside space-y-1 ml-6 mt-2">
              <li><strong>Payment Processors:</strong> Polar.sh for secure payment processing</li>
              <li><strong>Cloud Storage:</strong> AWS S3 for secure document storage</li>
              <li><strong>AI Services:</strong> OpenAI for CV optimization and content generation</li>
              <li><strong>Email Services:</strong> Hostinger SMTP for transactional emails</li>
              <li><strong>Analytics:</strong> Google Analytics for usage analysis (with anonymization)</li>
            </ul>
          </li>
          <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government regulation, including compliance with India's DPDP Act 2023, GDPR, and CCPA.</li>
          <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction by Morigrid Labs.</li>
          <li><strong>Safety and Security:</strong> We may share information to protect the safety and security of our users, platform, or the public, including fraud prevention.</li>
        </ul>
      </div>

      {/* Data Security */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Shield className="w-6 h-6 text-lime-400 mr-2" />
          Data Security and Storage
        </h3>
        
        <p className="text-white/80 mb-4">
          We implement industry-standard security measures to protect your personal information:
        </p>

        <ul className="list-disc list-inside space-y-3 text-white/80 ml-4">
          <li>End-to-end encryption of data in transit (HTTPS/TLS) and at rest</li>
          <li>MongoDB database security with access controls and authentication</li>
          <li>NextAuth.js and Firebase authentication with secure session management</li>
          <li>JWT token-based session management with secure cookie settings</li>
          <li>CSRF protection and secure HTTP headers</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Secure data centers with physical and digital security measures</li>
          <li>Regular automated backups and disaster recovery procedures</li>
          <li>Email verification and multi-factor authentication options</li>
        </ul>

        <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            <strong>Important:</strong> While we implement robust security measures, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we continuously work to protect your data.
          </p>
        </div>
      </div>

      {/* Your Rights */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Globe className="w-6 h-6 text-lime-400 mr-2" />
          Your Rights and Choices
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Data Access and Control (GDPR, CCPA, DPDP Act)</h4>
            <p className="text-white/80 mb-3">You have the following rights regarding your personal data:</p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Right to Access:</strong> Request a copy of all personal data we hold about you</li>
              <li><strong>Right to Correction:</strong> Update or correct inaccurate personal information</li>
              <li><strong>Right to Deletion:</strong> Request deletion of your account and associated data ("Right to be Forgotten" under GDPR)</li>
              <li><strong>Right to Data Portability:</strong> Export your data in a machine-readable format (JSON, PDF)</li>
              <li><strong>Right to Opt-Out:</strong> Opt-out of marketing communications and non-essential data processing</li>
              <li><strong>Right to Object:</strong> Object to processing of your data for certain purposes</li>
              <li><strong>Right to Restrict Processing:</strong> Request limitation of data processing in certain circumstances</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Data Retention</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>We retain your data as long as your account is active and for 30 days after account deletion</li>
              <li>Some information may be retained for legal compliance (tax records, payment history) for up to 7 years</li>
              <li>CV and cover letter data is deleted within 30 days of account deletion request</li>
              <li>You can request immediate data deletion by contacting privacy@cvcircle.io</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">How to Exercise Your Rights</h4>
            <p className="text-white/80 mb-3">
              To exercise any of these rights, please contact us at <strong>privacy@cvcircle.io</strong> with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Your account email address</li>
              <li>Specific request (access, deletion, correction, etc.)</li>
              <li>Verification of your identity (for security purposes)</li>
            </ul>
            <p className="text-white/80 mt-3">
              We will respond to all requests within <strong>30 days</strong> as required by global data protection laws.
            </p>
          </div>
        </div>
      </div>

      {/* AI and Third-Party Services */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <FileText className="w-6 h-6 text-lime-400 mr-2" />
          AI Services and Third-Party Integrations
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">OpenAI Integration</h4>
            <p className="text-white/80 mb-3">
              We use OpenAI's API to provide AI-powered CV optimization, content generation, and ATS analysis. When you use these features:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Your CV content is sent to OpenAI for analysis and optimization</li>
              <li>OpenAI processes data according to their privacy policy and data processing terms</li>
              <li>We do not store your CV content on OpenAI's servers permanently</li>
              <li>You can opt-out of AI features and use manual editing if preferred</li>
              <li>AI-generated content should be reviewed before use in job applications</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Payment Processors</h4>
            <p className="text-white/80 mb-3">
              We use secure payment processors for subscription management:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Polar.sh</strong> securely processes all subscription payments (PCI-DSS compliant)</li>
              <li>Payment information is processed directly by these providers - we do not store full card details</li>
              <li>Billing information is stored securely for invoice generation</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Cloud Storage (AWS S3)</h4>
            <p className="text-white/80 mb-3">
              Your CV documents and exported files are stored securely on AWS S3:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>Files are encrypted at rest and in transit</li>
              <li>Access is restricted to authenticated users only</li>
              <li>Files are automatically deleted when you delete your account</li>
            </ul>
          </div>
        </div>
      </div>

      {/* International Transfers */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">International Data Transfers</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          Your information may be transferred to and processed in countries other than your own (including India, United States, and European Union). We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards, including:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
          <li>Standard Contractual Clauses (SCCs) for GDPR compliance</li>
          <li>Data Processing Agreements (DPAs) with all third-party processors</li>
          <li>Encryption and security measures during transfer</li>
        </ul>
      </div>

      {/* Children's Privacy */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Children's Privacy</h3>
        <p className="text-white/80 leading-relaxed">
          Our service is not intended for children under 13 years of age (or 16 in the EU). We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <strong>privacy@cvcircle.io</strong> and we will delete such information.
        </p>
      </div>

      {/* Changes to Policy */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          Morigrid Labs may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or for other operational reasons. We will notify you of any material changes by:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
          <li>Posting the new Privacy Policy on this page with an updated "Last updated" date</li>
          <li>Sending an email notification to registered users for significant changes</li>
          <li>Displaying a notice on our platform for 30 days after changes</li>
        </ul>
        <p className="text-white/80 leading-relaxed mt-4">
          Your continued use of our service after any changes constitutes acceptance of the updated Privacy Policy. If you do not agree with the changes, you may delete your account.
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Mail className="w-6 h-6 text-lime-400 mr-2" />
          Contact Us
        </h3>
        
        <p className="text-white/80 mb-4">
          If you have any questions about this Privacy Policy, wish to exercise your data rights, or have concerns about our data practices, please contact us:
        </p>

        <div className="space-y-3 text-white/80">
          <p><strong>Email:</strong> <a href="mailto:privacy@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">privacy@cvcircle.io</a></p>
          <p><strong>Subject Line:</strong> Privacy Policy Inquiry / Data Rights Request</p>
          <p><strong>Response Time:</strong> We aim to respond to all privacy-related inquiries within 48 hours and process data rights requests within 30 days as required by law.</p>
          <p><strong>Parent Company:</strong> Morigrid Labs</p>
        </div>

        <div className="mt-6 p-4 bg-lime-500/10 rounded-lg border border-lime-500/20">
          <p className="text-lime-400 text-sm text-center">
            © 2026 CVCircle by <strong>Morigrid Labs</strong>. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyContent;
