// @ts-nocheck
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
      } catch (error) {} finally { setLoadingOffersState(false); }
    };
    if (mounted) fetchAllOffers();
  }, [mounted]);

  useEffect(() => {
    const fetchPricingData = async () => {
      setLoadingPricing(true);
      try {
        const response = await fetch('/api/admin/country-pricing');
        const data = await response.json();
        if (data.success) {
          setCountryPricing(data.data?.countryPricing || data.countryPricing || []);
        }
      } catch (error) {} finally { setLoadingPricing(false); }
    };
    if (mounted) fetchPricingData();
  }, [mounted]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  if (!mounted) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className={currentTab === 'revenue' ? "space-y-0" : "space-y-10"}>
      {/* Command Header */}
      {currentTab !== 'revenue' && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
              Economic <span className="text-emerald-500">Matrix</span>
            </h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
              Monetization Protocols • Multi-Regional Pricing
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsAddCountryModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl px-8 py-4 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center gap-2 text-xs uppercase tracking-widest transition-all">
              <Plus className="w-5 h-5" /> Establish Plan
            </button>
          </div>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={onSubTabChange} className="w-full">
        <TabsContent value="plans" className="mt-10 space-y-10">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Active Protocols', val: safePlans.filter(p => p.status === 'active').length, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Signal Overlays', val: promotionalOffersState.length, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Sector Coverage', val: safeCountryPricing.length, icon: Globe, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((m, i) => (
              <div key={i} className="bg-[#111111] border border-white/10 p-8 rounded-[2.5rem] flex flex-col justify-between h-40 group hover:border-white/20 transition-all shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] blur-3xl rounded-full" />
                <div className="flex justify-between items-start relative z-10">
                  <div className={`p-3 rounded-2xl ${m.bg} ${m.color}`}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                </div>
                <div className="relative z-10">
                  <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{m.label}</p>
                  <p className="text-3xl font-black text-white">{m.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Plans Table */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Protocol Alias</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Base Value</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Billing Cycle</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {safePlans.map((plan) => (
                    <motion.tr key={plan._id} variants={item} className="group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => { setSelectedPlanForDetails(plan); setIsPlanDetailsModalOpen(true); }}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black text-sm">
                            {plan.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">{plan.name}</div>
                            <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest truncate max-w-[150px]">{plan.key}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-black text-white">${(plan.price_monthly || plan.price_quarterly || plan.price_yearly || plan.price_one_time || 0).toFixed(2)}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{plan.billingCycle}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          plan.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {plan.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setSelectedPlanForEdit(plan); setIsEditModalOpen(true); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20">
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regional" className="mt-10">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-12 text-center shadow-2xl">
            <div className="p-6 bg-white/5 rounded-3xl w-fit mx-auto mb-6">
              <Globe className="h-12 w-12 text-white/10" />
            </div>
            <h4 className="text-white font-black uppercase tracking-widest text-sm">Geospatial Overlay</h4>
            <p className="text-white/20 text-[10px] uppercase font-bold mt-4 max-w-xs mx-auto">Regional pricing matrix is undergoing maintenance. Real-time parity adjustments active.</p>
          </div>
        </TabsContent>

        <TabsContent value="promotions" className="mt-10">
          <PromotionalOfferManager />
        </TabsContent>

        <TabsContent value="coupons" className="mt-10">
          <DiscountCodeManager />
        </TabsContent>

        <TabsContent value="revenue" className="mt-10">
          <RevenueManager />
        </TabsContent>
      </Tabs>

      {/* Detail Modal Overhaul */}
      <AnimatePresence>
        {isPlanDetailsModalOpen && selectedPlanForDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsPlanDetailsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#111111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-8 border-b border-white/5 bg-white/2 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedPlanForDetails.name}</h3>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Protocol Blueprint</p>
                </div>
                <button onClick={() => setIsPlanDetailsModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-10 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Allocation Metrics</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'CV Limit', val: selectedPlanForDetails.maxCVs === -1 ? 'Unlimited' : selectedPlanForDetails.maxCVs },
                        { label: 'Exports', val: selectedPlanForDetails.maxExports === -1 ? 'Unlimited' : selectedPlanForDetails.maxExports },
                        { label: 'Storage', val: `${selectedPlanForDetails.storageLimit} GB` }
                      ].map((stat, i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{stat.label}</span>
                          <span className="text-xs font-black text-white">{stat.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Feature Matrix</h4>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 max-h-[160px] overflow-y-auto scrollbar-hide">
                      <ul className="space-y-2">
                        {selectedPlanForDetails.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button onClick={() => { setIsPlanDetailsModalOpen(false); setSelectedPlanForPreview(selectedPlanForDetails); setIsPreviewModalOpen(true); }} className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> Visual Preview
                  </button>
                  <button onClick={() => { setIsPlanDetailsModalOpen(false); setSelectedPlanForEdit(selectedPlanForDetails); setIsEditModalOpen(true); }} className="flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                    <Edit className="w-4 h-4" /> Reconfigure
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
              }
            } catch (error) {} finally { setLoadingPricing(false); }
          };
          fetchPricingData();
        }}
        plans={safePlans} 
      />
    </motion.div>
  );
};

export default PricingPlanManager;
