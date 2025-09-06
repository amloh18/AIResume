'use client';

import React, { useState, useEffect } from 'react';
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
  Settings
} from 'lucide-react';
import MembershipModal from '@/components/payment/MembershipModal';
import RedesignedPricingCards from '@/components/pricing/RedesignedPricingCards';
import PricingPlanEditModal from '@/components/admin/PricingPlanEditModal';

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
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedPlanForPreview, setSelectedPlanForPreview] = useState<PricingPlan | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PricingPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PricingPlan | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('cards');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/pricing-plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
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
        fetchPlans(); // Refresh plans
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  const handlePreviewPlan = (plan: PricingPlan) => {
    setSelectedPlanForPreview(plan);
    setIsPreviewModalOpen(true);
  };

  const handleGenerateCheckoutLink = async (plan: PricingPlan) => {
    try {
      const response = await fetch(`/api/admin/plans/${plan.key}/checkout-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan.key })
      });

      if (response.ok) {
        const data = await response.json();
        // Copy to clipboard
        navigator.clipboard.writeText(data.checkoutUrl);
        alert('Checkout link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error generating checkout link:', error);
    }
  };

  const handleEditPlan = (plan: PricingPlan) => {
    setSelectedPlanForEdit(plan);
    setIsEditModalOpen(true);
  };

  const handlePlanUpdated = () => {
    fetchPlans(); // Refresh plans after edit
    setIsEditModalOpen(false);
    setSelectedPlanForEdit(null);
  };

  const getPlanPrice = (plan: PricingPlan) => {
    if (plan.key === 'free') return 0;
    if (plan.key === 'day_pass') return plan.price_one_time || 0;
    if (plan.key === 'pro_monthly') return plan.price_monthly || 0;
    if (plan.key === 'pro_quarterly') return plan.price_quarterly || 0;
    if (plan.key === 'pro_yearly') return plan.price_yearly || 0;
    return 0;
  };

  const getProviderReadiness = (plan: PricingPlan) => {
    const readiness = {
      stripe: false,
      razorpay: false,
      stripeDetails: '',
      razorpayDetails: ''
    };

    if (plan.key === 'free') {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing Plans</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage subscription plans and pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Grid
            </button>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={16} />
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Display */}
      {viewMode === 'cards' ? (
        <RedesignedPricingCards
          plans={plans}
          onEdit={handleEditPlan}
          onPreview={handlePreviewPlan}
          onCheckout={handleGenerateCheckoutLink}
          adminMode={true}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const readiness = getProviderReadiness(plan);
            const price = getPlanPrice(plan);
            
            return (
              <div key={plan._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
                {/* Plan Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.isPopular && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                        Popular
                      </span>
                    )}
                    {plan.isBestValue && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                        Best Value
                      </span>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.key === 'free' ? 'Free' : `€${price}`}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {plan.key === 'free' ? 'No cost' : 
                     plan.key === 'day_pass' ? 'One-time' :
                     plan.key === 'pro_monthly' ? 'Per month' :
                     plan.key === 'pro_quarterly' ? 'Per quarter' :
                     'Per year'}
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Features:</div>
                  <div className="space-y-1">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="text-xs text-gray-700 dark:text-gray-300">• {feature}</div>
                    ))}
                    {plan.features.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">+{plan.features.length - 3} more</div>
                    )}
                  </div>
                </div>

                {/* Provider Readiness */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Provider Readiness:</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-blue-600" />
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Stripe:</span>
                      {readiness.stripe ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-300">{readiness.stripeDetails}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ExternalLink size={14} className="text-orange-600" />
                      <span className="text-xs font-medium text-gray-900 dark:text-white">Razorpay:</span>
                      {readiness.razorpay ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-300">{readiness.razorpayDetails}</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    plan.status === 'active' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {plan.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleToggleActive(plan._id, plan.status)}
                    className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                  >
                    {plan.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    Toggle
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreviewPlan(plan)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-1"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  <button
                    onClick={() => handleGenerateCheckoutLink(plan)}
                    className="flex-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 px-3 py-2 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center gap-1"
                  >
                    <Link size={14} />
                    Checkout Link
                  </button>
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 px-3 py-2 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800 flex items-center justify-center gap-1"
                  >
                    <Edit size={14} />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {selectedPlanForPreview && (
        <MembershipModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          currentPlanKey="free"
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
    </div>
  );
};

export default PricingPlanManager;
