'use client';

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { usePricingPlans } from '@/lib/hooks/usePricingPlans';
import { useBillingData } from '@/lib/hooks/useBillingData';
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
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import AddPaymentMethodModal from '@/components/payment/AddPaymentMethodModal';
import ChangePasswordModal from '@/components/auth/ChangePasswordModal';
// TwoFactorModal removed - 2FA not implemented yet
import CalendarSyncSettings from '@/components/settings/CalendarSyncSettings';
import { uploadToS3 } from '@/lib/utils/upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// --- SKELETON LOADERS ---
// Skeleton components for better loading UX (no full-page spinners)

const AccountProfileSkeleton = () => (
  <div className="p-8 h-full overflow-y-auto">
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SecuritySkeleton = () => (
  <div className="p-8 h-full overflow-y-auto">
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

const MembershipSkeleton = () => (
  <div className="p-8 h-full overflow-y-auto">
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
    company: user.settings?.company || '',
    address: user.settings?.address || '',
    timezone: user.settings?.timezone || 'UTC +07:00 - Asia / Jakarta',
    languagePreference: user.settings?.languagePreference || 'English',
    dateOfBirth: user.settings?.dateOfBirth || '',
    gender: user.settings?.gender || '',
    nationality: user.settings?.nationality || '',
  });

  const [avatar, setAvatar] = useState(user.avatar || user.profilePhoto || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
        console.log('🔍 Settings - Fetching master CV data for profile population');
        
        // Use the correct API endpoint for master CV
        const response = await fetch('/api/cvs/master');
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Settings - Master CV API response:', data);
          
          if (data.success && data.data?.masterCV) {
            const masterCV = data.data.masterCV;
            setMasterCVData(masterCV);
            
            console.log('🔍 Settings - Master CV data:', masterCV);
            
            // Only update fields that haven't been manually modified by user
            const updatedFormData = { ...formData };
            const updatedHasUserModified = { ...hasUserModified };
            
            // Extract and populate name fields
            if (!hasUserModified.firstName && masterCV.cvData?.basics?.name) {
              const fullName = masterCV.cvData.basics.name.trim();
              const nameParts = fullName.split(' ');
              updatedFormData.firstName = nameParts[0] || '';
              updatedFormData.lastName = nameParts.slice(1).join(' ') || '';
              console.log('🔍 Settings - Populated name from master CV:', { firstName: updatedFormData.firstName, lastName: updatedFormData.lastName });
            }
            
            // Populate phone
            if (!hasUserModified.phone && masterCV.cvData?.basics?.phone) {
              updatedFormData.phone = masterCV.cvData.basics.phone.trim();
              console.log('🔍 Settings - Populated phone from master CV:', updatedFormData.phone);
            }
            
            // Populate location (combine city, address, region)
            if (!hasUserModified.location && masterCV.cvData?.basics?.location) {
              const location = masterCV.cvData.basics.location;
              const locationParts = [];
              if (location.city) locationParts.push(location.city);
              if (location.region) locationParts.push(location.region);
              if (location.address) locationParts.push(location.address);
              updatedFormData.location = locationParts.join(', ');
              console.log('🔍 Settings - Populated location from master CV:', updatedFormData.location);
            }
            
            // Populate website
            if (!hasUserModified.website && masterCV.cvData?.basics?.url) {
              updatedFormData.website = masterCV.cvData.basics.url.trim();
              console.log('🔍 Settings - Populated website from master CV:', updatedFormData.website);
            }
            
            // Populate social profiles
            if (masterCV.cvData?.basics?.profiles && Array.isArray(masterCV.cvData.basics.profiles)) {
              // LinkedIn
              if (!hasUserModified.linkedin) {
                const linkedinProfile = masterCV.cvData.basics.profiles.find((p: any) => 
                  p.network && p.network.toLowerCase() === 'linkedin'
                );
                if (linkedinProfile && linkedinProfile.url) {
                  updatedFormData.linkedin = linkedinProfile.url.trim();
                  console.log('🔍 Settings - Populated LinkedIn from master CV:', updatedFormData.linkedin);
                }
              }
              
              // GitHub
              if (!hasUserModified.github) {
                const githubProfile = masterCV.cvData.basics.profiles.find((p: any) => 
                  p.network && p.network.toLowerCase() === 'github'
                );
                if (githubProfile && githubProfile.url) {
                  updatedFormData.github = githubProfile.url.trim();
                  console.log('🔍 Settings - Populated GitHub from master CV:', updatedFormData.github);
                }
              }
            }
            
            // Populate summary
            if (!hasUserModified.summary && masterCV.cvData?.basics?.summary) {
              updatedFormData.summary = masterCV.cvData.basics.summary.trim();
              console.log('🔍 Settings - Populated summary from master CV');
            }
            
            // Populate label as company (if not already set)
            if (!hasUserModified.company && masterCV.cvData?.basics?.label && !updatedFormData.company) {
              updatedFormData.company = masterCV.cvData.basics.label.trim();
              console.log('🔍 Settings - Populated company from master CV label:', updatedFormData.company);
            }
            
            // Populate avatar/profile photo
            if (masterCV.cvData?.basics?.image && !avatar) {
              setAvatar(masterCV.cvData.basics.image.trim());
              console.log('🔍 Settings - Populated avatar from master CV');
            }
            
            setFormData(updatedFormData);
            console.log('✅ Settings - Successfully populated profile from master CV');
          } else {
            console.log('⚠️ Settings - No master CV found or API returned no data');
          }
        } else {
          console.error('❌ Settings - Failed to fetch master CV:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Settings - Error fetching Master CV:', error);
      }
    };

    fetchMasterCV();
  }, []); // Only run once on mount

  // Function to refresh data from Master CV
  const refreshFromMasterCV = async () => {
    if (!masterCVData) return;
    
    console.log('🔄 Settings - Refreshing profile data from master CV');
    
    const updatedFormData = { ...formData };
    
    // Only update fields that haven't been manually modified by user
    if (!hasUserModified.firstName && masterCVData.cvData?.basics?.name) {
      const fullName = masterCVData.cvData.basics.name.trim();
      const nameParts = fullName.split(' ');
      updatedFormData.firstName = nameParts[0] || '';
      updatedFormData.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    if (!hasUserModified.phone && masterCVData.cvData?.basics?.phone) {
      updatedFormData.phone = masterCVData.cvData.basics.phone.trim();
    }
    
    if (!hasUserModified.location && masterCVData.cvData?.basics?.location) {
      const location = masterCVData.cvData.basics.location;
      const locationParts = [];
      if (location.city) locationParts.push(location.city);
      if (location.region) locationParts.push(location.region);
      if (location.address) locationParts.push(location.address);
      updatedFormData.location = locationParts.join(', ');
    }
    
    if (!hasUserModified.website && masterCVData.cvData?.basics?.url) {
      updatedFormData.website = masterCVData.cvData.basics.url.trim();
    }
    
    if (masterCVData.cvData?.basics?.profiles && Array.isArray(masterCVData.cvData.basics.profiles)) {
      // LinkedIn
      if (!hasUserModified.linkedin) {
        const linkedinProfile = masterCVData.cvData.basics.profiles.find((p: any) => 
          p.network && p.network.toLowerCase() === 'linkedin'
        );
        if (linkedinProfile && linkedinProfile.url) {
          updatedFormData.linkedin = linkedinProfile.url.trim();
        }
      }
      
      // GitHub
      if (!hasUserModified.github) {
        const githubProfile = masterCVData.cvData.basics.profiles.find((p: any) => 
          p.network && p.network.toLowerCase() === 'github'
        );
        if (githubProfile && githubProfile.url) {
          updatedFormData.github = githubProfile.url.trim();
        }
      }
    }
    
    if (!hasUserModified.summary && masterCVData.cvData?.basics?.summary) {
      updatedFormData.summary = masterCVData.cvData.basics.summary.trim();
    }
    
    if (!hasUserModified.company && masterCVData.cvData?.basics?.label && !updatedFormData.company) {
      updatedFormData.company = masterCVData.cvData.basics.label.trim();
    }
    
    setFormData(updatedFormData);
    console.log('✅ Settings - Profile refreshed from master CV');
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
        <div className="py-4 sm:py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Avatar</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                Choose an image that best reflects your identity or brand.
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
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
                  className={`px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-center ${
                    isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
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
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
            {masterCVData && (
              <button
                onClick={refreshFromMasterCV}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm bg-lime-100 dark:bg-lime-400/20 text-lime-700 dark:text-lime-400 border border-lime-300 dark:border-lime-400/30 rounded-lg hover:bg-lime-200 dark:hover:bg-lime-400/30 transition-colors w-full sm:w-auto"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Sync from Master CV</span>
                <span className="sm:hidden">Sync from CV</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Email cannot be changed. Contact support if you need to update your email address.
                </p>
                
                {!user.isEmailVerified && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        Email Not Verified
                      </span>
                    </div>
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
                  </div>
                )}
                
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
                  className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent ${
                    usernameError ? 'border-red-500 dark:border-red-400' : 
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-lime-500/20 rounded-lg bg-white dark:bg-[#232f1c] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 focus:ring-lime-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Tell us about your background, experience, and career goals..."
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
    // Notification removed
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
  // Use consolidated billing data hook (fetches subscription, payment methods, invoices in parallel)
  const { data: billingData, isLoading: billingLoading, error: billingErrors, refetch: refetchBillingData } = useBillingData();
  
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
    <div className="p-8 h-full overflow-y-auto">
      <div className="space-y-8">
        
        {/* Plan Cards Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription Plans</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Current Plan Card */}
            {loading ? (
              <div className="bg-gradient-to-r from-lime-50 to-lime-100 dark:from-lime-400/10 dark:to-lime-500/10 border border-lime-200 dark:border-lime-400/20 rounded-xl p-6 relative animate-pulse">
                <div className="absolute top-4 right-4">
                  <div className="h-6 w-20 bg-lime-300 dark:bg-lime-600 rounded-full"></div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-lime-300 dark:bg-lime-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-6 w-32 bg-lime-200 dark:bg-lime-700 rounded mb-2"></div>
                    <div className="h-4 w-24 bg-lime-200 dark:bg-lime-700 rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-40 bg-lime-200 dark:bg-lime-700 rounded mb-2"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-lime-200 dark:bg-lime-700 rounded"></div>
                  <div className="h-4 w-36 bg-lime-200 dark:bg-lime-700 rounded"></div>
                </div>
              </div>
            ) : (
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
            )}

            {/* Change Plan Card */}
            {loading ? (
              <div className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-6 w-28 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded"></div>
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            ) : (
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
            )}
          </div>

        </div>

        {/* Payment Methods Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Methods
            </h3>
            {!loading && (
              <button 
                className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
                onClick={() => setIsAddPaymentModalOpen(true)}
              >
                Add Payment Method
              </button>
            )}
          </div>
          
          {/* Loading State for Payment Methods */}
          {loading && (
            <div className="space-y-4">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[1, 2].map((i) => (
                  <div key={i} className="w-80 h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          )}
          
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
                  refetchBillingData();
                }}
              >
                Retry
              </button>
            </div>
          )}
          
          {!loading && paymentMethods.length > 0 ? (
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
          ) : !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Payment Methods</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You haven't added any payment methods yet. Add a card to enable quick and secure payments.
              </p>
            </div>
          )}
        </div>

        {/* Payment History Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                <p className="text-red-700 dark:text-red-300 text-sm">
                  {invoicesError}
                </p>
              </div>
              <button 
                className="mt-2 text-red-600 dark:text-red-400 text-sm hover:underline"
                onClick={() => {
                  refetchBillingData();
                }}
              >
                Retry
              </button>
            </div>
          )}
          
          {!loading && invoices.length > 0 ? (
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
          ) : !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Payment History</h4>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You haven't made any purchases yet. Your payment history will appear here once you upgrade to a paid plan.
              </p>
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

// Legacy components removed - ReferralsRewards_OLD and ConnectedAppsIntegrations_OLD

// Settings tabs configuration
const settingsTabs = [
  { id: 'account', name: 'Account & Profile', icon: User },
  { id: 'security', name: 'Security & Notifications', icon: Shield },
  { id: 'membership', name: 'Membership & Billing', icon: CreditCard },
  { id: 'integrations', name: 'Integrations', icon: Link },
  { id: 'workspace', name: 'Workspace', icon: Users },
];

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
  const { toggleSidebar, isOpen } = useMobileSidebar();
  const searchParams = useSearchParams();
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
    // Don't block rendering with a full-page spinner
    // Show skeleton loaders or cached data instead for better UX
    
    switch (activeTab) {
      case 'account':
        return loading || !userData ? <AccountProfileSkeleton /> : <AccountProfile user={userData} onSave={handleSaveUser} />;
      case 'security':
        return loading || !userData ? <SecuritySkeleton /> : <SecurityAndNotifications user={userData} />;
      case 'membership':
        return loading || !userData ? <MembershipSkeleton /> : <MembershipBilling user={userData} />;
      case 'integrations':
        return (
          <div className="p-4 sm:p-6 lg:p-8 h-full">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-8 sm:py-12">
                <Link size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  Connected apps and integrations are currently in development.
                </p>
              </div>
            </div>
          </div>
        );
      case 'workspace':
        return (
          <div className="p-4 sm:p-6 lg:p-8 h-full">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-8 sm:py-12">
                <Users size={40} className="sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 px-4">
                  Team collaboration features are currently in development.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 sm:p-6 lg:p-8 h-full">
            <div className="max-w-7xl mx-auto">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Coming Soon</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">This section is currently under development.</p>
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
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header - Same style as other dashboard pages */}
          <PageHeader
            title="Settings"
            description={getTabDescription(activeTab)}
            user={{
              name: userData ? `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || user?.name || 'User' : user?.name || 'User',
              email: userData?.email || user?.email || '',
              username: userData?.username || user?.username,
              profilePhoto: userData?.profilePhoto || user?.image,
              designation: 'Software Developer',
              subscription: userData?.subscription,
              isEmailVerified: userData?.isEmailVerified || false
            }}
            showSettings={true}
            onMobileMenuToggle={toggleSidebar}
            isMobileMenuOpen={isOpen}
          />

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <TabsList className="flex w-max bg-transparent border-0 justify-start">
                  {settingsTabs.map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="data-[state=active]:text-lime-700 dark:data-[state=active]:text-lime-400 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex-shrink-0 rounded-none px-4 py-3 border-b-2 data-[state=active]:border-lime-500 dark:data-[state=active]:border-lime-400 border-transparent"
                      >
                        <IconComponent className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{tab.name}</span>
                        <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            {/* Content Area */}
            <TabsContent value={activeTab} className="mt-0">
              {renderTabContent()}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RouteGuard>
  );
};

// Main Component
export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <SettingsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
