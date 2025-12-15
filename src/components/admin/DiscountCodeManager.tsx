'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Users,
  Percent,
  Euro
} from 'lucide-react';

interface DiscountCode {
  _id: string;
  code: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'trial';  // Support trial coupons
  discountValue?: number;
  trialDays?: number;  // For trial coupons
  currency?: string;
  maxUses: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  applicablePlans?: string[];  // Legacy
  applicablePlanKeys?: string[];  // Plan keys (e.g., 'pro_monthly')
  minimumOrderValue?: number;
  isActive: boolean;
  requiresCreditCard?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingPlan {
  _id: string;
  key?: string;  // Plan key (e.g., 'pro_monthly')
  name: string;
  price: number;
  currency: string;
}

interface DiscountCodeFormData {
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'trial';  // Support all coupon types
  discountValue?: number;
  trialDays?: number;  // For trial coupons
  currency?: string;
  maxUses: number;
  validFrom: string;
  validUntil: string;
  applicablePlanKeys: string[];  // Use plan keys instead of ObjectIds
  minimumOrderValue?: number;
  isActive: boolean;
  requiresCreditCard?: boolean;
}

const DiscountCodeManager: React.FC = () => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState<DiscountCodeFormData>({
    code: '',
    description: '',
    type: 'percentage',
    discountValue: 0,
    trialDays: 7,
    currency: 'USD',
    maxUses: 100,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    applicablePlanKeys: [],
    minimumOrderValue: 0,
    isActive: true,
    requiresCreditCard: false
  });
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['EUR', 'USD', 'INR']);

  useEffect(() => {
    fetchStatusConfig();
  }, []);

  const fetchStatusConfig = async () => {
    try {
      const response = await fetch('/api/admin/config/statuses');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success && data.currencies) {
            setAvailableCurrencies(data.currencies);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching status config:', error);
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
    fetchPricingPlans();
  }, [showInactive]);

  const fetchDiscountCodes = async () => {
    try {
      const url = showInactive
        ? '/api/admin/discount-codes?includeInactive=true'
        : '/api/admin/discount-codes';
      const response = await fetch(url);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setDiscountCodes(data);
        }
      }
    } catch (error) {
      console.error('Error fetching discount codes:', error);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCode
        ? `/api/admin/discount-codes/${editingCode._id}`
        : '/api/admin/discount-codes';

      const method = editingCode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchDiscountCodes();
        resetForm();
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            alert(error.error || 'Failed to save discount code');
          } catch {
            alert('Failed to save discount code');
          }
        } else {
          alert('Failed to save discount code');
        }
      }
    } catch (error) {
      console.error('Error saving discount code:', error);
      alert('Failed to save discount code');
    }
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || '',
      type: code.type,
      discountValue: code.discountValue,
      trialDays: code.trialDays,
      currency: code.currency,
      maxUses: code.maxUses,
      validFrom: new Date(code.validFrom).toISOString().split('T')[0],
      validUntil: new Date(code.validUntil).toISOString().split('T')[0],
      applicablePlanKeys: code.applicablePlanKeys || code.applicablePlans || [],
      minimumOrderValue: code.minimumOrderValue,
      isActive: code.isActive,
      requiresCreditCard: code.requiresCreditCard
    });
    setShowForm(true);
  };

  const handleDelete = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;

    try {
      const response = await fetch(`/api/admin/discount-codes/${codeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDiscountCodes();
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            alert(error.error || 'Failed to delete discount code');
          } catch {
            alert('Failed to delete discount code');
          }
        } else {
          alert('Failed to delete discount code');
        }
      }
    } catch (error) {
      console.error('Error deleting discount code:', error);
      alert('Failed to delete discount code');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      type: 'percentage',
      discountValue: 0,
      trialDays: 7,
      currency: 'USD',
      maxUses: 100,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      applicablePlanKeys: [],
      minimumOrderValue: 0,
      isActive: true,
      requiresCreditCard: false
    });
    setEditingCode(null);
    setShowForm(false);
  };

  const isCodeValid = (code: DiscountCode) => {
    const now = new Date();
    return code.isActive &&
      code.usedCount < code.maxUses &&
      now >= new Date(code.validFrom) &&
      now <= new Date(code.validUntil);
  };

  const getRemainingUses = (code: DiscountCode) => {
    return Math.max(0, code.maxUses - code.usedCount);
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Discount Codes</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage promotional codes and discounts</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show Inactive</span>
          </label>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            Add Discount Code
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 tablet:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{discountCodes.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Codes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {discountCodes.filter(c => isCodeValid(c)).length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Codes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {discountCodes.reduce((sum, code) => sum + code.usedCount, 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Uses</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {discountCodes.filter(c => c.type === 'percentage').length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Percentage Codes</div>
        </div>
      </div>

      {/* Discount Codes Grid */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
        {discountCodes.map((code) => (
          <div
            key={code._id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${isCodeValid(code) ? 'border-green-200 dark:border-green-700' : 'border-red-200 dark:border-red-700'
              }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                    {code.code}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {code.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isCodeValid(code) ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {code.type === 'percentage' ? (
                      <span className="text-green-600">{code.discountValue}%</span>
                    ) : (
                      <span className="text-green-600">{code.currency} {code.discountValue}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Usage:</span>
                  <span className="text-sm font-medium">
                    {code.usedCount} / {code.maxUses}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className={`text-sm font-medium ${getRemainingUses(code) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {getRemainingUses(code)} uses
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={12} />
                  <span>
                    {new Date(code.validFrom).toLocaleDateString()} - {new Date(code.validUntil).toLocaleDateString()}
                  </span>
                </div>

                {code.minimumOrderValue && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Euro size={12} />
                    <span>Min: {code.currency} {code.minimumOrderValue}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Users size={12} />
                  <span>
                    {(code.applicablePlanKeys || code.applicablePlans || []).length === 0
                      ? 'All plans'
                      : `${(code.applicablePlanKeys || code.applicablePlans || []).length} plan${(code.applicablePlanKeys || code.applicablePlans || []).length > 1 ? 's' : ''}`
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(code)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(code._id)}
                  className="flex items-center justify-center px-3 py-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingCode ? 'Edit Discount Code' : 'Add New Discount Code'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white font-mono"
                      placeholder="SAVE20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      {availableCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="20% off all plans"
                    required
                  />
                </div>

                {/* Discount Details */}
                <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' | 'trial' }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="trial">Trial Period</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {formData.type === 'trial' ? 'Trial Days' : formData.type === 'percentage' ? 'Percentage' : 'Amount'}
                    </label>
                    <input
                      type="number"
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      value={formData.type === 'trial' ? formData.trialDays : formData.discountValue}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setFormData(prev =>
                          prev.type === 'trial'
                            ? { ...prev, trialDays: value }
                            : { ...prev, discountValue: value }
                        );
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Minimum Order Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Order Value (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.minimumOrderValue || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderValue: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Leave empty for no minimum"
                  />
                </div>

                {/* Applicable Plans */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Applicable Plans
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.applicablePlanKeys.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, applicablePlanKeys: [] }));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        All Plans (Sitewide) {formData.applicablePlanKeys.length === 0 && <span className="text-green-600">✓</span>}
                      </span>
                    </label>
                    {pricingPlans.map((plan) => (
                      <label key={plan._id} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.applicablePlanKeys.includes(plan.key || plan._id)}
                          disabled={formData.applicablePlanKeys.length === 0}
                          onChange={(e) => {
                            const planKey = plan.key || plan._id;
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                applicablePlanKeys: [...prev.applicablePlanKeys, planKey]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                applicablePlanKeys: prev.applicablePlanKeys.filter((id: string) => id !== planKey)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {plan.name} ({plan.currency} {plan.price})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="border-t pt-6">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Settings</h4>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Save size={16} />
                    {editingCode ? 'Update Code' : 'Create Code'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountCodeManager;
