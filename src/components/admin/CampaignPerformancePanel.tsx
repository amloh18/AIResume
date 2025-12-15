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
        // Export performance data as CSV
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
        // Industry benchmarks
        const benchmarks = {
            open: { good: 20, average: 15 },
            click: { good: 3, average: 2 },
            bounce: { good: 2, average: 5 },
            unsubscribe: { good: 0.2, average: 0.5 }
        };

        const benchmark = benchmarks[metric];

        if (metric === 'bounce' || metric === 'unsubscribe') {
            // Lower is better
            if (rate <= benchmark.good) return 'text-green-400';
            if (rate <= benchmark.average) return 'text-yellow-400';
            return 'text-red-400';
        } else {
            // Higher is better
            if (rate >= benchmark.good) return 'text-green-400';
            if (rate >= benchmark.average) return 'text-yellow-400';
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
        color = 'text-blue-400'
    }: {
        icon: React.ReactNode;
        label: string;
        value: number | string;
        rate?: number;
        rateLabel?: string;
        trend?: 'up' | 'down';
        color?: string;
    }) => (
        <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={color}>{icon}</div>
                            <span className="text-sm text-gray-400">{label}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{value}</div>
                        {rate !== undefined && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-sm font-semibold ${color}`}>
                                    {rate.toFixed(2)}%
                                </span>
                                {rateLabel && (
                                    <span className="text-xs text-gray-500">{rateLabel}</span>
                                )}
                            </div>
                        )}
                    </div>
                    {trend && (
                        <div className={trend === 'up' ? 'text-green-400' : 'text-red-400'}>
                            {trend === 'up' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Campaign Performance</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                        {loading && <span className="ml-2 text-blue-400">Refreshing...</span>}
                    </p>
                </div>
                <Button
                    onClick={handleExportReport}
                    variant="outline"
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                </Button>
            </div>

            {/* Standard Metrics */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Standard Metrics</h3>
                <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4">
                    <MetricCard
                        icon={<Mail className="w-5 h-5" />}
                        label="Sent"
                        value={performance.sent.toLocaleString()}
                        color="text-blue-400"
                    />

                    <MetricCard
                        icon={<CheckCircle className="w-5 h-5" />}
                        label="Delivered"
                        value={performance.delivered.toLocaleString()}
                        rate={deliveryRate}
                        rateLabel="delivery rate"
                        color="text-green-400"
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
                <h3 className="text-lg font-semibold text-white mb-4">Engagement Details</h3>
                <div className="grid grid-cols-1 tablet:grid-cols-3 gap-4">
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
                    <h3 className="text-lg font-semibold text-white mb-4">Goal Performance</h3>
                    <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                        <MetricCard
                            icon={<Target className="w-5 h-5" />}
                            label={`Goal Completions (${campaignGoal})`}
                            value={performance.goalCompletions.toLocaleString()}
                            rate={goalCompletionRate}
                            rateLabel="of clicks"
                            color="text-purple-400"
                        />

                        {performance.revenue !== undefined && (
                            <MetricCard
                                icon={<DollarSign className="w-5 h-5" />}
                                label="Revenue Generated"
                                value={`$${performance.revenue.toLocaleString()}`}
                                color="text-green-400"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* List Health Indicators */}
            <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">List Health</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Hard Bounce Rate</span>
                            <span className={`font-semibold ${calculateRate(performance.hardBounces, performance.sent) > 2
                                    ? 'text-red-400'
                                    : 'text-green-400'
                                }`}>
                                {calculateRate(performance.hardBounces, performance.sent).toFixed(2)}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">Spam Complaint Rate</span>
                            <span className={`font-semibold ${calculateRate(performance.spamReports, performance.delivered) > 0.1
                                    ? 'text-red-400'
                                    : 'text-green-400'
                                }`}>
                                {calculateRate(performance.spamReports, performance.delivered).toFixed(3)}%
                            </span>
                        </div>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-sm text-blue-300">
                                <strong>Health Status:</strong> {
                                    bounceRate < 2 && calculateRate(performance.spamReports, performance.delivered) < 0.1
                                        ? '✅ Excellent - Your sender reputation is healthy'
                                        : bounceRate < 5 && calculateRate(performance.spamReports, performance.delivered) < 0.5
                                            ? '⚠️ Fair - Monitor your list quality'
                                            : '❌ Poor - Take action to improve list hygiene'
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Performance Benchmarks */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
                <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Industry Benchmarks</h3>
                    <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-gray-400">Open Rate</div>
                            <div className="text-white font-semibold">15-25%</div>
                            <div className={`text-xs mt-1 ${getPerformanceColor(openRate, 'open')}`}>
                                Your: {openRate.toFixed(2)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">Click Rate</div>
                            <div className="text-white font-semibold">2-5%</div>
                            <div className={`text-xs mt-1 ${getPerformanceColor(clickRate, 'click')}`}>
                                Your: {clickRate.toFixed(2)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">Bounce Rate</div>
                            <div className="text-white font-semibold">&lt;2%</div>
                            <div className={`text-xs mt-1 ${getPerformanceColor(bounceRate, 'bounce')}`}>
                                Your: {bounceRate.toFixed(2)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">Unsubscribe Rate</div>
                            <div className="text-white font-semibold">&lt;0.5%</div>
                            <div className={`text-xs mt-1 ${getPerformanceColor(unsubscribeRate, 'unsubscribe')}`}>
                                Your: {unsubscribeRate.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
