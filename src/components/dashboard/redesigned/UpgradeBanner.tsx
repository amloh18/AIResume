'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Rocket, ShieldCheck, ArrowRight, Star } from 'lucide-react';
import { UserTier } from '@/types/dashboard-widgets';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface UpgradeBannerProps {
  tier: UserTier;
  isYearly?: boolean;
}

export default function UpgradeBanner({ tier, isYearly = false }: UpgradeBannerProps) {
  const router = useRouter();

  const getContent = () => {
    switch (tier) {
      case 'starter':
        return {
          title: "Unlock Your Full Career Potential",
          description: "You're currently using the Starter plan. Upgrade to Focused or Smart to access strategic job tracking, advanced ATS analytics, and our autonomous AI job hunter.",
          features: ["Strategic Job Pipeline", "Advanced ATS Heatmaps", "AI Cover Letter Engine"],
          cta: "View Premium Plans",
          gradient: "from-emerald-600 via-teal-700 to-cyan-800",
          icon: <Rocket className="w-12 h-12 text-[#83d60d]" />,
          path: "/pricing"
        };
      case 'focused':
        return {
          title: "Go on Autopilot with Smart AI",
          description: "Don't spend hours applying manually. Smart users unlock our Autonomous Bot that finds, tailors, and applies to jobs for you 24/7 with 95% match accuracy.",
          features: ["AI Autonomous Bot", "Priority Application Queue", "Behavioral AI Insights"],
          cta: "Activate Smart Autopilot",
          gradient: "from-indigo-600 via-purple-700 to-rose-700",
          icon: <Zap className="w-12 h-12 text-amber-400" />,
          path: "/pricing?plan=smart"
        };
      case 'smart':
        if (!isYearly) {
          return {
            title: "Maximize Your Savings",
            description: "You're on the Smart monthly plan. Switch to Yearly and save significantly while keeping your career on autopilot for the entire year.",
            features: ["Full Year of Autopilot", "Unlock Exclusive Templates", "VIP Support Access"],
            cta: "Switch to Yearly & Save",
            gradient: "from-[#0f172a] via-[#1e293b] to-[#334155]",
            icon: <Star className="w-12 h-12 text-[#83d60d]" />,
            path: "/pricing?interval=yearly"
          };
        }
        return {
          title: "You're at the Peak of Innovation",
          description: "You are currently on the Smart Yearly plan. Your career is on full autopilot. Keep your profile updated for the best AI match results.",
          features: ["Active AI Autopilot", "Premium Priority", "Full Suite Access"],
          cta: "Manage Subscription",
          gradient: "from-[#163d32] to-[#0f172a]",
          icon: <ShieldCheck className="w-12 h-12 text-[#83d60d]" />,
          path: "/dashboard/settings"
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative w-full mt-12 mb-8"
    >
      <div className={cn(
        "relative overflow-hidden rounded-[40px] p-8 md:p-12 shadow-2xl border border-white/10",
        "bg-gradient-to-br",
        content.gradient
      )}>
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#83d60d]/10 blur-[100px] -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <Sparkles size={14} className="text-[#83d60d]" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Premium Opportunity</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1]">
              {content.title}
            </h2>
            
            <p className="text-lg font-medium text-white/70 max-w-2xl leading-relaxed">
              {content.description}
            </p>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              {content.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#83d60d]" />
                  <span className="text-xs font-bold text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full lg:w-auto flex flex-col items-center gap-6">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-32 h-32 rounded-[40px] bg-white/10 border border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-xl"
            >
              {content.icon}
            </motion.div>
            
            <button
              onClick={() => router.push(content.path)}
              className="group relative px-8 py-4 rounded-2xl bg-[#83d60d] hover:bg-[#a2f02d] text-slate-900 font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-[#83d60d]/20 overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                {content.cta}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <motion.div 
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.5 }}
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Dynamic Background Ornament */}
      <div className="absolute -z-10 inset-x-8 bottom-0 h-4 bg-black/20 blur-2xl rounded-full" />
    </motion.div>
  );
}
