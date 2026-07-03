'use client';

import React from 'react';
import { useEnhancer } from '@/contexts/linkedin-enhancer';

export default function ProfileChecklistCard() {
    const { state: enhancerState } = useEnhancer();
    const sections = enhancerState.sections;

    const checklistItems = [
        { id: 'hero', label: 'Headline & Location', completed: !!sections.hero.current.headline && !!sections.hero.current.location },
        { id: 'about', label: 'About Section', completed: !!sections.about.current },
        { id: 'experience', label: 'Work Experience', completed: sections.experience.length > 0 },
        { id: 'education', label: 'Education', completed: sections.education.length > 0 },
        { id: 'skills', label: 'Skills Matrix', completed: sections.skills_matrix.current.length > 0 },
    ];

    const completedCount = checklistItems.filter(item => item.completed).length;
    const progress = Math.round((completedCount / checklistItems.length) * 100);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10 relative">
                <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Profile Checklist</h3>
                <span className="text-small font-medium text-gray-600 dark:text-gray-400">{completedCount}/{checklistItems.length}</span>
            </div>

            <div className="mb-6 z-10 relative">
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 z-10 relative">
                <ul className="space-y-3">
                    {checklistItems.map(item => (
                        <li key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-700/30">
                            <div className="flex items-center space-x-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'}`}>
                                    {item.completed ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="text-small font-bold block w-full h-full text-center leading-6">-</span>
                                    )}
                                </div>
                                <span className={`text-small font-medium ${item.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {item.label}
                                </span>
                            </div>
                            {!item.completed && (
                                <button className="text-small font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-2 py-1 rounded transition-colors">
                                    Add
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-50 dark:bg-purple-900/20 rounded-full opacity-50 blur-2xl"></div>
        </div>
    );
}
