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
        const data = await response.json();
        setOffers(data);
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
        const data = await response.json();
        // Extract plans from response - API returns { plans: [...], region: {...} }
        const plans = Array.isArray(data) ? data : (data?.plans || []);
        setPricingPlans(Array.isArray(plans) ? plans : []);
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
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save offer'}`);
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
      return { text: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    }
    if (now < validFrom) {
      return { text: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
    }
    if (now > validUntil) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    }
    return { text: 'Active', color: 'bg-green-100 text-green-800' };
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promotional Offers</h2>
          <p className="text-gray-600">Manage promotional campaigns and special offers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Create Offer
        </button>
      </div>

      {/* Offers List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="grid gap-4">
            {offers.map((offer) => {
              const status = getStatusBadge(offer);
              return (
                <motion.div
                  key={offer._id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{offer.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.text}
                        </span>
                        <span className="text-sm text-gray-500">
                          Priority: {offer.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{offer.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Target size={16} />
                          {getTargetAudienceText(offer)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {new Date(offer.validFrom).toLocaleDateString()} - {new Date(offer.validUntil).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          {offer.applicablePlans.length} plans
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(offer)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(offer._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">
                    {editingOffer ? 'Edit Promotional Offer' : 'Create Promotional Offer'}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Target Audience */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Audience *
                    </label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value as any }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Users</option>
                      <option value="new_signups">New Signups Only</option>
                      <option value="free_users">Free Users Only</option>
                      <option value="existing_users">Existing Users Only</option>
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valid From *
                      </label>
                      <input
                        type="date"
                        value={formData.validFrom}
                        onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Valid Until *
                      </label>
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Banner Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner Text
                      </label>
                      <input
                        type="text"
                        value={formData.bannerText}
                        onChange={(e) => setFormData(prev => ({ ...prev, bannerText: e.target.value }))}
                        placeholder="e.g., Limited Time Offer!"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Banner Color
                      </label>
                      <input
                        type="color"
                        value={formData.bannerColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, bannerColor: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Promotional Pricing */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Promotional Pricing
                      </label>
                      <button
                        type="button"
                        onClick={addPromotionalPricing}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Add Plan
                      </button>
                    </div>
                    
                    {formData.promotionalPricing.map((pricing, index) => (
                      <div key={index} className="border rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Plan {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removePromotionalPricing(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Plan
                            </label>
                            <select
                              value={pricing.planId}
                              onChange={(e) => updatePromotionalPricing(index, 'planId', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Monthly Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_monthly || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_monthly', parseFloat(e.target.value) || undefined)}
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quarterly Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_quarterly || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_quarterly', parseFloat(e.target.value) || undefined)}
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Yearly Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_yearly || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_yearly', parseFloat(e.target.value) || undefined)}
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              One-time Price
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={pricing.promotionalPrice_one_time || ''}
                              onChange={(e) => updatePromotionalPricing(index, 'promotionalPrice_one_time', parseFloat(e.target.value) || undefined)}
                              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="rounded"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      Active
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save size={16} />
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
