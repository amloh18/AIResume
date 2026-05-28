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
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { useRouter } from 'next/navigation';
import { LocationService } from '@/lib/payment/locationService';

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
  polarPriceId_monthly?: string;
  polarPriceId_quarterly?: string;
  polarPriceId_yearly?: string;
  polarPriceId_one_time?: string;
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
  const [editedPrices, setEditedPrices] = useState<Record<string, { lifetime: number, monthly: number, quarterly: number, yearly: number }>>({});
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
            lifetime: { ...original.planPrices?.lifetime, price: prices.lifetime },
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
      return { text: 'Inactive', color: ADMIN_THEME.badge.inactive, badge: 'Inactive' };
    }
    if (now < validFrom) {
      return { text: 'Scheduled', color: ADMIN_THEME.badge.scheduled, badge: 'Scheduled' };
    }
    if (now > validUntil) {
      return { text: 'Expired', color: ADMIN_THEME.badge.cancelled, badge: 'Expired' };
    }
    return { text: 'Active', color: ADMIN_THEME.badge.active, badge: 'Active' };
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

  const getPlanPrice = (plan: any) => {
    if (plan.key === DEFAULT_PLAN_KEY) return 0;
    
    // First try to use the base USD price provided by the API
    if (plan.baseUsdPrice !== undefined) return plan.baseUsdPrice;
    if (plan.usdPrice !== undefined) return plan.usdPrice;
    
    // Fallback to old field names
    if (plan.key === 'pro_monthly') return plan.price_monthly || 0;
    if (plan.key === 'pro_quarterly') return plan.price_quarterly || 0;
    if (plan.key === 'pro_yearly') return plan.price_yearly || 0;
    if (plan.key === 'pro_lifetime') return plan.price_one_time || 0;
    
    return plan.price_yearly || plan.price_monthly || plan.price_one_time || 0;
  };

  const getBillingCycle = (plan: PricingPlan) => {
    if (plan.key === DEFAULT_PLAN_KEY) return 'N/A';
    if (plan.key === 'pro_monthly') return 'Monthly';
    if (plan.key === 'pro_quarterly') return 'Quarterly';
    if (plan.key === 'pro_yearly') return 'Annually';
    if (plan.key === 'pro_lifetime') return 'One-time';
    return 'N/A';
  };

  const getProviderReadiness = (plan: PricingPlan) => {
    const readiness = {
      polar: false,
      polarDetails: ''
    };

    if (plan.key === DEFAULT_PLAN_KEY) {
      readiness.polar = true;
      readiness.polarDetails = 'Free plan';
    } else if (plan.key === 'pro_lifetime') {
      readiness.polar = !!plan.polarPriceId_one_time;
      readiness.polarDetails = plan.polarPriceId_one_time || 'Missing one-time price ID';
    } else {
      readiness.polar = !!(plan.polarPriceId_monthly || plan.polarPriceId_quarterly || plan.polarPriceId_yearly);

      const polarIds: string[] = [];
      if (plan.polarPriceId_monthly) polarIds.push('Monthly');
      if (plan.polarPriceId_quarterly) polarIds.push('Quarterly');
      if (plan.polarPriceId_yearly) polarIds.push('Yearly');

      readiness.polarDetails = polarIds.length > 0 ? polarIds.join(', ') : 'No price IDs';
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
        <TabsList className={`inline-flex h-10 items-center justify-center rounded-xl p-1 text-muted-foreground ${ADMIN_THEME.background.secondary} border ${ADMIN_THEME.border.primary} mb-6`}>
          <TabsTrigger
            value="pricing"
            className={`data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 hover:text-emerald-600`}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Current Pricing
          </TabsTrigger>
          <TabsTrigger
            value="regional"
            className={`data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 hover:text-emerald-600`}
          >
            <Globe className="h-4 w-4 mr-2" />
            Regional Settings
          </TabsTrigger>
          <TabsTrigger
            value="promotions"
            className={`data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 hover:text-emerald-600`}
          >
            <Gift className="h-4 w-4 mr-2" />
            Promotional Offers
          </TabsTrigger>
          <TabsTrigger
            value="coupons"
            className={`data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 hover:text-emerald-600`}
          >
            <Tag className="h-4 w-4 mr-2" />
            Coupon Management
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className={`data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 hover:text-emerald-600`}
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
                <h2 className={`text-2xl font-bold ${ADMIN_THEME.text.primary}`}>Dashboard Overview</h2>
                <p className={`${ADMIN_THEME.text.muted} mt-1`}>A summary of key pricing metrics.</p>
              </div>

              <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6 mt-6">
                <Card className={ADMIN_THEME.card.base}>
                  <CardContent className="p-6">
                    <div className={`text-3xl font-bold ${ADMIN_THEME.text.primary} mb-2`}>{activePlans}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {activePlansChange > 0 ? (
                        <span className="text-emerald-600">↑+{activePlansChange} this month</span>
                      ) : activePlansChange < 0 ? (
                        <span className="text-red-600">↓{activePlansChange} this month</span>
                      ) : (
                        <span className={ADMIN_THEME.text.muted}>— No change</span>
                      )}
                    </div>
                    <div className={`${ADMIN_THEME.text.muted} text-sm mt-1`}>Active Plans</div>
                  </CardContent>
                </Card>

                <Card className={ADMIN_THEME.card.base}>
                  <CardContent className="p-6">
                    <div className={`text-3xl font-bold ${ADMIN_THEME.text.primary} mb-2`}>{activePromotions}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {activePromotionsChange > 0 ? (
                        <span className="text-emerald-600">↑+{activePromotionsChange} this month</span>
                      ) : activePromotionsChange < 0 ? (
                        <span className="text-red-600">↓{activePromotionsChange} this month</span>
                      ) : (
                        <span className={ADMIN_THEME.text.muted}>— No change</span>
                      )}
                    </div>
                    <div className={`${ADMIN_THEME.text.muted} text-sm mt-1`}>Active Promotions</div>
                  </CardContent>
                </Card>

                <Card className={ADMIN_THEME.card.base}>
                  <CardContent className="p-6">
                    <div className={`text-3xl font-bold ${ADMIN_THEME.text.primary} mb-2`}>{regionsWithCustomPricing}</div>
                    <div className="flex items-center gap-2 text-sm">
                      {regionsChange > 0 ? (
                        <span className="text-emerald-600">↑+{regionsChange} this month</span>
                      ) : regionsChange < 0 ? (
                        <span className="text-red-600">↓{regionsChange} this month</span>
                      ) : (
                        <span className={ADMIN_THEME.text.muted}>— No change</span>
                      )}
                    </div>
                    <div className={`${ADMIN_THEME.text.muted} text-sm mt-1`}>Regions with Custom Pricing</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-2xl font-bold ${ADMIN_THEME.text.primary}`}>Pricing Plans</h2>
                <p className={`${ADMIN_THEME.text.muted} mt-1`}>Manage subscription plans and pricing</p>
              </div>
              <div className="flex items-center gap-3">
                <Button className={`${ADMIN_THEME.button.primary} rounded-lg`} onClick={() => setIsAddCountryModalOpen(true)}>
                  <Plus size={16} />
                  Add Plan
                </Button>
              </div>
            </div>

            {/* Plans Table View */}
            <Card className={ADMIN_THEME.card.base}>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${ADMIN_THEME.border.primary} ${ADMIN_THEME.table.header}`}>
                        <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>PLAN NAME</th>
                        <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>BASE PRICE</th>
                        <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>BILLING CYCLE</th>
                        <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>STATUS</th>
                        <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>ACTIONS</th>
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
                            className={`border-b ${ADMIN_THEME.border.primary} ${ADMIN_THEME.table.row} cursor-pointer transition-colors`}
                            onClick={() => handleRowClick(plan)}
                          >
                            <td className="p-4">
                              <div className={`font-medium ${ADMIN_THEME.text.primary}`}>{plan.name}</div>
                            </td>
                            <td className={`p-4 ${ADMIN_THEME.text.secondary}`}>{priceDisplay}</td>
                            <td className={`p-4 ${ADMIN_THEME.text.secondary}`}>{billingCycle}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${plan.status === 'active'
                                ? ADMIN_THEME.badge.active
                                : ADMIN_THEME.badge.inactive
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
                                className="text-emerald-700 hover:text-emerald-800 text-sm font-medium"
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
                <h2 className={`text-2xl font-bold ${ADMIN_THEME.text.primary}`}>Promotional Offers</h2>
                <p className={`${ADMIN_THEME.text.muted} mt-1`}>Active and expired promotional offers</p>
              </div>

              {loadingOffersState ? (
                <div className="flex items-center justify-center h-32">
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${ADMIN_THEME.loading.spinner}`}></div>
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
                      <Card key={offer._id} className={`${ADMIN_THEME.card.base} hover:shadow-lg transition-shadow`}>
                        <CardContent className="p-6 relative">
                          <div className="absolute top-4 right-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.badge}
                            </span>
                          </div>

                          <div className="mb-4 mt-2">
                            <div className={`text-sm ${ADMIN_THEME.text.muted} mb-1`}>Code: {offer.title?.toUpperCase() || 'N/A'}</div>
                            <div className={`text-2xl font-bold ${ADMIN_THEME.text.primary} mb-2`}>{discountText}</div>
                            <div className={`text-sm ${ADMIN_THEME.text.secondary}`}>{offer.description || 'No description'}</div>
                          </div>

                          <div className={`mt-4 pt-4 border-t ${ADMIN_THEME.border.primary} flex items-center justify-between`}>
                            <div className={`text-sm ${ADMIN_THEME.text.muted}`}>
                              {isExpired ? `Expired: ${expiryDate}` : `Expires: ${expiryDate}`}
                            </div>
                            <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                              Details
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {promotionalOffersState.length === 0 && (
                    <div className={`col-span-full text-center py-8 ${ADMIN_THEME.text.muted}`}>
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
                <h2 className={`text-lg font-medium ${ADMIN_THEME.text.primary}`}>Pricing by Region</h2>
                <p className={`text-sm ${ADMIN_THEME.text.muted}`}>
                  Manage regional pricing for all plans.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsAddCountryModalOpen(true)}
                  className={ADMIN_THEME.button.primary}
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
                      className="border-red-500 text-red-500 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveRegionalPricing}
                      disabled={savingPricing}
                      className={ADMIN_THEME.button.success}
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
                        const getAutoCalc = (planKey: string) => {
                          let usdBase = 0;
                          if (planKey === 'lifetime') usdBase = 199;
                          if (planKey === 'monthly') usdBase = 9.99;
                          if (planKey === 'quarterly') usdBase = 59.99;
                          if (planKey === 'yearly') usdBase = 199;
                          return Math.round(LocationService.convertPrice(usdBase, 'USD', cp.currency).convertedPrice);
                        };
                        initialEdits[cp.countryCode] = {
                          lifetime: cp.planPrices?.lifetime?.price || getAutoCalc('lifetime'),
                          monthly: cp.planPrices?.monthly?.price || getAutoCalc('monthly'),
                          quarterly: cp.planPrices?.quarterly?.price || getAutoCalc('quarterly'),
                          yearly: cp.planPrices?.yearly?.price || getAutoCalc('yearly')
                        };
                      });
                      setEditedPrices(initialEdits);
                      setIsEditing(true);
                    }}
                    className={ADMIN_THEME.button.primary}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Manage Regional Pricing
                  </Button>
                )}
              </div>
            </div>

            <Card className={ADMIN_THEME.card.base}>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={ADMIN_THEME.table.header}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky left-0 ${ADMIN_THEME.background.tertiary} z-10 ${ADMIN_THEME.text.secondary}`}>Country</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${ADMIN_THEME.text.secondary}`}>Currency</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${ADMIN_THEME.text.secondary}`}>Lifetime</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${ADMIN_THEME.text.secondary}`}>Monthly</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${ADMIN_THEME.text.secondary}`}>Quarterly</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${ADMIN_THEME.text.secondary}`}>Yearly</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${ADMIN_THEME.border.primary}`}>
                      {loadingPricing || loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <div className="flex items-center justify-center">
                              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${ADMIN_THEME.loading.spinner}`}></div>
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
                                <tr key={pricing._id} className={`${ADMIN_THEME.table.row}`}>
                                  <td className={`px-6 py-4 whitespace-nowrap sticky left-0 ${ADMIN_THEME.background.primary} ${ADMIN_THEME.background.hover}`}>
                                    <div className="flex items-center gap-3">
                                      <span className="text-2xl" role="img" aria-label={pricing.countryName}>
                                        {getCountryFlag(pricing.countryCode)}
                                      </span>
                                      <div>
                                        <div className={`text-sm font-medium ${ADMIN_THEME.text.primary}`}>
                                          {getCountryName(pricing.countryCode)}
                                        </div>
                                        <div className={`text-xs ${ADMIN_THEME.text.muted}`}>
                                          {pricing.countryCode}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${ADMIN_THEME.text.secondary}`}>
                                    <div className="flex items-center gap-1">
                                      <span className={`font-semibold ${ADMIN_THEME.text.primary}`}>{pricing.currency}</span>
                                      <span className={`text-xs ${ADMIN_THEME.text.muted}`}>({pricing.currencySymbol})</span>
                                    </div>
                                  </td>
                                  {/* Price Columns */}
                                  {(['lifetime', 'monthly', 'quarterly', 'yearly'] as const).map((planKey) => (
                                    <td key={planKey} className="px-6 py-4 whitespace-nowrap">
                                      {isEditing ? (
                                        <div className="relative">
                                          <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${ADMIN_THEME.text.muted}`}>
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
                                            className={`w-24 pl-5 h-8 text-sm ${ADMIN_THEME.input.base} ${ADMIN_THEME.input.focus}`}
                                          />
                                        </div>
                                      ) : (
                                        <span className={`text-sm font-medium ${ADMIN_THEME.text.primary}`}>
                                          {(() => {
                                            const dbPrice = pricing.planPrices?.[planKey]?.price;
                                            if (dbPrice && dbPrice > 0) return `${pricing.currencySymbol}${dbPrice.toLocaleString()}`;
                                            
                                            // Auto-calculate fallback
                                            let usdBase = 0;
                                            if (planKey === 'lifetime') usdBase = 199;
                                            if (planKey === 'monthly') usdBase = 9.99;
                                            if (planKey === 'quarterly') usdBase = 59.99;
                                            if (planKey === 'yearly') usdBase = 199;
                                            
                                            if (usdBase === 0) return `${pricing.currencySymbol}0`;
                                            
                                            const autoCalc = Math.round(LocationService.convertPrice(usdBase, 'USD', pricing.currency).convertedPrice);
                                            return `${pricing.currencySymbol}${autoCalc.toLocaleString()} (Auto)`;
                                          })()}
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
                                <div className={`flex flex-col items-center ${ADMIN_THEME.text.muted}`}>
                                  <Globe className="h-12 w-12 text-slate-300 mb-3" />
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
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isPlanDetailsModalOpen ? 'block' : 'hidden'} ${ADMIN_THEME.modal.overlay}`}
            onClick={() => setIsPlanDetailsModalOpen(false)}
          >
            <Card
              className={`${ADMIN_THEME.modal.container} max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className={`text-2xl font-bold ${ADMIN_THEME.text.primary} mb-2`}>{selectedPlanForDetails.name}</h3>
                    <p className={ADMIN_THEME.text.muted}>{selectedPlanForDetails.description}</p>
                  </div>
                  <button
                    onClick={() => setIsPlanDetailsModalOpen(false)}
                    className={`${ADMIN_THEME.text.muted} hover:${ADMIN_THEME.text.primary}`}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Pricing */}
                  <div>
                    <h4 className={`text-lg font-semibold ${ADMIN_THEME.text.primary} mb-3`}>Pricing</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedPlanForDetails.price_monthly && (
                        <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                          <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Monthly</div>
                          <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>${selectedPlanForDetails.price_monthly.toFixed(2)}</div>
                        </div>
                      )}
                      {selectedPlanForDetails.price_quarterly && (
                        <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                          <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Quarterly</div>
                          <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>${selectedPlanForDetails.price_quarterly.toFixed(2)}</div>
                        </div>
                      )}
                      {selectedPlanForDetails.price_yearly && (
                        <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                          <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Yearly</div>
                          <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>${selectedPlanForDetails.price_yearly.toFixed(2)}</div>
                        </div>
                      )}
                      {selectedPlanForDetails.price_one_time && (
                        <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                          <div className={`text-sm ${ADMIN_THEME.text.muted}`}>One-time</div>
                          <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>${selectedPlanForDetails.price_one_time.toFixed(2)}</div>
                        </div>
                      )}
                      {selectedPlanForDetails.key === DEFAULT_PLAN_KEY && (
                        <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                          <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Price</div>
                          <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>Free</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className={`text-lg font-semibold ${ADMIN_THEME.text.primary} mb-3`}>Features</h4>
                    <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                      <ul className="space-y-2">
                        {selectedPlanForDetails.features.map((feature, index) => (
                          <li key={index} className={`${ADMIN_THEME.text.secondary} flex items-start gap-2`}>
                            <CheckCircle size={16} className="text-emerald-600 mt-1 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Limits */}
                  <div>
                    <h4 className={`text-lg font-semibold ${ADMIN_THEME.text.primary} mb-3`}>Limits</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                        <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Max CVs</div>
                        <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>{selectedPlanForDetails.maxCVs === -1 ? 'Unlimited' : selectedPlanForDetails.maxCVs}</div>
                      </div>
                      <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                        <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Max Exports</div>
                        <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>{selectedPlanForDetails.maxExports === -1 ? 'Unlimited' : selectedPlanForDetails.maxExports}</div>
                      </div>
                      <div className={`${ADMIN_THEME.background.tertiary} p-4 rounded-lg`}>
                        <div className={`text-sm ${ADMIN_THEME.text.muted}`}>Storage</div>
                        <div className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>{selectedPlanForDetails.storageLimit === -1 ? 'Unlimited' : `${selectedPlanForDetails.storageLimit}GB`}</div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className={`flex items-center justify-between pt-4 border-t ${ADMIN_THEME.border.primary}`}>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedPlanForDetails.status === 'active'
                        ? ADMIN_THEME.badge.active
                        : ADMIN_THEME.badge.inactive
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
                        className={`${ADMIN_THEME.button.outline} px-4 py-2 rounded-lg flex items-center gap-2`}
                      >
                        <Eye size={16} />
                        Preview
                      </button>
                      <button
                        onClick={() => {
                          setIsPlanDetailsModalOpen(false);
                          handleEditPlan(selectedPlanForDetails);
                        }}
                        className={`${ADMIN_THEME.button.primary} px-4 py-2 rounded-lg flex items-center gap-2`}
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
