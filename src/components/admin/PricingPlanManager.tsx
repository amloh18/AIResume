'use client';

import React, { useState, useEffect } from 'react';
import { usePricingPlans } from '@/lib/hooks/usePricingPlans';
import { AdminPricingPlanSkeleton } from './AdminSkeletons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  DollarSign,
  Save,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import RedesignedPricingCards from '@/components/pricing/RedesignedPricingCards';
import PricingPlanEditModal from '@/components/admin/PricingPlanEditModal';
import AddPricingModal from '@/components/admin/AddPricingModal';
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
  const [promotionalOffersState, setPromotionalOffersState] = useState<PromotionalOffer[]>([]); // Renamed to avoid conflict with hook
  const [regionalPricing, setRegionalPricing] = useState<any[]>([]);
  const [loadingOffersState, setLoadingOffersState] = useState(false); // Renamed to avoid conflict with hook
  const [regionalFilter, setRegionalFilter] = useState<string>('all');
  const [countryPricing, setCountryPricing] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);

  // Use the shared pricing hook
  const { plans, loading, refetch, promotionalOffers } = usePricingPlans({ includeInactive: true });

  // Ensure plans is always an array to prevent filter errors
  const safePlans = Array.isArray(plans) ? plans : [];
  const safePromotionalOffers = Array.isArray(promotionalOffers) ? promotionalOffers : [];

  // Ensure pricing data is always an array to prevent errors
  const safeCountryPricing = Array.isArray(countryPricing) ? countryPricing : [];



  // Calculate metrics for dashboard overview
  const activePlans = safePlans.filter(p => p.status === 'active').length;
  const activePromotions = safePromotionalOffers.filter((offer: any) => offer.isActive).length;
  const regionsWithCustomPricing = safeCountryPricing.length; // From database

  // Calculate monthly changes (placeholder - would need historical data)
  const activePlansChange = 2; // Would calculate from historical data
  const activePromotionsChange = -1; // Would calculate from historical data
  const regionsChange = 0; // Would calculate from historical data

  interface PromotionalOffer {
    _id: string;
    title: string;
    description: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
    bannerText?: string;
    promotionalPricing?: any[];
  }

  // Fetch all promotional offers for display
  useEffect(() => {
    const fetchAllOffers = async () => {
      setLoadingOffersState(true);
      try {
        const response = await fetch('/api/admin/promotional-offers');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            setPromotionalOffersState(data);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching promotional offers:', error.message);
        } else if (error && typeof error === 'object' && !('target' in error)) {
          console.error('Error fetching promotional offers:', String(error));
        }
      } finally {
        setLoadingOffersState(false);
      }
    };
    fetchAllOffers();
  }, []);

  // Fetch country pricing from database
  useEffect(() => {
    const fetchPricingData = async () => {
      setLoadingPricing(true);
      try {
        const response = await fetch('/api/admin/country-pricing');

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json();

            if (responseData.success) {
              // Extract data from the nested 'data' property (standard api-validator format)
              // Fallback to direct property for backward compatibility
              const pricingList = responseData.data?.countryPricing || responseData.countryPricing || [];
              setCountryPricing(pricingList);
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching country pricing:', error.message);
        } else if (error && typeof error === 'object' && !('target' in error)) {
          console.error('Error fetching country pricing:', String(error));
        }
      } finally {
        setLoadingPricing(false);
      }
    };
    fetchPricingData();
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, { dayPass: number, monthly: number, quarterly: number, yearly: number }>>({});
  const [savingPricing, setSavingPricing] = useState(false);

  const handleSaveRegionalPricing = async () => {
    setSavingPricing(true);
    try {
      const updates = Object.entries(editedPrices).map(async ([countryCode, prices]) => {
        // Find original data to keep constant fields
        const original = countryPricing.find(cp => cp.countryCode === countryCode);
        if (!original) return null;

        const payload = {
          countryCode: original.countryCode,
          countryName: original.countryName,
          currency: original.currency,
          currencySymbol: original.currencySymbol,
          regionId: original.regionId,
          planPrices: {
            ...original.planPrices,
            dayPass: { ...original.planPrices?.dayPass, price: prices.dayPass },
            monthly: { ...original.planPrices?.monthly, price: prices.monthly },
            quarterly: { ...original.planPrices?.quarterly, price: prices.quarterly },
            yearly: { ...original.planPrices?.yearly, price: prices.yearly }
          }
        };

        const response = await fetch('/api/admin/country-pricing', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Failed to update ${countryCode}`);
        return response.json();
      });

      await Promise.all(updates);

      // Refresh data
      const response = await fetch('/api/admin/country-pricing');
      if (response.ok) {
        const responseData = await response.json();
        // Handle potentially nested data structure same as useEffect
        if (responseData.success) {
          const pricingList = responseData.data?.countryPricing || responseData.countryPricing || [];
          setCountryPricing(pricingList);
        }
      }

      setIsEditing(false);
      setEditedPrices({});

    } catch (error) {
      console.error('Error saving pricing:', error);
      alert('Failed to save some pricing updates');
    } finally {
      setSavingPricing(false);
    }
  };

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
    if (plan.key === 'pro_lifetime') return plan.price_yearly || 0;
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
              <div>
                <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                <p className="text-gray-400 mt-1">A summary of key pricing metrics.</p>
              </div>

              <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6">
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
                      {safePlans.map((plan: any) => {
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
                              <span className={`px-2 py-1 rounded-full text-xs ${plan.status === 'active'
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

              {loadingOffersState ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
                  {promotionalOffersState.map((offer) => {
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

                  {promotionalOffersState.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      No promotional offers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regional" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Pricing by Region</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage regional pricing for all plans.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsAddCountryModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Country
                </Button>
                {isEditing ? (
                  <>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedPrices({});
                      }}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveRegionalPricing}
                      disabled={savingPricing}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {savingPricing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      // Initialize edit state with current values
                      const initialEdits: Record<string, any> = {};
                      safeCountryPricing.forEach(cp => {
                        initialEdits[cp.countryCode] = {
                          dayPass: cp.planPrices?.dayPass?.price || 0,
                          monthly: cp.planPrices?.monthly?.price || 0,
                          quarterly: cp.planPrices?.quarterly?.price || 0,
                          yearly: cp.planPrices?.yearly?.price || 0
                        };
                      });
                      setEditedPrices(initialEdits);
                      setIsEditing(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Manage Regional Pricing
                  </Button>
                )}
              </div>
            </div>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">Country</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Currency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Day Pass</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monthly</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quarterly</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Yearly</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {loadingPricing || loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {safeCountryPricing.length > 0 ? (
                            safeCountryPricing.map((pricing: any) => {
                              const countryCode = pricing.countryCode;
                              const edits = editedPrices[countryCode] || {};

                              return (
                                <tr key={pricing._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl" role="img" aria-label={pricing.countryName}>
                                        {getCountryFlag(pricing.countryCode)}
                                      </span>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {getCountryName(pricing.countryCode)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {pricing.countryCode}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <span className="font-semibold text-gray-700 dark:text-gray-300">{pricing.currency}</span>
                                      <span className="text-xs text-gray-500">({pricing.currencySymbol})</span>
                                    </div>
                                  </td>
                                  {/* Price Columns */}
                                  {(['dayPass', 'monthly', 'quarterly', 'yearly'] as const).map((planKey) => (
                                    <td key={planKey} className="px-6 py-4 whitespace-nowrap">
                                      {isEditing ? (
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                            {pricing.currencySymbol}
                                          </span>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={edits[planKey] !== undefined ? edits[planKey] : pricing.planPrices?.[planKey]?.price || 0}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              setEditedPrices(prev => ({
                                                ...prev,
                                                [countryCode]: {
                                                  ...prev[countryCode],
                                                  [planKey]: val
                                                }
                                              }));
                                            }}
                                            className="w-24 pl-5 h-8 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-sm text-gray-900 dark:text-white font-medium">
                                          {pricing.currencySymbol}{pricing.planPrices?.[planKey]?.price?.toLocaleString() || '0'}
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center">
                                <div className="text-gray-500 dark:text-gray-400 flex flex-col items-center">
                                  <Globe className="h-12 w-12 text-gray-300 mb-3" />
                                  <p className="text-lg font-medium mb-1">No regional pricing configured.</p>
                                  <p className="text-sm">Click "Manage Regional Pricing" to verify configuration.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
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
      {
        selectedPlanForPreview && (
          <UniversalPaymentModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            currentUserPlan={DEFAULT_PLAN_KEY}
            preselectedPlanKey={selectedPlanForPreview.key}
            onSuccess={() => setIsPreviewModalOpen(false)}
            adminMode={true}
            previewMode={true}
          />
        )
      }

      {/* Edit Modal */}
      {
        selectedPlanForEdit && (
          <PricingPlanEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            plan={selectedPlanForEdit}
            onSave={handlePlanUpdated}
          />
        )
      }

      {/* Plan Details Modal */}
      {
        selectedPlanForDetails && (
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
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedPlanForDetails.status === 'active'
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
        )
      }
      <AddPricingModal
        isOpen={isAddCountryModalOpen}
        onClose={() => setIsAddCountryModalOpen(false)}
        onSuccess={() => {
          // Re-fetch pricing data
          const fetchPricingData = async () => {
            setLoadingPricing(true);
            try {
              const response = await fetch('/api/admin/country-pricing');
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  setCountryPricing(data.data?.countryPricing || data.countryPricing || []);
                }
              }
            } finally {
              setLoadingPricing(false);
            }
          };
          fetchPricingData();
          refetch(); // Also refetch plans just in case
        }}
        plans={safePlans}
      />
    </div >
  );
};

export default PricingPlanManager;
