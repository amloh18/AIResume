'use client';

import React, { useEffect, useState } from 'react';
import {
    Mail,
    CheckCircle,
    XCircle,
    Eye,
    MousePointerClick,
    UserMinus,
    TrendingUp,
    TrendingDown,
    Download,
    AlertTriangle,
    DollarSign,
    Target
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CampaignPerformance {
    sent: number;
    delivered: number;
    bounced: number;
    hardBounces: number;
    softBounces: number;
    opened: number;
    uniqueOpens: number;
    clicked: number;
    uniqueClicks: number;
    unsubscribed: number;
    spamReports: number;
    goalCompletions: number;
    revenue?: number;
}

interface CampaignPerformancePanelProps {
    campaignId: string;
    campaignGoal?: string;
    performance?: CampaignPerformance;
    refreshInterval?: number; // milliseconds
}

export default function CampaignPerformancePanel({
    campaignId,
    campaignGoal = 'clicks',
    performance: initialPerformance,
    refreshInterval = 30000 // 30 seconds default
}: CampaignPerformancePanelProps) {
    const [performance, setPerformance] = useState<CampaignPerformance>(initialPerformance || {
        sent: 0,
        delivered: 0,
        bounced: 0,
        hardBounces: 0,
        softBounces: 0,
        opened: 0,
        uniqueOpens: 0,
        clicked: 0,
        uniqueClicks: 0,
        unsubscribed: 0,
        spamReports: 0,
        goalCompletions: 0
    });
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        if (!initialPerformance) {
            fetchPerformance();
        }

        const interval = setInterval(() => {
            fetchPerformance();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [campaignId, refreshInterval]);

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/email-campaigns/${campaignId}/performance`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setPerformance(data.performance);
                    setLastUpdated(new Date());
                }
            }
        } catch (error) {
            console.error('Failed to fetch performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateRate = (numerator: number, denominator: number): number => {
        if (denominator === 0) return 0;
        return (numerator / denominator) * 100;
    };

    const openRate = calculateRate(performance.uniqueOpens, performance.delivered);
    const clickRate = calculateRate(performance.uniqueClicks, performance.delivered);
    const bounceRate = calculateRate(performance.bounced, performance.sent);
    const unsubscribeRate = calculateRate(performance.unsubscribed, performance.delivered);
    const deliveryRate = calculateRate(performance.delivered, performance.sent);
    const goalCompletionRate = calculateRate(performance.goalCompletions, performance.clicked);

    const handleExportReport = () => {
        const csvData = [
            ['Metric', 'Value', 'Rate'],
            ['Sent', performance.sent, ''],
            ['Delivered', performance.delivered, `${deliveryRate.toFixed(2)}%`],
            ['Bounced', performance.bounced, `${bounceRate.toFixed(2)}%`],
            ['Hard Bounces', performance.hardBounces, ''],
            ['Soft Bounces', performance.softBounces, ''],
            ['Unique Opens', performance.uniqueOpens, `${openRate.toFixed(2)}%`],
            ['Total Opens', performance.opened, ''],
            ['Unique Clicks', performance.uniqueClicks, `${clickRate.toFixed(2)}%`],
            ['Total Clicks', performance.clicked, ''],
            ['Unsubscribed', performance.unsubscribed, `${unsubscribeRate.toFixed(2)}%`],
            ['Spam Reports', performance.spamReports, ''],
            ['Goal Completions', performance.goalCompletions, `${goalCompletionRate.toFixed(2)}%`],
        ];

        if (performance.revenue) {
            csvData.push(['Revenue', `$${performance.revenue.toFixed(2)}`, '']);
        }

        const csv = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-${campaignId}-performance.csv`;
        a.click();
    };

    const getPerformanceColor = (rate: number, metric: 'open' | 'click' | 'bounce' | 'unsubscribe') => {
        const benchmarks = {
            open: { good: 20, average: 15 },
            click: { good: 3, average: 2 },
            bounce: { good: 2, average: 5 },
            unsubscribe: { good: 0.2, average: 0.5 }
        };

        const benchmark = benchmarks[metric];

        if (metric === 'bounce' || metric === 'unsubscribe') {
            if (rate <= benchmark.good) return 'text-emerald-500';
            if (rate <= benchmark.average) return 'text-amber-500';
            return 'text-red-400';
        } else {
            if (rate >= benchmark.good) return 'text-emerald-500';
            if (rate >= benchmark.average) return 'text-amber-500';
            return 'text-red-400';
        }
    };

    const MetricCard = ({
        icon,
        label,
        value,
        rate,
        rateLabel,
        trend,
        color = 'text-blue-500'
    }: {
        icon: React.ReactNode;
        label: string;
        value: number | string;
        rate?: number;
        rateLabel?: string;
        trend?: 'up' | 'down';
        color?: string;
    }) => (
        <Card className="bg-[#111111] border-white/10 shadow-2xl">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={color}>{icon}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
                        </div>
                        <div className="text-3xl font-black text-white tracking-tighter">{value}</div>
                        {rate !== undefined && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs font-black ${color}`}>
                                    {rate.toFixed(1)}%
                                </span>
                                {rateLabel && (
                                    <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">{rateLabel}</span>
                                )}
                            </div>
                        )}
                    </div>
                    {trend && (
                        <div className={trend === 'up' ? 'text-emerald-500' : 'text-red-400'}>
                            {trend === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Campaign <span className="text-emerald-500">Performance</span></h2>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2">
                        Last synced: {lastUpdated.toLocaleTimeString()}
                        {loading && <span className="ml-3 text-emerald-500 animate-pulse">Syncing...</span>}
                    </p>
                </div>
                <Button
                    onClick={handleExportReport}
                    variant="outline"
                    className="bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest px-6"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export Intel
                </Button>
            </div>

            {/* Standard Metrics */}
            <div>
                <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 ml-2">Standard Telemetry</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        icon={<Mail className="w-5 h-5" />}
                        label="Sent"
                        value={performance.sent.toLocaleString()}
                        color="text-blue-500"
                    />

                    <MetricCard
                        icon={<CheckCircle className="w-5 h-5" />}
                        label="Delivered"
                        value={performance.delivered.toLocaleString()}
                        rate={deliveryRate}
                        rateLabel="delivery rate"
                        color="text-emerald-500"
                    />

                    <MetricCard
                        icon={<Eye className="w-5 h-5" />}
                        label="Unique Opens"
                        value={performance.uniqueOpens.toLocaleString()}
                        rate={openRate}
                        rateLabel="open rate"
                        color={getPerformanceColor(openRate, 'open')}
                    />

                    <MetricCard
                        icon={<MousePointerClick className="w-5 h-5" />}
                        label="Unique Clicks"
                        value={performance.uniqueClicks.toLocaleString()}
                        rate={clickRate}
                        rateLabel="CTR"
                        color={getPerformanceColor(clickRate, 'click')}
                    />
                </div>
            </div>

            {/* Engagement Details */}
            <div>
                <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 ml-2">Engagement Depth</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MetricCard
                        icon={<XCircle className="w-5 h-5" />}
                        label="Bounced"
                        value={performance.bounced.toLocaleString()}
                        rate={bounceRate}
                        rateLabel={`${performance.hardBounces} hard, ${performance.softBounces} soft`}
                        color={getPerformanceColor(bounceRate, 'bounce')}
                    />

                    <MetricCard
                        icon={<UserMinus className="w-5 h-5" />}
                        label="Unsubscribed"
                        value={performance.unsubscribed.toLocaleString()}
                        rate={unsubscribeRate}
                        rateLabel="unsubscribe rate"
                        color={getPerformanceColor(unsubscribeRate, 'unsubscribe')}
                    />

                    <MetricCard
                        icon={<AlertTriangle className="w-5 h-5" />}
                        label="Spam Reports"
                        value={performance.spamReports.toLocaleString()}
                        color="text-red-400"
                    />
                </div>
            </div>

            {/* Goal Performance */}
            {campaignGoal && (
                <div>
                    <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em] mb-6 ml-2">Objective Tracking</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <MetricCard
                            icon={<Target className="w-5 h-5" />}
                            label={`Goal Completions (${campaignGoal})`}
                            value={performance.goalCompletions.toLocaleString()}
                            rate={goalCompletionRate}
                            rateLabel="of clicks"
                            color="text-purple-500"
                        />

                        {performance.revenue !== undefined && (
                            <MetricCard
                                icon={<DollarSign className="w-5 h-5" />}
                                label="Revenue Generated"
                                value={`$${performance.revenue.toLocaleString()}`}
                                color="text-emerald-500"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* List Health Indicators */}
            <Card className="bg-[#111111] border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                <CardContent className="p-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight mb-6">Sector Health</h3>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Hard Bounce Rate</span>
                            <span className={`text-xs font-black ${calculateRate(performance.hardBounces, performance.sent) > 2
                                    ? 'text-red-400'
                                    : 'text-emerald-500'
                                }`}>
                                {calculateRate(performance.hardBounces, performance.sent).toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Spam Complaint Rate</span>
                            <span className={`text-xs font-black ${calculateRate(performance.spamReports, performance.delivered) > 0.1
                                    ? 'text-red-400'
                                    : 'text-emerald-500'
                                }`}>
                                {calculateRate(performance.spamReports, performance.delivered).toFixed(3)}%
                            </span>
                        </div>
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <p className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest leading-relaxed">
                                <strong className="text-emerald-400">System Assessment:</strong> {
                                    bounceRate < 2 && calculateRate(performance.spamReports, performance.delivered) < 0.1
                                        ? 'PROTOCOL OPTIMAL - Sender reputation is secure.'
                                        : bounceRate < 5 && calculateRate(performance.spamReports, performance.delivered) < 0.5
                                            ? 'PROTOCOL STABLE - Monitor signal quality.'
                                            : 'PROTOCOL CRITICAL - Immediate list hygiene required.'
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Benchmarks */}
            <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-500/20 rounded-[2rem] shadow-2xl">
                <CardContent className="p-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-tight mb-6">Market Benchmarks</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Open Rate</div>
                            <div className="text-sm font-black text-white">15-25%</div>
                            <div className={`text-[10px] font-bold mt-2 ${getPerformanceColor(openRate, 'open')}`}>
                                Actual: {openRate.toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Click Rate</div>
                            <div className="text-sm font-black text-white">2-5%</div>
                            <div className={`text-[10px] font-bold mt-2 ${getPerformanceColor(clickRate, 'click')}`}>
                                Actual: {clickRate.toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Bounce Rate</div>
                            <div className="text-sm font-black text-white">&lt;2%</div>
                            <div className={`text-[10px] font-bold mt-2 ${getPerformanceColor(bounceRate, 'bounce')}`}>
                                Actual: {bounceRate.toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Unsubscribe</div>
                            <div className="text-sm font-black text-white">&lt;0.5%</div>
                            <div className={`text-[10px] font-bold mt-2 ${getPerformanceColor(unsubscribeRate, 'unsubscribe')}`}>
                                Actual: {unsubscribeRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
