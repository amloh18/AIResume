// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
'use client';

import React, { useState, useEffect } from 'react';
import { usePricingPlans } from '@/lib/hooks/usePricingPlans';
import { AdminPricingPlanSkeleton } from './AdminSkeletons';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  Plus, Edit, Eye, Link, ToggleLeft, ToggleRight, CheckCircle, 
  AlertCircle, ExternalLink, Copy, Settings, Globe, X, 
  Save, Loader2, Zap, Shield, TrendingUp, ArrowUpRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import PricingPlanEditModal from '@/components/admin/PricingPlanEditModal';
import AddPricingModal from '@/components/admin/AddPricingModal';
import PromotionalOfferManager from '@/components/admin/PromotionalOfferManager';
import DiscountCodeManager from '@/components/admin/DiscountCodeManager';
import RevenueManager from '@/components/admin/RevenueManager';
import { getCountryName, getCountryFlag, DEFAULT_PLAN_KEY } from '@/lib/config/adminConstants';
import { useRouter } from 'next/navigation';
import { LocationService } from '@/lib/payment/locationService';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingPlanManagerProps {
  activeSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const PricingPlanManager: React.FC<PricingPlanManagerProps> = ({ activeSubTab, onSubTabChange }) => {
  const router = useRouter();
  const currentTab = activeSubTab || 'plans';
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedPlanForPreview, setSelectedPlanForPreview] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<any>(null);
  const [isPlanDetailsModalOpen, setIsPlanDetailsModalOpen] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<any>(null);
  const [promotionalOffersState, setPromotionalOffersState] = useState<any[]>([]);
  const [loadingOffersState, setLoadingOffersState] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [countryPricing, setCountryPricing] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, any>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { plans, loading, refetch, promotionalOffers } = usePricingPlans({ includeInactive: true });

  const safePlans = Array.isArray(plans) ? plans : [];
  const safeCountryPricing = Array.isArray(countryPricing) ? countryPricing : [];

  useEffect(() => {
    const fetchAllOffers = async () => {
      setLoadingOffersState(true);
      try {
        const response = await fetch('/api/admin/promotional-offers');
        const data = await response.json();
        setPromotionalOffersState(data);
        setOffersError(null);
      } catch (error) {
        console.error('Failed to load promotional offers:', error);
        setOffersError("Couldn't load promotional offers. Try again.");
      } finally { setLoadingOffersState(false); }
    };
    if (mounted) fetchAllOffers();
  }, [mounted, retryTick]);

  useEffect(() => {
    const fetchPricingData = async () => {
      setLoadingPricing(true);
      try {
        const response = await fetch('/api/admin/country-pricing');
        const data = await response.json();
        if (data.success) {
          setCountryPricing(data.data?.countryPricing || data.countryPricing || []);
          setPricingError(null);
        } else {
          setPricingError("Couldn't load regional pricing. Try again.");
        }
      } catch (error) {
        console.error('Failed to load country pricing:', error);
        setPricingError("Couldn't load regional pricing. Try again.");
      } finally { setLoadingPricing(false); }
    };
    if (mounted) fetchPricingData();
  }, [mounted, retryTick]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (!mounted) return null;

  const retryLoad = () => {
    setOffersError(null);
    setPricingError(null);
    setRetryTick(t => t + 1);
  };

  const pricingTabs = [
    { id: 'plans', label: 'Plans & Tiers', icon: Zap },
    { id: 'regional', label: 'Regional Pricing', icon: Globe },
    { id: 'promotions', label: 'Promotional Offers', icon: TrendingUp },
    { id: 'coupons', label: 'Discount Codes', icon: Shield },
    { id: 'revenue', label: 'Revenue Analytics', icon: ArrowUpRight },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Sub Tab Navigation Pill Bar + Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#111216] border border-white/5 overflow-x-auto max-w-full">
          {pricingTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSubTabChange && onSubTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {currentTab === 'plans' && (
          <button
            onClick={() => setIsAddCountryModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-full px-4 py-2 flex items-center gap-1.5 text-xs transition-all shadow-sm shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Establish Plan</span>
          </button>
        )}
      </div>

      {/* Load error (inline, with retry) */}
      {(offersError || pricingError) && (
        <div role="alert" className="flex items-center justify-between gap-3 bg-red-500/[0.06] border border-red-500/20 rounded-2xl px-4 py-2.5">
          <span className="text-xs text-red-400 font-medium">{offersError || pricingError}</span>
          <button
            onClick={retryLoad}
            className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold transition-all shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={onSubTabChange} className="w-full">
        <TabsContent value="plans" className="mt-4 space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Active Protocols', val: safePlans.filter(p => p.status === 'active').length, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Signal Overlays', val: promotionalOffersState.length, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Sector Coverage', val: safeCountryPricing.length, icon: Globe, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map((m, i) => (
              <div key={i} className="bg-[#111216] border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-28 group hover:border-white/10 transition-all shadow-xl">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">{m.label}</p>
                  <p className="text-xl font-bold text-white tracking-tight">{m.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Plans Table */}
          <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Protocol Alias</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Base Value</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Billing Cycle</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {safePlans.map((plan) => (
                    <motion.tr key={plan._id} variants={item} className="group hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => { setSelectedPlanForDetails(plan); setIsPlanDetailsModalOpen(true); }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {plan.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">{plan.name}</div>
                            <div className="text-[10px] text-white/30 truncate max-w-[150px]">{plan.key}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs font-semibold text-white">${(plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0).toFixed(2)}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-medium text-white/40 capitalize">{plan.billingCycle}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          plan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedPlanForEdit(plan); setIsEditModalOpen(true); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-all">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regional" className="mt-4">
          <div className="bg-[#111216] border border-white/5 rounded-2xl p-8 text-center shadow-xl">
            <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto mb-3">
              <Globe className="h-8 w-8 text-white/20" />
            </div>
            <h4 className="text-white font-semibold text-sm">Geospatial Overlay</h4>
            <p className="text-white/40 text-xs mt-1 max-w-sm mx-auto">Regional pricing matrix is undergoing maintenance. Real-time parity adjustments active.</p>
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="mt-4">
          <PromotionalOfferManager />
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <DiscountCodeManager />
        </TabsContent>

        <TabsContent value="revenue" className="mt-0">
          <RevenueManager />
        </TabsContent>
      </Tabs>

      {/* Detail Modal Overhaul */}
      <AnimatePresence>
        {isPlanDetailsModalOpen && selectedPlanForDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsPlanDetailsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="relative bg-[#111216] border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedPlanForDetails.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">Protocol Blueprint</p>
                </div>
                <button onClick={() => setIsPlanDetailsModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Allocation Metrics</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'CV Limit', val: selectedPlanForDetails.maxCVs === -1 ? 'Unlimited' : selectedPlanForDetails.maxCVs },
                        { label: 'Exports', val: selectedPlanForDetails.maxExports === -1 ? 'Unlimited' : selectedPlanForDetails.maxExports },
                        { label: 'Storage', val: `${selectedPlanForDetails.storageLimit} GB` }
                      ].map((stat, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 bg-white/[0.02] rounded-xl border border-white/5">
                          <span className="text-[10px] text-white/40 font-medium">{stat.label}</span>
                          <span className="text-xs font-semibold text-white">{stat.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Feature Matrix</h4>
                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 max-h-[140px] overflow-y-auto">
                      <ul className="space-y-1.5">
                        {selectedPlanForDetails.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button onClick={() => { setIsPlanDetailsModalOpen(false); setSelectedPlanForPreview(selectedPlanForDetails); setIsPreviewModalOpen(true); }} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/10">
                    <Eye className="w-3.5 h-3.5" /> Visual Preview
                  </button>
                  <button onClick={() => { setIsPlanDetailsModalOpen(false); setSelectedPlanForEdit(selectedPlanForDetails); setIsEditModalOpen(true); }} className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5">
                    <Edit className="w-3.5 h-3.5" /> Reconfigure
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddPricingModal 
        isOpen={isAddCountryModalOpen} 
        onClose={() => setIsAddCountryModalOpen(false)} 
        onSuccess={() => {
          refetch();
          const fetchPricingData = async () => {
            setLoadingPricing(true);
            try {
              const response = await fetch('/api/admin/country-pricing');
              const data = await response.json();
              if (data.success) {
                setCountryPricing(data.data?.countryPricing || data.countryPricing || []);
                setPricingError(null);
              } else {
                setPricingError("Couldn't refresh regional pricing. Try again.");
              }
            } catch (error) {
              console.error('Failed to refresh country pricing:', error);
              setPricingError("Couldn't refresh regional pricing. Try again.");
            } finally { setLoadingPricing(false); }
          };
          fetchPricingData();
        }}
        plans={safePlans} 
      />
    </motion.div>
  );
};

export default PricingPlanManager;
