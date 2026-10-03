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
import { toast } from '@/lib/hot-toast';

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
  applicablePlanKeys?: string[];  // Plan keys (e.g., 'focused_monthly')
  minimumOrderValue?: number;
  isActive: boolean;
  requiresCreditCard?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingPlan {
  _id: string;
  key?: string;  // Plan key (e.g., 'focused_monthly')
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
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
        toast.success(editingCode ? 'Discount code updated' : 'Discount code created');
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            toast.error(error.error || "Couldn't save the discount code. Try again.");
          } catch {
            toast.error("Couldn't save the discount code. Try again.");
          }
        } else {
          toast.error("Couldn't save the discount code. Try again.");
        }
      }
    } catch (error) {
      console.error('Error saving discount code:', error);
      toast.error("Couldn't save the discount code. Try again.");
    } finally {
      setIsSubmitting(false);
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
    if (deletingId) return;
    if (!confirm('Are you sure you want to delete this discount code?')) return;

    try {
      setDeletingId(codeId);
      const response = await fetch(`/api/admin/discount-codes/${codeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDiscountCodes();
        toast.success('Discount code deleted');
      } else {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const error = await response.json();
            toast.error(error.error || "Couldn't delete the discount code. Try again.");
          } catch {
            toast.error("Couldn't delete the discount code. Try again.");
          }
        } else {
          toast.error("Couldn't delete the discount code. Try again.");
        }
      }
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error("Couldn't delete the discount code. Try again.");
    } finally {
      setDeletingId(null);
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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded bg-white/5 border-white/10 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-xs text-white/60">Show Inactive</span>
        </label>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-semibold transition-all shadow-sm"
        >
          <Plus size={14} />
          Add Discount Code
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Codes', val: discountCodes.length, icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Active Codes', val: discountCodes.filter(c => isCodeValid(c)).length, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Uses', val: discountCodes.reduce((sum, code) => sum + code.usedCount, 0), icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Percentage Codes', val: discountCodes.filter(c => c.type === 'percentage').length, icon: Percent, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-[#111216] border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between h-24 shadow-xl">
            <div className="flex justify-between items-start">
              <div className={`p-1.5 rounded-lg ${m.bg} ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">{m.label}</p>
              <p className="text-lg font-bold text-white tracking-tight">{m.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Discount Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {discountCodes.map((code) => (
          <div
            key={code._id}
            className={`bg-[#111216] rounded-xl border p-4 shadow-xl ${isCodeValid(code) ? 'border-emerald-500/20' : 'border-red-500/20'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  {code.code}
                </h3>
                <p className="text-xs text-white/50 truncate max-w-[200px]">
                  {code.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {isCodeValid(code) ? (
                  <CheckCircle size={14} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={14} className="text-red-400" />
                )}
              </div>
            </div>

            <div className="space-y-1.5 mb-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Discount:</span>
                <span className="font-bold text-emerald-400">
                  {code.type === 'percentage' ? (
                    `${code.discountValue}%`
                  ) : (
                    `${code.currency} ${code.discountValue}`
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/40">Usage:</span>
                <span className="text-white/70">
                  {code.usedCount} / {code.maxUses}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/40">Remaining:</span>
                <span className={`font-medium ${getRemainingUses(code) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {getRemainingUses(code)} uses
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-white/40 pt-1">
                <Calendar size={11} />
                <span>
                  {new Date(code.validFrom).toLocaleDateString()} - {new Date(code.validUntil).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => handleEdit(code)}
                className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors border border-white/5"
              >
                <Edit size={12} />
                Edit
              </button>
              <button
                onClick={() => handleDelete(code._id)}
                disabled={deletingId === code._id}
                title="Delete discount code"
                className="flex items-center justify-center px-2.5 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deletingId === code._id ? (
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400" />
                ) : (
                  <Trash2 size={12} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#111216] border border-white/10 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">
                  {editingCode ? 'Edit Discount Code' : 'Add New Discount Code'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                {/* Basic Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      placeholder="SAVE20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-[#111216] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
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
                  <label className="block text-xs font-semibold text-white/70 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="20% off all plans"
                    required
                  />
                </div>

                {/* Discount Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' | 'trial' }))}
                      className="w-full px-3 py-1.5 bg-[#111216] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="trial">Trial Period</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
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
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxUses: parseInt(e.target.value) }))}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="border-t border-white/5 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded bg-white/5 border-white/10 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-white/70">Active</span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-1.5 text-xs text-white/60 hover:text-white border border-white/10 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    ) : (
                      <Save size={14} />
                    )}
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
