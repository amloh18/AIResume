'use client';

import React, { useState } from 'react';
import { Target, Users, Zap, Star, TrendingUp, Heart, Plus, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

interface FilterPreset {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: 'onboarding' | 're-engagement' | 'upsale' | 'retention' | 'promotional' | 'custom';
    filters: any;
    estimatedCount?: number;
    color: string;
}

interface FilterPresetsProps {
    onApplyPreset: (filters: any, presetName: string) => void;
    currentFilters?: any;
    onSaveCustomPreset?: (name: string, filters: any) => void;
}

const PRESET_TEMPLATES: FilterPreset[] = [
    {
        id: 'new-users',
        name: 'Welcome New Users',
        description: 'Users who registered in the last 7 days',
        icon: <Users className="w-5 h-5" />,
        category: 'onboarding',
        filters: {
            userAge: { type: 'new_users', days: 7 }
        },
        color: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
    },
    {
        id: 'verified-users',
        name: 'Verified Email Users',
        description: 'All users with verified email addresses',
        icon: <Target className="w-5 h-5" />,
        category: 'onboarding',
        filters: {
            emailVerified: true
        },
        color: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/50'
    },
    {
        id: 'inactive-users',
        name: 'Re-engage Inactive Users',
        description: 'Users who haven\'t logged in for 30+ days',
        icon: <Zap className="w-5 h-5" />,
        category: 're-engagement',
        filters: {
            userAge: { type: 'existing_users', days: 30 }
        },
        color: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50'
    },
    {
        id: 'dormant-users',
        name: 'Dormant Users (90+ Days)',
        description: 'Users inactive for over 3 months - churn risk',
        icon: <Zap className="w-5 h-5" />,
        category: 're-engagement',
        filters: {
            userAge: { type: 'existing_users', days: 90 }
        },
        color: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
    },
    {
        id: 'high-engagement-free',
        name: 'Upsale to Premium',
        description: 'Starter plan users registered in the last 7 days',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'upsale',
        filters: {
            membershipPlans: ['starter_monthly'],
            userAge: { type: 'new_users', days: 7 }
        },
        color: 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
    },
    {
        id: 'focused-members',
        name: 'Focused Plan Members',
        description: 'Users subscribed to Focused monthly or yearly tiers',
        icon: <Heart className="w-5 h-5" />,
        category: 'retention',
        filters: {
            membershipPlans: ['focused_monthly', 'focused_yearly']
        },
        color: 'bg-pink-500/10 border-pink-500/30 hover:border-pink-500/50'
    },
    {
        id: 'first-cv-users',
        name: 'First CV Created',
        description: 'Users who created at least one CV',
        icon: <Star className="w-5 h-5" />,
        category: 'retention',
        filters: {
            usageMetrics: {
                minCVsCreated: 1
            }
        },
        color: 'bg-violet-500/10 border-violet-500/30 hover:border-violet-500/50'
    },
    {
        id: 'active-users-promo',
        name: 'Active Users Promotion',
        description: 'Users active in the last 30 days',
        icon: <Star className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            userAge: { type: 'new_users', days: 30 }
        },
        color: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
    },
    {
        id: 'smart-members',
        name: 'Smart Plan Members',
        description: 'Users on Smart quarterly or yearly tiers',
        icon: <Star className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            membershipPlans: ['smart_quarterly', 'smart_yearly']
        },
        color: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
    },
    {
        id: 'all-premium',
        name: 'All Paid Members',
        description: 'Everyone on any active focused or smart plan',
        icon: <Users className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            membershipPlans: ['focused_monthly', 'focused_yearly', 'smart_quarterly', 'smart_yearly']
        },
        color: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/50'
    },
    /* Advanced presets added for complicated filters */
    {
        id: 'highly-active-starter',
        name: 'Highly Active Starter Members',
        description: 'Starter members with 3+ CVs created (Target for upsales)',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'upsale',
        filters: {
            membershipPlans: ['starter_monthly'],
            usageMetrics: { minCVsCreated: 3 }
        },
        color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
    },
    {
        id: 'smart-power-users',
        name: 'Smart Plan Power Users',
        description: 'Smart members with 5+ CVs and 3+ Job Journeys completed',
        icon: <Star className="w-5 h-5" />,
        category: 'retention',
        filters: {
            membershipPlans: ['smart_quarterly', 'smart_yearly'],
            usageMetrics: { minCVsCreated: 5, minJourneysCompleted: 3 }
        },
        color: 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
    },
    {
        id: 'dormant-paid-members',
        name: 'Dormant Paid Members',
        description: 'Paid plan subscribers inactive for over 90 days (Extreme churn risk)',
        icon: <Zap className="w-5 h-5" />,
        category: 're-engagement',
        filters: {
            membershipPlans: ['focused_monthly', 'focused_yearly', 'smart_quarterly', 'smart_yearly'],
            userAge: { type: 'existing_users', days: 90 }
        },
        color: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
    },
    {
        id: 'unverified-new-registrants',
        name: 'Unverified New Registrants',
        description: 'Users registered in the last 7 days whose email is unverified',
        icon: <Users className="w-5 h-5" />,
        category: 'onboarding',
        filters: {
            emailVerified: false,
            userAge: { type: 'new_users', days: 7 }
        },
        color: 'bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-500/50'
    },
    {
        id: 'active-us-focused',
        name: 'Active US Focused Users',
        description: 'US region users on Focused tiers active within the last 30 days',
        icon: <Target className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            membershipPlans: ['focused_monthly', 'focused_yearly'],
            region: 'US',
            userAge: { type: 'new_users', days: 30 }
        },
        color: 'bg-violet-500/10 border-violet-500/30 hover:border-violet-500/50'
    }
];

export default function FilterPresets({
    onApplyPreset,
    currentFilters,
    onSaveCustomPreset
}: FilterPresetsProps) {
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [showSaveCustom, setShowSaveCustom] = useState(false);
    const [customPresetName, setCustomPresetName] = useState('');

    const handleApplyPreset = async (preset: FilterPreset) => {
        setSelectedPresetId(preset.id);
        onApplyPreset(preset.filters, preset.name);
    };

    const handleSaveCustom = () => {
        if (customPresetName.trim() && onSaveCustomPreset && currentFilters) {
            onSaveCustomPreset(customPresetName, currentFilters);
            setCustomPresetName('');
            setShowSaveCustom(false);
        }
    };

    const getCategoryLabel = (category: string) => {
        const labels: Record<string, string> = {
            'onboarding': 'Onboarding',
            're-engagement': 'Re-engagement',
            'upsale': 'Upsale',
            'retention': 'Retention',
            'promotional': 'Promotional',
            'custom': 'Custom'
        };
        return labels[category] || category;
    };

    return (
        <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Presets:</span>
            <select
                onChange={(e) => {
                    const selected = PRESET_TEMPLATES.find(p => p.id === e.target.value);
                    if (selected) handleApplyPreset(selected);
                }}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold cursor-pointer"
                defaultValue=""
            >
                <option value="" disabled className="bg-[#111111] text-white/40">Select Preset Filters...</option>
                {PRESET_TEMPLATES.map((preset) => (
                    <option key={preset.id} value={preset.id} className="bg-[#111111] text-white">
                        {preset.name}
                    </option>
                ))}
            </select>

            {onSaveCustomPreset && (
                <button
                    onClick={() => {
                        const name = prompt("Enter a name for this custom preset:");
                        if (name && name.trim()) {
                            onSaveCustomPreset(name.trim(), currentFilters);
                        }
                    }}
                    className="text-[10px] font-black uppercase text-white/40 hover:text-white border border-white/10 px-4 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                >
                    Save As Preset
                </button>
            )}
        </div>
    );
}
