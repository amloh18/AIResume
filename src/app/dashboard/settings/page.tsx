'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  LogOut, 
  Copy, 
  X, 
  Sun, 
  Moon, 
  Download, 
  Check, 
  Loader2,
  User,
  Shield,
  CreditCard,
  Bell,
  Gift,
  Link,
  Users,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Settings,
  Key,
  FileText,
  Globe,
  Smartphone,
  Mail,
  Building,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  CreditCard as CreditCardIcon,
  Share2,
  ExternalLink,
  RefreshCw,
  Plus,
  Edit,
  Save,
  RotateCcw,
  Crown
} from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import MembershipModal from '@/components/payment/MembershipModal';

// --- TYPES ---
interface PricingPlan {
  _id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  features?: string[];
  maxCVs: number;
  maxExports: number;
  storageLimit: number;
  status: 'active' | 'inactive';
  isPopular?: boolean;
}

interface UserSubscription {
  planName: string;
  status: 'active' | 'inactive' | 'cancelled';
  credits: number;
  endDate: string;
  planId?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  loginNotifications?: string;
  connectedDevices?: number;
  recentActivity?: string;
  emailNotifications?: string;
  smsAlerts?: string;
  contentPreferences?: string;
  defaultDashboardView?: string;
  darkMode?: string;
  languageForContent?: string;
}

interface NotificationPreferences {
  email: {
    productUpdates: boolean;
    billing: boolean;
    referrals: boolean;
  };
  inApp: {
    productUpdates: boolean;
    billing: boolean;
    referrals: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
}

interface ReferralStats {
  totalInvites: number;
  successfulSignups: number;
  rewardsEarned: number;
  referralLink: string;
}

interface ConnectedApp {
  id: string;
  name: string;
  provider: string;
  connected: boolean;
  lastSynced?: string;
  scopes: string[];
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

// --- MOCK DATA ---
// Fallback data in case API calls fail
const mockUser: User = {
  id: '1',
  firstName: 'Liam',
  lastName: 'Smith',
  email: 'wilson@example.com',
  phone: '(213) 555-1234',
  company: 'TechCorp',
  role: 'Software Engineer',
  address: 'California - United States',
  profilePhoto: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  timezone: 'GMT-5',
  locale: 'en-US',
  dateOfBirth: 'January 1, 1987',
  gender: 'Male',
  nationality: 'American',
  displayName: 's_wilson_168920',
  accountCreated: 'March 20, 2020',
  lastLogin: 'August 22, 2024',
  membershipStatus: 'Premium Member',
  accountVerification: 'Verified',
  languagePreference: 'English',
  passwordLastChanged: 'July 15, 2024',
  twoFactorAuth: 'Enabled',
  securityQuestions: 'Yes',
  loginNotifications: 'Enabled',
  connectedDevices: 3,
  recentActivity: 'No Suspicious Activity Detected',
  emailNotifications: 'Subscribed',
  smsAlerts: 'Enabled',
  contentPreferences: 'Technology, Design, Innovation',
  defaultDashboardView: 'Compact Mode',
  darkMode: 'Activated',
  languageForContent: 'English'
};

const mockNotificationPreferences: NotificationPreferences = {
  email: {
    productUpdates: true,
    billing: true,
    referrals: false,
  },
  inApp: {
    productUpdates: true,
    billing: false,
    referrals: true,
  },
  frequency: 'daily',
};

const mockReferralStats: ReferralStats = {
  totalInvites: 12,
  successfulSignups: 8,
  rewardsEarned: 240,
  referralLink: 'https://cvcircle.com/ref/jan-novak-123',
};

const mockConnectedApps: ConnectedApp[] = [
  {
    id: '1',
    name: 'Google',
    provider: 'google',
    connected: true,
    lastSynced: '2024-01-15T10:30:00Z',
    scopes: ['profile', 'email'],
  },
  {
    id: '2',
    name: 'Microsoft',
    provider: 'microsoft',
    connected: false,
    scopes: ['profile', 'email', 'calendar'],
  },
  {
    id: '3',
    name: 'Slack',
    provider: 'slack',
    connected: false,
    scopes: ['channels:read', 'chat:write'],
  },
];

const mockActiveSessions: ActiveSession[] = [
  {
    id: '1',
    device: 'Chrome on Windows 10',
    location: 'Prague, Czech Republic',
    lastActive: '2024-01-15T10:30:00Z',
    current: true,
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'Prague, Czech Republic',
    lastActive: '2024-01-14T15:20:00Z',
    current: false,
  },
];

const mockBillingHistory = [
  { id: 'INV-20250601-001', total: 'USD $10.00', type: 'Personal Plan', status: 'Paid', date: 'June 2025', cardType: 'Mastercard', cardEnding: '3319' },
  { id: 'INV-20250501-002', total: 'USD $10.00', type: 'Personal Plan', status: 'Paid', date: 'May 2025', cardType: 'Visa', cardEnding: '8806' },
  { id: 'INV-20250401-003', total: 'USD $10.00', type: 'Personal Plan', status: 'Paid', date: 'Apr 2025', cardType: 'Visa', cardEnding: '8806' },
  { id: 'INV-20250301-004', total: 'USD $10.00', type: 'Personal Plan', status: 'Paid', date: 'Mar 2025', cardType: 'Visa', cardEnding: '8806' },
  { id: 'INV-20250201-005', total: 'USD $10.00', type: 'Personal Plan', status: 'Paid', date: 'Feb 2025', cardType: 'Visa', cardEnding: '8806' },
  { id: 'INV-20250101-006', total: 'USD $10.00', type: 'Personal Plan', status: 'Paid', date: 'Jan 2025', cardType: 'Mastercard', cardEnding: '3319' },
];

const mockPricingPlans: PricingPlan[] = [
  {
    _id: 'free',
    name: 'Free Plan',
    price: 0,
    currency: 'USD',
    billingCycle: 'monthly',
    features: ['5 CVs per month', 'Basic templates', 'Email support'],
    maxCVs: 5,
    maxExports: 5,
    storageLimit: 100,
    status: 'active',
    isPopular: false
  },
  {
    _id: 'pro',
    name: 'Pro Plan',
    price: 29,
    currency: 'USD',
    billingCycle: 'monthly',
    features: ['Unlimited CVs', 'Premium templates', 'Priority support', 'AI assistance'],
    maxCVs: -1,
    maxExports: -1,
    storageLimit: 1000,
    status: 'active',
    isPopular: true
  },
  {
    _id: 'enterprise',
    name: 'Enterprise Plan',
    price: 99,
    currency: 'USD',
    billingCycle: 'monthly',
    features: ['Everything in Pro', 'Team collaboration', 'Advanced analytics', 'Custom branding'],
    maxCVs: -1,
    maxExports: -1,
    storageLimit: 5000,
    status: 'active',
    isPopular: false
  }
];

// --- SVG ICONS ---
const VisaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="3.5" y="12.5" width="41" height="23" rx="3.5" className="fill-white dark:fill-gray-700" stroke="#D1D5DB" />
        <path d="M12.2381 29H9L13.1238 19.3333H16.1143L20.2381 29H16.981L16.2095 26.9619H13.019L12.2381 29ZM14.619 21.6095L13.5143 24.9048H15.7238L14.619 21.6095Z" className="fill-gray-800 dark:fill-gray-300"/>
        <path d="M25.3371 29H22V19.3333H25.2228C26.4323 19.3333 27.3466 19.619 27.9656 20.1904C28.5847 20.7619 28.8942 21.5619 28.8942 22.5904C28.8942 23.3333 28.7185 23.9523 28.3661 24.4476C28.0137 24.9428 27.5344 25.2952 26.9296 25.5047L29.3371 29H25.8613L23.7767 25.7524H24.3481V29H25.3371ZM24.3481 24.419H25.1312C25.7608 24.419 26.2402 24.2428 26.5693 23.8904C26.8984 23.5381 27.0635 23.0857 27.0635 22.5333C27.0635 21.9809 26.8984 21.5285 26.5693 21.1762C26.2402 20.8238 25.7608 20.6476 25.1312 20.6476H24.3481V24.419Z" className="fill-gray-800 dark:fill-gray-300"/>
        <path d="M38.2381 19.3333L35.1905 25.2L32.1429 19.3333H29L33.6667 29H34.7619L39.4286 19.3333H38.2381Z" className="fill-gray-800 dark:fill-gray-300"/>
    </svg>
);

// --- COMPONENTS ---

const ThemeToggle = ({ theme, setTheme }: { theme: string; setTheme: (theme: string) => void }) => {
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="flex items-center justify-center p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            <button 
                onClick={toggleTheme}
                className={`p-2 rounded-md transition-colors duration-300 ${theme === 'light' ? 'bg-white shadow' : 'text-gray-400'}`}
            >
                <Sun size={18} />
            </button>
            <button 
                onClick={toggleTheme}
                className={`p-2 rounded-md transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-800 text-white shadow' : 'text-gray-500'}`}
            >
                <Moon size={18} />
            </button>
        </div>
    );
};

const Sidebar = ({ 
    theme, 
    setTheme, 
    activeTab, 
    setActiveTab,
    user 
}: { 
    theme: string; 
    setTheme: (theme: string) => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    user: User;
}) => {
    const handleLogout = () => {
        signOut({ callbackUrl: '/' });
    };

    const navigationItems = [
        { id: 'account', name: 'Account & Profile', icon: User },
        { id: 'security', name: 'Security & Privacy', icon: Shield },
        { id: 'membership', name: 'Membership & Billing', icon: CreditCard },
        { id: 'notifications', name: 'Notifications & Communication', icon: Bell },
        { id: 'referrals', name: 'Referrals & Rewards', icon: Gift },
        { id: 'integrations', name: 'Connected Apps & Integrations', icon: Link },
        { id: 'workspace', name: 'Workspace & Team', icon: Users },
    ];

    return (
        <aside className="w-80 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700">
            <div>
                <div className="flex flex-col items-center mb-6">
                    <img 
                        src={user.profilePhoto || 'https://placehold.co/96x96/EFEFEF/333333?text=User'} 
                        alt="User Avatar" 
                        className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-gray-200 dark:border-gray-600"
                        onError={(e) => { 
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; 
                            target.src='https://placehold.co/96x96/EFEFEF/333333?text=User'; 
                        }}
                    />
                    <div className="text-center mb-4">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    <ThemeToggle theme={theme} setTheme={setTheme} />
                </div>
                <nav>
                    <ul className="space-y-1">
                        {navigationItems.map(item => {
                            const IconComponent = item.icon;
                            return (
                                <li key={item.id}>
                                    <button 
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full text-left flex items-center gap-3 py-3 px-4 rounded-md font-medium transition-colors duration-200 ${
                                            activeTab === item.id
                                            ? 'bg-lime-500 text-white' 
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <IconComponent size={18} />
                                        <span className="text-sm">{item.name}</span>
                                        {item.id === 'workspace' && (
                                            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                                Soon
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
            <button 
                onClick={handleLogout}
                className="w-full mt-8 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
                <LogOut size={18} />
                Log out
            </button>
        </aside>
    );
};

// Account & Profile Component
const AccountProfile = ({ user, onSave }: { user: User; onSave: (userData: User) => void }) => {
    const [formData, setFormData] = useState<User>(user);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    useEffect(() => {
        setHasChanges(JSON.stringify(formData) !== JSON.stringify(user));
    }, [formData, user]);

    const handleInputChange = (field: keyof User, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData(user);
        setIsEditing(false);
    };

    return (
        <div className="space-y-8">
            {/* Profile Header */}
            <div className="text-center mb-8">
                <div className="relative inline-block">
                    <img
                        src={formData.profilePhoto || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-700 mx-auto mb-4"
                    />
                    {isEditing && (
                        <button className="absolute bottom-2 right-2 w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center text-black hover:bg-lime-400 transition-colors">
                            <Edit size={16} />
                        </button>
                    )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                    {formData.firstName} {formData.lastName}
                    <span className="ml-2 text-blue-400">✓</span>
                </h2>
                <p className="text-gray-400">{formData.email}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Personal Details & Security */}
                <div className="space-y-6">
                    {/* Personal Details */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Personal Details</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Full name</span>
                                <span className="text-white font-medium">{formData.firstName} {formData.lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Date of Birth</span>
                                <span className="text-white">{formData.dateOfBirth}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Gender</span>
                                <span className="text-white">{formData.gender}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Nationality</span>
                                <span className="text-white">{formData.nationality}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Address</span>
                                <span className="text-white flex items-center gap-2">
                                    {formData.address}
                                    <span className="text-sm">🇺🇸</span>
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Phone Number</span>
                                <span className="text-white">{formData.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Email</span>
                                <span className="text-white">{formData.email}</span>
                            </div>
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Password Last Changed</span>
                                <span className="text-white">{formData.passwordLastChanged}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Two-Factor Authentication</span>
                                <span className="text-blue-400 font-medium">{formData.twoFactorAuth}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Security Questions Set</span>
                                <span className="text-white">{formData.securityQuestions}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Login Notifications</span>
                                <span className="text-blue-400 font-medium">{formData.loginNotifications}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Connected Devices</span>
                                <span className="text-white">{formData.connectedDevices} Devices</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Recent Account Activity</span>
                                <span className="text-white">{formData.recentActivity}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Account Details & Preferences */}
                <div className="space-y-6">
                    {/* Account Details */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Display Name</span>
                                <span className="text-white font-medium">{formData.displayName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Account Created</span>
                                <span className="text-white">{formData.accountCreated}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Last Login</span>
                                <span className="text-white">{formData.lastLogin}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Membership Status</span>
                                <span className="text-white font-medium">{formData.membershipStatus}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Account Verification</span>
                                <span className="bg-green-500 text-black text-xs font-medium px-2 py-1 rounded-full">
                                    {formData.accountVerification}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Language Preference</span>
                                <span className="text-white">{formData.languagePreference}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Time Zone</span>
                                <span className="text-white">{formData.timezone} (Eastern Time)</span>
                            </div>
                        </div>
                    </div>

                    {/* Preferences */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Preferences</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Email Notifications</span>
                                <span className="text-purple-400 font-medium">{formData.emailNotifications}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">SMS Alerts</span>
                                <span className="text-blue-400 font-medium">{formData.smsAlerts}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Content Preferences</span>
                                <span className="text-white">{formData.contentPreferences}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Default Dashboard View</span>
                                <span className="text-white">{formData.defaultDashboardView}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Dark Mode</span>
                                <span className="text-white">{formData.darkMode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Language for Content</span>
                                <span className="text-white">{formData.languageForContent}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Button */}
            <div className="flex justify-center pt-6">
                {isEditing ? (
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="px-6 py-3 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || loading}
                            className="px-6 py-3 text-sm font-medium text-black bg-lime-500 rounded-lg hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Changes
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 text-sm font-medium text-black bg-lime-500 rounded-lg hover:bg-lime-400 flex items-center gap-2 transition-colors"
                    >
                        <Edit size={16} />
                        Edit Profile
                    </button>
                )}
            </div>
        </div>
    );
};

// Security & Privacy Component
const SecurityPrivacy = ({ user }: { user: User }) => {
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(mockActiveSessions);
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
        setLoading(true);
        try {
            // API call to change password
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            
            if (response.ok) {
                setShowPasswordModal(false);
                // Show success message
            }
        } catch (error) {
            console.error('Error changing password:', error);
        } finally {
            setLoading(false);
        }
    };

    const handle2FAToggle = async (enabled: boolean) => {
        setLoading(true);
        try {
            const response = await fetch('/api/auth/2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            });
            
            if (response.ok) {
                setShow2FAModal(false);
                // Show success message
            }
        } catch (error) {
            console.error('Error toggling 2FA:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
            }
        } catch (error) {
            console.error('Error revoking session:', error);
        }
    };

    const handleDataExport = async () => {
        try {
            const response = await fetch('/api/privacy/export', {
                method: 'POST',
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'user-data-export.json';
                a.click();
            }
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/privacy/delete', {
                method: 'POST',
            });
            
            if (response.ok) {
                // Redirect to home page after account deletion
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error deleting account:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Security & Privacy</h3>

            {/* Password Change */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Password</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Update your password to keep your account secure</p>
                    </div>
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600"
                    >
                        Change Password
                    </button>
                </div>
            </section>

            {/* Two-Factor Authentication */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Two-Factor Authentication</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Add an extra layer of security to your account</p>
                    </div>
                    <button
                        onClick={() => setShow2FAModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600"
                    >
                        Setup 2FA
                    </button>
                </div>
            </section>

            {/* Active Sessions */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Active Sessions</h4>
                <div className="space-y-4">
                    {activeSessions.map((session) => (
                        <div key={session.id} className="flex justify-between items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-800 dark:text-white">{session.device}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{session.location}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Last active: {new Date(session.lastActive).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {session.current && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Current</span>
                                )}
                                {!session.current && (
                                    <button
                                        onClick={() => handleRevokeSession(session.id)}
                                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Data Export */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Data Export</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Download a copy of your personal data</p>
                    </div>
                    <button
                        onClick={handleDataExport}
                        className="px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 flex items-center gap-2"
                    >
                        <Download size={16} />
                        Export Data
                    </button>
                </div>
            </section>

            {/* Account Deletion */}
            <section className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Delete Account</h4>
                        <p className="text-red-600 dark:text-red-300 text-sm">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        Delete Account
                    </button>
                </div>
            </section>

            {/* Modals would be implemented here */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Change Password</h3>
                        {/* Password change form */}
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Current password"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <input
                                type="password"
                                placeholder="New password"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <input
                                type="password"
                                placeholder="Confirm new password"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handlePasswordChange('', '')}
                                disabled={loading}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 disabled:opacity-50"
                            >
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-red-500" size={24} />
                            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Delete Account</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {loading ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Notifications & Communication Component
const NotificationsCommunication = () => {
    const [preferences, setPreferences] = useState<NotificationPreferences>(mockNotificationPreferences);
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setHasChanges(JSON.stringify(preferences) !== JSON.stringify(mockNotificationPreferences));
    }, [preferences]);

    const handleToggle = (type: 'email' | 'inApp', category: keyof NotificationPreferences['email']) => {
        setPreferences(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [category]: !prev[type][category]
            }
        }));
    };

    const handleFrequencyChange = (frequency: NotificationPreferences['frequency']) => {
        setPreferences(prev => ({ ...prev, frequency }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences),
            });
            
            if (response.ok) {
                // Show success message
                setHasChanges(false);
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setPreferences(mockNotificationPreferences);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Notifications & Communication</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                        <RotateCcw size={16} />
                        Reset to Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Email Notifications */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Mail size={20} />
                    Email Notifications
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Product Updates</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Get notified about new features and improvements</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.email.productUpdates}
                                onChange={() => handleToggle('email', 'productUpdates')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 dark:peer-focus:ring-lime-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-lime-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Billing & Payments</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Receive invoices and payment confirmations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.email.billing}
                                onChange={() => handleToggle('email', 'billing')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 dark:peer-focus:ring-lime-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-lime-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Referrals & Rewards</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Get notified when friends sign up using your referral</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.email.referrals}
                                onChange={() => handleToggle('email', 'referrals')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 dark:peer-focus:ring-lime-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-lime-500"></div>
                        </label>
                    </div>
                </div>
            </section>

            {/* In-App Notifications */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Bell size={20} />
                    In-App Notifications
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Product Updates</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Show notifications about new features</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.inApp.productUpdates}
                                onChange={() => handleToggle('inApp', 'productUpdates')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 dark:peer-focus:ring-lime-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-lime-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Billing & Payments</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Show billing-related notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.inApp.billing}
                                onChange={() => handleToggle('inApp', 'billing')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 dark:peer-focus:ring-lime-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-lime-500"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Referrals & Rewards</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Show referral success notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.inApp.referrals}
                                onChange={() => handleToggle('inApp', 'referrals')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-lime-300 dark:peer-focus:ring-lime-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-lime-500"></div>
                        </label>
                    </div>
                </div>
            </section>

            {/* Notification Frequency */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Notification Frequency</h4>
                <div className="space-y-3">
                    {[
                        { value: 'immediate', label: 'Immediate', description: 'Receive notifications as they happen' },
                        { value: 'daily', label: 'Daily Digest', description: 'Get a summary once per day' },
                        { value: 'weekly', label: 'Weekly Digest', description: 'Get a summary once per week' }
                    ].map((option) => (
                        <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="radio"
                                name="frequency"
                                value={option.value}
                                checked={preferences.frequency === option.value}
                                onChange={() => handleFrequencyChange(option.value as NotificationPreferences['frequency'])}
                                className="text-lime-500 focus:ring-lime-500"
                            />
                            <div>
                                <p className="font-medium text-gray-800 dark:text-white">{option.label}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{option.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </section>
        </div>
    );
};

// Referrals & Rewards Component
// Connected Apps & Integrations Component
const ConnectedAppsIntegrations = () => {
    const [apps, setApps] = useState<ConnectedApp[]>(mockConnectedApps);
    const [loading, setLoading] = useState(false);

    const handleConnect = async (appId: string) => {
        setLoading(true);
        try {
            const app = apps.find(a => a.id === appId);
            if (!app) return;

            // Simulate OAuth flow
            const response = await fetch(`/api/integrations/${app.provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'connect' }),
            });
            
            if (response.ok) {
                setApps(prev => prev.map(a => 
                    a.id === appId 
                        ? { ...a, connected: true, lastSynced: new Date().toISOString() }
                        : a
                ));
            }
        } catch (error) {
            console.error('Error connecting app:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (appId: string) => {
        try {
            const app = apps.find(a => a.id === appId);
            if (!app) return;

            const response = await fetch(`/api/integrations/${app.provider}`, {
                method: 'DELETE',
            });
            
            if (response.ok) {
                setApps(prev => prev.map(a => 
                    a.id === appId 
                        ? { ...a, connected: false, lastSynced: undefined }
                        : a
                ));
            }
        } catch (error) {
            console.error('Error disconnecting app:', error);
        }
    };

    const handleResync = async (appId: string) => {
        try {
            const app = apps.find(a => a.id === appId);
            if (!app) return;

            const response = await fetch(`/api/integrations/${app.provider}/resync`, {
                method: 'POST',
            });
            
            if (response.ok) {
                setApps(prev => prev.map(a => 
                    a.id === appId 
                        ? { ...a, lastSynced: new Date().toISOString() }
                        : a
                ));
            }
        } catch (error) {
            console.error('Error resyncing app:', error);
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Connected Apps & Integrations</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apps.map((app) => (
                    <div key={app.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                        {app.name.charAt(0)}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-800 dark:text-white text-sm">{app.name}</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300">{app.provider}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {app.connected ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Connected</span>
                                ) : (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Not Connected</span>
                                )}
                            </div>
                        </div>

                        {app.connected && app.lastSynced && (
                            <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Last synced: {new Date(app.lastSynced).toLocaleString()}
                                </p>
                            </div>
                        )}

                        <div className="mb-3">
                            <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Permissions:</h5>
                            <div className="flex flex-wrap gap-1">
                                {app.scopes.map((scope, index) => (
                                    <span key={index} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-1">
                            {app.connected ? (
                                <>
                                    <button
                                        onClick={() => handleResync(app.id)}
                                        className="flex-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-1"
                                    >
                                        <RefreshCw size={12} />
                                        Resync
                                    </button>
                                    <button
                                        onClick={() => handleDisconnect(app.id)}
                                        className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 flex items-center justify-center gap-1"
                                    >
                                        <X size={12} />
                                        Disconnect
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleConnect(app.id)}
                                    disabled={loading}
                                    className="w-full px-2 py-1.5 text-xs font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />}
                                    Connect
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add New Integration */}
            <section className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Plus size={20} className="text-gray-400" />
                    </div>
                    <h4 className="text-base font-medium text-gray-800 dark:text-white mb-1">Add New Integration</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs mb-3">
                        Connect more apps and services to enhance your CV Circle experience
                    </p>
                    <button className="px-3 py-1.5 text-xs font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 flex items-center gap-1 mx-auto">
                        <Plus size={14} />
                        Browse Integrations
                    </button>
                </div>
            </section>
        </div>
    );
};

// Referrals & Rewards Component
const ReferralsRewards = () => {
    const [stats, setStats] = useState<ReferralStats>(mockReferralStats);
    const [copied, setCopied] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(stats.referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail) return;
        
        setInviteLoading(true);
        try {
            const response = await fetch('/api/referrals/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail }),
            });
            
            if (response.ok) {
                setInviteEmail('');
                setShowInviteModal(false);
                // Show success message
            }
        } catch (error) {
            console.error('Error sending invite:', error);
        } finally {
            setInviteLoading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join CV Circle',
                    text: 'Create professional CVs with AI assistance',
                    url: stats.referralLink,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            handleCopyLink();
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Referrals & Rewards</h3>

            {/* Referral Link */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Your Referral Link</h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={stats.referralLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                        onClick={handleCopyLink}
                        className="px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 flex items-center gap-2"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={handleShare}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                    >
                        <Share2 size={16} />
                        Share
                    </button>
                </div>
            </section>

            {/* Referral Stats */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Your Referral Stats</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-lime-50 dark:bg-lime-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-lime-600 dark:text-lime-400">{stats.totalInvites}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Invites</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.successfulSignups}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Successful Signups</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${stats.rewardsEarned}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Rewards Earned</div>
                    </div>
                </div>
            </section>

            {/* Send Invites */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Send Invites</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Invite friends and earn rewards when they sign up</p>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 flex items-center gap-2"
                    >
                        <Mail size={16} />
                        Send Invite
                    </button>
                </div>
            </section>

            {/* Rewards Ledger */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Rewards Ledger</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">John Doe signed up</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">January 15, 2024</p>
                        </div>
                        <div className="text-right">
                            <p className="font-medium text-green-600 dark:text-green-400">+$30</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reward earned</p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-800 dark:text-white">Jane Smith signed up</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">January 10, 2024</p>
                        </div>
                        <div className="text-right">
                            <p className="font-medium text-green-600 dark:text-green-400">+$30</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Reward earned</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Send Invite</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendInvite}
                                disabled={!inviteEmail || inviteLoading}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-lime-500 rounded-md hover:bg-lime-600 disabled:opacity-50"
                            >
                                {inviteLoading ? 'Sending...' : 'Send Invite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Membership & Billing Component
const MembershipBilling = ({ 
    currentPlan, 
    onPlanChange, 
    pricingPlans, 
    userSubscription,
    paymentMethods,
    invoices,
    loading 
}: { 
    currentPlan: string; 
    onPlanChange: (planId: string) => void;
    pricingPlans: PricingPlan[];
    userSubscription: UserSubscription | null;
    paymentMethods: any[];
    invoices: any[];
    loading: boolean;
}) => {
    if (loading) {
        return (
            <div className="space-y-8">
                <h3 className="text-xl font-semibold text-white">Membership & Billing</h3>
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-lime-500" />
                    <span className="ml-2 text-gray-400">Loading plans...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h3 className="text-xl font-semibold text-white">Membership & Billing</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Membership Section */}
                <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Crown size={20} className="text-lime-400" />
                        <h4 className="text-lg font-semibold text-white">Membership</h4>
                    </div>
                    
                                         <div className="space-y-4">
                         {pricingPlans && pricingPlans.length > 0 ? (
                             pricingPlans.map((plan) => (
                                <div 
                                    key={plan._id}
                                    className={`relative p-4 rounded-lg border transition-all duration-200 ${
                                        currentPlan === plan._id
                                            ? 'border-lime-500 bg-lime-500/10'
                                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h5 className="font-semibold text-white">{plan.name}</h5>
                                                {currentPlan === plan._id && (
                                                    <span className="bg-lime-500 text-black text-xs font-medium px-2 py-1 rounded-full">
                                                        Current Plan
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-2xl font-bold text-white">
                                                    €{plan.price}
                                                </span>
                                                <span className="text-gray-400">/{plan.billingCycle}</span>
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                {plan.maxCVs === -1 ? 'Unlimited' : plan.maxCVs} CVs, {plan.maxExports === -1 ? 'Unlimited' : plan.maxExports} exports
                                            </div>
                                            {currentPlan === plan._id && (
                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                        <span>Credits used</span>
                                                        <span>{userSubscription?.credits || 0} / {plan.maxCVs === -1 ? 'Unlimited' : plan.maxCVs * 1000}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-600 rounded-full h-2">
                                                        <div 
                                                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${Math.min(100, ((userSubscription?.credits || 0) / (plan.maxCVs === -1 ? 1000 : plan.maxCVs * 1000)) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {currentPlan !== plan._id && (
                                            <button
                                                onClick={() => onPlanChange(plan._id)}
                                                className="px-4 py-2 bg-lime-500 text-black font-medium rounded-lg hover:bg-lime-400 transition-colors duration-200"
                                            >
                                                Upgrade
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-400">No plans available</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Payment Methods Section */}
                <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <CreditCardIcon size={20} className="text-lime-400" />
                        <h4 className="text-lg font-semibold text-white">Payment Methods</h4>
                    </div>
                    
                    <div className="space-y-4">
                        {paymentMethods.length > 0 ? (
                            paymentMethods.map((method) => (
                                <div key={method.id} className="flex items-center justify-between p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            method.provider === 'visa' ? 'bg-purple-600' :
                                            method.provider === 'mastercard' ? 'bg-black' :
                                            method.provider === 'paypal' ? 'bg-blue-600' : 'bg-gray-600'
                                        }`}>
                                            <span className="text-white font-semibold text-sm">
                                                {method.provider === 'visa' ? 'V' :
                                                 method.provider === 'mastercard' ? 'M' :
                                                 method.provider === 'paypal' ? 'P' : 'C'}
                                            </span>
                                        </div>
                                        <div>
                                            {method.type === 'credit_card' ? (
                                                <>
                                                    <p className="font-medium text-white">
                                                        {method.brand} ending {method.last4}
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="font-medium text-white">PayPal</p>
                                                    <p className="text-sm text-gray-400">{method.email}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button className="text-gray-400 hover:text-red-400 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                No payment methods found
                            </div>
                        )}

                        <button className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors duration-200 flex items-center justify-center gap-2">
                            <Plus size={16} />
                            Add Payment Method
                        </button>
                    </div>
                </section>
            </div>

            {/* Invoices Section */}
            <section className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <FileText size={20} className="text-lime-400" />
                    <h4 className="text-lg font-semibold text-white">Invoices</h4>
                </div>
                
                <div className="space-y-3">
                    {invoices.length > 0 ? (
                        invoices.slice(0, 6).map((invoice) => (
                            <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-700/50 border border-gray-600 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" className="w-4 h-4 text-lime-500 bg-gray-600 border-gray-500 rounded focus:ring-lime-500" />
                                    <div>
                                        <p className="font-medium text-white">{invoice.planName} - {new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                                        <p className="text-sm text-gray-400">{invoice.currency} ${invoice.amount.toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {invoice.paymentMethodType && (
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center ${
                                                invoice.paymentMethodType === 'visa' ? 'bg-purple-600' : 'bg-black'
                                            }`}>
                                                <span className="text-white text-xs font-semibold">
                                                    {invoice.paymentMethodType === 'visa' ? 'V' : 'M'}
                                                </span>
                                            </div>
                                            <span className="text-sm text-gray-400">*** {invoice.paymentMethodLast4}</span>
                                        </div>
                                    )}
                                    <button className="text-gray-400 hover:text-white transition-colors">
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            No invoices found
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

const MainContent = ({ 
    activeTab, 
    currentPlan, 
    onPlanChange,
    user,
    pricingPlans,
    userSubscription,
    paymentMethods,
    invoices,
    loading
}: { 
    activeTab: string; 
    currentPlan: string; 
    onPlanChange: (planId: string) => void;
    user: User;
    pricingPlans: PricingPlan[];
    userSubscription: UserSubscription | null;
    paymentMethods: any[];
    invoices: any[];
    loading: boolean;
}) => {
    const router = useRouter();

    const handleClose = () => {
        router.push('/dashboard');
    };

    const getTabTitle = () => {
        switch (activeTab) {
            case 'account': return 'Account & Profile';
            case 'security': return 'Security & Privacy';
            case 'membership': return 'Membership & Billing';
            case 'notifications': return 'Notifications & Communication';
            case 'referrals': return 'Referrals & Rewards';
            case 'integrations': return 'Connected Apps & Integrations';
            case 'workspace': return 'Workspace & Team';
            default: return 'Settings';
        }
    };

    const getTabDescription = () => {
        switch (activeTab) {
            case 'account': return 'Manage your account settings and profile information';
            case 'security': return 'Secure your account and manage privacy settings';
            case 'membership': return 'Manage your subscription and billing information';
            case 'notifications': return 'Control how you receive notifications and communications';
            case 'referrals': return 'Refer friends and track your rewards';
            case 'integrations': return 'Connect and manage third-party applications';
            case 'workspace': return 'Manage your workspace and team settings (Coming soon)';
            default: return '';
        }
    };

    const handleSaveUser = async (userData: User) => {
        try {
            const response = await fetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            
            if (response.ok) {
                // Show success message
                console.log('Profile updated successfully');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'account':
                return <AccountProfile user={user} onSave={handleSaveUser} />;
            case 'security':
                return <SecurityPrivacy user={user} />;
            case 'membership':
                return (
                    <MembershipBilling 
                        currentPlan={currentPlan} 
                        onPlanChange={onPlanChange}
                        pricingPlans={pricingPlans}
                        userSubscription={userSubscription}
                        paymentMethods={paymentMethods}
                        invoices={invoices}
                        loading={loading}
                    />
                );
            case 'notifications':
                return <NotificationsCommunication />;
            case 'referrals':
                return <ReferralsRewards />;
            case 'integrations':
                return <ConnectedAppsIntegrations />;
            case 'workspace':
                return (
                    <div className="space-y-8">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Workspace & Team</h3>
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={24} className="text-gray-400" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Coming Soon</h4>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">
                                Team collaboration features are currently in development. 
                                You'll be able to manage team members, roles, and permissions soon.
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <main className="flex-1 bg-gradient-to-br from-black via-gray-900 to-black p-6 sm:p-8 overflow-y-auto">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white">{getTabTitle()}</h2>
                    <p className="text-gray-400 mt-1">{getTabDescription()}</p>
                </div>
                <button 
                    onClick={handleClose}
                    className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                    <X size={24} />
                </button>
            </header>

            {renderTabContent()}
        </main>
    );
};

// --- MAIN COMPONENT ---
export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('account');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [user, setUser] = useState<User>(mockUser);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>(mockPricingPlans);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<string | undefined>();

  // Set active tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['account', 'security', 'membership', 'notifications', 'referrals', 'integrations', 'workspace'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      if (!session) return;

      try {
        setLoading(true);
        
        // Fetch pricing plans
        try {
          const plansResponse = await fetch('/api/pricing-plans');
          if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            if (Array.isArray(plansData)) {
              setPricingPlans(plansData);
            } else if (plansData.success && Array.isArray(plansData.plans)) {
              setPricingPlans(plansData.plans);
            }
          }
        } catch (error) {
          console.error('Error fetching pricing plans:', error);
        }

        // Fetch user subscription
        try {
          const subscriptionResponse = await fetch('/api/user/subscription');
          if (subscriptionResponse.ok) {
            const subscriptionData = await subscriptionResponse.json();
            if (subscriptionData && typeof subscriptionData === 'object') {
              setUserSubscription(subscriptionData);
              if (subscriptionData.planId) {
                setCurrentPlan(subscriptionData.planId);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user subscription:', error);
        }

        // Fetch payment methods
        try {
          const paymentMethodsResponse = await fetch('/api/user/payment-methods');
          if (paymentMethodsResponse.ok) {
            const paymentMethodsData = await paymentMethodsResponse.json();
            if (paymentMethodsData.success && Array.isArray(paymentMethodsData.paymentMethods)) {
              setPaymentMethods(paymentMethodsData.paymentMethods);
            }
          }
        } catch (error) {
          console.error('Error fetching payment methods:', error);
        }

        // Fetch invoices
        try {
          const invoicesResponse = await fetch('/api/user/invoices');
          if (invoicesResponse.ok) {
            const invoicesData = await invoicesResponse.json();
            if (invoicesData.success && Array.isArray(invoicesData.invoices)) {
              setInvoices(invoicesData.invoices);
            }
          }
        } catch (error) {
          console.error('Error fetching invoices:', error);
        }

        // Fetch user data (you might want to create this API endpoint)
        // const userResponse = await fetch('/api/user/profile');
        // if (userResponse.ok) {
        //   const userData = await userResponse.json();
        //   setUser(userData);
        // }

      } catch (error) {
        console.error('Error fetching data:', error);
        // Keep using mock data if API calls fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  useEffect(() => {
    // In a real app, you might want to save this to localStorage
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanForModal(planId);
    setIsMembershipModalOpen(true);
  };

  const handleMembershipSuccess = async (planKey: string, invoiceId?: string) => {
    // Refresh subscription data
    try {
      const subscriptionResponse = await fetch('/api/user/subscription');
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setUserSubscription(subscriptionData);
        if (subscriptionData.planId) {
          setCurrentPlan(subscriptionData.planId);
        }
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
    
    // Show success message
    // You can implement a toast notification here
    console.log(`Successfully upgraded to ${planKey} plan`);
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="bg-gradient-to-br from-black via-gray-900 to-black min-h-screen font-sans">
          <div className="flex h-screen">
              <Sidebar 
                  theme={theme} 
                  setTheme={setTheme} 
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  user={user}
              />
              <MainContent 
                  activeTab={activeTab}
                  currentPlan={currentPlan}
                  onPlanChange={handlePlanChange}
                  user={user}
                  pricingPlans={pricingPlans}
                  userSubscription={userSubscription}
                  paymentMethods={paymentMethods}
                  invoices={invoices}
                  loading={loading}
              />
          </div>
      </div>
      
      {/* Membership Modal */}
      <MembershipModal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        currentPlanKey={currentPlan}
        preselectedPlanKey={selectedPlanForModal}
        onSuccess={handleMembershipSuccess}
      />
    </RouteGuard>
  );
}
