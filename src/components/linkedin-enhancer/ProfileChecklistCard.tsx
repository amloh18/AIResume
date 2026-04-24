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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 z-10 relative">
                <h3 className="text-lg font-semibold text-gray-900">Profile Checklist</h3>
                <span className="text-sm font-medium text-gray-600">{completedCount}/{checklistItems.length}</span>
            </div>

            <div className="mb-6 z-10 relative">
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 z-10 relative">
                <ul className="space-y-3">
                    {checklistItems.map(item => (
                        <li key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 bg-gray-50/50">
                            <div className="flex items-center space-x-3">
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                    {item.completed ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <span className="text-xs font-bold block w-full h-full text-center leading-6">-</span>
                                    )}
                                </div>
                                <span className={`text-sm font-medium ${item.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {item.label}
                                </span>
                            </div>
                            {!item.completed && (
                                <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">
                                    Add
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-50 rounded-full opacity-50 blur-2xl"></div>
        </div>
    );
}
