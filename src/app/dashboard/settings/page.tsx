'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import {
  User,
  Trash2,
  Shield,
  CreditCard,
  Gift,
  Link,
  Users,
  Bell,
  Settings,
  Download,
  Eye,
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
  Loader2
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import RouteGuard from '@/components/auth/RouteGuard';
import { useNotifications } from '@/contexts/NotificationContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import AddPaymentMethodModal from '@/components/payment/AddPaymentMethodModal';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
// TwoFactorModal removed - 2FA not implemented yet
import PageHeader from '@/components/dashboard/PageHeader';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

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
    company: user.settings?.company || '',
    address: user.settings?.address || '',
    timezone: user.settings?.timezone || 'UTC +07:00 - Asia / Jakarta',
    languagePreference: user.settings?.languagePreference || 'English',
    dateOfBirth: user.settings?.dateOfBirth || '',
    gender: user.settings?.gender || '',
    nationality: user.settings?.nationality || '',
  });

  const [avatar, setAvatar] = useState(user.avatar || user.profilePhoto || '');
  const [masterCVData, setMasterCVData] = useState<any>(null);
  const [hasUserModified, setHasUserModified] = useState({
    firstName: false,
    lastName: false,
    phone: false,
    location: false,
    website: false,
    linkedin: false,
    github: false,
    summary: false,
    company: false,
    address: false,
    dateOfBirth: false,
    gender: false,
    nationality: false,
  });

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

  // Fetch Master CV data and populate form if user hasn't modified fields
  React.useEffect(() => {
    const fetchMasterCV = async () => {
      try {
        const response = await fetch('/api/cvs?type=cv&master=true');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.cvs && data.cvs.length > 0) {
            const masterCV = data.cvs[0];
            setMasterCVData(masterCV);
            
            // Only update fields that haven't been manually modified by user
            const updatedFormData = { ...formData };
            const updatedHasUserModified = { ...hasUserModified };
            
            if (!hasUserModified.firstName && masterCV.cvData?.basics?.name) {
              const fullName = masterCV.cvData.basics.name;
              const nameParts = fullName.split(' ');
              updatedFormData.firstName = nameParts[0] || '';
              updatedFormData.lastName = nameParts.slice(1).join(' ') || '';
            }
            
            if (!hasUserModified.phone && masterCV.cvData?.basics?.phone) {
              updatedFormData.phone = masterCV.cvData.basics.phone;
            }
            
            if (!hasUserModified.location && masterCV.cvData?.basics?.location) {
              const location = masterCV.cvData.basics.location;
              updatedFormData.location = location.city || location.address || '';
            }
            
            if (!hasUserModified.website && masterCV.cvData?.basics?.website) {
              updatedFormData.website = masterCV.cvData.basics.website;
            }
            
            if (!hasUserModified.linkedin && masterCV.cvData?.basics?.profiles) {
              const linkedinProfile = masterCV.cvData.basics.profiles.find((p: any) => p.network === 'LinkedIn');
              if (linkedinProfile) {
                updatedFormData.linkedin = linkedinProfile.url || '';
              }
            }
            
            if (!hasUserModified.github && masterCV.cvData?.basics?.profiles) {
              const githubProfile = masterCV.cvData.basics.profiles.find((p: any) => p.network === 'GitHub');
              if (githubProfile) {
                updatedFormData.github = githubProfile.url || '';
              }
            }
            
            if (!hasUserModified.summary && masterCV.cvData?.basics?.summary) {
              updatedFormData.summary = masterCV.cvData.basics.summary;
            }
            
            setFormData(updatedFormData);
          }
        }
      } catch (error) {
        console.error('Error fetching Master CV:', error);
      }
    };

    fetchMasterCV();
  }, []); // Only run once on mount

  // Function to refresh data from Master CV
  const refreshFromMasterCV = async () => {
    if (!masterCVData) return;
    
    const updatedFormData = { ...formData };
    
    // Only update fields that haven't been manually modified by user
    if (!hasUserModified.firstName && masterCVData.cvData?.basics?.name) {
      const fullName = masterCVData.cvData.basics.name;
      const nameParts = fullName.split(' ');
      updatedFormData.firstName = nameParts[0] || '';
      updatedFormData.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    if (!hasUserModified.phone && masterCVData.cvData?.basics?.phone) {
      updatedFormData.phone = masterCVData.cvData.basics.phone;
    }
    
    if (!hasUserModified.location && masterCVData.cvData?.basics?.location) {
      const location = masterCVData.cvData.basics.location;
      updatedFormData.location = location.city || location.address || '';
    }
    
    if (!hasUserModified.website && masterCVData.cvData?.basics?.website) {
      updatedFormData.website = masterCVData.cvData.basics.website;
    }
    
    if (!hasUserModified.linkedin && masterCVData.cvData?.basics?.profiles) {
      const linkedinProfile = masterCVData.cvData.basics.profiles.find((p: any) => p.network === 'LinkedIn');
      if (linkedinProfile) {
        updatedFormData.linkedin = linkedinProfile.url || '';
      }
    }
    
    if (!hasUserModified.github && masterCVData.cvData?.basics?.profiles) {
      const githubProfile = masterCVData.cvData.basics.profiles.find((p: any) => p.network === 'GitHub');
      if (githubProfile) {
        updatedFormData.github = githubProfile.url || '';
      }
    }
    
    if (!hasUserModified.summary && masterCVData.cvData?.basics?.summary) {
      updatedFormData.summary = masterCVData.cvData.basics.summary;
    }
    
    setFormData(updatedFormData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as user-modified to prevent Master CV from overriding it
    if (field in hasUserModified) {
      setHasUserModified(prev => ({ ...prev, [field]: true }));
    }
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
        // Main profile fields
        phone: formData.phone,
        location: formData.location,
        website: formData.website,
        linkedin: formData.linkedin,
        github: formData.github,
        summary: formData.summary,
        // Settings fields
        settings: {
          company: formData.company,
          address: formData.address,
          timezone: formData.timezone,
          languagePreference: formData.languagePreference,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          nationality: formData.nationality,
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
        console.error('Save failed:', result.error);
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
    <div className="p-8 h-full">
      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Avatar</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Choose an image that best reflects your identity or brand.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                We only support .JPG, .JPEG, or .PNG file. 1 MB max.
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden mx-auto md:mx-0">
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Convert to base64 for now (in production, upload to cloud storage)
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        setAvatar(result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="avatar-upload"
                />
                <label 
                  htmlFor="avatar-upload"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-center"
                >
                  Upload Image
                </label>
                {avatar && (
                  <button 
                    onClick={() => setAvatar('')}
                    className="px-4 py-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium"
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
            {masterCVData && (
              <button
                onClick={refreshFromMasterCV}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-lime-100 dark:bg-lime-400/20 text-lime-700 dark:text-lime-400 border border-lime-300 dark:border-lime-400/30 rounded-lg hover:bg-lime-200 dark:hover:bg-lime-400/30 transition-colors"
              >
                <RefreshCw size={14} />
                Sync with Master CV
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="space-y-2">
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Email cannot be changed. Contact support if you need to update your email address.
                </p>
                
                {/* Email Verification Status */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    {user.isEmailVerified ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Email Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          Email Not Verified
                        </span>
                      </>
                    )}
                  </div>
                  
                  {!user.isEmailVerified && (
                    <button
                      onClick={handleSendVerification}
                      disabled={isSendingVerification}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingVerification ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      {isSendingVerification ? 'Sending...' : 'Verify Email'}
                    </button>
                  )}
                </div>
                
                {verificationMessage && (
                  <div className={`text-sm px-3 py-2 rounded-md ${
                    verificationMessage.type === 'success' 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }`}>
                    {verificationMessage.text}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    usernameError ? 'border-red-500 dark:border-red-400' : 
                    usernameStatus === 'available' ? 'border-green-500 dark:border-green-400' :
                    'border-gray-300 dark:border-gray-600'
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
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{usernameError}</p>
              )}
              {usernameStatus === 'available' && !usernameError && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">Username is available</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="City, Country"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="https://yourwebsite.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => handleInputChange('linkedin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub
              </label>
              <input
                type="url"
                value={formData.github}
                onChange={(e) => handleInputChange('github', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="https://github.com/yourusername"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Professional Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Professional Summary
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Tell us about your background, experience, and career goals..."
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={formData.languagePreference}
                onChange={(e) => handleInputChange('languagePreference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
      <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
            saveStatus === 'success' 
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
  );
};

// Security & Notifications Component
const SecurityAndNotifications = ({ user }: { user: User }) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  
  // Modal states
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  // Two-factor modal removed - feature not implemented
  
  // Toast notification state

  const showToastNotification = (type: 'success' | 'error' | 'info', message: string) => {
    addNotification({
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      persistent: false
    });
  };

  const handlePasswordChanged = () => {
    showToastNotification('success', 'Password changed successfully!');
  };

  const handleTwoFactorToggled = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    showToastNotification('success', `Two-factor authentication ${twoFactorEnabled ? 'disabled' : 'enabled'} successfully!`);
  };

  return (
    <div className="p-8 h-full">
      <div className="space-y-8">
        {/* Security Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-xs text-gray-500 dark:text-gray-300">Add an extra layer of security to your account</div>
              </div>
              <button
                onClick={() => showToastNotification('info', 'Two-factor authentication coming soon!')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  twoFactorEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  twoFactorEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Change Password</div>
                <div className="text-xs text-gray-500 dark:text-gray-300">Update your account password</div>
              </div>
              <button 
                onClick={() => setIsChangePasswordModalOpen(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</div>
                <div className="text-xs text-gray-500 dark:text-gray-300">Receive updates via email</div>
              </div>
              <button
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  emailNotifications ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between py-4">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</div>
                <div className="text-xs text-gray-500 dark:text-gray-300">Receive push notifications in your browser</div>
              </div>
              <button
                onClick={() => setPushNotifications(!pushNotifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  pushNotifications ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  pushNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={handlePasswordChanged}
      />

      {/* Two-Factor Authentication Modal - Coming Soon */}

      {/* Toast Notifications */}
    </div>
  );
};

// Membership & Billing Component
const MembershipBilling = ({ user }: { user: User }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  
  // Toast notification state
  
  // Error states for individual API calls
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const showToastNotification = (type: 'success' | 'error' | 'info', message: string) => {
    addNotification({
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      persistent: false
    });
  };

  const handlePaymentMethodAdded = (paymentMethod: any) => {
    // Refresh payment methods list
    fetchPaymentData();
    showToastNotification('success', 'Payment method added successfully!');
  };

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      // Reset error states
      setSubscriptionError(null);
      setPaymentMethodsError(null);
      setInvoicesError(null);
      setPlansError(null);
      
      // Fetch subscription data
      try {
        const subscriptionResponse = await fetch('/api/user/subscription');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          if (subscriptionData.success) {
            setSubscription(subscriptionData.subscription);
          } else {
            setSubscriptionError(subscriptionData.error || 'Failed to load subscription');
          }
        } else {
          setSubscriptionError('Failed to load subscription data');
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscriptionError('Network error loading subscription');
      }

      // Fetch payment methods
      try {
        const paymentResponse = await fetch('/api/user/payment-methods');
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          if (paymentData.success) {
            setPaymentMethods(paymentData.paymentMethods || []);
          } else {
            // Only show error if it's not a "no records" case
            if (paymentData.error && !paymentData.error.includes('No payment methods found') && !paymentData.error.includes('not found')) {
              setPaymentMethodsError(paymentData.error);
            } else {
              setPaymentMethods([]);
            }
          }
        } else {
          // Only show error for actual HTTP errors, not 404s for empty data
          if (paymentResponse.status !== 404) {
            setPaymentMethodsError('Failed to load payment methods');
          } else {
            setPaymentMethods([]);
          }
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error);
        setPaymentMethodsError('Network error loading payment methods');
      }

      // Fetch invoices
      try {
        const invoiceResponse = await fetch('/api/user/invoices?limit=20');
        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          if (invoiceData.success) {
            setInvoices(invoiceData.invoices || []);
          } else {
            // Only show error if it's not a "no records" case
            if (invoiceData.error && !invoiceData.error.includes('No invoices found') && !invoiceData.error.includes('not found')) {
              setInvoicesError(invoiceData.error);
            } else {
              setInvoices([]);
            }
          }
        } else {
          // Only show error for actual HTTP errors, not 404s for empty data
          if (invoiceResponse.status !== 404) {
            setInvoicesError('Failed to load invoices');
          } else {
            setInvoices([]);
          }
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
        setInvoicesError('Network error loading invoices');
      }

      // Fetch available plans (excluding free plan)
      try {
        const plansResponse = await fetch('/api/pricing-plans');
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          // Filter out free plan and inactive plans
          const filteredPlans = plansData.filter((plan: any) => 
            plan.key !== 'free' && plan.status === 'active'
          );
          setAvailablePlans(filteredPlans);
        } else {
          setPlansError('Failed to load pricing plans');
        }
      } catch (error) {
        console.error('Error fetching pricing plans:', error);
        setPlansError('Network error loading pricing plans');
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      showToastNotification('error', 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 h-full">
        <div className="space-y-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="space-y-8">
        
        {/* Plan Cards Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Plans</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-r from-lime-50 to-lime-100 dark:from-lime-400/10 dark:to-lime-500/10 border border-lime-200 dark:border-lime-400/20 rounded-xl p-6 relative">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-lime-500 text-white text-xs font-medium rounded-full">
                  Current Plan
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-lime-500 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {subscription?.planName || 'Free Plan'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Status: <span className={`font-medium ${subscription?.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                      {subscription?.status || 'Active'}
                    </span>
                  </p>
                </div>
              </div>
              {subscription?.endDate && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Next billing: {subscription.endDate}
                </p>
              )}
              {subscription?.planDetails?.features && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <p>CVs: {subscription.planDetails.features.maxCVs === -1 ? 'Unlimited' : subscription.planDetails.features.maxCVs}</p>
                  <p>Exports: {subscription.planDetails.features.maxExports === -1 ? 'Unlimited' : subscription.planDetails.features.maxExports}</p>
                </div>
              )}
            </div>

            {/* Change Plan Card */}
            <div 
              className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setIsMembershipModalOpen(true)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    Change Plan
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Upgrade or downgrade your subscription
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Click to change plan</span>
                <div className="transform transition-transform duration-200">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Payment Methods Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Methods
            </h3>
            <button 
              className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
              onClick={() => setIsAddPaymentModalOpen(true)}
            >
              Add Payment Method
            </button>
          </div>
          
          {/* Error Display */}
          {paymentMethodsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {paymentMethodsError}
                </p>
              </div>
              <button 
                className="mt-2 text-red-600 dark:text-red-400 text-sm hover:underline"
                onClick={() => {
                  setPaymentMethodsError(null);
                  fetchPaymentData();
                }}
              >
                Retry
              </button>
            </div>
          )}
          
          {paymentMethods.length > 0 ? (
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Saved Cards</h4>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="w-80 h-48 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 text-white relative">
                    {/* Card Design */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-5 bg-white rounded flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-800">{method.brand.toUpperCase()}</span>
                        </div>
                        {method.isDefault && (
                          <span className="px-2 py-1 bg-lime-500 text-white text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-300 hover:text-white transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-lg font-mono tracking-wider">
                        •••• •••• •••• {method.last4}
                      </div>
                      <div className="flex justify-between text-sm text-gray-300">
                        <span>{method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}</span>
                        <span className="uppercase">{method.brand}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Payment Methods</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You haven't added any payment methods yet. Add a card to enable quick and secure payments.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Secure & Safe</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Your payment information is encrypted and secure with industry-standard protection.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payment History Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment History
          </h3>
          
          {/* Error Display */}
          {invoicesError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {invoicesError}
                </p>
              </div>
              <button 
                className="mt-2 text-red-600 dark:text-red-400 text-sm hover:underline"
                onClick={() => {
                  setInvoicesError(null);
                  fetchPaymentData();
                }}
              >
                Retry
              </button>
            </div>
          )}
          
          {invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invoice.planName} - {invoice.billingCycle}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Invoice #{invoice.invoiceNumber} • {formatDate(invoice.createdAt)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {invoice.paymentMethodType.toUpperCase()} •••• {invoice.paymentMethodLast4}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <p className={`text-sm font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Payment History</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You haven't made any purchases yet. Your payment history will appear here once you upgrade to a paid plan.
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Free Plan Benefits</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  You're currently enjoying our free plan with basic features.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Membership Modal */}
      <UniversalPaymentModal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        currentUserPlan={subscription?.planKey || 'free'}
        onSuccess={() => {
          setIsMembershipModalOpen(false);
          fetchPaymentData();
          showToastNotification('success', 'Subscription updated successfully!');
        }}
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

// Referrals & Rewards Component - REMOVED
const ReferralsRewards_OLD = () => {
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Toast notification state

  const showToastNotification = (type: 'success' | 'error' | 'info', message: string) => {
    addNotification({
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
      message,
      persistent: false
    });
  };

  useEffect(() => {
    const fetchReferralStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/user/referrals');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setReferralStats(data.stats);
          } else {
            setError(data.error || 'Failed to load referral data');
          }
        } else {
          setError('Failed to load referral data');
        }
      } catch (error) {
        console.error('Error fetching referral stats:', error);
        setError('Network error loading referral data');
      } finally {
        setLoading(false);
      }
    };

    fetchReferralStats();
  }, []);

  const copyReferralLink = async () => {
    if (referralStats?.referralLink) {
      try {
        await navigator.clipboard.writeText(referralStats.referralLink);
        setCopied(true);
        showToastNotification('success', 'Referral link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy referral link:', error);
        showToastNotification('error', 'Failed to copy referral link');
      }
    } else {
      showToastNotification('error', 'No referral link available');
    }
  };

  if (loading) {
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Referrals & Rewards</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Invite friends and earn rewards for successful referrals.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 dark:text-red-300 text-sm">
                {error}
              </p>
            </div>
            <button 
              className="mt-2 text-red-600 dark:text-red-400 text-sm hover:underline"
              onClick={() => {
                setError(null);
                // Retry fetch
                const fetchReferralStats = async () => {
                  try {
                    setLoading(true);
                    const response = await fetch('/api/user/referrals');
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success) {
                        setReferralStats(data.stats);
                      } else {
                        setError(data.error || 'Failed to load referral data');
                      }
                    } else {
                      setError('Failed to load referral data');
                    }
                  } catch (error) {
                    console.error('Error fetching referral stats:', error);
                    setError('Network error loading referral data');
                  } finally {
                    setLoading(false);
                  }
                };
                fetchReferralStats();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-lime-50 to-lime-100 dark:from-lime-400/10 dark:to-lime-500/10 border border-lime-200 dark:border-lime-400/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-lime-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {referralStats?.totalInvites || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Invites</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-400/10 dark:to-blue-500/10 border border-blue-200 dark:border-blue-400/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {referralStats?.successfulSignups || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Successful Signups</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-400/10 dark:to-yellow-500/10 border border-yellow-200 dark:border-yellow-400/20 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${referralStats?.rewardsEarned || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">Rewards Earned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Referral Link</h4>
          <div className="flex gap-3">
            <input
              type="text"
              value={referralStats?.referralLink || ''}
              readOnly
              className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
            <button
              onClick={copyReferralLink}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                copied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
            Share this link with friends to earn rewards when they sign up and upgrade to a paid plan.
          </p>
        </div>

        {/* How it Works */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How Referrals Work</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
              <p className="text-gray-600 dark:text-gray-300">Share your unique referral link with friends and colleagues</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
              <p className="text-gray-600 dark:text-gray-300">They sign up using your link and create their account</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
              <p className="text-gray-600 dark:text-gray-300">When they upgrade to a paid plan, you both earn rewards!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
    </div>
  );
};

// Connected Apps & Integrations Component - REMOVED
const ConnectedAppsIntegrations_OLD = () => {
  const [connectedApps, setConnectedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<any>(null);

  useEffect(() => {
    const fetchConnectedApps = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/integrations');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setConnectedApps(data.apps);
          }
        }
      } catch (error) {
        console.error('Error fetching connected apps:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserSettings = async () => {
      try {
        const response = await fetch('/api/user/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      }
    };

    fetchConnectedApps();
    fetchUserSettings();
  }, []);

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🔍';
      case 'microsoft':
        return '🏢';
      case 'slack':
        return '💬';
      default:
        return '🔗';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'from-red-50 to-red-100 dark:from-red-400/10 dark:to-red-500/10 border-red-200 dark:border-red-400/20';
      case 'microsoft':
        return 'from-blue-50 to-blue-100 dark:from-blue-400/10 dark:to-blue-500/10 border-blue-200 dark:border-blue-400/20';
      case 'slack':
        return 'from-purple-50 to-purple-100 dark:from-purple-400/10 dark:to-purple-500/10 border-purple-200 dark:border-purple-400/20';
      default:
        return 'from-gray-50 to-gray-100 dark:from-gray-400/10 dark:to-gray-500/10 border-gray-200 dark:border-gray-400/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 h-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
        </div>
      </div>
    );
  }

  const handleUpdateSettings = async (updatedSettings: any) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserSettings(updatedSettings);
        }
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connected Apps & Integrations</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your connected applications and third-party integrations.
          </p>
        </div>

        {/* Calendar Sync Settings */}
        {userSettings && (
          <CalendarSyncSettings 
            userSettings={userSettings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {/* Connected Apps List */}
        <div className="space-y-4">
          {connectedApps.map((app) => (
            <div
              key={app.id}
              className={`bg-gradient-to-r ${getProviderColor(app.provider)} border rounded-xl p-6`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {getProviderIcon(app.provider)}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {app.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {app.connected ? (
                        <>
                          Connected • Last synced: {app.lastSynced ? new Date(app.lastSynced).toLocaleDateString() : 'Never'}
                        </>
                      ) : (
                        'Not connected'
                      )}
                    </p>
                    {app.scopes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Permissions: {app.scopes.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {app.connected ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <button className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl text-sm">
                        Connect
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Integration */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Integration</h4>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Connect more apps to streamline your workflow and sync your data across platforms.
          </p>
          <button className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
            Browse Integrations
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200 dark:border-yellow-400/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Security & Privacy</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                We use industry-standard security measures to protect your data. You can revoke access to any connected app at any time. 
                Review the permissions carefully before connecting new applications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Sidebar Component
const SettingsSidebar = ({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  const personalItems = [
    { id: 'account', name: 'Account & Profile', icon: User },
    { id: 'security', name: 'Security & Notifications', icon: Shield },
    { id: 'membership', name: 'Membership & Billing', icon: CreditCard },
  ];

  const workspaceItems = [
    { id: 'integrations', name: 'Connected Apps & Integrations', icon: Link },
    { id: 'workspace', name: 'Workspace & Team', icon: Users },
  ];

  return (
    <div className="p-3 md:p-6 h-full overflow-y-auto flex flex-col">
      {/* Personal Section */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-3 md:mb-4 hidden md:block">
          PERSONAL
        </h3>
        <div className="block md:hidden mb-3">
          <div className="flex flex-col items-center gap-1">
            <User size={14} className="text-gray-500 dark:text-gray-300" />
            <div className="w-full h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>
        </div>
        <div className="space-y-1">
          {personalItems.map(item => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-lime-100 dark:bg-lime-400/20 text-lime-700 dark:text-lime-400 border border-lime-300 dark:border-lime-400/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.name}
              >
                <IconComponent size={16} />
                <span className="hidden md:inline">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workspace Section */}
      <div className="flex-1">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-3 md:mb-4 hidden md:block">
          WORKSPACE
        </h3>
        <div className="block md:hidden mb-3">
          <div className="flex flex-col items-center gap-1">
            <Users size={14} className="text-gray-500 dark:text-gray-300" />
            <div className="w-full h-px bg-gray-300 dark:bg-gray-600"></div>
          </div>
        </div>
        <div className="space-y-1">
          {workspaceItems.map(item => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-lime-100 dark:bg-lime-400/20 text-lime-700 dark:text-lime-400 border border-lime-300 dark:border-lime-400/30'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.name}
              >
                <IconComponent size={16} />
                <span className="hidden md:inline">{item.name}</span>
                {item.id === 'workspace' && (
                  <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded hidden md:inline">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Policy Links Section */}
      <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <a 
            href="/privacy-policy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Privacy Policy
          </a>
          <a 
            href="/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Terms of Service
          </a>
          <a 
            href="/cookie-policy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cookie Policy
          </a>
        </div>
      </div>
    </div>
  );
};

// Helper function to get tab description
const getTabDescription = (tab: string) => {
  switch (tab) {
    case 'account': return 'Manage your personal information and account details';
    case 'security': return 'Secure your account and manage notification preferences';
    case 'membership': return 'View and manage your subscription and billing information';
    case 'referrals': return 'Track your referrals and earn rewards';
    case 'integrations': return 'Connect and manage your third-party integrations';
    case 'workspace': return 'Manage your workspace and team settings';
    default: return 'Configure your account settings';
  }
};

// Main Settings Content Component
const SettingsContent = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const router = useRouter();
  const { toggleSidebar, isMobileMenuOpen } = useMobileSidebar();
  const searchParams = useSearchParams();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('account');
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'security', 'membership', 'referrals', 'integrations', 'workspace'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch user data from database
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUserData(data.user);
        }
      } else {
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

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
        setUserData(prev => ({
          ...prev,
          ...updatedUser,
        }));
      }
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    };
  }, []);

  const handleSaveUser = async (userData: User) => {
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          console.log('Profile updated successfully');
          setUserData(result.user);
          
          // Dispatch custom event to notify other components of user data update
          window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
            detail: { user: result.user } 
          }));
        }
      } else {
        console.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const renderTabContent = () => {
    if (loading || !userData) {
      return (
        <div className="p-8 h-full">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'account':
        return <AccountProfile user={userData} onSave={handleSaveUser} />;
      case 'security':
        return <SecurityAndNotifications user={userData} />;
      case 'membership':
        return <MembershipBilling user={userData} />;
      case 'integrations':
        return (
          <div className="p-8 h-full">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <Link size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Connected apps and integrations are currently in development.
                </p>
              </div>
            </div>
          </div>
        );
      case 'workspace':
        return (
          <div className="p-8 h-full">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <Users size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Team collaboration features are currently in development.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-8 h-full">
            <div className="max-w-7xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Coming Soon</h3>
              <p className="text-gray-600 dark:text-gray-300">This section is currently under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="h-screen flex flex-col">
        {/* Page Header - Fixed */}
        <div className="flex-shrink-0 sticky top-0 z-10">
          <PageHeader
            title="Settings"
            description={getTabDescription(activeTab)}
            user={{
              name: userData ? `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || user?.name || 'User' : user?.name || 'User',
              email: userData?.email || user?.email || '',
              username: userData?.username || user?.username,
              profilePhoto: userData?.profilePhoto || user?.image,
              designation: 'Software Developer',
              subscription: userData?.subscription
            }}
            showSettings={true}
            onMobileMenuToggle={toggleSidebar}
            isMobileMenuOpen={isMobileMenuOpen}
          />
        </div>
        
        {/* Main Layout - Flexible */}
        <div className="flex flex-1 min-h-0 h-[calc(100vh-8rem)]">
          {/* Settings Sidebar - Fixed */}
          <div className="w-16 md:w-80 flex-shrink-0 bg-gray-50/95 dark:bg-[#141810]/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/20 m-2">
            <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          
          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-gray-50/95 dark:bg-[#141810]/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/20 m-2 mr-4">
            {/* Main Content */}
            {renderTabContent()}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
};

// Main Component
export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      }>
        <SettingsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
