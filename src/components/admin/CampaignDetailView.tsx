'use client';

import React from 'react';
import {
    X,
    Send,
    Eye,
    BarChart2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import CampaignPerformancePanel from './CampaignPerformancePanel';

interface CampaignDetailViewProps {
    campaign: any;
    onClose: () => void;
}

export default function CampaignDetailView({ campaign, onClose }: CampaignDetailViewProps) {
    if (!campaign) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'MMM d, yyyy h:mm a');
        } catch (e) {
            return dateString;
        }
    };

    const statusColors = {
        draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        sending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        sent: 'bg-green-500/10 text-green-500 border-green-500/20',
        cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    const statusColor = statusColors[campaign.status as keyof typeof statusColors] || statusColors.draft;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end"
            onClick={onClose}
        >
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl h-full flex flex-col bg-gray-900 border-l border-gray-700 shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">{campaign.campaignName}</h2>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${statusColor}`}>
                                {campaign.status.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                            Subject: <span className="text-gray-300">"{campaign.subject}"</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Main Performance Panel */}
                    <CampaignPerformancePanel
                        campaignId={campaign._id}
                        campaignGoal={campaign.campaignGoal}
                        performance={campaign.performance}
                        refreshInterval={10000} // Refresh every 10s
                    />

                    {/* Campaign Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Sending Info */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Send className="w-5 h-5 text-blue-400" />
                                    Sending Details
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Sent Date</span>
                                        <span className="text-white font-mono">{formatDate(campaign.sentAt)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Created By</span>
                                        <span className="text-white">{campaign.createdByName}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Target Audience</span>
                                        <span className="text-white">{campaign.targetedUserCount?.toLocaleString() || 0} Users</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">From Name</span>
                                        <span className="text-white">{campaign.fromName}</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-gray-400">From Email</span>
                                        <span className="text-white">{campaign.fromEmail}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Configuration */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <BarChart2 className="w-5 h-5 text-purple-400" />
                                    Configuration
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Goal</span>
                                        <span className="text-white capitalize">{campaign.campaignGoal || 'Clicks'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">UTM Source</span>
                                        <span className="text-white">{campaign.utmSource || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">UTM Medium</span>
                                        <span className="text-white">{campaign.utmMedium || '-'}</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-gray-400">Template ID</span>
                                        <span className="text-white font-mono text-xs">{campaign.templateId || 'None'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Email Preview (Read Only) */}
                    <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Eye className="w-5 h-5 text-green-400" />
                                Content Preview
                            </h3>
                        </div>
                        <div className="bg-white p-4 max-h-[500px] overflow-y-auto">
                            <div dangerouslySetInnerHTML={{ __html: campaign.htmlContent }} />
                        </div>
                    </Card>

                </div>
            </motion.div>
        </motion.div>
    );
}
