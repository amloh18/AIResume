'use client';

import React from 'react';
import { Cookie, Settings, Shield, Eye, BarChart3, Users, Globe, Clock, AlertTriangle, Mail, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

const CookiePolicyContent: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Cookie className="w-12 h-12 text-lime-400 mr-3" />
          <h2 className="text-4xl font-bold">Cookie Policy</h2>
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
          <Settings className="w-6 h-6 text-lime-400 mr-2" />
          What Are Cookies?
        </h3>
        <p className="text-white/80 leading-relaxed mb-4">
          Cookies are small text files that are placed on your device (computer, tablet, or mobile) when you visit our website. They help us provide you with a better experience by remembering your preferences, analyzing how you use our site, and personalizing content.
        </p>
        <p className="text-white/80 leading-relaxed mb-4">
          This Cookie Policy explains how CVCircle uses cookies and similar tracking technologies when you visit our website and how you can control them. This policy complies with GDPR, CCPA, and the ePrivacy Directive.
        </p>
        <div className="bg-lime-500/10 rounded-lg p-4 border border-lime-500/20">
          <p className="text-lime-400 text-sm">
            <strong>Important:</strong> By using our website, you consent to our use of cookies in accordance with this policy. You can manage your cookie preferences at any time through our cookie consent banner or browser settings.
          </p>
        </div>
      </div>

      {/* Types of Cookies */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Cookie className="w-6 h-6 text-lime-400 mr-2" />
          Types of Cookies We Use
        </h3>
        
        <div className="space-y-6">
          <div className="bg-green-500/10 rounded-lg p-6 border border-green-500/20">
            <div className="flex items-center mb-3">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <h4 className="text-xl font-medium text-green-400">Essential Cookies (Required)</h4>
            </div>
            <p className="text-white/80 mb-3">
              These cookies are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and form submissions. These cookies cannot be disabled as they are essential for the service to work.
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>next-auth.session-token:</strong> NextAuth.js session management cookie for user authentication</li>
              <li><strong>Firebase Authentication Cookies:</strong> Firebase session tokens for secure authentication</li>
              <li><strong>csrf-token:</strong> CSRF protection cookie to prevent cross-site request forgery attacks</li>
              <li><strong>User Session Cookies:</strong> Maintains your login session and preferences</li>
              <li><strong>Email Verification Tokens:</strong> Temporary tokens for email verification processes</li>
              <li><strong>Security Cookies:</strong> Access control and security-related cookies</li>
            </ul>
            <p className="text-white/60 text-sm mt-3">
              <strong>Duration:</strong> Session cookies (deleted when browser closes) or up to 30 days for persistent authentication
            </p>
          </div>

          <div className="bg-blue-500/10 rounded-lg p-6 border border-blue-500/20">
            <div className="flex items-center mb-3">
              <BarChart3 className="w-5 h-5 text-blue-400 mr-2" />
              <h4 className="text-xl font-medium text-blue-400">Performance Cookies (Analytics)</h4>
            </div>
            <p className="text-white/80 mb-3">
              These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This data helps us improve our service and user experience.
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Google Analytics Cookies:</strong> 
                <ul className="list-disc list-inside space-y-1 ml-6 mt-1">
                  <li>_ga: Distinguishes users (expires: 2 years)</li>
                  <li>_gid: Distinguishes users (expires: 24 hours)</li>
                  <li>_gat: Throttles request rate (expires: 1 minute)</li>
                </ul>
              </li>
              <li><strong>Page Load Time Tracking:</strong> Measures page performance and load times</li>
              <li><strong>Error Tracking:</strong> Monitors and logs errors for debugging and improvement</li>
              <li><strong>User Behavior Analysis:</strong> Tracks feature usage and user interactions (anonymized)</li>
            </ul>
            <p className="text-white/60 text-sm mt-3">
              <strong>Opt-Out:</strong> You can opt-out of Google Analytics using the{' '}
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Google Analytics Opt-out Browser Add-on
              </a>
            </p>
          </div>

          <div className="bg-purple-500/10 rounded-lg p-6 border border-purple-500/20">
            <div className="flex items-center mb-3">
              <Settings className="w-5 h-5 text-purple-400 mr-2" />
              <h4 className="text-xl font-medium text-purple-400">Functional Cookies (Preferences)</h4>
            </div>
            <p className="text-white/80 mb-3">
              These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings. These improve your experience but are not essential for the service to function.
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Theme Preferences:</strong> Remembers your dark/light mode preference</li>
              <li><strong>CV Template Preferences:</strong> Saves your favorite templates and design choices</li>
              <li><strong>User Interface Settings:</strong> Remembers dashboard layout and customization</li>
              <li><strong>Notification Preferences:</strong> Stores your notification settings</li>
              <li><strong>Onboarding Status:</strong> Tracks completion of setup wizards</li>
              <li><strong>Language Preferences:</strong> Remembers your language selection</li>
            </ul>
            <p className="text-white/60 text-sm mt-3">
              <strong>Duration:</strong> Up to 1 year or until you clear your browser cookies
            </p>
          </div>

          <div className="bg-orange-500/10 rounded-lg p-6 border border-orange-500/20">
            <div className="flex items-center mb-3">
              <Users className="w-5 h-5 text-orange-400 mr-2" />
              <h4 className="text-xl font-medium text-orange-400">Marketing Cookies (Optional)</h4>
            </div>
            <p className="text-white/80 mb-3">
              These cookies are used to track visitors across websites to display relevant and engaging advertisements. These cookies require your explicit consent and can be disabled.
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Social Media Integration Cookies:</strong> For sharing features and social login (Facebook, LinkedIn, Twitter)</li>
              <li><strong>Advertising Network Cookies:</strong> Third-party advertising cookies (if we use ad networks)</li>
              <li><strong>Retargeting Cookies:</strong> Cookies that help show relevant ads based on your browsing behavior</li>
              <li><strong>Conversion Tracking Cookies:</strong> Tracks conversions from marketing campaigns</li>
            </ul>
            <p className="text-white/60 text-sm mt-3">
              <strong>Opt-Out:</strong> You can opt-out through our cookie consent banner or use the{' '}
              <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
                Digital Advertising Alliance's opt-out tool
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Third-Party Cookies */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Globe className="w-6 h-6 text-lime-400 mr-2" />
          Third-Party Cookies
        </h3>
        
        <p className="text-white/80 mb-4">
          We use third-party services that may place cookies on your device. These services help us provide better functionality and analyze our website performance:
        </p>

        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Google Analytics</h4>
            <p className="text-white/80 mb-2">
              We use Google Analytics to understand how visitors use our website. Google Analytics uses cookies to collect information such as:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-4">
              <li>How often users visit our site</li>
              <li>What pages they visit</li>
              <li>What other sites they used prior to coming to our site</li>
              <li>Time spent on pages and user flow</li>
            </ul>
            <p className="text-white/60 text-sm mt-2">
              <strong>Privacy:</strong> Google Analytics data is anonymized and aggregated. We do not share personally identifiable information with Google. 
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 underline ml-1">
                Google Privacy Policy
              </a>
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Payment Processors</h4>
            <p className="text-white/80 mb-2">
              Our payment processors (Stripe and Razorpay) may use cookies to ensure secure payment processing and fraud prevention:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-4">
              <li><strong>Stripe:</strong> Uses cookies for payment security and fraud detection</li>
              <li><strong>Razorpay:</strong> Uses cookies for secure payment processing and session management</li>
            </ul>
            <p className="text-white/60 text-sm mt-2">
              <strong>Privacy:</strong> Payment processors handle data according to their privacy policies and PCI-DSS compliance standards.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium mb-2 text-lime-400">Social Media Platforms</h4>
            <p className="text-white/80 mb-2">
              Social media platforms may use cookies when you interact with social media features on our website, such as:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-4">
              <li>Social sharing buttons (Facebook, LinkedIn, Twitter)</li>
              <li>Social login options (Google OAuth, Facebook Login)</li>
              <li>Embedded social media content</li>
            </ul>
            <p className="text-white/60 text-sm mt-2">
              <strong>Privacy:</strong> These cookies are controlled by the respective social media platforms. Review their privacy policies for more information.
            </p>
          </div>
        </div>
      </div>

      {/* Cookie Duration */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Clock className="w-6 h-6 text-lime-400 mr-2" />
          Cookie Duration
        </h3>
        
        <div className="grid tablet:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Session Cookies</h4>
            <p className="text-white/80 mb-3">
              These cookies are temporary and are deleted when you close your browser. They are used to maintain your session while you browse our website.
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-4">
              <li>Authentication tokens</li>
              <li>Form data and temporary preferences</li>
              <li>Shopping cart information (if applicable)</li>
              <li>User session state</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Persistent Cookies</h4>
            <p className="text-white/80 mb-3">
              These cookies remain on your device for a set period or until you delete them. They help us remember your preferences and provide personalized experiences.
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 ml-4">
              <li>Language preferences (up to 1 year)</li>
              <li>Theme settings (up to 1 year)</li>
              <li>Analytics data (up to 2 years for Google Analytics)</li>
              <li>Marketing preferences (varies by provider)</li>
              <li>Authentication tokens (up to 30 days)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Managing Cookies */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Settings className="w-6 h-6 text-lime-400 mr-2" />
          Managing Your Cookie Preferences
        </h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Cookie Consent Banner</h4>
            <p className="text-white/80 mb-3">
              When you first visit our website, you'll see a cookie consent banner that allows you to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Accept All Cookies:</strong> Accept all cookies including analytics and marketing cookies</li>
              <li><strong>Customize Preferences:</strong> Choose which types of cookies to accept (essential cookies are always required)</li>
              <li><strong>Reject Non-Essential:</strong> Reject all cookies except essential ones</li>
              <li><strong>Learn More:</strong> Access detailed information about our cookie usage</li>
            </ul>
            <p className="text-white/60 text-sm mt-3">
              You can change your cookie preferences at any time by clicking the cookie settings link in our footer or clearing your browser cookies.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Browser Settings</h4>
            <p className="text-white/80 mb-3">
              You can control and manage cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>View and delete existing cookies</li>
              <li>Block cookies from specific websites</li>
              <li>Block all cookies (may break website functionality)</li>
              <li>Set preferences for different types of cookies</li>
              <li>Receive notifications when cookies are set</li>
            </ul>
            <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-blue-400 text-sm">
                <strong>Browser-Specific Instructions:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/60 text-sm mt-2 ml-4">
                <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Opt-Out Options</h4>
            <p className="text-white/80 mb-3">
              You can opt out of certain types of cookies through third-party tools:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li><strong>Google Analytics:</strong> Use the{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 underline">
                  Google Analytics Opt-out Browser Add-on
                </a>
              </li>
              <li><strong>Marketing Cookies:</strong> Use the{' '}
                <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 underline">
                  Digital Advertising Alliance's opt-out tool
                </a>
              </li>
              <li><strong>Social Media:</strong> Adjust your privacy settings on social media platforms (Facebook, LinkedIn, Twitter)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Impact of Disabling Cookies */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <AlertTriangle className="w-6 h-6 text-lime-400 mr-2" />
          Impact of Disabling Cookies
        </h3>
        
        <p className="text-white/80 mb-4">
          While you can disable cookies, doing so may affect your experience on our website:
        </p>

        <div className="grid tablet:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">Essential Functions</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>You may not be able to log in to your account</li>
              <li>Some features may not work properly</li>
              <li>Your preferences may not be saved</li>
              <li>Security features may be compromised</li>
              <li>Form submissions may fail</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xl font-medium mb-3 text-lime-400">User Experience</h4>
            <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
              <li>You may need to re-enter information repeatedly</li>
              <li>Personalized content may not be available</li>
              <li>Some features may be limited or unavailable</li>
              <li>Performance may be affected</li>
              <li>Analytics and improvements may be hindered</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            <strong>Recommendation:</strong> We recommend allowing essential cookies for the best experience. You can disable non-essential cookies (analytics, marketing) without affecting core functionality.
          </p>
        </div>
      </div>

      {/* Do Not Track */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Do Not Track Signals</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          Some browsers include a "Do Not Track" (DNT) feature that signals to websites you visit that you do not want to have your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted.
        </p>
        <p className="text-white/80 leading-relaxed">
          We respect DNT signals and will not track users who have enabled DNT in their browsers, except for essential cookies required for service functionality. However, we may still collect anonymized usage data for service improvement purposes.
        </p>
      </div>

      {/* Updates to Policy */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-4">Updates to This Cookie Policy</h3>
        <p className="text-white/80 leading-relaxed mb-4">
          We may update this Cookie Policy from time to time to reflect changes in our practices, legal requirements, or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:
        </p>
        <ul className="list-disc list-inside space-y-2 text-white/80 ml-4">
          <li>Posting the updated policy on our website with an updated "Last updated" date</li>
          <li>Displaying a notice on our platform for significant changes</li>
          <li>Sending an email notification to registered users for major updates</li>
        </ul>
        <p className="text-white/80 leading-relaxed mt-4">
          Your continued use of our website after any changes constitutes acceptance of the updated Cookie Policy. If you do not agree with the changes, you may adjust your cookie preferences or stop using our service.
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
        <h3 className="text-2xl font-semibold mb-6 flex items-center">
          <Mail className="w-6 h-6 text-lime-400 mr-2" />
          Contact Us
        </h3>
        
        <p className="text-white/80 mb-4">
          If you have any questions about our use of cookies or this Cookie Policy, please contact us:
        </p>

        <div className="space-y-2 text-white/80">
          <p><strong>Email:</strong> <a href="mailto:privacy@cvcircle.io" className="text-lime-400 hover:text-lime-300 underline">privacy@cvcircle.io</a></p>
          <p><strong>Subject Line:</strong> Cookie Policy Inquiry</p>
          <p><strong>Response Time:</strong> We aim to respond to all cookie-related inquiries within 48 hours.</p>
        </div>

        <div className="mt-6 p-4 bg-lime-500/10 rounded-lg border border-lime-500/20">
          <p className="text-lime-400 text-sm">
            <strong>Note:</strong> For more information about our data practices, please review our{' '}
            <Link href="/legal#privacy" className="underline hover:text-lime-300">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/legal#terms" className="underline hover:text-lime-300">
              Terms of Service
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyContent;

