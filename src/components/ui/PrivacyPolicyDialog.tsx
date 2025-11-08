'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';

interface PrivacyPolicyDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const PrivacyPolicyDialog: React.FC<PrivacyPolicyDialogProps> = ({
  isOpen,
  onAccept,
  onDecline
}) => {
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);

  const handleAccept = () => {
    if (hasReadPolicy && hasReadTerms) {
      onAccept();
    }
  };

  const canAccept = hasReadPolicy && hasReadTerms;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-lime-400 to-green-500 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Privacy Policy & Terms of Service
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Please review and accept our policies to continue
                    </p>
                  </div>
                </div>
                <button
                  onClick={onDecline}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Introduction */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Important Information
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Before creating your account, please read and accept our Privacy Policy and Terms of Service. 
                      These documents explain how we handle your data and the terms governing your use of CVCircle.
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy Links */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Privacy Policy
                    </h3>
                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      className="text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Learn how we collect, use, and protect your personal information.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setHasReadPolicy(!hasReadPolicy)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        hasReadPolicy
                          ? 'bg-lime-500 border-lime-500 text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {hasReadPolicy && <Check className="w-3 h-3" />}
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      I have read and understood the Privacy Policy
                    </span>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Terms of Service
                    </h3>
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Review the terms and conditions for using our service.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setHasReadTerms(!hasReadTerms)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        hasReadTerms
                          ? 'bg-lime-500 border-lime-500 text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {hasReadTerms && <Check className="w-3 h-3" />}
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      I have read and agree to the Terms of Service
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Points */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Key Points:
                </h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-lime-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>We collect and process your data to provide CV creation and management services</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-lime-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>Your CV content and personal information are protected with industry-standard security</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-lime-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>You can request data deletion and control your privacy settings at any time</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 bg-lime-500 rounded-full mt-2 flex-shrink-0"></span>
                    <span>We offer a 7-day return policy for Pro plans (if no documents are exported)</span>
                  </li>
                </ul>
              </div>

              {/* Contact Information */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Questions? Contact us at{' '}
                  <a
                    href="mailto:privacy@cvcircle.io"
                    className="text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300 underline"
                  >
                    privacy@cvcircle.io
                  </a>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={onDecline}
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!canAccept}
                  className={`px-6 py-2.5 rounded-lg transition-colors ${
                    canAccept
                      ? 'bg-lime-500 hover:bg-lime-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrivacyPolicyDialog;
