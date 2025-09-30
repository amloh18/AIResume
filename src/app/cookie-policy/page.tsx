'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cookie, Settings, Shield, Eye, BarChart3, Users, Globe, Clock, AlertTriangle, Mail } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Logo from '@/components/ui/Logo';

const CookiePolicy: React.FC = () => {
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
              <Link href="/privacy-policy" className="text-white/60 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                Terms of Service
              </Link>
              
              {/* User Authentication Section */}
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-white/20">
                {status === 'loading' ? (
                  <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
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
              <Cookie className="w-12 h-12 text-lime-400 mr-3" />
              <h1 className="text-4xl font-bold">Cookie Policy</h1>
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
              <Settings className="w-6 h-6 text-lime-400 mr-2" />
              What Are Cookies?
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences, analyzing how you use our site, and personalizing content.
            </p>
            <p className="text-white/80 leading-relaxed">
              This Cookie Policy explains how CVCircle.io uses cookies and similar technologies when you visit our website and how you can control them.
            </p>
          </div>

          {/* Types of Cookies */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Cookie className="w-6 h-6 text-lime-400 mr-2" />
              Types of Cookies We Use
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Essential Cookies</h3>
                <p className="text-white/80 mb-3">
                  These cookies are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and form submissions.
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Authentication and security cookies</li>
                  <li>Session management cookies</li>
                  <li>Load balancing cookies</li>
                  <li>User interface customization cookies</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Performance Cookies</h3>
                <p className="text-white/80 mb-3">
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Google Analytics cookies</li>
                  <li>Page load time tracking</li>
                  <li>Error tracking and monitoring</li>
                  <li>User behavior analysis</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Functional Cookies</h3>
                <p className="text-white/80 mb-3">
                  These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Language preference cookies</li>
                  <li>Theme and layout preferences</li>
                  <li>CV template preferences</li>
                  <li>User interface settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Marketing Cookies</h3>
                <p className="text-white/80 mb-3">
                  These cookies are used to track visitors across websites to display relevant and engaging advertisements.
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Social media integration cookies</li>
                  <li>Advertising network cookies</li>
                  <li>Retargeting cookies</li>
                  <li>Conversion tracking cookies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Third-Party Cookies */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Globe className="w-6 h-6 text-lime-400 mr-2" />
              Third-Party Cookies
            </h2>
            
            <p className="text-white/80 mb-4">
              We use third-party services that may place cookies on your device. These services help us provide better functionality and analyze our website performance:
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2 text-lime-400">Google Analytics</h3>
                <p className="text-white/80">
                  We use Google Analytics to understand how visitors use our website. Google Analytics uses cookies to collect information such as how often users visit our site, what pages they visit, and what other sites they used prior to coming to our site.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-lime-400">Payment Processors</h3>
                <p className="text-white/80">
                  Our payment processors (Stripe, Razorpay) may use cookies to ensure secure payment processing and fraud prevention.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-lime-400">Social Media</h3>
                <p className="text-white/80">
                  Social media platforms may use cookies when you interact with social media features on our website, such as sharing buttons or login options.
                </p>
              </div>
            </div>
          </div>

          {/* Cookie Duration */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Clock className="w-6 h-6 text-lime-400 mr-2" />
              Cookie Duration
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Session Cookies</h3>
                <p className="text-white/80 mb-3">
                  These cookies are temporary and are deleted when you close your browser. They are used to maintain your session while you browse our website.
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/80">
                  <li>Authentication tokens</li>
                  <li>Shopping cart information</li>
                  <li>Form data</li>
                  <li>User preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Persistent Cookies</h3>
                <p className="text-white/80 mb-3">
                  These cookies remain on your device for a set period or until you delete them. They help us remember your preferences and provide personalized experiences.
                </p>
                <ul className="list-disc list-inside space-y-1 text-white/80">
                  <li>Language preferences</li>
                  <li>Theme settings</li>
                  <li>Analytics data</li>
                  <li>Marketing preferences</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Managing Cookies */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Settings className="w-6 h-6 text-lime-400 mr-2" />
              Managing Your Cookie Preferences
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Browser Settings</h3>
                <p className="text-white/80 mb-3">
                  You can control and manage cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>View and delete existing cookies</li>
                  <li>Block cookies from specific websites</li>
                  <li>Block all cookies</li>
                  <li>Set preferences for different types of cookies</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Cookie Consent</h3>
                <p className="text-white/80 mb-3">
                  When you first visit our website, you'll see a cookie consent banner that allows you to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Accept all cookies</li>
                  <li>Customize your cookie preferences</li>
                  <li>Reject non-essential cookies</li>
                  <li>Learn more about our cookie usage</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Opt-Out Options</h3>
                <p className="text-white/80 mb-3">
                  You can opt out of certain types of cookies:
                </p>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>Google Analytics: Use the Google Analytics Opt-out Browser Add-on</li>
                  <li>Marketing cookies: Use the Digital Advertising Alliance's opt-out tool</li>
                  <li>Social media: Adjust your privacy settings on social media platforms</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Impact of Disabling Cookies */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <AlertTriangle className="w-6 h-6 text-lime-400 mr-2" />
              Impact of Disabling Cookies
            </h2>
            
            <p className="text-white/80 mb-4">
              While you can disable cookies, doing so may affect your experience on our website:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">Essential Functions</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>You may not be able to log in to your account</li>
                  <li>Some features may not work properly</li>
                  <li>Your preferences may not be saved</li>
                  <li>Security features may be compromised</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-3 text-lime-400">User Experience</h3>
                <ul className="list-disc list-inside space-y-2 text-white/80">
                  <li>You may need to re-enter information repeatedly</li>
                  <li>Personalized content may not be available</li>
                  <li>Some features may be limited</li>
                  <li>Performance may be affected</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Updates to Policy */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-4">Updates to This Cookie Policy</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.
            </p>
            <p className="text-white/80 leading-relaxed">
              Your continued use of our website after any changes constitutes acceptance of the updated Cookie Policy.
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <Mail className="w-6 h-6 text-lime-400 mr-2" />
              Contact Us
            </h2>
            
            <p className="text-white/80 mb-4">
              If you have any questions about our use of cookies or this Cookie Policy, please contact us:
            </p>

            <div className="space-y-2 text-white/80">
              <p><strong>Email:</strong> privacy@cvcircle.io</p>
              <p><strong>Subject:</strong> Cookie Policy Inquiry</p>
              <p><strong>Response Time:</strong> We aim to respond to all cookie-related inquiries within 48 hours.</p>
            </div>

            <div className="mt-6 p-4 bg-lime-500/10 rounded-lg border border-lime-500/20">
              <p className="text-lime-400 text-sm">
                <strong>Note:</strong> For more information about our data practices, please review our{' '}
                <Link href="/privacy-policy" className="underline hover:text-lime-300">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CookiePolicy;
