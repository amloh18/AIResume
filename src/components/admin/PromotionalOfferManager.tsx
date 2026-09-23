'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Users,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Copy,
  ExternalLink,
  TrendingUp,
  Gift,
  Star
} from 'lucide-react';
import { CHIP_INLINE, CHIP_TONES, type ChipTone } from '@/components/ui/chip-styles';

interface PromotionalOffer {
  _id: string;
  title: string;
  description: string;
  targetAudience: 'all' | 'new_signups' | 'free_users' | 'existing_users';
  applicableToNewSignups: boolean;
  applicableToFreeUsers: boolean;
  applicableToExistingUsers: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  priority: number;
  applicablePlans: string[];
  promotionalPricing: {
    planId: string;
    promotionalPrice_monthly?: number;
    promotionalPrice_quarterly?: number;
    promotionalPrice_yearly?: number;
    promotionalPrice_one_time?: number;
  }[];
  bannerText?: string;
  bannerColor?: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingPlan {
  _id: string;
  key: string;
  name: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  currency: string;
}

interface PromotionalOfferFormData {
  title: string;
  description: string;
  targetAudience: 'all' | 'new_signups' | 'free_users' | 'existing_users';
  applicableToNewSignups: boolean;
  applicableToFreeUsers: boolean;
  applicableToExistingUsers: boolean;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  priority: number;
  applicablePlans: string[];
  promotionalPricing: {
    planId: string;
    promotionalPrice_monthly?: number;
    promotionalPrice_quarterly?: number;
    promotionalPrice_yearly?: number;
    promotionalPrice_one_time?: number;
  }[];
  bannerText: string;
  bannerColor: string;
}

const PromotionalOfferManager: React.FC = () => {
  const [offers, setOffers] = useState<PromotionalOffer[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PromotionalOffer | null>(null);
  const [formData, setFormData] = useState<PromotionalOfferFormData>({
    title: '',
    description: '',
    targetAudience: 'all',
    applicableToNewSignups: false,
    applicableToFreeUsers: false,
    applicableToExistingUsers: false,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
    priority: 1,
    applicablePlans: [],
    promotionalPricing: [],
    bannerText: '',
    bannerColor: '#10b981'
  });

  useEffect(() => {
    fetchOffers();
    fetchPricingPlans();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/admin/promotional-offers');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setOffers(data);
        }
      }
    } catch (error) {
      console.error('Error fetching promotional offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch('/api/pricing-plans?includeInactive=true');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          // Extract plans from response - API returns { plans: [...], region: {...} }
          const plans = Array.isArray(data) ? data : (data?.plans || []);
          setPricingPlans(Array.isArray(plans) ? plans : []);
        }
      }
    } catch (error) {
      console.error('Error fetching pricing plans:', error);
      setPricingPlans([]); // Set empty array on error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingOffer 
        ? `/api/admin/promotional-offers/${editingOffer._id}`
        : '/api/admin/promotional-offers';
      
      const method = editingOffer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchOffers();
        resetForm();
        alert(editingOffer ? 'Promotional offer updated!' : 'Promotional offer created!');
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            alert(`Error: ${errorData.error || 'Failed to save offer'}`);
          } catch {
            alert('Failed to save offer');
          }
        } else {
          alert('Failed to save offer');
        }
      }
    } catch (error) {
      console.error('Error saving promotional offer:', error);
      alert('Error saving promotional offer');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (offer: PromotionalOffer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description,
      targetAudience: offer.targetAudience,
      applicableToNewSignups: offer.applicableToNewSignups,
      applicableToFreeUsers: offer.applicableToFreeUsers,
      applicableToExistingUsers: offer.applicableToExistingUsers,
      validFrom: offer.validFrom.split('T')[0],
      validUntil: offer.validUntil.split('T')[0],
      isActive: offer.isActive,
      priority: offer.priority,
      applicablePlans: offer.applicablePlans,
      promotionalPricing: offer.promotionalPricing,
      bannerText: offer.bannerText || '',
      bannerColor: offer.bannerColor || '#10b981'
    });
    setShowForm(true);
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;

    try {
      const response = await fetch(`/api/admin/promotional-offers/${offerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchOffers();
        alert('Promotional offer deleted!');
      } else {
        alert('Error deleting promotional offer');
      }
    } catch (error) {
      console.error('Error deleting promotional offer:', error);
      alert('Error deleting promotional offer');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetAudience: 'all',
      applicableToNewSignups: false,
      applicableToFreeUsers: false,
      applicableToExistingUsers: false,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      priority: 1,
      applicablePlans: [],
      promotionalPricing: [],
      bannerText: '',
      bannerColor: '#10b981'
    });
    setEditingOffer(null);
    setShowForm(false);
  };

  const addPromotionalPricing = () => {
    setFormData(prev => ({
      ...prev,
      promotionalPricing: [...prev.promotionalPricing, {
        planId: '',
        promotionalPrice_monthly: undefined,
        promotionalPrice_quarterly: undefined,
        promotionalPrice_yearly: undefined,
        promotionalPrice_one_time: undefined
      }]
    }));
  };

  const updatePromotionalPricing = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      promotionalPricing: prev.promotionalPricing.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removePromotionalPricing = (index: number) => {
    setFormData(prev => ({
      ...prev,
      promotionalPricing: prev.promotionalPricing.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (offer: PromotionalOffer) => {
    const now = new Date();
    const validFrom = new Date(offer.validFrom);
    const validUntil = new Date(offer.validUntil);

    if (!offer.isActive) {
      return { text: 'Inactive', tone: 'neutral' as ChipTone };
    }
    if (now < validFrom) {
      return { text: 'Scheduled', tone: 'blue' as ChipTone };
    }
    if (now > validUntil) {
      return { text: 'Expired', tone: 'rose' as ChipTone };
    }
    return { text: 'Active', tone: 'emerald' as ChipTone };
  };

  const getTargetAudienceText = (offer: PromotionalOffer) => {
    if (offer.targetAudience === 'all') return 'All Users';
    if (offer.targetAudience === 'new_signups') return 'New Signups';
    if (offer.targetAudience === 'free_users') return 'Free Users';
    if (offer.targetAudience === 'existing_users') return 'Existing Users';
    return 'Unknown';
  };

  if (loading && offers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Promotional Offers</h2>
          <p className="text-xs text-white/40 mt-0.5">Manage promotional campaigns and special offers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Plus size={14} />
          Create Offer
        </button>
      </div>

      {/* Offers List */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl shadow-xl p-4 sm:p-5">
        <div className="grid gap-3">
          {offers.map((offer) => {
            const status = getStatusBadge(offer);
            return (
              <motion.div
                key={offer._id}
                className="border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl p-4 transition-all"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-sm font-semibold text-white">{offer.title}</h3>
                      <span className={`${CHIP_INLINE} font-semibold text-[10px] ${CHIP_TONES[status.tone]}`}>
                        {status.text}
                      </span>
                      <span className="text-[10px] text-white/40">
                        Priority: {offer.priority}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mb-3">{offer.description}</p>
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <div className="flex items-center gap-1">
                        <Target size={13} />
                        {getTargetAudienceText(offer)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={13} />
                        {new Date(offer.validFrom).toLocaleDateString()} - {new Date(offer.validUntil).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={13} />
                        {offer.applicablePlans.length} plans
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(offer)}
                      className="p-1.5 text-white/40 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(offer._id)}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#111216] border border-white/10 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="p-4 sm:p-5">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">
                    {editingOffer ? 'Edit Promotional Offer' : 'Create Promotional Offer'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="p-1.5 text-white/40 hover:text-white rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Priority
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Target Audience *
                    </label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                      className="w-full bg-[#111216] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="all">All Users</option>
                      <option value="new_signups">New Signups Only</option>
                      <option value="free_users">Free Users Only</option>
                      <option value="existing_users">Existing Users Only</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Valid From *
                      </label>
                      <input
                        type="date"
                        value={formData.validFrom}
                        onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Valid Until *
                      </label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Banner Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Banner Text
                      </label>
                      <input
                        type="text"
                        value={formData.bannerText}
                        onChange={(e) => setFormData(prev => ({ ...prev, bannerText: e.target.value }))}
                        placeholder="e.g., Limited Time Offer!"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Banner Color
                      </label>
                      <input
                        type="color"
                        value={formData.bannerColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, bannerColor: e.target.value }))}
                        className="w-full h-9 bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Promotional Pricing */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-white/70">
                        Promotional Pricing
                      </label>
                      <button
                        type="button"
                        onClick={addPromotionalPricing}
                        className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs hover:bg-emerald-500 flex items-center gap-1 font-semibold"
                      >
                        <Plus size={12} />
                        Add Plan
                      </button>
                    </div>
                    
                    {formData.promotionalPricing.map((pricing, index) => (
                      <div key={index} className="border border-white/5 bg-white/[0.02] rounded-xl p-3 mb-2">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-white/80">Plan {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removePromotionalPricing(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-white/50 mb-0.5">
                              Plan
                            </label>
                            <select
                              value={pricing.planId}
                              onChange={(e) => updatePromotionalPricing(index, 'planId', e.target.value)}
                              className="w-full bg-[#111216] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">Select a plan</option>
                              {pricingPlans.map(plan => (
                                <option key={plan._id} value={plan._id}>
                                  {plan.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/50 mb-0.5">
                              Monthly Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_monthly || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_monthly', parseFloat(e.target.value) || undefined)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/50 mb-0.5">
                              Quarterly Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_quarterly || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_quarterly', parseFloat(e.target.value) || undefined)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/50 mb-0.5">
                              Yearly Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_yearly || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_yearly', parseFloat(e.target.value) || undefined)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-white/50 mb-0.5">
                              One-time Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_one_time || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_one_time', parseFloat(e.target.value) || undefined)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded bg-white/5 border-white/10"
                    />
                    <label htmlFor="isActive" className="text-xs font-semibold text-white/70 cursor-pointer">
                      Active
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3.5 py-1.5 text-xs text-white/60 hover:text-white border border-white/10 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      ) : (
                        <Save size={14} />
                      )}
                      {editingOffer ? 'Update Offer' : 'Create Offer'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromotionalOfferManager;
