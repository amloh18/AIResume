'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MessageSquare, LayoutTemplate, ArrowUpRight } from 'lucide-react';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

export default function ContentAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/admin/analytics/content');
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
            } catch (error) {
                console.error('Error fetching content analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${ADMIN_THEME.loading.spinner}`}></div>
            </div>
        );
    }

    if (!data) {
        return <div className={`p-8 text-center ${ADMIN_THEME.text.muted}`}>Failed to load analytics.</div>;
    }

    const COLORS = ['#0f766e', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className={`text-3xl font-bold ${ADMIN_THEME.text.primary} tracking-tight`}>Content & Layout Analytics</h1>
                    <p className={`${ADMIN_THEME.text.muted} mt-1`}>Monitor the performance and usage of CV layouts and user testimonials.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#185b3a] rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-[#185b3a]/20">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-lime-50 font-medium text-lg">Total Layouts</p>
                        <div className="w-8 h-8 rounded-full border border-lime-400/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                            <LayoutTemplate className="w-4 h-4 text-lime-300" />
                        </div>
                    </div>
                    <h2 className="text-5xl font-bold mb-6 tracking-tight">
                        {data?.totalTemplates ?? 0}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-lime-100/80">
                        {data?.totalTemplates === 0 ? 'No layouts yet' : 'Active layouts in the system'}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">Total Testimonials</p>
                        <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                    <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
                        {data?.totalTestimonials ?? 0}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        {data?.totalTestimonials === 0 ? 'No testimonials yet' : 'Published testimonials'}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={`${ADMIN_THEME.card.base} rounded-3xl overflow-hidden`}>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 pb-4">
                        <CardTitle className={ADMIN_THEME.text.primary}>Popular Layouts</CardTitle>
                        <CardDescription className={ADMIN_THEME.text.muted}>Top 5 most used layouts in CVs</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.popularTemplates}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis dataKey="_id" stroke="#9CA3AF" tick={{fill: '#6b7280'}} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9CA3AF" tick={{fill: '#6b7280'}} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#111827', fontWeight: 'bold' }}
                                    cursor={{fill: '#f3f4f6'}}
                                />
                                <Bar dataKey="count" fill="#185b3a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className={`${ADMIN_THEME.card.base} rounded-3xl overflow-hidden`}>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 pb-4">
                        <CardTitle className={ADMIN_THEME.text.primary}>Layouts by Category</CardTitle>
                        <CardDescription className={ADMIN_THEME.text.muted}>Distribution of layouts across categories</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.templatesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ _id, percent }: any) => `${_id} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={90}
                                    fill="#8884d8"
                                    dataKey="count"
                                    nameKey="_id"
                                >
                                    {data.templatesByCategory.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#111827', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
