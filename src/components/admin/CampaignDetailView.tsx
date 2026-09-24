'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Send,
    Eye,
    BarChart2,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    Download,
    UserCheck,
    Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CampaignPerformancePanel from './CampaignPerformancePanel';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { CHIP_INLINE, CHIP_TONES_DARK, type ChipTone } from '@/components/ui/chip-styles';

interface RecipientPayload {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    currentPlanKey?: string | null;
    registrationDate?: string | null;
    lastActiveAt?: string | null;
    isCsv: boolean;
}

interface RecipientsResponse {
    success: boolean;
    campaignId?: string;
    totalCount: number;
    page: number;
    totalPages: number;
    limit: number;
    users: RecipientPayload[];
    error?: string;
}

function formatDateSafe(dateString?: string | null) {
    if (!dateString) return '—';
    try {
        return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
        return '—';
    }
}

/**
 * Returns a tone, not a class string. This table renders inside
 * `ADMIN_THEME.background.primary` (`#0a0a0a`), so the old `bg-purple-100
 * text-purple-700` pills were light chips on a near-black row.
 */
function planTone(plan?: string | null): ChipTone {
    const normalized = (plan || 'free').toLowerCase();
    if (normalized === 'premium') return 'purple';
    if (normalized === 'enterprise') return 'blue';
    if (normalized === 'basic') return 'emerald';
    return 'neutral';
}

interface CampaignDetailViewProps {
    campaign: any;
    onClose: () => void;
}

export default function CampaignDetailView(props: CampaignDetailViewProps) {
    // Wrapper split (react-hooks/rules-of-hooks): the early return must not sit above the hooks in
    // the same component — if `campaign` flips between renders, hook counts would change. The body
    // component mounts only when campaign exists, preserving today's mount semantics exactly.
    if (!props.campaign) return null;
    return <CampaignDetailViewBody {...props} />;
}

function CampaignDetailViewBody({ campaign, onClose }: CampaignDetailViewProps) {
    const [recipientsData, setRecipientsData] = useState<RecipientsResponse | null>(null);
    const [loadingRecipients, setLoadingRecipients] = useState(true);
    const [recipientsError, setRecipientsError] = useState<string | null>(null);
    const [emailSearch, setEmailSearch] = useState('');
    const [nameSearch, setNameSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'db' | 'csv'>('all');
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    const limit = 50;

    const fetchRecipients = async (pageOverride?: number) => {
        setLoadingRecipients(true);
        setRecipientsError(null);
        try {
            const baseParams = new URLSearchParams({
                page: String(pageOverride ?? page),
                limit: String(limit),
                email: emailSearch,
                name: nameSearch,
                source: sourceFilter,
            });
            const res = await fetch(`/api/admin/email-campaigns/${campaign._id}/recipients?${baseParams.toString()}`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });
            const data: RecipientsResponse = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to load recipients');
            }
            setRecipientsData(data);
            if (pageOverride) setPage(pageOverride);
        } catch (err: any) {
            setRecipientsError(err.message || 'Failed to load recipients');
            setRecipientsData(null);
        } finally {
            setLoadingRecipients(false);
        }
    };

    useEffect(() => {
        fetchRecipients(1);
    }, [emailSearch, nameSearch, sourceFilter]);

    const handleRemoveRecipient = async (email: string) => {
        if (!confirm('Are you sure you want to remove this user from the campaign recipient list?')) {
            return;
        }
        try {
            const res = await fetch(`/api/admin/email-campaigns/${campaign._id}/recipients?email=${encodeURIComponent(email)}`, {
                method: 'DELETE',
                headers: { Accept: 'application/json' },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to remove recipient');
            }
            // Reload the list
            fetchRecipients(page);
        } catch (err: any) {
            alert(err.message || 'Failed to remove recipient');
        }
    };

    const paginatedUsers = useMemo(
        () => recipientsData?.users || [],
        [recipientsData]
    );

    const handleExportCsv = async () => {
        setExporting(true);
        try {
            const res = await fetch(`/api/admin/email-campaigns/${campaign._id}/recipients?limit=500`);
            const data: RecipientsResponse = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load recipients');

            const header = 'First Name,Last Name,Email,Plan,Source,Registered,Last Active\n';
            const rows = data.users.map((u) => {
                const source = u.isCsv ? 'CSV Upload' : 'Database';
                const safe = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                return [
                    safe(u.firstName),
                    safe(u.lastName),
                    safe(u.email),
                    safe(u.currentPlanKey),
                    safe(source),
                    safe(u.registrationDate),
                    safe(u.lastActiveAt),
                ].join(',');
            });

            const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaign-${campaign._id}-recipients.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setExporting(false);
        }
    };

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
                            Subject: <span className={ADMIN_THEME.text.primary}>&quot;{campaign.subject}&quot;</span>
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

                    {/* Recipients */}
                    <Card className={ADMIN_THEME.card.base}>
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <h3 className={`text-lg font-semibold flex items-center gap-2 ${ADMIN_THEME.text.primary}`}>
                                        <Users className="w-5 h-5 text-emerald-600" />
                                        Recipients
                                    </h3>
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={handleExportCsv}
                                        disabled={exporting}
                                    >
                                        <Download className="w-4 h-4" />
                                        {exporting ? 'Exporting...' : 'Export CSV'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Search email"
                                            value={emailSearch}
                                            onChange={(e) => setEmailSearch(e.target.value)}
                                            className={`pl-9 ${ADMIN_THEME.input.base}`}
                                        />
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Search name"
                                            value={nameSearch}
                                            onChange={(e) => setNameSearch(e.target.value)}
                                            className={`pl-9 ${ADMIN_THEME.input.base}`}
                                        />
                                    </div>
                                    <select
                                        value={sourceFilter}
                                        onChange={(e) => setSourceFilter(e.target.value as any)}
                                        className={`h-10 rounded-md border px-3 text-sm ${ADMIN_THEME.input.base}`}
                                    >
                                        <option value="all">All Sources</option>
                                        <option value="db">Database</option>
                                        <option value="csv">CSV Upload</option>
                                    </select>
                                </div>
                            </div>

                            {loadingRecipients ? (
                                <div className={`text-sm py-8 text-center ${ADMIN_THEME.text.muted}`}>Loading recipients...</div>
                            ) : recipientsError ? (
                                <div className="text-sm py-8 text-center text-red-600">{recipientsError}</div>
                            ) : paginatedUsers.length === 0 ? (
                                <div className={`text-sm py-8 text-center ${ADMIN_THEME.text.muted}`}>No recipients found.</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto border rounded-lg">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className={`${ADMIN_THEME.background.tertiary} ${ADMIN_THEME.text.muted} text-left text-xs uppercase tracking-wider`}>
                                                    <th className="px-4 py-3 font-medium">Name</th>
                                                    <th className="px-4 py-3 font-medium">Email</th>
                                                    <th className="px-4 py-3 font-medium">Plan</th>
                                                    <th className="px-4 py-3 font-medium">Source</th>
                                                    <th className="px-4 py-3 font-medium">Registered</th>
                                                    <th className="px-4 py-3 font-medium">Last Active</th>
                                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${ADMIN_THEME.border.primary}`}>
                                                {paginatedUsers.map((user) => (
                                                    <tr
                                                        key={user.id}
                                                        className={`transition-colors ${ADMIN_THEME.background.primary} hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                                                    >
                                                        <td className={`px-4 py-3 ${ADMIN_THEME.text.primary}`}>
                                                            <span className="font-medium">{user.firstName}</span>{' '}
                                                            <span className="font-medium">{user.lastName}</span>
                                                        </td>
                                                        <td className={`px-4 py-3 font-mono text-xs ${ADMIN_THEME.text.primary}`}>
                                                            {user.email}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`${CHIP_INLINE} font-medium ${CHIP_TONES_DARK[planTone(user.currentPlanKey)]}`}>
                                                                <UserCheck className="w-3 h-3" />
                                                                {user.currentPlanKey || 'free'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                                user.isCsv
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-sky-100 text-sky-700'
                                                            }`}>
                                                                {user.isCsv ? 'CSV Upload' : 'Database'}
                                                            </span>
                                                        </td>
                                                        <td className={`px-4 py-3 text-xs ${ADMIN_THEME.text.muted}`}>
                                                            {formatDateSafe(user.registrationDate)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-xs ${ADMIN_THEME.text.muted}`}>
                                                            {formatDateSafe(user.lastActiveAt)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => handleRemoveRecipient(user.email)}
                                                                disabled={campaign.status === 'sent' || campaign.status === 'sending'}
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 dark:hover:text-red-400 p-0 inline-flex items-center justify-center"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className={`text-xs ${ADMIN_THEME.text.muted}`}>
                                            Showing{' '}
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {((recipientsData?.page || 1) - 1) * (recipientsData?.limit || limit) + 1}
                                            </span>{' '}
                                            –{' '}
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {Math.min(
                                                    (recipientsData?.page || 1) * (recipientsData?.limit || limit),
                                                    recipientsData?.totalCount || 0
                                                )}
                                            </span>{' '}
                                            of{' '}
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                {recipientsData?.totalCount || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={loadingRecipients || (recipientsData?.page || 1) <= 1}
                                                onClick={() => fetchRecipients((recipientsData?.page || 1) - 1)}
                                                className="h-8 w-8"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <span className={`px-3 text-xs font-medium ${ADMIN_THEME.text.muted}`}>
                                                {recipientsData?.page || 1} / {recipientsData?.totalPages || 1}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={
                                                    loadingRecipients ||
                                                    (recipientsData?.page || 1) >= (recipientsData?.totalPages || 1)
                                                }
                                                onClick={() => fetchRecipients((recipientsData?.page || 1) + 1)}
                                                className="h-8 w-8"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

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
