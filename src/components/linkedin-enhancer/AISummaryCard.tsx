'use client';

import React from 'react';
import { useDashboard, useExtension } from '@/contexts/linkedin-enhancer';

export default function AISummaryCard() {
    const { state: dashboardState } = useDashboard();
    const { state: extensionState, connect } = useExtension();
    const audit = dashboardState.audit;
    const isConnected = extensionState.isConnected;

    if (!isConnected) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/30 p-8 flex flex-col h-full items-center justify-center text-center relative overflow-hidden">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-4 z-10">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 z-10">Connect Extension to unlock metrics</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-sm z-10">
                    Get deep AI insights, skill gap analysis, and tailored recommendations directly from your live LinkedIn profile.
                </p>
                <button 
                    onClick={connect}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 transition-colors z-10"
                >
                    Connect Extension
                </button>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 dark:bg-white/5 rounded-full blur-3xl mix-blend-overlay pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-200/40 dark:bg-blue-900/40 rounded-full blur-3xl mix-blend-overlay pointer-events-none transform -translate-x-1/2 translate-y-1/2" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex items-center space-x-2 mb-6 z-10 relative">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Summary & Metrics</h3>
            </div>
            
            <div className="space-y-6 flex-1 z-10 relative">
                {audit ? (
                    <>
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Strategy Applied</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 leading-relaxed">
                                {audit.strategy_applied}
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Detected Edge Cases</h4>
                            <ul className="space-y-2">
                                {audit.detected_edge_cases.map((edgeCase, idx) => (
                                    <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-400 bg-amber-50/50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-100/50 dark:border-amber-800/30">
                                        <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>{edgeCase}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No audit data available yet.<br/>Enhance your profile to see AI insights.</p>
                    </div>
                )}
            </div>
            
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-50 dark:bg-purple-900/20 rounded-full opacity-50 blur-2xl"></div>
        </div>
    );
}
