'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut, Copy, X, Sun, Moon, Download, Check, Loader2 } from 'lucide-react';

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
  avatarUrl: string;
  email: string;
  taxNumber: string;
  address: string;
  phone: string;
}

// --- MOCK DATA ---
// Fallback data in case API calls fail
const mockUser: User = {
  avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=2080&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  email: 'jan.novak@email.com',
  taxNumber: 'CZ12345678',
  address: 'Vinohradská TCŽ/3445, Praha, 130 00, Czech Republic',
  phone: '+420 777 123 456',
};

const mockBillingHistory = [
  { id: 'INV-20250131-61482', total: '28,764.00 CZK', type: 'Golden conversion', status: 'Paid', date: '31th Jan 2025' },
  { id: 'INV-20240121-61475', total: '28,764.00 CZK', type: 'Golden conversion', status: 'Paid', date: 'July 28, 2025' },
  { id: 'INV-20240142-61474', total: '28,764.00 CZK', type: 'Golden conversion', status: 'Paid', date: 'November 5, 2024' },
  { id: 'INV-20240144-61473', total: '28,764.00 CZK', type: 'Golden conversion', status: 'Paid', date: 'February 17, 2024' },
  { id: 'INV-20240113-60335', total: '28,764.00 CZK', type: 'Golden conversion', status: 'Paid', date: 'September 9, 2023' },
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

    return (
        <aside className="w-80 bg-white dark:bg-gray-800 p-6 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700">
            <div>
                <div className="flex flex-col items-center mb-6">
                    <img 
                        src={user.avatarUrl} 
                        alt="User Avatar" 
                        className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-gray-200 dark:border-gray-600"
                        onError={(e) => { 
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; 
                            target.src='https://placehold.co/96x96/EFEFEF/333333?text=User'; 
                        }}
                    />
                    <ThemeToggle theme={theme} setTheme={setTheme} />
                </div>
                <nav>
                    <ul>
                        {[
                            { id: 'account', name: 'Account' },
                            { id: 'membership', name: 'Membership' },
                            { id: 'contact', name: 'Contact' },
                            { id: 'billing', name: 'Billing' },
                            { id: 'refer', name: 'Refer Friends' }
                        ].map(item => (
                            <li key={item.id} className="mb-1">
                                <button 
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full text-left block py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
                                        activeTab === item.id
                                        ? 'bg-lime-500 text-white' 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {item.name}
                                </button>
                            </li>
                        ))}
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

const BillingDetails = ({ user }: { user: User }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Billing email:</label>
            <p className="text-gray-800 dark:text-gray-200">{user.email}</p>
        </div>
        <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Tax Number:</label>
            <p className="text-gray-800 dark:text-gray-200">{user.taxNumber}</p>
        </div>
        <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Address:</label>
            <p className="text-gray-800 dark:text-gray-200">{user.address}</p>
        </div>
        <div>
            <label className="text-sm text-gray-500 dark:text-gray-400">Phone:</label>
            <p className="text-gray-800 dark:text-gray-200">{user.phone}</p>
        </div>
    </div>
);

const PaymentMethods = () => (
    <section>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Payment methods</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">No card registered to your account</p>
        <div className="flex flex-wrap gap-6">
            <div className="border border-lime-300 dark:border-lime-700 bg-lime-50 dark:bg-lime-900/20 rounded-lg p-4 flex items-center gap-4 w-full sm:w-auto">
                <div className="text-lime-600 dark:text-lime-400">
                    <VisaIcon />
                </div>
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">Visa ending in 4516</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Expiry 08/2026</p>
                </div>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center w-full sm:w-72">
                 <p className="font-semibold text-gray-800 dark:text-gray-200">Card Information</p>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No card on file</p>
                 <button className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-1 px-4 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
                     Add Card
                 </button>
            </div>
        </div>
    </section>
);

const BillingHistory = () => (
    <section>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Billing history</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">View and track your past invoices and payment history.</p>
        <div className="overflow-x-auto">
            <div className="min-w-full text-sm">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 font-medium text-gray-500 dark:text-gray-400 p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="col-span-3">Invoice number</div>
                    <div className="col-span-2">Total incl. tax</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Date</div>
                </div>
                {/* Table Body */}
                {mockBillingHistory.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="col-span-3 text-gray-800 dark:text-gray-200 font-medium">{item.id}</div>
                        <div className="col-span-2 text-gray-800 dark:text-gray-200">{item.total}</div>
                        <div className="col-span-3 text-gray-800 dark:text-gray-200">{item.type}</div>
                        <div className="col-span-2">
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                                {item.status}
                            </span>
                        </div>
                        <div className="col-span-2 text-gray-600 dark:text-gray-400 flex justify-end items-center gap-3">
                            {item.date}
                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                <Download size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <a href="#" className="text-red-600 font-medium mt-6 inline-block hover:underline">
            Cancel subscription
        </a>
    </section>
);

const PlanManagement = ({ 
    currentPlan, 
    onPlanChange, 
    pricingPlans, 
    userSubscription,
    loading 
}: { 
    currentPlan: string; 
    onPlanChange: (planId: string) => void;
    pricingPlans: PricingPlan[];
    userSubscription: UserSubscription | null;
    loading: boolean;
}) => {
    if (loading) {
        return (
            <section>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Choose Your Plan</h3>
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-lime-500" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading plans...</span>
                </div>
            </section>
        );
    }

    return (
        <section>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Choose Your Plan</h3>
            
            {/* Current Plan Display */}
            {userSubscription && userSubscription.planName && (
                <div className="mb-8 p-6 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-700 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Current Plan</h4>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 dark:text-gray-300">{userSubscription.planName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Status: <span className={`font-medium ${userSubscription.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                                    {userSubscription.status}
                                </span>
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Credits remaining: {userSubscription.credits || 0}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Next billing: {userSubscription.endDate ? new Date(userSubscription.endDate).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pricingPlans && pricingPlans.length > 0 ? (
                    pricingPlans.map((plan) => (
                        <div 
                            key={plan._id}
                            className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${
                                currentPlan === plan._id
                                    ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-lime-300 dark:hover:border-lime-600'
                            }`}
                        >
                            {plan.isPopular && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-lime-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                        Most Popular
                                    </span>
                                </div>
                            )}
                            
                            <div className="text-center mb-6">
                                <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{plan.name}</h4>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold text-gray-800 dark:text-white">
                                        ${plan.price}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">/{plan.billingCycle}</span>
                                </div>
                            </div>
                            
                            <ul className="space-y-3 mb-6">
                                {plan.features && plan.features.length > 0 ? (
                                    plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                            <Check size={16} className="text-lime-500 mr-2 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-sm text-gray-500 dark:text-gray-400">No features listed</li>
                                )}
                            </ul>
                            
                            <button
                                onClick={() => onPlanChange(plan._id)}
                                className={`w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 ${
                                    currentPlan === plan._id
                                        ? 'bg-lime-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-lime-500 hover:text-white'
                                }`}
                            >
                                {currentPlan === plan._id ? 'Current Plan' : 'Select Plan'}
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No plans available</p>
                    </div>
                )}
            </div>
        </section>
    );
};

const MainContent = ({ 
    activeTab, 
    currentPlan, 
    onPlanChange,
    user,
    pricingPlans,
    userSubscription,
    loading
}: { 
    activeTab: string; 
    currentPlan: string; 
    onPlanChange: (planId: string) => void;
    user: User;
    pricingPlans: PricingPlan[];
    userSubscription: UserSubscription | null;
    loading: boolean;
}) => {
    const router = useRouter();

    const handleClose = () => {
        router.push('/dashboard');
    };

    const getTabTitle = () => {
        switch (activeTab) {
            case 'account': return 'Account';
            case 'membership': return 'Membership';
            case 'contact': return 'Contact';
            case 'billing': return 'Billing';
            case 'refer': return 'Refer Friends';
            default: return 'Settings';
        }
    };

    const getTabDescription = () => {
        switch (activeTab) {
            case 'account': return 'Manage your account settings and preferences';
            case 'membership': return 'Get the most out of Konverzky and choose the subscription that\'s right for you';
            case 'contact': return 'Update your contact information and preferences';
            case 'billing': return 'Manage your billing information and payment methods';
            case 'refer': return 'Refer friends and earn rewards';
            default: return '';
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'account':
                return (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Account Information</h3>
                            <BillingDetails user={user} />
                        </section>
                    </div>
                );
            case 'membership':
                return (
                    <div className="space-y-6">
                        <PlanManagement 
                            currentPlan={currentPlan} 
                            onPlanChange={onPlanChange}
                            pricingPlans={pricingPlans}
                            userSubscription={userSubscription}
                            loading={loading}
                        />
                    </div>
                );
            case 'contact':
                return (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Contact Information</h3>
                            <BillingDetails user={user} />
                        </section>
                    </div>
                );
            case 'billing':
                return (
                    <div className="space-y-10">
                        <section>
                            <BillingDetails user={user} />
                            <a href="#" className="text-lime-500 dark:text-lime-400 font-medium hover:underline">
                                Update billing details &gt;
                            </a>
                        </section>
                        
                        <PaymentMethods />
                        
                        <BillingHistory />

                        <section>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Recurring payment terms</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 mb-4">Membership will be activated immediately after payment is made.</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed">
                                By submitting your order and making a payment, you agree to the automatic renewal of your subscription in the future and to the storage of your payment details on the GoPay payment gateway. GoPay handles your payment details in accordance with the international PCI-DSS Level 1 security standard (this is the highest level of data security in the payment card processing sector).
                            </p>
                        </section>
                    </div>
                );
            case 'refer':
                return (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Refer Friends</h3>
                            <p className="text-gray-500 dark:text-gray-400">Refer your friends and earn rewards for each successful referral.</p>
                        </section>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <main className="flex-1 bg-white dark:bg-gray-800 p-6 sm:p-8 overflow-y-auto">
            <header className="flex justify-between items-center mb-2">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{getTabTitle()}</h2>
                <button 
                    onClick={handleClose}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <X size={24} />
                </button>
            </header>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{getTabDescription()}</p>

            {renderTabContent()}
        </main>
    );
};

// --- MAIN COMPONENT ---
export default function SettingsPage() {
  const { data: session } = useSession();
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('membership');
  const [currentPlan, setCurrentPlan] = useState('free');
  const [user, setUser] = useState<User>(mockUser);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>(mockPricingPlans);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handlePlanChange = async (planId: string) => {
    try {
      // Make API call to update user's plan
      const response = await fetch('/api/user/subscription', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        setCurrentPlan(planId);
        // Refresh subscription data
        const subscriptionResponse = await fetch('/api/user/subscription');
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setUserSubscription(subscriptionData);
        }
      } else {
        console.error('Failed to update plan');
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans">
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
                loading={loading}
            />
        </div>
    </div>
  );
}
