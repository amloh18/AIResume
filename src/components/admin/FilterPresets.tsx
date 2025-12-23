'use client';

import React, { useState } from 'react';
import { Target, Users, Zap, Star, TrendingUp, Heart, Plus, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
            registrationDateRange: {
                preset: 'last7days',
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            }
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
            lastActiveRange: {
                preset: 'inactive30',
                endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            }
        },
        color: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50'
    },
    {
        id: 'dormant-users',
        name: 'Dormant Users (90+ Days)',
        description: 'Users inactive for over 3 months - last chance',
        icon: <Zap className="w-5 h-5" />,
        category: 're-engagement',
        filters: {
            lastActiveRange: {
                preset: 'inactive60',
                endDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
            }
        },
        color: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
    },
    {
        id: 'high-engagement-free',
        name: 'Upsale to Premium',
        description: 'Free plan users with high engagement',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'upsale',
        filters: {
            membershipPlans: ['free'],
            lastActiveRange: {
                preset: 'last7days',
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            }
        },
        color: 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
    },
    {
        id: 'day-pass-users',
        name: 'Day Pass Users',
        description: 'Users currently on day pass plan',
        icon: <TrendingUp className="w-5 h-5" />,
        category: 'upsale',
        filters: {
            membershipPlans: ['day_pass'],
            lastActiveRange: {
                preset: 'last7days',
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            }
        },
        color: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
    },
    {
        id: 'pro-users',
        name: 'Pro Plan Members',
        description: 'All users on pro plans (monthly/quarterly/yearly)',
        icon: <Heart className="w-5 h-5" />,
        category: 'retention',
        filters: {
            membershipPlans: ['pro_monthly', 'pro_quarterly', 'pro_yearly']
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
        description: 'Active users who logged in within last 14 days',
        icon: <Star className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            lastActiveRange: {
                preset: 'last14days',
                startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            }
        },
        color: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
    },
    {
        id: 'all-pro-users',
        name: 'All Pro Members',
        description: 'All users on any pro plan',
        icon: <Star className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            membershipPlans: ['pro_monthly', 'pro_quarterly', 'pro_yearly']
        },
        color: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
    },
    {
        id: 'all-active',
        name: 'All Active Users',
        description: 'Everyone who logged in within last 30 days',
        icon: <Users className="w-5 h-5" />,
        category: 'promotional',
        filters: {
            lastActiveRange: {
                preset: 'last30days',
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            }
        },
        color: 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/50'
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Quick Filter Presets</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Apply pre-configured audience filters for common scenarios
                    </p>
                </div>
                {onSaveCustomPreset && (
                    <Button
                        onClick={() => setShowSaveCustom(!showSaveCustom)}
                        variant="outline"
                        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 px-3 py-1.5 text-sm"
                    >
                        <Bookmark className="w-4 h-4 mr-2" />
                        Save Current as Preset
                    </Button>
                )}
            </div>

            {showSaveCustom && (
                <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={customPresetName}
                                onChange={(e) => setCustomPresetName(e.target.value)}
                                placeholder="Enter preset name..."
                                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button
                                onClick={handleSaveCustom}
                                disabled={!customPresetName.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Save
                            </Button>
                            <Button
                                onClick={() => setShowSaveCustom(false)}
                                variant="outline"
                                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 tablet:grid-cols-2 gap-3">
                {PRESET_TEMPLATES.map((preset) => (
                    <Card
                        key={preset.id}
                        className={`cursor-pointer transition-all ${preset.color} ${selectedPresetId === preset.id ? 'ring-2 ring-blue-500' : ''
                            }`}
                        onClick={() => handleApplyPreset(preset)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${preset.color}`}>
                                    {preset.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-white font-semibold text-sm">
                                            {preset.name}
                                        </h4>
                                        <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                                            {getCategoryLabel(preset.category)}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs">
                                        {preset.description}
                                    </p>
                                    {preset.estimatedCount !== undefined && (
                                        <div className="mt-2 text-xs text-blue-400">
                                            ~{preset.estimatedCount.toLocaleString()} users
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                    <strong>Tip:</strong> After applying a preset, you can further customize the filters to refine your audience.
                </p>
            </div>
        </div>
    );
}
