'use client';

import React, { useState, useEffect } from 'react';
import { usePricingPlans } from '@/lib/hooks/usePricingPlans';
import { AdminPricingPlanSkeleton } from './AdminSkeletons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  Edit, 
  Eye, 
  Link, 
  ToggleLeft, 
  ToggleRight,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Settings,
  Globe,
  Gift,
  Tag,
  X,
  DollarSign
} from 'lucide-react';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import RedesignedPricingCards from '@/components/pricing/RedesignedPricingCards';
import PricingPlanEditModal from '@/components/admin/PricingPlanEditModal';
import PromotionalOfferManager from '@/components/admin/PromotionalOfferManager';
import DiscountCodeManager from '@/components/admin/DiscountCodeManager';
import RevenueManager from '@/components/admin/RevenueManager';
import { getCountryName, getCountryFlag, DEFAULT_PLAN_KEY, TIME_RANGES } from '@/lib/config/adminConstants';
import { useRouter } from 'next/navigation';
// RegionalPricing interface (from database)
interface RegionalPricing {
  currency: string;
  currencySymbol: string;
  dayPass: number;
  monthly: number;
  quarterly: number;
  yearly: number;
}

interface PricingPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
  billingCycle: string;
  maxCVs: number;
  maxExports: number;
  storageLimit: number;
  features: string[];
  status: 'active' | 'inactive';
  isPopular: boolean;
  isBestValue: boolean;
  sortOrder: number;
  stripePriceId_monthly?: string;
  stripePriceId_quarterly?: string;
  stripePriceId_yearly?: string;
  stripePriceId_one_time?: string;
  razorpayPlanId_monthly?: string;
  razorpayPlanId_quarterly?: string;
  razorpayPlanId_yearly?: string;
  dayPassDuration?: number;
}

const PricingPlanManager: React.FC = () => {
  const router = useRouter();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedPlanForPreview, setSelectedPlanForPreview] = useState<PricingPlan | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PricingPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PricingPlan | null>(null);
  const [isPlanDetailsModalOpen, setIsPlanDetailsModalOpen] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<PricingPlan | null>(null);
  const [allPromotionalOffers, setAllPromotionalOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [regionalFilter, setRegionalFilter] = useState<string>('all');
  const [priceRegions, setPriceRegions] = useState<any[]>([]);
  const [countryMappings, setCountryMappings] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Use the shared pricing hook
  const { plans, loading, refetch, promotionalOffers } = usePricingPlans({ includeInactive: true });

  // Ensure plans is always an array to prevent filter errors
  const safePlans = Array.isArray(plans) ? plans : [];
  const safePromotionalOffers = Array.isArray(promotionalOffers) ? promotionalOffers : [];
  
  // Ensure pricing data is always an array to prevent errors
  const safePriceRegions = Array.isArray(priceRegions) ? priceRegions : [];
  const safeCountryMappings = Array.isArray(countryMappings) ? countryMappings : [];

  // Calculate metrics for dashboard overview
  const activePlans = safePlans.filter(p => p.status === 'active').length;
  const activePromotions = safePromotionalOffers.filter((offer: any) => offer.isActive).length;
  const regionsWithCustomPricing = safePriceRegions.length; // From database
  
  // Calculate monthly changes (placeholder - would need historical data)
  const activePlansChange = 2; // Would calculate from historical data
  const activePromotionsChange = -1; // Would calculate from historical data
  const regionsChange = 0; // Would calculate from historical data

  // Fetch all promotional offers for display
  useEffect(() => {
    const fetchAllOffers = async () => {
      setLoadingOffers(true);
      try {
        const response = await fetch('/api/admin/promotional-offers');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            setAllPromotionalOffers(data);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching promotional offers:', error.message);
        } else if (error && typeof error === 'object' && !('target' in error)) {
          console.error('Error fetching promotional offers:', String(error));
        }
      } finally {
        setLoadingOffers(false);
      }
    };
    fetchAllOffers();
  }, []);

  // Fetch pricing regions and country mappings from database
  useEffect(() => {
    const fetchPricingData = async () => {
      setLoadingPricing(true);
      try {
        const response = await fetch('/api/admin/pricing-regions');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.success) {
              setPriceRegions(data.priceRegions || []);
              setCountryMappings(data.countryMappings || []);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching pricing regions:', error.message);
        } else if (error && typeof error === 'object' && !('target' in error)) {
          console.error('Error fetching pricing regions:', String(error));
        }
      } finally {
        setLoadingPricing(false);
      }
    };
    fetchPricingData();
  }, []);

  const handleRowClick = (plan: PricingPlan) => {
    setSelectedPlanForDetails(plan);
    setIsPlanDetailsModalOpen(true);
  };

  const getOfferStatus = (offer: any) => {
    const now = new Date();
    const validFrom = new Date(offer.validFrom);
    const validUntil = new Date(offer.validUntil);

    if (!offer.isActive) {
      return { text: 'Inactive', color: 'bg-gray-700 text-gray-400', badge: 'Inactive' };
    }
    if (now < validFrom) {
      return { text: 'Scheduled', color: 'bg-blue-900 text-blue-300', badge: 'Scheduled' };
    }
    if (now > validUntil) {
      return { text: 'Expired', color: 'bg-red-900 text-red-300', badge: 'Expired' };
    }
    return { text: 'Active', color: 'bg-green-900 text-green-300', badge: 'Active' };
  };

  const formatOfferDiscount = (offer: any) => {
    // Use bannerText if available (e.g., "20% OFF", "$10 OFF")
    if (offer.bannerText) {
      return offer.bannerText;
    }
    
    // Fallback: try to calculate from promotional pricing
    if (offer.promotionalPricing && offer.promotionalPricing.length > 0) {
      // For now, just return a generic discount text
      return 'Discount Available';
    }
    
    // Final fallback
    return offer.title || 'Special Offer';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleToggleActive = async (planId: string, currentStatus: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: currentStatus === 'active' ? 'inactive' : 'active' 
        })
      });

      if (response.ok) {
        refetch(); // Refresh plans
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error toggling plan status:', error.message);
      } else if (error && typeof error === 'object' && !('target' in error)) {
        console.error('Error toggling plan status:', String(error));
      }
    }
  };

  const handlePreviewPlan = (plan: PricingPlan) => {
    setSelectedPlanForPreview(plan);
    setIsPreviewModalOpen(true);
  };

  const handleGenerateCheckoutLink = async (plan: PricingPlan) => {
    try {
      const response = await fetch('/api/admin/plans/checkout-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan.key })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          // Copy to clipboard
          navigator.clipboard.writeText(data.checkoutUrl);
          alert('Checkout link copied to clipboard!');
        } else {
          alert('Invalid response from server');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error generating checkout link:', error.message);
      } else if (error && typeof error === 'object' && !('target' in error)) {
        console.error('Error generating checkout link:', String(error));
      }
      alert('Failed to generate checkout link');
    }
  };

  const handleEditPlan = (plan: PricingPlan) => {
    setSelectedPlanForEdit(plan);
    setIsEditModalOpen(true);
  };

  const handlePlanUpdated = () => {
    refetch(); // Refresh plans after edit
    setIsEditModalOpen(false);
    setSelectedPlanForEdit(null);
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === DEFAULT_PLAN_KEY) return 0;
    if (plan.key === 'day_pass') return plan.price_one_time || 0;
    if (plan.key === 'pro_monthly') return plan.price_monthly || 0;
    if (plan.key === 'pro_quarterly') return plan.price_quarterly || 0;
    if (plan.key === 'pro_yearly') return plan.price_yearly || 0;
    return 0;
  };

  const getBillingCycle = (plan: PricingPlan) => {
    if (plan.key === DEFAULT_PLAN_KEY) return 'N/A';
    if (plan.key === 'day_pass') return 'One-time';
    if (plan.price_monthly) return 'Monthly';
    if (plan.price_quarterly) return 'Quarterly';
    if (plan.price_yearly) return 'Annually';
    return 'N/A';
  };

  const getProviderReadiness = (plan: PricingPlan) => {
    const readiness = {
      stripe: false,
      razorpay: false,
      stripeDetails: '',
      razorpayDetails: ''
    };

    if (plan.key === DEFAULT_PLAN_KEY) {
      readiness.stripe = true;
      readiness.razorpay = true;
      readiness.stripeDetails = 'Free plan';
      readiness.razorpayDetails = 'Free plan';
    } else if (plan.key === 'day_pass') {
      readiness.stripe = !!plan.stripePriceId_one_time;
      readiness.razorpay = true; // Uses Order
      readiness.stripeDetails = plan.stripePriceId_one_time || 'Missing one-time price ID';
      readiness.razorpayDetails = 'Uses Order (no plan ID needed)';
    } else {
      // Pro plans
      readiness.stripe = !!(plan.stripePriceId_monthly || plan.stripePriceId_quarterly || plan.stripePriceId_yearly);
      readiness.razorpay = !!(plan.razorpayPlanId_monthly || plan.razorpayPlanId_quarterly || plan.razorpayPlanId_yearly);
      
      const stripeIds = [];
      if (plan.stripePriceId_monthly) stripeIds.push('Monthly');
      if (plan.stripePriceId_quarterly) stripeIds.push('Quarterly');
      if (plan.stripePriceId_yearly) stripeIds.push('Yearly');
      
      const razorpayIds = [];
      if (plan.razorpayPlanId_monthly) razorpayIds.push('Monthly');
      if (plan.razorpayPlanId_quarterly) razorpayIds.push('Quarterly');
      if (plan.razorpayPlanId_yearly) razorpayIds.push('Yearly');
      
      readiness.stripeDetails = stripeIds.length > 0 ? stripeIds.join(', ') : 'No price IDs';
      readiness.razorpayDetails = razorpayIds.length > 0 ? razorpayIds.join(', ') : 'No plan IDs';
    }

    return readiness;
  };

  // Add error boundary wrapper
  if (loading && safePlans.length === 0) {
    return (
      <div className="space-y-6">
        <AdminPricingPlanSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <Tabs defaultValue="pricing" className="w-full" key="pricing-manager-tabs">
        <TabsList className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-none p-0 h-auto w-full justify-start">
          <TabsTrigger 
            value="pricing" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Current Pricing
          </TabsTrigger>
          <TabsTrigger 
            value="regional" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Globe className="h-4 w-4 mr-2" />
            Regional Settings
          </TabsTrigger>
          <TabsTrigger 
            value="promotions" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Gift className="h-4 w-4 mr-2" />
            Promotional Offers
          </TabsTrigger>
          <TabsTrigger 
            value="coupons" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Tag className="h-4 w-4 mr-2" />
            Coupon Management
          </TabsTrigger>
          <TabsTrigger 
            value="revenue" 
            className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 rounded-none px-6 py-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
        </TabsList>

        {/* Current Pricing Tab */}
        <TabsContent value="pricing" className="mt-6">
          <div className="space-y-6">
            {/* Dashboard Overview Section */}
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                  <p className="text-gray-400 mt-1">A summary of key pricing metrics.</p>
                </div>
                <Button
                  onClick={() => router.push('/admin/pricing-plans')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Regional Pricing
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-3xl font-bold text-white mb-2">{activePlans}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {activePlansChange > 0 ? (
                        <span className="text-green-400">↑+{activePlansChange} this month</span>
                      ) : activePlansChange < 0 ? (
                        <span className="text-red-400">↓{activePlansChange} this month</span>
                      ) : (
                        <span className="text-gray-500">— No change</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Active Plans</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-3xl font-bold text-white mb-2">{activePromotions}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {activePromotionsChange > 0 ? (
                        <span className="text-green-400">↑+{activePromotionsChange} this month</span>
                      ) : activePromotionsChange < 0 ? (
                        <span className="text-red-400">↓{activePromotionsChange} this month</span>
                      ) : (
                        <span className="text-gray-500">— No change</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Active Promotions</div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="text-3xl font-bold text-white mb-2">{regionsWithCustomPricing}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {regionsChange > 0 ? (
                        <span className="text-green-400">↑+{regionsChange} this month</span>
                      ) : regionsChange < 0 ? (
                        <span className="text-red-400">↓{regionsChange} this month</span>
                      ) : (
                        <span className="text-gray-500">— No change</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Regions with Custom Pricing</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Pricing Plans</h2>
                <p className="text-gray-400 mt-1">Manage subscription plans and pricing</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus size={16} />
                  Add Plan
                </button>
              </div>
            </div>

            {/* Plans Table View */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">PLAN NAME</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">BASE PRICE</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">BILLING CYCLE</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">STATUS</th>
                        <th className="text-left p-4 text-sm font-semibold text-gray-300">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safePlans.map((plan) => {
                        const price = getPlanPrice(plan);
                        const billingCycle = getBillingCycle(plan);
                        const priceDisplay = plan.key === DEFAULT_PLAN_KEY 
                          ? 'Free' 
                          : price === 0 
                            ? 'Contact Us' 
                            : `$${price.toFixed(2)}`;
                        
                        return (
                          <tr 
                            key={plan._id} 
                            className="border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors"
                            onClick={() => handleRowClick(plan)}
                          >
                            <td className="p-4">
                              <div className="font-medium text-white">{plan.name}</div>
                            </td>
                            <td className="p-4 text-gray-300">{priceDisplay}</td>
                            <td className="p-4 text-gray-300">{billingCycle}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                plan.status === 'active'
                                  ? 'bg-green-900 text-green-300'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {plan.status === 'active' ? 'Active' : 'Archived'}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPlan(plan);
                                }}
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Promotional Offers Section */}
            <div className="mt-8">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Promotional Offers</h2>
                <p className="text-gray-400 mt-1">Active and expired promotional offers</p>
              </div>
              
              {loadingOffers ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allPromotionalOffers.map((offer) => {
                    const status = getOfferStatus(offer);
                    const discountText = formatOfferDiscount(offer);
                    const isExpired = status.badge === 'Expired';
                    const expiryDate = isExpired 
                      ? formatDate(offer.validUntil) 
                      : formatDate(offer.validUntil);
                    
                    return (
                      <Card key={offer._id} className="bg-gray-800 border-gray-700 hover:shadow-lg transition-shadow">
                        <CardContent className="p-6 relative">
                          <div className="absolute top-4 right-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.badge}
                            </span>
                          </div>
                          
                          <div className="mb-4">
                            <div className="text-sm text-gray-400 mb-1">Code: {offer.title?.toUpperCase() || 'N/A'}</div>
                            <div className="text-2xl font-bold text-white mb-2">{discountText}</div>
                            <div className="text-sm text-gray-300">{offer.description || 'No description'}</div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-400">
                              {isExpired ? `Expired: ${expiryDate}` : `Expires: ${expiryDate}`}
                            </div>
                            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                              Details
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {allPromotionalOffers.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      No promotional offers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Regional Settings Tab */}
        <TabsContent value="regional" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Regional Settings</h2>
                <p className="text-gray-400 mt-1">Regional pricing is now managed per plan. Use the dedicated pricing plans page to edit regional pricing.</p>
              </div>
              <Button
                onClick={() => router.push('/admin/pricing-plans')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Regional Pricing
              </Button>
            </div>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Regional Pricing Management</h3>
                  <p className="text-gray-400 mb-6">
                    Regional pricing is now stored directly in each pricing plan. Click the button above to manage regional pricing for all plans.
                  </p>
                  <Button
                    onClick={() => router.push('/admin/pricing-plans')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Go to Pricing Plans Management
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Promotional Offers Tab */}
        <TabsContent value="promotions" className="mt-6">
          <PromotionalOfferManager />
        </TabsContent>

        {/* Coupon Management Tab */}
        <TabsContent value="coupons" className="mt-6">
          <DiscountCodeManager />
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-6">
          <RevenueManager />
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {selectedPlanForPreview && (
        <UniversalPaymentModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          currentUserPlan={DEFAULT_PLAN_KEY}
          preselectedPlanKey={selectedPlanForPreview.key}
          onSuccess={() => setIsPreviewModalOpen(false)}
          adminMode={true}
          previewMode={true}
        />
      )}

      {/* Edit Modal */}
      {selectedPlanForEdit && (
        <PricingPlanEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          plan={selectedPlanForEdit}
          onSave={handlePlanUpdated}
        />
      )}

      {/* Plan Details Modal */}
      {selectedPlanForDetails && (
        <div 
          className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 ${isPlanDetailsModalOpen ? 'block' : 'hidden'}`}
          onClick={() => setIsPlanDetailsModalOpen(false)}
        >
          <Card 
            className="bg-gray-800 border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedPlanForDetails.name}</h3>
                  <p className="text-gray-400">{selectedPlanForDetails.description}</p>
                </div>
                <button
                  onClick={() => setIsPlanDetailsModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Pricing */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Pricing</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPlanForDetails.price_monthly && (
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Monthly</div>
                        <div className="text-xl font-bold text-white">${selectedPlanForDetails.price_monthly.toFixed(2)}</div>
                      </div>
                    )}
                    {selectedPlanForDetails.price_quarterly && (
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Quarterly</div>
                        <div className="text-xl font-bold text-white">${selectedPlanForDetails.price_quarterly.toFixed(2)}</div>
                      </div>
                    )}
                    {selectedPlanForDetails.price_yearly && (
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Yearly</div>
                        <div className="text-xl font-bold text-white">${selectedPlanForDetails.price_yearly.toFixed(2)}</div>
                      </div>
                    )}
                    {selectedPlanForDetails.price_one_time && (
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">One-time</div>
                        <div className="text-xl font-bold text-white">${selectedPlanForDetails.price_one_time.toFixed(2)}</div>
                      </div>
                    )}
                    {selectedPlanForDetails.key === DEFAULT_PLAN_KEY && (
                      <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="text-sm text-gray-400">Price</div>
                        <div className="text-xl font-bold text-white">Free</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Features</h4>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <ul className="space-y-2">
                      {selectedPlanForDetails.features.map((feature, index) => (
                        <li key={index} className="text-gray-300 flex items-start gap-2">
                          <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Limits */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Limits</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Max CVs</div>
                      <div className="text-xl font-bold text-white">{selectedPlanForDetails.maxCVs === -1 ? 'Unlimited' : selectedPlanForDetails.maxCVs}</div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Max Exports</div>
                      <div className="text-xl font-bold text-white">{selectedPlanForDetails.maxExports === -1 ? 'Unlimited' : selectedPlanForDetails.maxExports}</div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <div className="text-sm text-gray-400">Storage</div>
                      <div className="text-xl font-bold text-white">{selectedPlanForDetails.storageLimit === -1 ? 'Unlimited' : `${selectedPlanForDetails.storageLimit}GB`}</div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedPlanForDetails.status === 'active'
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {selectedPlanForDetails.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsPlanDetailsModalOpen(false);
                        handlePreviewPlan(selectedPlanForDetails);
                      }}
                      className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      onClick={() => {
                        setIsPlanDetailsModalOpen(false);
                        handleEditPlan(selectedPlanForDetails);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PricingPlanManager;
