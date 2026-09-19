// @ts-nocheck
'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { usePricingPlans } from '@/lib/hooks/usePricingPlans';
import { useBillingData } from '@/lib/hooks/useBillingData';
import RouteGuard from '@/components/auth/RouteGuard';
import {
  User,
  Trash2,
  Shield,
  CreditCard,
  Gift,
  Link,
  Mail,
  Users,
  Bell,
  Settings,
  Download,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  CreditCard as CardIcon,
  FileText,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Loader2,
  Award,
  Star,
  ArrowRight,
  Globe
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import Pricing from '@/components/landing/Pricing';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import AddPaymentMethodModal from '@/components/payment/AddPaymentMethodModal';
// TwoFactorModal removed - 2FA not implemented yet
import CalendarSyncSettings from '@/components/settings/CalendarSyncSettings';
import { uploadToS3 } from '@/lib/utils/upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData } from '@/lib/hooks/useUserData';
import { getPlanLabel } from '@/lib/entitlements/catalog';
import toast from 'react-hot-toast';
import EmailConnectModal from '@/components/dashboard/jobs/EmailConnectModal';
import LoginSessions from '@/components/settings/LoginSessions';

const fetchSettingsUserData = async (): Promise<User> => {
  const response = await fetch('/api/user');
  if (!response.ok) {
    throw new Error('Failed to fetch user data');
  }

  const data = await response.json();
  if (!data.success || !data.user) {
    throw new Error(data.error || 'Failed to fetch user data');
  }

  return data.user;
};

// --- TYPES ---

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phone?: string;
  company?: string;
  role?: string;
  address?: string;
  profilePhoto?: string;
  timezone?: string;
  locale?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  displayName?: string;
  accountCreated?: string;
  lastLogin?: string;
  membershipStatus?: string;
  accountVerification?: string;
  languagePreference?: string;
  passwordLastChanged?: string;
  twoFactorAuth?: string;
  securityQuestions?: string;
  backupCodes?: string[];
  loginHistory?: any[];
  deviceManagement?: any[];
  privacySettings?: any;
  notificationPreferences?: any;
  billingAddress?: any;
  paymentMethods?: PaymentMethod[];
  invoices?: Invoice[];
  subscriptionHistory?: any[];
  referralCode?: string;
  referredBy?: string;
  referralStats?: any;
  connectedApps?: any[];
  apiKeys?: any[];
  webhooks?: any[];
  integrations?: any[];
  workspaceSettings?: any;
  teamMembers?: any[];
  permissions?: any[];
  roles?: any[];
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  avatar?: string;
  isEmailVerified?: boolean;
  settings?: {
    company?: string;
    address?: string;
    timezone?: string;
    languagePreference?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
  };
  subscription?: {
    planName: string;
    status: string;
    credits: number;
    endDate?: string;
    planKey?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  email?: string;
  accountName?: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  planName: string;
  billingCycle: string;
  paymentMethodType: string;
  paymentMethodLast4: string;
  paidAt?: string;
  dueDate?: string;
  description: string;
  createdAt: string;
}

// --- SKELETON LOADERS ---
// Skeleton components for better loading UX (no full-page spinners)

const AccountProfileSkeleton = () => (
  <div className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
    <div className="space-y-8">
      <div>
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Account & Profile</h3>
        <div className="mt-2 h-3 w-64 max-w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-24 h-24 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
          <div className="h-4 w-72 max-w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
          <div className="h-10 w-36 bg-gray-200 dark:bg-white/10 rounded-lg animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
            <div className="h-10 w-full bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-lg">
              <div className="h-full w-2/3 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SecuritySkeleton = () => (
  <div className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Security</h3>
        <div className="h-3 w-72 max-w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
      </div>
      <div className="space-y-4">
        {['Two-Factor Authentication', 'Change Password', 'Email Notifications', 'Push Notifications'].map((label) => (
          <div key={label} className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <div className="text-small font-medium text-gray-900 dark:text-white">{label}</div>
              <div className="h-3 w-64 max-w-full bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
            </div>
            <div className="w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse">
              <div className="w-5 h-5 bg-white rounded-full translate-x-0.5 mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MembershipSkeleton = () => (
  <div className="p-8">
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        ))}
      </div>
    </div>
  </div>
);

// Account & Profile Component
const AccountProfile = ({ user, onSave }: { user: User; onSave: (userData: User) => void }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    username: user.username || '',
    phone: user.phone || '',
    location: user.location || '',
    website: user.website || '',
    linkedin: user.linkedin || '',
    github: user.github || '',
    summary: user.summary || '',
    company: user.company || '',
    address: user.address || '',
    jobTitle: user.jobTitle || '',
    industry: user.industry || '',
    experience: user.experience || 'mid',
    timezone: user.settings?.timezone || 'UTC +07:00 - Asia / Jakarta',
    languagePreference: user.settings?.languagePreference || 'English',
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || '',
    nationality: user.nationality || '',
  });

  const [avatar, setAvatar] = useState(user.avatar || user.profilePhoto || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken'>('idle');
  const [usernameTimeout, setUsernameTimeout] = useState<NodeJS.Timeout | null>(null);

  // Email verification states
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (usernameTimeout) {
        clearTimeout(usernameTimeout);
      }
    };
  }, [usernameTimeout]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.trim() === '') {
      setUsernameStatus('idle');
      setUsernameError('');
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError('');

    try {
      const response = await fetch('/api/user/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.available) {
          setUsernameStatus('available');
          setUsernameError('');
        } else {
          setUsernameStatus('taken');
          setUsernameError('This username is already taken');
        }
      } else {
        setUsernameStatus('idle');
        setUsernameError('');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('idle');
      setUsernameError('');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const requestData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        avatar: avatar,
        phone: formData.phone,
        location: formData.location,
        website: formData.website,
        linkedin: formData.linkedin,
        github: formData.github,
        summary: formData.summary,
        company: formData.company,
        address: formData.address,
        jobTitle: formData.jobTitle,
        industry: formData.industry,
        experience: formData.experience,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        nationality: formData.nationality,
        settings: {
          timezone: formData.timezone,
          languagePreference: formData.languagePreference,
        }
      };

      console.log('Sending data:', requestData);

      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        setSaveStatus('success');
        setUsernameError('');
        onSave(result.user);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        if (result.error === 'Username is already taken') {
          setUsernameError('This username is already taken. Please choose another one.');
        } else {
          setUsernameError('');
        }
        console.error('Save failed:', result.error, result.details || '');
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (isSendingVerification) return;

    try {
      setIsSendingVerification(true);
      setVerificationMessage(null);

      console.log('🔍 Settings - Current user verification status:', user.isEmailVerified);
      console.log('🔍 Settings - Sending verification for email:', user.email);

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });

      const result = await response.json();
      console.log('🔍 Settings - API response:', result);

      if (result.success) {
        setVerificationMessage({
          type: 'success',
          text: 'Verification email sent! Please check your inbox.'
        });

        // Dispatch event to refresh user data across the app
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: { refreshUserData: true }
        }));
      } else {
        setVerificationMessage({
          type: 'error',
          text: result.message || 'Failed to send verification email'
        });
      }
    } catch (error) {
      setVerificationMessage({
        type: 'error',
        text: 'Failed to send verification email'
      });
    } finally {
      setIsSendingVerification(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
      <div className="space-y-8 min-w-0 max-w-full">
        {/* Avatar Section */}
        <div className="py-4 sm:py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-body sm:text-h3 font-semibold text-gray-900 dark:text-white mb-2">Avatar</h3>
              <p className="text-gray-600 dark:text-gray-300 text-small sm:text-small">
                Choose an image that best reflects your identity or brand.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-small mt-2">
                We only support .JPG, .JPEG, or .PNG file. 1 MB max.
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden mx-auto md:mx-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-gray-500 dark:text-gray-300" />
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsUploadingAvatar(true);
                      setUploadProgress(0);

                      try {
                        // Upload to S3
                        const result = await uploadToS3({
                          file,
                          uploadType: 'profile-picture',
                          onProgress: (progress) => {
                            setUploadProgress(progress);
                          },
                        });

                        if (result.success && result.publicUrl) {
                          setAvatar(result.publicUrl);
                        } else {
                          console.error('Upload failed:', result.error);
                          // Fallback to base64 preview if upload fails
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setAvatar(result);
                          };
                          reader.readAsDataURL(file);
                        }
                      } catch (error) {
                        console.error('Error uploading avatar:', error);
                        // Fallback to base64 preview
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          setAvatar(result);
                        };
                        reader.readAsDataURL(file);
                      } finally {
                        setIsUploadingAvatar(false);
                        setUploadProgress(0);
                      }
                    }
                  }}
                  className="hidden"
                  id="avatar-upload"
                  disabled={isUploadingAvatar}
                />
                <label
                  htmlFor="avatar-upload"
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-small font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-center ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {isUploadingAvatar ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Uploading... {uploadProgress}%
                    </div>
                  ) : (
                    'Upload Image'
                  )}
                </label>
                {avatar && !isUploadingAvatar && (
                  <button
                    onClick={() => setAvatar('')}
                    className="px-4 py-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-300 dark:border-gray-600 rounded-lg text-small font-medium"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Trash2 size={16} />
                      Delete
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-body sm:text-h3 font-semibold text-gray-900 dark:text-white">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-small sm:text-small font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 text-small sm:text-body border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-small sm:text-small font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 text-small sm:text-body border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-gray-100 dark:bg-[#232f1c]/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  {user.isEmailVerified && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
                <p className="text-small text-gray-500 dark:text-gray-400">
                  Email cannot be changed. Contact support if you need to update your email address.
                </p>

                {!user.isEmailVerified && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-small text-orange-600 dark:text-orange-400 font-medium">
                        Email Not Verified
                      </span>
                    </div>
                    <button
                      onClick={handleSendVerification}
                      disabled={isSendingVerification}
                      className="flex items-center gap-2 px-3 py-1.5 text-small bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingVerification ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      {isSendingVerification ? 'Sending...' : 'Verify Email'}
                    </button>
                  </div>
                )}

                {verificationMessage && (
                  <div className={`text-small px-3 py-2 rounded-md ${verificationMessage.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}>
                    {verificationMessage.text}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('username', value);
                    setUsernameError('');
                    setUsernameStatus('idle');

                    // Clear existing timeout
                    if (usernameTimeout) {
                      clearTimeout(usernameTimeout);
                    }

                    // Set new timeout for debounced check
                    const timeoutId = setTimeout(() => {
                      checkUsernameAvailability(value);
                    }, 500);

                    setUsernameTimeout(timeoutId);
                  }}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent ${usernameError ? 'border-red-500 dark:border-red-400' :
                    usernameStatus === 'available' ? 'border-green-500 dark:border-green-400' :
                      'border-gray-300 dark:border-lime-500/20'
                    }`}
                  placeholder="Choose a unique username"
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lime-500"></div>
                  </div>
                )}
                {!isCheckingUsername && usernameStatus === 'available' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              {usernameError && (
                <p className="mt-1 text-small text-red-600 dark:text-red-400">{usernameError}</p>
              )}
              {usernameStatus === 'available' && !usernameError && (
                <p className="mt-1 text-small text-green-600 dark:text-green-400">Username is available</p>
              )}
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub
              </label>
              <input
                type="url"
                value={formData.github}
                onChange={(e) => handleInputChange('github', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="https://github.com/yourusername"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="e.g. Senior Software Engineer"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="e.g. Technology"
              />
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experience Level
              </label>
              <select
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="executive">Executive</option>
              </select>
            </div>
          </div>

          {/* Professional Summary */}
          <div>
            <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
              Professional Summary
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Tell us about your background, experience, and career goals..."
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Preferences</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={formData.languagePreference}
                onChange={(e) => handleInputChange('languagePreference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>

            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              >
                <option value="UTC +07:00 - Asia / Jakarta">UTC +07:00 - Asia / Jakarta</option>
                <option value="UTC -05:00 - America / New York">UTC -05:00 - America / New York</option>
                <option value="UTC +00:00 - Europe / London">UTC +00:00 - Europe / London</option>
                <option value="UTC +08:00 - Asia / Singapore">UTC +08:00 - Asia / Singapore</option>
              </select>
            </div>
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-3">
          <button className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${saveStatus === 'success'
              ? 'bg-green-500 text-white'
              : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white shadow-lg hover:shadow-xl'
              } ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : saveStatus === 'success' ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Saved!
              </>
            ) : saveStatus === 'error' ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Error
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Security & Notifications Component
const SecurityAndNotifications = ({ user }: { user: User }) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dailySummaryEmail, setDailySummaryEmail] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Integrations States
  const [emailSyncConnected, setEmailSyncConnected] = useState(false);
  const [emailSyncAddress, setEmailSyncAddress] = useState('');
  const [emailSyncProvider, setEmailSyncProvider] = useState<'gmail' | 'outlook' | 'imap'>('gmail');
  const [emailConnecting, setEmailConnecting] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const [isEmailConnectModalOpen, setIsEmailConnectModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'email' | 'calendar'>('email');

  const handleModalConnected = (data: { provider: string; emailAddress: string; syncStatus: string }) => {
    if (data.provider === 'calendar' || data.provider === 'google') {
      fetchCalendarSettings();
    } else {
      fetchEmailSyncStatus();
    }
  };

  const [calendarSettings, setCalendarSettings] = useState<any>({
    connected: false,
    provider: 'google',
    syncEnabled: false,
    syncSettings: {
      includeInterviews: true,
      includeFollowUps: true,
      includeDeadlines: true,
      reminderMinutes: 60,
      colorCoding: true,
    }
  });
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // 2FA State
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSessionId, setTwoFactorSessionId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  
  // Password prompt for disabling 2FA
  const [showDisableTwoFactorPrompt, setShowDisableTwoFactorPrompt] = useState(false);
  const [disableTwoFactorPassword, setDisableTwoFactorPassword] = useState('');

  // Password change form state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const isSocialLogin = ['google', 'apple', 'nextauth'].includes(user?.authProvider?.toLowerCase() || '');

  const fetchEmailSyncStatus = async () => {
    try {
      const response = await fetch('/api/tracker/emails/sync');
      const data = await response.json();
      if (data.success) {
        setEmailSyncConnected(data.connected);
        setEmailSyncAddress(data.emailAddress || '');
        setEmailSyncProvider(data.provider || 'gmail');
      }
    } catch (error) {
      console.error('Error fetching email sync status:', error);
    }
  };

  const fetchCalendarSettings = async () => {
    try {
      const response = await fetch('/api/user/settings');
      const data = await response.json();
      if (data.success && data.data?.settings?.advanced?.integrations?.calendar) {
        setCalendarSettings(data.data.settings.advanced.integrations.calendar);
      }
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    }
  };

  // Load initial settings from user data
  useEffect(() => {
    if (user?.settings?.notifications) {
      setEmailNotifications(user.settings.notifications.email?.enabled ?? true);
      setPushNotifications(user.settings.notifications.push?.enabled ?? true);
      setDailySummaryEmail(user.settings.notifications.email?.dailySummary ?? true);
    }
    
    // Fetch security settings
    const fetchSecuritySettings = async () => {
      try {
        const response = await fetch('/api/user/settings/security');
        const data = await response.json();
        if (data.success && data.data) {
          setTwoFactorEnabled(data.data.twoFactorEnabled ?? false);
        }
      } catch (error) {
        console.error('Error fetching security settings:', error);
      }
    };
    
    fetchSecuritySettings();
    fetchEmailSyncStatus();
    fetchCalendarSettings();
  }, [user]);

  const showToastNotification = (type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast(message);
    }
  };

  const handleConnectCalendar = async () => {
    setCalendarConnecting(true);
    try {
      const response = await fetch('/api/calendar/auth');
      const data = await response.json();
      if (data.success) {
        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setCalendarConnecting(false);
            fetchCalendarSettings();
            showToastNotification('success', 'Calendar connection complete.');
          }
        }, 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setCalendarConnecting(false);
      showToastNotification('error', 'Failed to connect calendar');
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const updatedCalendar = {
        ...calendarSettings,
        connected: false,
        accessToken: undefined,
        refreshToken: undefined,
        syncEnabled: false,
      };
      await updateCalendarSettings(updatedCalendar);
      showToastNotification('success', 'Google Calendar disconnected.');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    }
  };

  const handleForceSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: calendarSettings.accessToken,
          refreshToken: calendarSettings.refreshToken,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showToastNotification('success', `Calendar synced: ${data.syncedCount || 0} applications updated.`);
      } else {
        showToastNotification('error', data.error || 'Failed to sync calendar');
      }
    } catch (error) {
      showToastNotification('error', 'Error syncing calendar');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const updateCalendarSettings = async (updatedCalendar: any) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            advanced: {
              integrations: {
                calendar: updatedCalendar
              }
            }
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setCalendarSettings(updatedCalendar);
      } else {
        showToastNotification('error', 'Failed to update calendar settings');
      }
    } catch (error) {
      console.error('Error updating calendar settings:', error);
      showToastNotification('error', 'Error updating calendar settings');
    }
  };

  const handleCalendarSettingToggle = async (key: string, value: any) => {
    const updated = {
      ...calendarSettings,
      [key]: value
    };
    await updateCalendarSettings(updated);
  };

  const handleCalendarSubsettingChange = async (key: string, value: any) => {
    const updated = {
      ...calendarSettings,
      syncSettings: {
        ...(calendarSettings.syncSettings || {}),
        [key]: value
      }
    };
    await updateCalendarSettings(updated);
  };

  const handleConnectEmail = async () => {
    if (!emailInput) return;
    setEmailConnecting(true);
    try {
      const response = await fetch('/api/tracker/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          provider: emailSyncProvider,
          emailAddress: emailInput
        })
      });
      const data = await response.json();
      if (data.success) {
        setEmailSyncConnected(true);
        setEmailSyncAddress(emailInput);
        setEmailInput('');
        showToastNotification('success', `Email tracking connected for ${emailInput}`);
      } else {
        showToastNotification('error', data.error || 'Failed to connect email');
      }
    } catch (error) {
      showToastNotification('error', 'Error connecting email');
    } finally {
      setEmailConnecting(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Are you sure you want to disconnect email tracking?')) return;
    setEmailConnecting(true);
    try {
      const response = await fetch('/api/tracker/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect'
        })
      });
      const data = await response.json();
      if (data.success) {
        setEmailSyncConnected(false);
        setEmailSyncAddress('');
        showToastNotification('success', 'Email tracking disconnected.');
      } else {
        showToastNotification('error', data.error || 'Failed to disconnect email');
      }
    } catch (error) {
      showToastNotification('error', 'Error disconnecting email');
    } finally {
      setEmailConnecting(false);
    }
  };

  const handleNotificationToggle = async (type: 'email' | 'push', value: boolean) => {
    if (type === 'email') {
      setEmailNotifications(value);
    } else {
      setPushNotifications(value);
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            detailedNotifications: {
              [type]: {
                enabled: value
              }
            }
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        showToastNotification('success', `${type === 'email' ? 'Email' : 'Push'} notifications ${value ? 'enabled' : 'disabled'}`);
      } else {
        // Revert on error
        if (type === 'email') {
          setEmailNotifications(!value);
        } else {
          setPushNotifications(!value);
        }
        showToastNotification('error', 'Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      // Revert on error
      if (type === 'email') {
        setEmailNotifications(!value);
      } else {
        setPushNotifications(!value);
      }
      showToastNotification('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDailySummaryToggle = async (value: boolean) => {
    setDailySummaryEmail(value);
    setSaving(true);
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            detailedNotifications: {
              email: {
                dailySummary: value
              }
            }
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        showToastNotification('success', `Daily summary email ${value ? 'enabled' : 'disabled'}`);
      } else {
        setDailySummaryEmail(!value);
        showToastNotification('error', 'Failed to update daily summary preference');
      }
    } catch (error) {
      console.error('Error updating daily summary:', error);
      setDailySummaryEmail(!value);
      showToastNotification('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordInputChange = (field: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    if (passwordErrors) setPasswordErrors(null);
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword) {
      return 'Please enter your current password';
    }
    if (!passwordForm.newPassword) {
      return 'Please enter a new password';
    }
    if (passwordForm.newPassword.length < 8) {
      return 'New password must be at least 8 characters long';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return 'New passwords do not match';
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return 'New password must be different from current password';
    }
    return null;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePasswordForm();
    if (validationError) {
      setPasswordErrors(validationError);
      return;
    }

    setPasswordLoading(true);
    setPasswordErrors(null);

    try {
      // PUT /api/user/settings/security with action 'changePassword'.
      // This previously POSTed to /api/user/change-password, which does not
      // exist on disk — so it 404'd, `response.json()` threw on the HTML error
      // body, and every attempt reported "Network error. Please try again."
      // while the password was never changed. The complete implementation
      // (verify current password, save, reset lockout, audit-log) already
      // lives in that route and is used by the 2FA flow below, so we call it
      // instead of adding a second copy of the same logic.
      const response = await fetch('/api/user/settings/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          data: {
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        showToastNotification('success', 'Password changed successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        // `message`, not `error` — that route's error envelope uses `message`.
        setPasswordErrors(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordErrors('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTwoFactorToggled = async () => {
    if (twoFactorEnabled) {
      // Prompt to disable 2FA
      if (isSocialLogin) {
        // Bypass password requirement for social logins
        await disableTwoFactor('');
      } else {
        setShowDisableTwoFactorPrompt(true);
      }
    } else {
      // Start enable 2FA flow
      setTwoFactorLoading(true);
      setTwoFactorError(null);
      try {
        const response = await fetch('/api/auth/two-factor/generate?setup=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email })
        });
        const data = await response.json();
        if (data.success) {
          setTwoFactorSessionId(data.sessionId);
          setShowTwoFactorSetup(true);
          showToastNotification('success', 'Verification code sent to your email');
        } else {
          showToastNotification('error', data.error || 'Failed to start 2FA setup');
        }
      } catch (error) {
        showToastNotification('error', 'Network error. Please try again.');
      } finally {
        setTwoFactorLoading(false);
      }
    }
  };

  const confirmEnableTwoFactor = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit code');
      return;
    }
    
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const response = await fetch('/api/user/settings/security/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: twoFactorSessionId, code: twoFactorCode })
      });
      const data = await response.json();
      if (data.success) {
        setTwoFactorEnabled(true);
        setShowTwoFactorSetup(false);
        setTwoFactorSessionId(null);
        setTwoFactorCode('');
        showToastNotification('success', 'Two-factor authentication enabled successfully!');
      } else {
        setTwoFactorError(data.error || 'Failed to verify code');
      }
    } catch (error) {
      setTwoFactorError('Network error. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const disableTwoFactor = async (password: string) => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const response = await fetch('/api/user/settings/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disableTwoFactor',
          data: { password }
        })
      });
      const data = await response.json();
      if (data.success) {
        setTwoFactorEnabled(false);
        setShowDisableTwoFactorPrompt(false);
        setDisableTwoFactorPassword('');
        showToastNotification('success', 'Two-factor authentication disabled');
      } else {
        setTwoFactorError(data.message || 'Failed to disable 2FA');
        if (showDisableTwoFactorPrompt) {
           showToastNotification('error', data.message || 'Failed to disable 2FA');
        }
      }
    } catch (error) {
      setTwoFactorError('Network error. Please try again.');
      if (showDisableTwoFactorPrompt) {
         showToastNotification('error', 'Network error. Please try again.');
      }
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
      <div className="space-y-8 min-w-0 max-w-full">
        {/* Security Section */}
        <div className="space-y-6">
          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Security</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-small font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-small text-gray-500 dark:text-gray-300">Add an extra layer of security to your account</div>
              </div>
              <button
                onClick={handleTwoFactorToggled}
                disabled={twoFactorLoading}
                className={`w-12 h-6 rounded-full transition-colors ${twoFactorEnabled ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'} ${twoFactorLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Inline Form to Enter 2FA Code */}
            {showTwoFactorSetup && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-small font-semibold text-gray-900 dark:text-white mb-2">Verify Your Email</h4>
                <p className="text-small text-gray-600 dark:text-gray-400 mb-4">
                    We've sent a 6-digit code to {user.email}. Enter it below to enable two-factor authentication.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => {
                      setTwoFactorCode(e.target.value.replace(/\D/g, ''));
                      setTwoFactorError(null);
                    }}
                    placeholder="000000"
                    className="w-32 px-3 py-2 text-center text-h3 tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                  <button
                    onClick={confirmEnableTwoFactor}
                    disabled={twoFactorLoading || twoFactorCode.length !== 6}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg font-medium text-small transition-colors disabled:opacity-50"
                  >
                    {twoFactorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                  <button
                    onClick={() => {
                      setShowTwoFactorSetup(false);
                      setTwoFactorSessionId(null);
                      setTwoFactorCode('');
                      setTwoFactorError(null);
                    }}
                    className="px-4 py-2 bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg font-medium text-small transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {twoFactorError && <p className="mt-2 text-small text-red-500">{twoFactorError}</p>}
              </div>
            )}

            {/* Inline Prompt for Disabling 2FA */}
            {showDisableTwoFactorPrompt && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-small font-semibold text-gray-900 dark:text-white mb-2">Disable Two-Factor Authentication</h4>
                <p className="text-small text-gray-600 dark:text-gray-400 mb-4">
                  Please enter your password to confirm you want to disable 2FA.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    value={disableTwoFactorPassword}
                    onChange={(e) => {
                      setDisableTwoFactorPassword(e.target.value);
                      setTwoFactorError(null);
                    }}
                    placeholder="Enter password"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => disableTwoFactor(disableTwoFactorPassword)}
                    disabled={twoFactorLoading || !disableTwoFactorPassword}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-small transition-colors disabled:opacity-50"
                  >
                    {twoFactorLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disable'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDisableTwoFactorPrompt(false);
                      setDisableTwoFactorPassword('');
                      setTwoFactorError(null);
                    }}
                    className="px-4 py-2 bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg font-medium text-small transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {twoFactorError && <p className="mt-2 text-small text-red-500">{twoFactorError}</p>}
              </div>
            )}

            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-small font-medium text-gray-900 dark:text-white">Change Password</div>
                  <div className="text-small text-gray-500 dark:text-gray-300">Update your account password</div>
                </div>
                {!isSocialLogin && (
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-small font-medium"
                  >
                    {showPasswordForm ? 'Cancel' : 'Change Password'}
                  </button>
                )}
              </div>

              {isSocialLogin ? (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-200 dark:border-gray-700/50">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-small text-gray-600 dark:text-gray-400">
                        Your account is linked via your provider. Password management is handled there.
                      </p>
                    </div>
                  </div>
                </div>
              ) : showPasswordForm && (
                <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-5 p-6 bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-h3 font-semibold text-white">Change Password</h4>
                  </div>

                  {/* Current Password */}
                  <div>
                    <label className="block text-white/80 text-small font-medium mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-white/80 text-small font-medium mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                        placeholder="Enter your new password"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordForm.newPassword && passwordForm.newPassword.length < 8 && (
                      <p className="mt-2 text-small text-red-400">Password must be at least 8 characters</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-white/80 text-small font-medium mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm your new password"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#013f2e] focus:bg-white/15 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                      <p className="mt-2 text-small text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  {/* Error Message */}
                  {passwordErrors && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-small text-red-300">{passwordErrors}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setPasswordErrors(null);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordLoading || passwordForm.newPassword.length < 8 || passwordForm.newPassword !== passwordForm.confirmPassword}
                      className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-[#013f2e]/10 text-[#013f2e] hover:bg-[#013f2e]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Login Sessions Section */}
        <div className="space-y-6">
          <LoginSessions />
        </div>

        {/* Notifications Section */}
        <div className="space-y-6">
          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Notifications</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-small font-medium text-gray-900 dark:text-white">Email Notifications</div>
                <div className="text-small text-gray-500 dark:text-gray-300">Receive updates via email</div>
              </div>
              <button
                onClick={() => handleNotificationToggle('email', !emailNotifications)}
                disabled={saving}
                className={`w-12 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-small font-medium text-gray-900 dark:text-white">Daily Summary Email</div>
                <div className="text-small text-gray-500 dark:text-gray-300">Receive a daily summary of your job search activity</div>
              </div>
              <button
                onClick={() => handleDailySummaryToggle(!dailySummaryEmail)}
                disabled={saving || !emailNotifications}
                className={`w-12 h-6 rounded-full transition-colors ${dailySummaryEmail && emailNotifications ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${saving || !emailNotifications ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${dailySummaryEmail && emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <div className="text-small font-medium text-gray-900 dark:text-white">Push Notifications</div>
                <div className="text-small text-gray-500 dark:text-gray-300">Receive push notifications in your browser</div>
              </div>
              <button
                onClick={() => handleNotificationToggle('push', !pushNotifications)}
                disabled={saving}
                className={`w-12 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${pushNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Integration Section */}
        <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-h3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Link className="h-5 w-5 text-lime-500" />
              Integration
            </h3>
            <p className="text-small text-gray-500 dark:text-gray-400 mt-1">
              Manage your linked email and calendar accounts for automated job application tracking.
            </p>
          </div>

          <div className="space-y-4">
            {/* Email Account Integration */}
            <div className="py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-small font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-500" />
                  Email Integration (Gmail / Outlook)
                </div>
                <div className="text-small text-gray-500 dark:text-gray-300 mt-1 max-w-xl">
                  Sync recruiter emails directly. When recruiter messages are matched, the job pipeline stage updates automatically.
                </div>
                {emailSyncConnected && (
                  <div className="text-small text-emerald-600 dark:text-emerald-400 font-semibold mt-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected to {emailSyncAddress} ({emailSyncProvider.toUpperCase()})
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {emailSyncConnected ? (
                  <button
                    onClick={handleDisconnectEmail}
                    disabled={emailConnecting}
                    className="px-4 py-2 border border-red-200 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-small font-medium transition duration-150 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setModalInitialTab('email');
                      setIsEmailConnectModalOpen(true);
                    }}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg text-small font-semibold transition"
                  >
                    Connect Email
                  </button>
                )}
              </div>
            </div>

            {/* Calendar Integration */}
            <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-small font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Calendar Sync (Google Calendar)
                </div>
                <div className="text-small text-gray-500 dark:text-gray-300 mt-1 max-w-xl">
                  Automatically synchronize job application deadlines, follow-up reminders, and scheduled recruiter interviews to your primary calendar.
                </div>
                {calendarSettings.connected && (
                  <div className="text-small text-blue-600 dark:text-blue-400 font-semibold mt-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Connected to Google Calendar
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {calendarSettings.connected ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleForceSyncCalendar}
                      disabled={syncingCalendar}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-small font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1.5"
                    >
                      {syncingCalendar ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Sync Now
                    </button>
                    <button
                      onClick={handleDisconnectCalendar}
                      className="px-4 py-2 border border-red-200 dark:border-red-950 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-small font-medium transition"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setModalInitialTab('calendar');
                      setIsEmailConnectModalOpen(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-small font-semibold transition"
                  >
                    Connect Calendar
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Calendar Settings */}
            {calendarSettings.connected && (
              <div className="mt-2 pl-4 border-l-2 border-lime-500/30 space-y-4 pt-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5">
                  <div className="space-y-0.5">
                    <div className="text-small font-medium text-gray-800 dark:text-gray-200">Enable Calendar Syncing</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Keep Google Calendar updated automatically</div>
                  </div>
                  <button
                    onClick={() => handleCalendarSettingToggle('syncEnabled', !calendarSettings.syncEnabled)}
                    className={`w-10 h-5 rounded-full transition-colors ${calendarSettings.syncEnabled ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${calendarSettings.syncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {calendarSettings.syncEnabled && (
                  <div className="space-y-3 pl-2">
                    <div className="text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sync Options</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-small font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calendarSettings.syncSettings?.includeInterviews ?? true}
                          onChange={(e) => handleCalendarSubsettingChange('includeInterviews', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-700 text-lime-600 focus:ring-lime-500 h-3.5 w-3.5"
                        />
                        Include Interviews
                      </label>
                      <label className="flex items-center gap-2 text-small font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calendarSettings.syncSettings?.includeFollowUps ?? true}
                          onChange={(e) => handleCalendarSubsettingChange('includeFollowUps', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-700 text-lime-600 focus:ring-lime-500 h-3.5 w-3.5"
                        />
                        Include Follow-ups
                      </label>
                      <label className="flex items-center gap-2 text-small font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calendarSettings.syncSettings?.includeDeadlines ?? true}
                          onChange={(e) => handleCalendarSubsettingChange('includeDeadlines', e.target.checked)}
                          className="rounded border-gray-300 dark:border-gray-700 text-lime-600 focus:ring-lime-500 h-3.5 w-3.5"
                        />
                        Include Deadlines
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <EmailConnectModal
        isOpen={isEmailConnectModalOpen}
        onClose={() => setIsEmailConnectModalOpen(false)}
        initialTab={modalInitialTab}
        onConnected={handleModalConnected}
      />
    </div>
  );
};

// Membership & Billing Component
const MembershipBilling = ({ user }: { user: User }) => {
  // Use consolidated billing data hook (fetches subscription, payment methods, invoices in parallel)
  const { data: billingData, isLoading: billingLoading, error: billingErrors, refetch: refetchBillingData } = useBillingData();

  // Get user data to access currentPlanKey
  const { userData } = useUserData();

  // Use the shared pricing hook - get full result to pass to modal
  const pricingHookResult = usePricingPlans({ excludeFree: true });

  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);

  // Toast notification state

  const showToastNotification = (type: 'success' | 'error' | 'info', message: string) => {
    // Notification removed
  };

  const handlePaymentMethodAdded = (paymentMethod: any) => {
    // Refresh billing data
    refetchBillingData();
    showToastNotification('success', 'Payment method added successfully!');
  };

  // Extract data from billing hook
  const subscription = billingData.subscription;
  const paymentMethods = billingData.paymentMethods;
  const invoices = billingData.invoices;
  const loading = billingLoading;
  const subscriptionError = billingErrors.subscription;
  const paymentMethodsError = billingErrors.paymentMethods;
  const invoicesError = billingErrors.invoices;

  // Determine the current plan key - use subscription planKey if available, otherwise use user's currentPlanKey
  const currentPlanKey = subscription?.planKey || userData?.currentPlanKey || 'free';
  // Map old billing keys to canonical plan labels
  const resolveCanonical = (key: string) => {
    if (key.includes('focused')) return 'focused';
    if (key.includes('starter')) return 'starter';
    return 'free';
  };
  const currentPlanName = subscription?.planName || getPlanLabel(resolveCanonical(currentPlanKey) as any);
  const currentPlanDetails = pricingHookResult.plans?.find((p: any) => p.key === currentPlanKey);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa': return '💳';
      case 'mastercard': return '💳';
      case 'amex': return '💳';
      default: return '💳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'text-green-600 dark:text-green-400';
      case 'pending': return 'text-yellow-600 dark:text-yellow-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
      <div className="space-y-8 min-w-0 max-w-full">

        {/* Plan Cards Section */}
        <div className="space-y-6">
          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Subscription Plans</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Current Plan Card */}
            {loading ? (
              <div className="glass-widget-premium p-4 relative animate-pulse h-full">
                <div className="absolute top-3 right-3">
                  <div className="h-5 w-16 bg-lime-300 dark:bg-lime-600 rounded-full"></div>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-lime-300 dark:bg-lime-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-lime-200 dark:bg-lime-700 rounded mb-1.5"></div>
                    <div className="h-3 w-20 bg-lime-200 dark:bg-lime-700 rounded"></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-lime-200 dark:bg-lime-700 rounded"></div>
                  <div className="h-3 w-2/3 bg-lime-200 dark:bg-lime-700 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="glass-widget-premium p-6 relative h-full flex flex-col justify-between">
                <div>
                  <div className="absolute top-4 right-4">
                    <span className="px-2.5 py-1 bg-lime-500/10 text-lime-600 dark:text-lime-400 border border-lime-500/20 text-small font-semibold rounded-full tracking-wide">
                      {subscription?.status || 'Active'}
                    </span>
                  </div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-600 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20 shrink-0">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-small text-gray-500 dark:text-gray-400 mb-0.5">Current Plan</p>
                      <p className="text-h2 font-bold text-gray-900 dark:text-white leading-tight">
                        {currentPlanName}
                      </p>
                    </div>
                  </div>
                  
                  {currentPlanDetails?.features && (
                    <ul className="space-y-2 mb-4">
                      {currentPlanDetails.features.slice(0, 3).map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-small text-gray-600 dark:text-gray-300">
                          <CheckCircle className="w-3.5 h-3.5 text-lime-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800/50">
                  {(() => {
                    const endDate = subscription?.currentPeriodEnd || subscription?.endDate;
                    if (!endDate) return null;

                    return (
                      <div className="flex justify-between items-center text-small">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" /> Renewal Date
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatDate(endDate)}</span>
                      </div>
                    );
                  })()}

                  {(() => {
                    const isFree = currentPlanKey === 'free';
                    const isStarter = currentPlanKey === 'starter_monthly';
                    
                    if (isFree) {
                      return (
                        <div className="flex justify-between items-center text-small">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" /> Price
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">Free (No Subscription)</span>
                        </div>
                      );
                    }

                    // Original/Gross price
                    let originalAmount = subscription?.amount;
                    if (!originalAmount || originalAmount === 0) {
                      const cycle = subscription?.billingCycle || (currentPlanKey.includes('yearly') ? 'yearly' : currentPlanKey.includes('quarterly') ? 'quarterly' : 'monthly');
                      if (cycle === 'yearly') originalAmount = currentPlanDetails?.price_yearly;
                      else if (cycle === 'quarterly') originalAmount = currentPlanDetails?.price_quarterly;
                      else originalAmount = currentPlanDetails?.price_monthly;
                    }
                    if (!originalAmount) {
                      originalAmount = currentPlanDetails?.price || 0;
                    }

                    const displayCurrency = subscription?.currency || 'USD';
                    const displayIntervalRaw = subscription?.billingCycle || (currentPlanKey.includes('yearly') ? 'yearly' : currentPlanKey.includes('quarterly') ? 'quarterly' : 'monthly');
                    const displayInterval = displayIntervalRaw === 'monthly' ? 'mo' : displayIntervalRaw === 'quarterly' ? '3months' : displayIntervalRaw === 'yearly' ? 'yr' : displayIntervalRaw;

                    // Discount/Effective price
                    const discountAmount = subscription?.discountAmount || 0;
                    const finalAmount = subscription?.finalAmount !== undefined ? subscription.finalAmount : originalAmount;
                    const hasDiscount = discountAmount > 0 && finalAmount < originalAmount;

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-small">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" /> Price
                          </span>
                          <div>
                            {hasDiscount ? (
                              <div className="flex items-center gap-2">
                                <span className="line-through text-small text-gray-400">
                                  {formatCurrency(originalAmount, displayCurrency)}
                                </span>
                                <span className="font-semibold text-green-600 dark:text-green-400">
                                  {formatCurrency(finalAmount, displayCurrency)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">/{displayInterval}</span>
                              </div>
                            ) : (
                              <div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(originalAmount, displayCurrency)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">/{displayInterval}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {hasDiscount && subscription?.endDate && (
                          <div className="text-[11px] text-right font-medium text-green-600 dark:text-green-400">
                            Discount active until {formatDate(subscription.endDate)}
                          </div>
                        )}

                        {isStarter && (
                          <p className="text-[10px] text-right font-medium text-indigo-600 dark:text-indigo-400">
                            Free Subscription ($0 invoices will be emailed to you)
                          </p>
                        )}
                      </div>
                    );
                  })()}


                </div>
              </div>
            )}

            {/* Change Plan Card / Upgrade Box */}
            {loading ? (
              <div className="glass-widget-premium p-6 animate-pulse h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-600 rounded-lg mt-auto"></div>
              </div>
            ) : (
              <div className="glass-widget-premium p-6 h-full flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-lime-400/20 to-lime-600/5 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                
                <div className="relative z-10 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800/80 rounded-lg flex items-center justify-center">
                      <Star className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div>
                      <h3 className="text-h3 font-bold text-gray-900 dark:text-white">
                        Upgrade Your Plan
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-small text-gray-600 dark:text-gray-300 mb-4">
                    Unlock premium features, priority support, and advanced AI-powered tools to accelerate your career.
                  </p>
                  
                  <ul className="space-y-2.5 mb-6">
                    {['Unlimited AI resume tailoring', 'Advanced cover letter generation', 'Priority support'].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-small text-gray-700 dark:text-gray-200">
                        <CheckCircle className="w-4 h-4 text-lime-500 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => {
                    setIsMembershipModalOpen(true);
                  }}
                  className="relative z-10 w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-small font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Upgrade Your Plan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Support & Assistant Section */}
        <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="glass-widget-premium p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-h3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                Need Help with Billing or Account?
              </h3>
              <p className="text-small text-gray-600 dark:text-gray-300">
                Ask Mori Assistant, our helpful virtual guide. Understand plans, ask about invoices, resolve account issues, or get in touch with our support teams.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('mori_assistant_active', 'true');
                window.dispatchEvent(new CustomEvent('mori-assistant-toggle', { detail: true }));
              }}
              className="py-2.5 px-6 bg-lime-500 hover:bg-lime-600 text-white font-semibold rounded-lg text-small transition-colors text-center shadow-lg shadow-lime-500/20 whitespace-nowrap"
            >
              Chat with Mori Assistant
            </button>
          </div>
        </div>

        {/* Compare Plans Section */}
        {/* Payment History Section */}
        <div id="payment-history" className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">
            Payment History
          </h3>

          {/* Loading State for Payment History */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-5 w-48 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-5 w-20 bg-gray-200 dark:bg-gray-600 rounded ml-auto"></div>
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded ml-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {invoicesError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300 text-small">
                  {invoicesError}
                </p>
              </div>
              <button
                className="mt-2 text-red-600 dark:text-red-400 text-small hover:underline"
                onClick={() => {
                  refetchBillingData();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && invoices.length > 0 ? (
            <div className="glass-widget-premium overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-black/20">
                      <th className="px-6 py-4 text-small font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                      <th className="px-6 py-4 text-small font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upgrade Date</th>
                      <th className="px-6 py-4 text-small font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-small font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-small font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-lg bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mr-3 text-lime-600 dark:text-lime-400">
                              <Star className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-small font-medium text-gray-900 dark:text-white">
                                {invoice.planName || 'Subscription'}
                              </p>
                              <p className="text-small text-gray-500 dark:text-gray-400">
                                {invoice.billingCycle || 'One-time'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-small text-gray-600 dark:text-gray-300">
                            {formatDate(invoice.createdAt || invoice.date)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-small font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium capitalize
                            ${invoice.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              invoice.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <a
                              href={`/api/user/invoices/${invoice.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              title="Download Invoice"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !loading && (
            <div className="glass-widget-premium rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h4 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">No Payment History</h4>
              <p className="text-small text-gray-500 dark:text-gray-400 mb-0">
                You haven't made any purchases yet. Your payment history and invoices will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Membership Modal */}
      <UniversalPaymentModal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        currentUserPlan={currentPlanKey}
        onSuccess={() => {
          setIsMembershipModalOpen(false);
          refetchBillingData();
          showToastNotification('success', 'Subscription updated successfully!');
        }}
        // Pass pricing data to avoid duplicate API calls
        plans={pricingHookResult.plans}
        promotionalOffers={pricingHookResult.promotionalOffers}
        locationData={pricingHookResult.locationData}
        regionalPricing={pricingHookResult.regionalPricing}
        getRegionalPrice={pricingHookResult.getRegionalPrice}
        getMonthlyEquivalent={pricingHookResult.getMonthlyEquivalent}
        getCurrencySymbol={pricingHookResult.getCurrencySymbol}
        getEffectivePrice={pricingHookResult.getEffectivePrice}
        hasPromotionalPricing={pricingHookResult.hasPromotionalPricing}
      />

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        onSuccess={handlePaymentMethodAdded}
      />

      {/* Toast Notifications */}
    </div>
  );
};



// Settings tabs configuration
const settingsTabs = [
  { id: 'account', name: 'Account & Profile', icon: User },
  { id: 'security', name: 'Security & Notifications', icon: Shield },
  { id: 'membership', name: 'Membership & Billing', icon: CreditCard },
];

// Helper function to get tab description
const getTabDescription = (tab: string) => {
  switch (tab) {
    case 'account': return 'Manage your personal information and account details';
    case 'security': return 'Secure your account and manage notification preferences';
    case 'membership': return 'View and manage your subscription and billing information';
    case 'referrals': return 'Track your referrals and earn rewards';
    default: return 'Configure your account settings';
  }
};

const SettingsPageShell = () => (
  <div className="w-full min-w-0 overflow-x-hidden pt-6 md:pt-8 pb-20">
    <div className="max-w-6xl mx-auto px-4 md:px-6 w-full min-w-0">
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-gray-900 dark:text-white">Settings</h1>
        <div className="mt-2 h-3 w-80 max-w-full rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
      </div>
      <div className="bg-white dark:bg-[#141810] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm overflow-hidden">
        <AccountProfileSkeleton />
      </div>
    </div>
  </div>
);

// Main Settings Content Component
const SettingsContent = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleSidebar, isOpen } = useMobileSidebar();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('account');
  const {
    data: userData = null,
    isPending: loading,
    refetch: fetchUserData
  } = useQuery({
    queryKey: ['settings-user', user?.id || user?.email],
    queryFn: fetchSettingsUserData,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'security', 'membership', 'referrals', 'integrations', 'workspace'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Listen for user profile updates from other components
  useEffect(() => {
    const handleUserProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail.user;
      const refreshUserData = event.detail.refreshUserData;

      if (refreshUserData) {
        console.log('🔄 Settings - Refreshing user data due to profile update');
        fetchUserData();
      } else if (updatedUser) {
        console.log('🔄 Settings - Received user profile update:', updatedUser);
        queryClient.setQueryData(['settings-user', user?.id || user?.email], (prev: User | null) => ({
          ...prev,
          ...updatedUser,
        }));
      }
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    };
  }, [fetchUserData, queryClient, user?.email, user?.id]);

  const handleSaveUser = (updatedUser: User) => {
    console.log('🔄 Settings - Updating local state with saved user data');
    queryClient.setQueryData(['settings-user', user?.id || user?.email], updatedUser);

    // Dispatch custom event to notify other components of user data update
    window.dispatchEvent(new CustomEvent('userProfileUpdated', {
      detail: { user: updatedUser }
    }));
  };

  const renderTabContent = () => {
    // Don't block rendering with a full-page spinner
    // Show skeleton loaders or cached data instead for better UX

    switch (activeTab) {
      case 'account':
        return !userData ? <AccountProfileSkeleton /> : <AccountProfile user={userData} onSave={handleSaveUser} />;
      case 'security':
        return !userData ? <SecuritySkeleton /> : <SecurityAndNotifications user={userData} />;
      case 'membership':
        return <MembershipBilling user={userData || user || { id: '', firstName: '', lastName: '', email: '' }} />;
      default:
        return (
          <div className="p-4 sm:p-6 lg:p-8 h-full min-w-0 max-w-full overflow-x-hidden">
            <div className="w-full min-w-0 max-w-full">
              <h3 className="text-body sm:text-h3 font-semibold text-gray-900 dark:text-white mb-4">Coming Soon</h3>
              <p className="text-small sm:text-body text-gray-600 dark:text-gray-300">This section is currently under development.</p>
            </div>
          </div>
        );
    }
  };

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/dashboard/settings?tab=${value}`, { scroll: false });
  };

  return (
    /* Same rounded-card-with-margins shell as the dashboard: white workspace,
       off-white card inset right/bottom (+ left on mobile/tablet where the
       sidebar is hidden); content scrolls inside the card. */
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
          <RouteGuard requireAuth={true}>
            <div className="w-full min-w-0 overflow-x-hidden pt-6 md:pt-8 pb-20">
              <div className="max-w-6xl mx-auto px-4 md:px-6 w-full min-w-0">
          {/* Settings Tabs - inline with heading (matching Jobs Hub header) */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-6 flex-wrap mb-6">
              <div>
                <h1 className="text-h1 font-bold text-gray-900 dark:text-white">
                  Settings
                </h1>
                <p className="mt-1 text-small text-gray-600 dark:text-gray-400">
                  {getTabDescription(activeTab)}
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-hide min-w-0 max-w-full">
                <TabsList className="flex w-max bg-transparent border-0 justify-start">
                  {settingsTabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        icon={<IconComponent className="h-4 w-4 shrink-0" />}
                        title={tab.name}
                        aria-label={tab.name}
                        className="data-[state=active]:text-lime-700 dark:data-[state=active]:text-lime-400 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex-shrink-0 rounded-none px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 border-b-transparent data-[state=active]:border-b-lime-500 dark:data-[state=active]:border-b-lime-400 hover:border-b-lime-500 dark:hover:border-b-lime-400 data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:shadow-none"
                      >
                        <span className="hidden sm:inline whitespace-nowrap">{tab.name}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            {/* Content Area */}
            <TabsContent value={activeTab} className="mt-0 min-w-0 max-w-full overflow-x-hidden">
              <div className="bg-white dark:bg-[#141810] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                {renderTabContent()}
              </div>
            </TabsContent>
          </Tabs>
          </div>
          </div>
      </RouteGuard>
      </div>
    </div>
  </div>
  );
};

// Main Component
export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SettingsPageShell />}>
        <RouteGuard requireAuth={true}>
          <SettingsContent />
        </RouteGuard>
      </Suspense>
    </ErrorBoundary>
  );
}
