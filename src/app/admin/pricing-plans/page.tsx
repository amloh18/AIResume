'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  Trash2, 
  Save, 
  X,
  Globe,
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCountryName, getCountryFlag, SUPPORTED_CURRENCIES } from '@/lib/config/adminConstants';

interface RegionalPricing {
  region: string;
  currency: string;
  price: number;
  displayPrice: string;
  stripePriceId?: string;
  razorpayPlanId?: string;
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
  regionalPricing?: RegionalPricing[];
  status: 'active' | 'inactive';
}

export default function PricingPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingRegion, setEditingRegion] = useState<{ planId: string; region: string } | null>(null);
  const [formData, setFormData] = useState<Partial<RegionalPricing>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing-plans?includeInactive=true');
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRegion = (planId: string, region?: RegionalPricing) => {
    if (region) {
      setFormData({
        region: region.region,
        currency: region.currency,
        billingCycle: region.billingCycle,
        price: region.price,
        displayPrice: region.displayPrice,
        stripePriceId: region.stripePriceId,
        razorpayPlanId: region.razorpayPlanId
      });
      setEditingRegion({ planId, region: `${region.region}-${region.billingCycle || 'all'}` });
    } else {
      setFormData({
        region: '',
        currency: 'EUR',
        billingCycle: undefined,
        price: 0,
        displayPrice: '',
        stripePriceId: '',
        razorpayPlanId: ''
      });
      setEditingRegion({ planId, region: 'new' });
    }
  };

  const handleSaveRegion = async () => {
    if (!editingRegion) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/pricing-plans/regional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: editingRegion.planId,
          ...formData
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess('Regional pricing saved successfully');
        setEditingRegion(null);
        setFormData({});
        await fetchPlans();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save regional pricing');
      }
    } catch (error: any) {
      console.error('Error saving regional pricing:', error);
      setError(error.message || 'Failed to save regional pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRegion = async (planId: string, region: string, billingCycle?: string) => {
    const cycleText = billingCycle ? ` for ${billingCycle} cycle` : '';
    if (!confirm(`Are you sure you want to delete pricing for region ${region}${cycleText}?`)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const url = `/api/admin/pricing-plans/regional?planId=${planId}&region=${region}${billingCycle ? `&billingCycle=${billingCycle}` : ''}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();

        if (data.success) {
          setSuccess('Regional pricing deleted successfully');
          await fetchPlans();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(data.error || 'Failed to delete regional pricing');
        }
      }
    } catch (error: any) {
      console.error('Error deleting regional pricing:', error);
      setError(error.message || 'Failed to delete regional pricing');
    } finally {
      setSaving(false);
    }
  };

  const getPriceForBillingCycle = (plan: PricingPlan, cycle: 'monthly' | 'quarterly' | 'yearly' | 'one_time') => {
    switch (cycle) {
      case 'monthly': return plan.price_monthly;
      case 'quarterly': return plan.price_quarterly;
      case 'yearly': return plan.price_yearly;
      case 'one_time': return plan.price_one_time;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white">Loading pricing plans...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-400 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-white">Pricing Plans Management</h1>
            <p className="text-gray-400 mt-2">Manage pricing plans and regional pricing</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Plans List */}
        {plans.map(plan => (
          <Card key={plan._id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400">{plan.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    plan.status === 'active' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {plan.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Prices */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Default Prices</h3>
                <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
                  {plan.price_one_time !== undefined && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Day Pass</div>
                      <div className="text-white font-semibold">{plan.currency} {plan.price_one_time}</div>
                    </div>
                  )}
                  {plan.price_monthly !== undefined && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Monthly</div>
                      <div className="text-white font-semibold">{plan.currency} {plan.price_monthly}</div>
                    </div>
                  )}
                  {plan.price_quarterly !== undefined && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Quarterly</div>
                      <div className="text-white font-semibold">{plan.currency} {plan.price_quarterly}</div>
                    </div>
                  )}
                  {plan.price_yearly !== undefined && (
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400">Yearly</div>
                      <div className="text-white font-semibold">{plan.currency} {plan.price_yearly}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Regional Pricing */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">Regional Pricing</h3>
                  <Button
                    onClick={() => handleEditRegion(plan._id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Region
                  </Button>
                </div>

                {/* Edit Form */}
                {editingRegion && editingRegion.planId === plan._id && (
                  <Card className="bg-gray-700/50 border-gray-600 mb-4">
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Region Code</label>
                          <Input
                            value={formData.region || ''}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value.toUpperCase() })}
                            placeholder="US, GB, IN, etc."
                            className="bg-gray-800 border-gray-600 text-white"
                            disabled={editingRegion.region !== 'new'}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Currency</label>
                          <select
                            value={formData.currency || 'EUR'}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                          >
                            {SUPPORTED_CURRENCIES.map(curr => (
                              <option key={curr} value={curr}>{curr}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Billing Cycle (Optional)</label>
                          <select
                            value={formData.billingCycle || ''}
                            onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any || undefined })}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                          >
                            <option value="">All Cycles (Default)</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                            <option value="one-time">One-time</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Price</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.price || ''}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                            placeholder="0.00"
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Display Price</label>
                          <Input
                            value={formData.displayPrice || ''}
                            onChange={(e) => setFormData({ ...formData, displayPrice: e.target.value })}
                            placeholder={`${formData.currency || 'EUR'} ${formData.price || '0'}`}
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Stripe Price ID (optional)</label>
                          <Input
                            value={formData.stripePriceId || ''}
                            onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value })}
                            placeholder="price_xxx"
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-300 mb-1">Razorpay Plan ID (optional)</label>
                          <Input
                            value={formData.razorpayPlanId || ''}
                            onChange={(e) => setFormData({ ...formData, razorpayPlanId: e.target.value })}
                            placeholder="plan_xxx"
                            className="bg-gray-800 border-gray-600 text-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveRegion}
                          disabled={saving || !formData.region || !formData.currency || formData.price === undefined}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingRegion(null);
                            setFormData({});
                          }}
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regional Pricing List */}
                {plan.regionalPricing && plan.regionalPricing.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-3 text-sm font-semibold text-gray-300">Region</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-300">Billing Cycle</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-300">Currency</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-300">Price</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-300">Display Price</th>
                          <th className="text-left p-3 text-sm font-semibold text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.regionalPricing.map((rp, idx) => (
                          <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getCountryFlag(rp.region)}</span>
                                <div>
                                  <div className="text-white font-medium">{getCountryName(rp.region)}</div>
                                  <div className="text-xs text-gray-400">{rp.region}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-gray-300">
                              {rp.billingCycle ? (
                                <span className="capitalize">{rp.billingCycle.replace('-', ' ')}</span>
                              ) : (
                                <span className="text-gray-500">All Cycles</span>
                              )}
                            </td>
                            <td className="p-3 text-gray-300">{rp.currency}</td>
                            <td className="p-3 text-white font-medium">{rp.price}</td>
                            <td className="p-3 text-gray-300">{rp.displayPrice}</td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleEditRegion(plan._id, rp)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteRegion(plan._id, rp.region, rp.billingCycle)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No regional pricing configured. Click "Add Region" to add pricing for specific regions.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

