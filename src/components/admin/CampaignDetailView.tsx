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
import { ADMIN_THEME } from '@/lib/config/adminTheme';

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
        draft: ADMIN_THEME.badge.draft,
        scheduled: ADMIN_THEME.badge.scheduled,
        sending: ADMIN_THEME.badge.warning,
        sent: ADMIN_THEME.badge.sent,
        cancelled: ADMIN_THEME.badge.cancelled,
    };

    const statusColor = statusColors[campaign.status as keyof typeof statusColors] || statusColors.draft;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`fixed inset-0 z-50 flex justify-end ${ADMIN_THEME.modal.overlay}`}
            onClick={onClose}
        >
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 20 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-4xl h-full flex flex-col border-l shadow-2xl overflow-hidden ${ADMIN_THEME.background.primary} ${ADMIN_THEME.border.primary}`}
            >
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.secondary}`}>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className={`text-2xl font-bold ${ADMIN_THEME.text.primary}`}>{campaign.campaignName}</h2>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColor}`}>
                                {campaign.status.toUpperCase()}
                            </span>
                        </div>
                        <p className={`text-sm mt-1 ${ADMIN_THEME.text.muted}`}>
                            Subject: <span className={ADMIN_THEME.text.primary}>"{campaign.subject}"</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${ADMIN_THEME.button.ghost}`}
                    >
                        <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
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
                        <Card className={ADMIN_THEME.card.base}>
                            <CardContent className="p-6">
                                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${ADMIN_THEME.text.primary}`}>
                                    <Send className="w-5 h-5 text-emerald-600" />
                                    Sending Details
                                </h3>

                                <div className="space-y-4">
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>Sent Date</span>
                                        <span className={`font-mono ${ADMIN_THEME.text.primary}`}>{formatDate(campaign.sentAt)}</span>
                                    </div>
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>Created By</span>
                                        <span className={ADMIN_THEME.text.primary}>{campaign.createdByName}</span>
                                    </div>
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>Target Audience</span>
                                        <span className={ADMIN_THEME.text.primary}>{campaign.targetedUserCount?.toLocaleString() || 0} Users</span>
                                    </div>
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>From Name</span>
                                        <span className={ADMIN_THEME.text.primary}>{campaign.fromName}</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className={ADMIN_THEME.text.muted}>From Email</span>
                                        <span className={ADMIN_THEME.text.primary}>{campaign.fromEmail}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Configuration */}
                        <Card className={ADMIN_THEME.card.base}>
                            <CardContent className="p-6">
                                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${ADMIN_THEME.text.primary}`}>
                                    <BarChart2 className="w-5 h-5 text-emerald-600" />
                                    Configuration
                                </h3>

                                <div className="space-y-4">
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>Goal</span>
                                        <span className={`capitalize ${ADMIN_THEME.text.primary}`}>{campaign.campaignGoal || 'Clicks'}</span>
                                    </div>
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>UTM Source</span>
                                        <span className={ADMIN_THEME.text.primary}>{campaign.utmSource || '-'}</span>
                                    </div>
                                    <div className={`flex justify-between border-b pb-2 ${ADMIN_THEME.border.primary}`}>
                                        <span className={ADMIN_THEME.text.muted}>UTM Medium</span>
                                        <span className={ADMIN_THEME.text.primary}>{campaign.utmMedium || '-'}</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className={ADMIN_THEME.text.muted}>Template ID</span>
                                        <span className={`font-mono text-xs ${ADMIN_THEME.text.primary}`}>{campaign.templateId || 'None'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Email Preview (Read Only) */}
                    <Card className={`${ADMIN_THEME.card.base} overflow-hidden`}>
                        <div className={`p-4 border-b flex justify-between items-center ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.tertiary}`}>
                            <h3 className={`text-lg font-semibold flex items-center gap-2 ${ADMIN_THEME.text.primary}`}>
                                <Eye className="w-5 h-5 text-emerald-600" />
                                Content Preview
                            </h3>
                        </div>
                        <div className="bg-white p-4 max-h-[500px] overflow-y-auto text-slate-900 border border-slate-200">
                            <div dangerouslySetInnerHTML={{ __html: campaign.htmlContent }} />
                        </div>
                    </Card>

                </div>
            </motion.div>
        </motion.div>
    );
}
