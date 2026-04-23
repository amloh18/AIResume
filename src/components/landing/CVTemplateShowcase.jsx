'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Quote, Wand2, ArrowRight } from 'lucide-react';

// ==========================================
// REAL MOCK DATA RENDERERS (Miniature Scale)
// ==========================================
const MiniHeader = ({ type, showPhoto = false, isDark = false }) => {
    const avatar = showPhoto ? (
        <div className={`w-14 h-14 rounded-full bg-slate-200 shadow-md ${isDark ? 'border-slate-800' : 'border-white'} border-[2px] shrink-0 overflow-hidden relative`}>
            <img 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop" 
                alt="Professional Headshot"
                className="w-full h-full object-cover object-center"
            />
        </div>
    ) : null;

    if (type === 'centered') {
        return (
            <div className="w-full flex flex-col items-center justify-center p-4 border-b-[1.5px] border-gray-200 shrink-0 px-2">
                {avatar && <div className="mb-2">{avatar}</div>}
                <h1 className="text-xl font-bold tracking-widest uppercase text-gray-900 break-words w-full text-center leading-none">Alex Jonathan</h1>
                <h2 className="text-[8px] font-bold text-emerald-500 tracking-[0.2em] uppercase mt-2 mb-2 text-center">Senior Data Scientist</h2>
                <div className="text-[6px] flex flex-wrap justify-center gap-x-2.5 gap-y-1 text-gray-500 font-medium">
                    <span>alex@example.com</span><span>•</span><span>+1 (555) 987-6543</span><span>•</span><span>San Francisco, CA</span>
                </div>
            </div>
        );
    }
    if (type === 'split') {
        return (
            <div className="w-full flex items-center justify-between p-5 border-b-[1.5px] border-gray-200 shrink-0">
                <div className="flex gap-4 items-center max-w-[60%]">
                    {avatar}
                    <div className="flex flex-col gap-0.5 items-start">
                        <h1 className="text-lg font-bold uppercase tracking-wider text-gray-900 break-words leading-none">Alex Jonathan</h1>
                        <h2 className="text-[7px] font-bold tracking-[0.15em] text-emerald-600 uppercase mt-1">Senior Data Scientist</h2>
                    </div>
                </div>
                <div className="text-[6px] flex flex-col gap-0.5 text-right text-gray-500 font-medium">
                    <span>alex@example.com</span>
                    <span>+1 (555) 987-6543</span>
                    <span>San Francisco, CA</span>
                </div>
            </div>
        );
    }
    if (type === 'accent') {
        return (
            <div className="w-full flex items-stretch p-0 shrink-0 mb-2 h-auto min-h-[4rem]">
                <div className="w-2 h-auto min-h-full bg-emerald-500 shrink-0" />
                <div className="flex flex-col justify-center px-4 py-3 flex-1 min-w-0">
                    <h1 className="text-xl font-light uppercase tracking-[0.2em] text-gray-900 break-words leading-none w-full">Alex Jonathan</h1>
                    <h2 className="text-[7px] font-bold tracking-[0.2em] uppercase mt-2 text-emerald-600">Senior Data Scientist</h2>
                </div>
                <div className="flex items-center gap-4 pr-5 shrink-0">
                    <div className="text-[5.5px] flex flex-col justify-center gap-1 text-right uppercase tracking-widest text-gray-500 font-semibold hidden sm:flex">
                        <span>alex@example.com</span>
                        <span>+1 (555) 987-6543</span>
                        <span>San Francisco, CA</span>
                    </div>
                    {avatar}
                </div>
            </div>
        );
    }
    if (type === 'avatar') {
        return (
            <div className={`w-full flex flex-col items-center text-center gap-2 pb-3 mb-2 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'} shrink-0 px-2`}>
                {showPhoto && avatar}
                <h1 className={`text-sm font-bold uppercase tracking-wider mt-1 break-words w-full leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Alex Jonathan</h1>
                <h2 className="text-[6px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Data Scientist</h2>
                <div className={`text-[5px] flex flex-col gap-0.5 mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>+1 (555) 987-6543</span>
                    <span>alex@example.com</span>
                    <span>San Francisco, CA</span>
                </div>
            </div>
        );
    }
    if (type === 'initials-right') {
        return (
            <div className="w-full flex items-start justify-between pb-4 pt-2 border-b-[1.5px] border-gray-200 shrink-0">
                <div className="flex-1">
                    <h1 className="text-xl font-light tracking-[0.2em] uppercase text-gray-900 break-words w-full">Alex Jonathan</h1>
                    <h2 className="text-[7px] text-gray-500 tracking-[0.15em] uppercase mt-1">Senior Data Scientist</h2>
                    <div className="text-[6px] flex flex-wrap gap-2 text-gray-400 font-medium mt-2">
                        <span>alex@example.com</span><span>•</span><span>+1 (555) 987-6543</span>
                    </div>
                </div>
                <div className="w-12 h-12 rounded-full border border-gray-800 flex items-center justify-center text-xs tracking-widest text-gray-800 shrink-0 ml-2">
                    AJ
                </div>
            </div>
        );
    }
    if (type === 'simple-left') {
        return (
            <div className="w-full pb-4 pt-2 border-b-[1.5px] border-gray-200 shrink-0">
                <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 break-words w-full leading-none">Alex Jonathan</h1>
                <h2 className="text-[8px] font-semibold text-emerald-600 uppercase tracking-widest mt-2 mb-2">Senior Data Scientist</h2>
                <div className="text-[6px] flex flex-wrap gap-x-3 gap-y-1 text-gray-500 font-medium">
                    <span>alex@example.com</span><span>+1 (555) 987-6543</span><span>San Francisco, CA</span>
                </div>
            </div>
        );
    }
    return null;
};

const MiniSummary = ({ type, isDark = false }) => {
    const textCol = isDark ? 'text-gray-300' : 'text-gray-600';
    const titleCol = isDark ? 'text-gray-100' : 'text-gray-900';
    const borderCol = isDark ? 'border-slate-700' : 'border-gray-200';

    if (type === 'highlight') {
        return (
            <div className="w-full flex flex-col gap-1.5 shrink-0">
                <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Profile</h3>
                <div className={`p-2 border-l-[3px] rounded-r-sm border-emerald-500 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <p className={`text-[5.5px] italic leading-relaxed ${textCol}`}>
                        Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact.
                    </p>
                </div>
            </div>
        );
    }
    if (type === 'quote') {
        return (
            <div className="w-full flex gap-3 items-start shrink-0">
                <div className={`shrink-0 pt-1 text-emerald-500 opacity-50`}><Quote size={16} fill="currentColor" /></div>
                <div className="flex-1 flex flex-col gap-1.5">
                    <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Profile</h3>
                    <p className={`text-[5.5px] leading-relaxed ${textCol}`}>
                        Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact.
                    </p>
                </div>
            </div>
        );
    }
    if (type === 'centered') {
        return (
            <div className="w-full flex flex-col gap-1.5 shrink-0 text-center">
                <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 text-center ${titleCol}`}>Profile</h3>
                <p className={`text-[5.5px] leading-relaxed mx-auto ${textCol}`}>
                    Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact.
                </p>
            </div>
        );
    }
    if (type === 'boxed') {
        return (
            <div className={`w-full flex flex-col gap-1.5 shrink-0 p-3 border rounded-md shadow-sm ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 ${titleCol}`}>Profile</h3>
                <p className={`text-[5.5px] leading-relaxed ${textCol}`}>
                    Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact.
                </p>
            </div>
        );
    }
    // clean / default
    return (
        <div className="w-full flex flex-col gap-1.5 shrink-0">
            <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Profile</h3>
            <p className={`text-[5.5px] leading-relaxed ${textCol}`}>
                Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact. Proven expertise in scoping and deploying end-to-end machine learning models to drive revenue growth.
            </p>
        </div>
    );
};

const MiniExperience = ({ type }) => {
    if (type === 'timeline') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 text-gray-900 border-gray-200">Experience</h3>
                {[
                    { date: 'Jan 2021 - Present', role: 'Lead Data Scientist', company: 'TechNova Solutions', desc: '• Architected scalable machine learning pipelines.\n• Optimized models reducing latency by 40%.' },
                    { date: 'Mar 2017 - Dec 2020', role: 'Data Analyst', company: 'Innovate AI', desc: '• Optimized marketing spend via data-driven insights.\n• Led execution of customer segmentation strategies.' }
                ].map((job, i) => (
                    <div key={i} className="relative pl-3 border-l border-gray-200">
                        <div className="absolute w-1.5 h-1.5 bg-emerald-500 rounded-full -left-[3.5px] top-1 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                        <div className="text-[5.5px] font-bold tracking-widest uppercase mb-0.5 text-emerald-600">{job.date}</div>
                        <h4 className="text-[7px] font-bold text-gray-900">{job.role}</h4>
                        <div className="text-[6px] italic mb-1 text-gray-600">{job.company}</div>
                        <div className="text-[5px] leading-[1.6] whitespace-pre-line text-gray-600">
                            {job.desc}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    if (type === 'hollow-timeline') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 text-gray-900 border-gray-200">Experience</h3>
                {[
                    { date: 'Jan 2021 - Present', role: 'Lead Data Scientist', company: 'TechNova Solutions', desc: '• Architected scalable machine learning pipelines.\n• Optimized models reducing latency by 40%.' },
                    { date: 'Mar 2017 - Dec 2020', role: 'Data Analyst', company: 'Innovate AI', desc: '• Optimized marketing spend via data-driven insights.' }
                ].map((job, i) => (
                    <div key={i} className="relative pl-3 border-l border-gray-300">
                        <div className="absolute w-2 h-2 border-[1.5px] border-emerald-500 bg-white rounded-full -left-[4.5px] top-1"></div>
                        <div className="text-[5.5px] font-bold tracking-widest uppercase mb-0.5 text-emerald-600">{job.date}</div>
                        <h4 className="text-[7px] font-bold text-gray-900">{job.role}</h4>
                        <div className="text-[6px] italic mb-1 text-gray-600">{job.company}</div>
                        <div className="text-[5px] leading-[1.6] whitespace-pre-line text-gray-600">{job.desc}</div>
                    </div>
                ))}
            </div>
        );
    }
    if (type === 'compact') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] border-b pb-1 text-gray-900 border-gray-200">Experience</h3>
                {[
                    { date: '2021 - Pres', role: 'Lead Data Scientist', company: 'TechNova Solutions', desc: '• Architected scalable machine learning pipelines in Python.' },
                    { date: '2017 - 2020', role: 'Data Analyst', company: 'Innovate AI', desc: '• Optimized marketing spend via data-driven insights.' }
                ].map((job, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-baseline">
                            <h4 className="text-[6.5px] font-bold text-gray-900">{job.role} <span className="font-normal italic text-gray-500">at {job.company}</span></h4>
                            <span className="text-[5px] font-bold text-emerald-600">{job.date}</span>
                        </div>
                        <p className="text-[5.5px] text-gray-600">{job.desc}</p>
                    </div>
                ))}
            </div>
        );
    }
    if (type === 'harvard') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] border-b pb-1 text-gray-900 border-gray-200">Experience</h3>
                {[
                    { date: '2021 - Present', role: 'Lead Data Scientist', company: 'TechNova Solutions', desc: '• Architected scalable pipelines.\n• Optimized models reducing latency.' },
                    { date: '2017 - 2020', role: 'Data Analyst', company: 'Innovate AI', desc: '• Optimized marketing spend via data-driven insights.' }
                ].map((job, i) => (
                    <div key={i} className="flex flex-col gap-0.5 mb-1">
                        <div className="flex justify-between items-baseline">
                            <h4 className="text-[6.5px] font-bold text-gray-900">{job.company}, <span className="font-semibold italic text-gray-700">{job.role}</span></h4>
                            <span className="text-[5px] font-bold text-gray-700 uppercase">{job.date}</span>
                        </div>
                        <p className="text-[5.5px] text-gray-600 whitespace-pre-line">{job.desc}</p>
                    </div>
                ))}
            </div>
        );
    }
    // Standard
    return (
        <div className="w-full flex flex-col gap-3 shrink-0">
            <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] border-b pb-1 text-gray-900 border-gray-200">Experience</h3>
            {[
                { date: 'Jan 2021 - Present', role: 'Lead Data Scientist', company: 'TechNova Solutions', desc: '• Architected scalable machine learning pipelines.\n• Optimized interaction workflows for dashboards.' },
                { date: 'Mar 2017 - Dec 2020', role: 'Data Analyst', company: 'Innovate AI', desc: '• Optimized marketing spend via data-driven insights.\n• Led execution of customer segmentation strategies.' }
            ].map((job, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline">
                        <h4 className="text-[7.5px] font-bold text-gray-900">{job.role}</h4>
                        <span className="text-[5.5px] font-bold text-emerald-600">{job.date}</span>
                    </div>
                    <div className="text-[6.5px] italic text-gray-600 mb-0.5">{job.company}</div>
                    <div className="text-[5px] leading-relaxed whitespace-pre-line text-gray-600">{job.desc}</div>
                </div>
            ))}
        </div>
    );
};

const MiniEducation = ({ type, isDark = false }) => {
    const textCol = isDark ? 'text-gray-300' : 'text-gray-600';
    const titleCol = isDark ? 'text-gray-100' : 'text-gray-900';
    const borderCol = isDark ? 'border-slate-700' : 'border-gray-200';

    if (type === 'compact') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Education</h3>
                {[
                    { deg: 'M.S. Data Science', uni: 'UC Berkeley', year: '2015' },
                    { deg: 'B.S. Computer Science', uni: 'Stanford University', year: '2013' }
                ].map((e, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-baseline">
                            <span className={`text-[6.5px] font-bold ${titleCol}`}>{e.deg}</span>
                            <span className="text-[5px] font-bold text-emerald-500">{e.year}</span>
                        </div>
                        <div className={`text-[5.5px] italic ${textCol}`}>{e.uni}</div>
                    </div>
                ))}
            </div>
        );
    }
    if (type === 'timeline') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Education</h3>
                {[
                    { deg: 'M.S. Data Science', uni: 'UC Berkeley', year: '2013 - 2015' },
                    { deg: 'B.S. Computer Science', uni: 'Stanford University', year: '2009 - 2013' }
                ].map((e, i) => (
                    <div key={i} className={`relative pl-3 border-l ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                        <div className="absolute w-1.5 h-1.5 bg-emerald-500 rounded-full -left-[3.5px] top-1"></div>
                        <div className={`text-[5.5px] font-bold tracking-widest uppercase mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{e.year}</div>
                        <h4 className={`text-[6.5px] font-bold ${titleCol}`}>{e.deg}</h4>
                        <div className={`text-[5.5px] italic ${textCol}`}>{e.uni}</div>
                    </div>
                ))}
            </div>
        );
    }
    if (type === 'harvard') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Education</h3>
                {[
                    { deg: 'M.S. Data Science', uni: 'UC Berkeley', year: '2015' },
                    { deg: 'B.S. Computer Science', uni: 'Stanford University', year: '2013' }
                ].map((e, i) => (
                    <div key={i} className="flex justify-between items-baseline mb-0.5">
                        <h4 className={`text-[6px] font-bold ${titleCol}`}>{e.uni}, <span className="font-semibold italic text-gray-500">{e.deg}</span></h4>
                        <span className={`text-[5px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-700'} uppercase`}>{e.year}</span>
                    </div>
                ))}
            </div>
        );
    }
    // Standard
    return (
        <div className="w-full flex flex-col gap-2 shrink-0">
            <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 ${titleCol} ${borderCol}`}>Education</h3>
            {[
                { deg: 'M.S. Data Science', uni: 'UC Berkeley', year: '2013 - 2015', desc: "Focus on Systems Architecture and Machine Learning." },
                { deg: 'B.S. Computer Science', uni: 'Stanford University', year: '2009 - 2013', desc: "Minor in Statistical Analysis." }
            ].map((e, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline">
                        <span className={`text-[7px] font-bold ${titleCol}`}>{e.deg}</span>
                        <span className="text-[5.5px] font-bold text-emerald-500">{e.year}</span>
                    </div>
                    <span className={`text-[6px] italic ${textCol}`}>{e.uni}</span>
                    <span className={`text-[5px] mt-0.5 ${textCol}`}>{e.desc}</span>
                </div>
            ))}
        </div>
    );
};

const MiniProjects = ({ type }) => {
    if (type === 'grid') {
        return (
            <div className="w-full flex flex-col gap-1.5 shrink-0">
                <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 text-gray-900 border-gray-200">Projects</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { title: 'Sales Forecaster', role: 'Lead Analyst', desc: 'XGBoost predictive models.' },
                        { title: 'Churn Analyzer', role: 'Data Scientist', desc: 'Predict churn with 89% accuracy.' },
                    ].map((p, i) => (
                        <div key={i} className="p-2 rounded border border-gray-200 bg-gray-50">
                            <h4 className="text-[6.5px] font-bold mb-0.5 text-gray-900">{p.title}</h4>
                            <div className="text-[5.5px] italic mb-1 text-gray-600">{p.role}</div>
                            <p className="text-[5px] leading-relaxed text-gray-600">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (type === 'compact') {
        return (
            <div className="w-full flex flex-col gap-2 shrink-0">
                <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] border-b pb-1 text-gray-900 border-gray-200">Projects</h3>
                {[
                    { title: 'Sales Forecaster', role: 'Lead Analyst', date: '2022', desc: '• Predictive model using XGBoost to forecast sales.' },
                    { title: 'Churn Analyzer', role: 'Data Scientist', date: '2021', desc: '• End-to-end pipeline predicting churn with 89% accuracy.' }
                ].map((p, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-baseline">
                            <h4 className="text-[6.5px] font-bold text-gray-900">{p.title} <span className="font-normal text-gray-400">|</span> <span className="font-normal italic text-gray-500">{p.role}</span></h4>
                            <span className="text-[5px] font-bold text-gray-500">{p.date}</span>
                        </div>
                        <p className="text-[5.5px] text-gray-600">{p.desc}</p>
                    </div>
                ))}
            </div>
        );
    }
    // Standard
    return (
        <div className="w-full flex flex-col gap-2.5 shrink-0">
            <h3 className="text-[7px] font-extrabold uppercase tracking-[0.15em] mb-1 border-b pb-1 text-gray-900 border-gray-200">Projects</h3>
            {[
                { title: 'Sales Forecasting Model', role: 'Lead Analyst', desc: '• Developed a predictive model using XGBoost.\n• Integrated the model via REST API.' },
                { title: 'Customer Churn Analyzer', role: 'Data Scientist', desc: '• Built an end-to-end pipeline analyzing user behavior.' },
            ].map((p, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between items-baseline">
                        <h4 className="text-[7px] font-bold text-gray-900">{p.title}</h4>
                        <span className="text-[5px] italic text-gray-500">{p.role}</span>
                    </div>
                    <div className="text-[5px] leading-relaxed whitespace-pre-line text-gray-600">{p.desc}</div>
                </div>
            ))}
        </div>
    );
};

const MiniSkills = ({ type, title = "Skills", isDark = false }) => {
    const skills = ['Python', 'React.js', 'AWS', 'SQL', 'TensorFlow', 'Tableau'];
    const textCol = isDark ? 'text-gray-300' : 'text-gray-700';
    const borderCol = isDark ? 'border-slate-700' : 'border-gray-200';
    const titleCol = isDark ? 'text-gray-100' : 'text-gray-900';

    const titleBlock = <h3 className={`text-[7px] font-extrabold uppercase tracking-[0.15em] mb-2 border-b pb-1 ${titleCol} ${borderCol}`}>{title}</h3>;

    if (type === 'dots') {
        return (
            <div className="w-full shrink-0">
                {titleBlock}
                <div className="flex flex-col gap-1.5">
                    {skills.slice(0, 5).map((skill, i) => (
                        <div key={skill} className="flex justify-between items-center">
                            <span className={`text-[5.5px] font-medium ${textCol}`}>{skill}</span>
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, j) => (
                                    <div key={j} className={`w-1.5 h-1.5 rounded-full ${j < (i % 2 === 0 ? 5 : 4) ? 'bg-emerald-500' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (type === 'pills') {
        return (
            <div className="w-full shrink-0">
                {titleBlock}
                <div className="flex flex-wrap gap-1">
                    {skills.map(skill => (
                        <span key={skill} className={`px-1.5 py-0.5 text-[5px] font-semibold rounded border ${isDark ? 'bg-slate-800 border-slate-600 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        );
    }
    if (type === 'thin-bars') {
        const widths = ['w-[95%]', 'w-[80%]', 'w-[90%]', 'w-[70%]', 'w-[85%]', 'w-[75%]'];
        return (
            <div className="w-full shrink-0">
                {titleBlock}
                <div className="flex flex-col gap-1.5">
                    {skills.map((skill, i) => (
                        <div key={skill} className="flex justify-between items-center gap-2">
                            <span className={`text-[5px] font-medium w-1/2 truncate ${textCol}`}>{skill}</span>
                            <div className={`flex-1 h-[1px] relative border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                                <div className={`absolute top-0 left-0 h-[1.5px] bg-emerald-500 ${widths[i]}`}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (type === 'tags') {
        return (
            <div className="w-full shrink-0 flex flex-col gap-2">
                {titleBlock}
                <div>
                    <div className={`text-[5px] font-bold mb-0.5 ${titleCol}`}>Languages</div>
                    <div className={`text-[4.5px] ${textCol}`}>Python, R, SQL, JavaScript</div>
                </div>
                <div>
                    <div className={`text-[5px] font-bold mb-0.5 ${titleCol}`}>Frameworks</div>
                    <div className={`text-[4.5px] ${textCol}`}>TensorFlow, React, Node.js</div>
                </div>
            </div>
        );
    }
    if (type === 'category-inline') {
        return (
            <div className="w-full shrink-0 flex flex-col gap-1.5">
                {titleBlock}
                <div className="flex flex-col gap-1">
                    <div className={`text-[5px] ${textCol}`}><span className={`font-bold ${titleCol} mr-1`}>Languages:</span> Python, R, SQL, JS</div>
                    <div className={`text-[5px] ${textCol}`}><span className={`font-bold ${titleCol} mr-1`}>Tools:</span> React, AWS, Docker</div>
                </div>
            </div>
        );
    }
    // Progress
    const widths = ['w-[95%]', 'w-[90%]', 'w-[85%]', 'w-[80%]', 'w-[75%]', 'w-[85%]'];
    return (
        <div className="w-full shrink-0">
            {titleBlock}
            <div className="flex flex-col gap-1.5">
                {skills.map((skill, i) => (
                    <div key={skill} className="flex justify-between items-center gap-2">
                        <span className={`text-[5.5px] font-medium w-1/2 truncate ${textCol}`}>{skill}</span>
                        <div className={`flex-1 h-[2.5px] rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                            <div className={`h-full bg-emerald-500 rounded-full ${widths[i]}`}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ==========================================
// LAYOUT CONFIGURATIONS
// ==========================================
const Layout1Col = ({ config }) => (
    <div className="flex flex-col gap-3 h-full p-6 text-gray-900 overflow-hidden w-full">
        <div key={`head-${config.header}-${config.photo}`} className="animate-snap-in w-full shrink-0">
            <MiniHeader type={config.header} showPhoto={config.photo} />
        </div>
        <div key={`sum-${config.sum}`} className="animate-snap-in w-full shrink-0"><MiniSummary type={config.sum} /></div>
        <div key={`exp-${config.exp}`} className="animate-snap-in w-full shrink-0"><MiniExperience type={config.exp} /></div>
        <div key={`proj-${config.proj}`} className="animate-snap-in w-full shrink-0"><MiniProjects type={config.proj} /></div>
        <div key={`edu-${config.edu}`} className="animate-snap-in w-full shrink-0"><MiniEducation type={config.edu} /></div>
    </div>
);

const LayoutSplit = ({ config }) => (
    <div className="flex flex-col h-full p-6 text-gray-900 overflow-hidden w-full">
        <div key={`head-${config.header}-${config.photo}`} className="animate-snap-in w-full shrink-0">
            <MiniHeader type={config.header} showPhoto={config.photo} />
        </div>
        <div className="flex gap-5 mt-1 flex-1 overflow-hidden w-full">
            <div className="flex-1 flex flex-col gap-4 border-r border-gray-200 pr-5 overflow-hidden">
                <div key={`exp-${config.exp}`} className="animate-snap-in w-full shrink-0"><MiniExperience type={config.exp} /></div>
                <div key={`edu-${config.edu}`} className="animate-snap-in w-full shrink-0"><MiniEducation type={config.edu} /></div>
            </div>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div key={`sum-${config.sum}`} className="animate-snap-in w-full shrink-0"><MiniSummary type={config.sum} /></div>
                <div key={`skills-${config.skills}`} className="animate-snap-in w-full shrink-0"><MiniSkills type={config.skills} /></div>
                <div key={`proj-${config.proj}`} className="animate-snap-in w-full shrink-0"><MiniProjects type={config.proj} /></div>
            </div>
        </div>
    </div>
);

const LayoutSidebarLeft = ({ config }) => (
    <div className="flex h-full w-full text-gray-900 overflow-hidden">
        <div className="w-[35%] bg-slate-50 p-4 border-r border-gray-200 flex flex-col gap-5 overflow-hidden shrink-0">
            <div key={`head-${config.header}-${config.photo}`} className="animate-snap-in w-full shrink-0">
                <MiniHeader type={config.header} showPhoto={config.photo} isDark={false} />
            </div>
            <div key={`skills-${config.skills}`} className="animate-snap-in w-full shrink-0">
                <MiniSkills type={config.skills} title="Core Skills" isDark={false} />
            </div>
        </div>
        <div className="w-[65%] p-5 flex flex-col gap-4 overflow-hidden">
            <div key={`sum-${config.sum}`} className="animate-snap-in w-full shrink-0"><MiniSummary type={config.sum} /></div>
            <div key={`exp-${config.exp}`} className="animate-snap-in w-full shrink-0"><MiniExperience type={config.exp} /></div>
            <div key={`edu-${config.edu}`} className="animate-snap-in w-full shrink-0"><MiniEducation type={config.edu} /></div>
        </div>
    </div>
);

const LayoutSidebarRightDark = ({ config }) => (
    <div className="flex h-full w-full text-gray-900 overflow-hidden">
        <div className="w-[65%] p-5 flex flex-col gap-4 overflow-hidden">
            <div key={`head-${config.header}-${config.photo}`} className="animate-snap-in w-full shrink-0">
                <MiniHeader type={config.header} showPhoto={config.photo} />
            </div>
            <div key={`exp-${config.exp}`} className="animate-snap-in w-full shrink-0"><MiniExperience type={config.exp} /></div>
            <div key={`proj-${config.proj}`} className="animate-snap-in w-full shrink-0"><MiniProjects type={config.proj} /></div>
        </div>
        <div className="w-[35%] bg-[#0f172a] text-white p-4 flex flex-col gap-5 overflow-hidden shrink-0">
            <div key={`sum-${config.sum}`} className="animate-snap-in w-full shrink-0"><MiniSummary type={config.sum} isDark={true} /></div>
            <div key={`skills-${config.skills}`} className="animate-snap-in w-full shrink-0"><MiniSkills type={config.skills} isDark={true} /></div>
            <div key={`edu-${config.edu}`} className="animate-snap-in w-full shrink-0"><MiniEducation type={config.edu} isDark={true} /></div>
        </div>
    </div>
);

const LayoutHybrid = ({ config }) => (
    <div className="flex flex-col h-full w-full p-5 text-gray-900 overflow-hidden">
        <div key={`head-${config.header}-${config.photo}`} className="animate-snap-in w-full shrink-0">
            <MiniHeader type={config.header} showPhoto={config.photo} />
        </div>
        <div key={`sum-${config.sum}`} className="animate-snap-in w-full shrink-0"><MiniSummary type={config.sum} /></div>
        <div className="flex flex-1 gap-5 mt-2 border-t border-gray-200 pt-3 overflow-hidden w-full">
            <div className="w-1/2 flex flex-col gap-4 border-r border-gray-200 pr-5 overflow-hidden">
                <div key={`exp-${config.exp}`} className="animate-snap-in w-full shrink-0"><MiniExperience type={config.exp} /></div>
                <div key={`edu-${config.edu}`} className="animate-snap-in w-full shrink-0"><MiniEducation type={config.edu} /></div>
            </div>
            <div className="w-1/2 flex flex-col gap-4 overflow-hidden">
                <div key={`proj-${config.proj}`} className="animate-snap-in w-full shrink-0"><MiniProjects type={config.proj} /></div>
                <div key={`skills-${config.skills}`} className="animate-snap-in w-full shrink-0"><MiniSkills type={config.skills} /></div>
            </div>
        </div>
    </div>
);

// SECTION VARIATIONS DEFINITION
const SECTION_VARIATIONS = {
    Header: ['centered', 'split', 'accent', 'avatar', 'initials-right', 'simple-left'],
    Summary: ['clean', 'highlight', 'quote', 'centered', 'boxed'],
    Experience: ['standard', 'timeline', 'hollow-timeline', 'compact', 'harvard'],
    Education: ['standard', 'compact', 'timeline', 'harvard'],
    Projects: ['standard', 'grid', 'compact'],
    Skills: ['progress', 'pills', 'dots', 'thin-bars', 'tags', 'category-inline']
};

const getCatName = (key) => {
    if (key === 'header') return 'Header';
    if (key === 'sum') return 'Summary';
    if (key === 'exp') return 'Experience';
    if (key === 'edu') return 'Education';
    if (key === 'proj') return 'Projects';
    if (key === 'skills') return 'Skills';
    return null;
}

// Sequence orchestrator defining individual steps across 5 layouts
// Ensure we go through multiple variations for each section one by one
const SEQUENCE = [
    // --- LAYOUT 1: Single Column (Deep Variations) ---
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'centered', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    // Header Vars
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'split', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: true },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'accent', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: true },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'avatar', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: true },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'initials-right', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    // Summary Vars
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'highlight', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'quote', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'centered', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    // Experience Vars
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'timeline', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'hollow-timeline', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'compact', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'standard', proj: 'standard', skills: 'progress', photo: false },
    // Education Vars
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'compact', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'timeline', proj: 'standard', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'standard', skills: 'progress', photo: false },
    // Projects Vars
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'grid', skills: 'progress', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'progress', photo: false },
    // Skills Vars
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'pills', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'thin-bars', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'tags', photo: false },
    { layoutIdx: 0, layoutComponent: Layout1Col, name: 'Single Column', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'category-inline', photo: false },

    // --- LAYOUT 5: Hybrid Dense (2 variants each) ---
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'accent', sum: 'clean', exp: 'compact', edu: 'compact', proj: 'grid', skills: 'dots', photo: false },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'split', sum: 'clean', exp: 'compact', edu: 'compact', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'clean', exp: 'compact', edu: 'compact', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'highlight', exp: 'compact', edu: 'compact', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'compact', edu: 'compact', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'standard', edu: 'compact', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'compact', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'standard', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'timeline', proj: 'grid', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'timeline', proj: 'standard', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'timeline', proj: 'compact', skills: 'dots', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'timeline', proj: 'compact', skills: 'progress', photo: true },
    { layoutIdx: 4, layoutComponent: LayoutHybrid, name: 'Hybrid One-Pager', header: 'centered', sum: 'quote', exp: 'timeline', edu: 'timeline', proj: 'compact', skills: 'tags', photo: true },

    // --- LAYOUT 3: Sidebar Left (2 variants each) ---
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'avatar', sum: 'clean', exp: 'compact', edu: 'compact', proj: 'compact', skills: 'dots', photo: true },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'accent', sum: 'clean', exp: 'compact', edu: 'compact', proj: 'compact', skills: 'dots', photo: true },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'clean', exp: 'compact', edu: 'compact', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'quote', exp: 'compact', edu: 'compact', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'compact', edu: 'compact', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'timeline', edu: 'compact', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'compact', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'standard', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'compact', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'standard', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'grid', skills: 'dots', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'grid', skills: 'progress', photo: false },
    { layoutIdx: 2, layoutComponent: LayoutSidebarLeft, name: 'Sidebar Left', header: 'simple-left', sum: 'boxed', exp: 'harvard', edu: 'harvard', proj: 'grid', skills: 'thin-bars', photo: false },

    // --- LAYOUT 2: Split 50/50 (2 variants each) ---
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'split', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'grid', skills: 'progress', photo: false },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'centered', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'centered', exp: 'standard', edu: 'standard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'standard', edu: 'standard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'timeline', edu: 'standard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'standard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'compact', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'harvard', proj: 'grid', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'harvard', proj: 'standard', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'harvard', proj: 'compact', skills: 'progress', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'harvard', proj: 'compact', skills: 'pills', photo: true },
    { layoutIdx: 1, layoutComponent: LayoutSplit, name: 'Split 50/50', header: 'accent', sum: 'highlight', exp: 'compact', edu: 'harvard', proj: 'compact', skills: 'dots', photo: true },

    // --- LAYOUT 4: Dark Sidebar Right (2 variants each) ---
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'split', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'initials-right', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'pills', photo: false },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'clean', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'quote', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'standard', edu: 'standard', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'hollow-timeline', edu: 'standard', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'standard', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'compact', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'timeline', proj: 'standard', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'timeline', proj: 'grid', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'timeline', proj: 'compact', skills: 'pills', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'timeline', proj: 'compact', skills: 'thin-bars', photo: true },
    { layoutIdx: 3, layoutComponent: LayoutSidebarRightDark, name: 'Dark Sidebar Right', header: 'avatar', sum: 'highlight', exp: 'harvard', edu: 'timeline', proj: 'compact', skills: 'tags', photo: true },
];

// Simulated Mouse Pointer Component
const SimulatedCursor = ({ state }) => (
    <div
        className={`absolute z-[60] pointer-events-none transition-all duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${state.visible ? 'opacity-100' : 'opacity-0'}`}
        style={{
            left: state.x,
            top: state.y,
            transform: `translate(-5px, -5px) ${state.clicking ? 'scale(0.8)' : 'scale(1)'}`
        }}
    >
        {/* SVG Cursor Pointer */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" fill="#84cc16" stroke="#4d7c0f" />
        </svg>
        {/* Click Ripple */}
        {state.clicking && (
            <div className="absolute top-[-5px] left-[-5px] w-8 h-8 bg-lime-500/40 rounded-full animate-ping" />
        )}
    </div>
);

// ==========================================
// MAIN SHOWCASE COMPONENT
// ==========================================
export default function CVTemplateShowcase() {
    const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
    const containerRef = useRef(null);

    const [step, setStep] = useState(0);
    const [animating, setAnimating] = useState('idle');
    const [galleryInfo, setGalleryInfo] = useState(null);
    const [mouseState, setMouseState] = useState({ visible: false, x: 450, y: 400, clicking: false });

    // Subtle Parallax Mouse Effect
    const handleMouseMove = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 15;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * -15;
        setRotation({ x: y, y: x, z: 0 });
    };

    const handleMouseLeave = () => {
        setRotation({ x: 0, y: 0, z: 0 });
    };

    // The Continuous Automator Loop
    useEffect(() => {
        let isMounted = true;
        let currentStep = 0;

        const runLoop = async () => {
            // Initial wait before starting automation
            await new Promise(r => setTimeout(r, 2000));

            while (isMounted) {
                const nextStep = (currentStep + 1) % SEQUENCE.length;
                const currentConfig = SEQUENCE[currentStep];
                const nextConfig = SEQUENCE[nextStep];
                const isLayoutChange = nextConfig.layoutIdx !== currentConfig.layoutIdx;

                if (isLayoutChange) {
                    setGalleryInfo(null);

                    // ENTIRE DOCUMENT FLIES OFF AND SWAPS
                    setAnimating('lifting');
                    await new Promise(r => setTimeout(r, 400));
                    if (!isMounted) break;

                    setAnimating('flyOut');
                    await new Promise(r => setTimeout(r, 400));
                    if (!isMounted) break;

                    setStep(nextStep);
                    currentStep = nextStep;

                    setAnimating('prepIn');
                    await new Promise(r => setTimeout(r, 50));
                    if (!isMounted) break;

                    setAnimating('flyIn');
                    await new Promise(r => setTimeout(r, 400));
                    if (!isMounted) break;

                    setAnimating('dropping');
                    await new Promise(r => setTimeout(r, 400));
                    if (!isMounted) break;

                    setAnimating('idle');
                    await new Promise(r => setTimeout(r, 2000)); // Rest after full layout change

                } else {
                    // JUST SNIPPET CHANGES WITH MOUSE ANIMATION
                    let changedCat = null;
                    let activeOpt = null;

                    ['header', 'sum', 'exp', 'edu', 'proj', 'skills'].forEach(key => {
                        if (currentConfig[key] !== nextConfig[key] || (key === 'header' && currentConfig.photo !== nextConfig.photo)) {
                            changedCat = getCatName(key);
                            activeOpt = nextConfig[key];
                        }
                    });

                    if (changedCat) {
                        const options = SECTION_VARIATIONS[changedCat].slice(0, 6);
                        setGalleryInfo({
                            category: changedCat,
                            options: options,
                            active: currentConfig[changedCat]
                        });

                        // Calculate accurate Y coordinate to click the target variation pill
                        const targetIndex = options.indexOf(activeOpt) !== -1 ? options.indexOf(activeOpt) : 0;
                        const itemStep = 42; // approx 34px height + 8px gap
                        const headerHeight = 28;
                        const totalHeight = headerHeight + (options.length * itemStep);
                        const startY = 240 - (totalHeight * 0.6); // Match the -translate-y-[60%]
                        const targetY = startY + headerHeight + (targetIndex * itemStep) + 15;

                        // Move mouse exactly to the upcoming variation pill
                        setMouseState({ visible: true, x: 420, y: targetY, clicking: false });
                    } else {
                        // Fallback
                        setMouseState({ visible: true, x: 420, y: 240, clicking: false });
                    }

                    await new Promise(r => setTimeout(r, 600));
                    if (!isMounted) break;

                    // Click
                    setMouseState(prev => ({ ...prev, clicking: true }));
                    await new Promise(r => setTimeout(r, 150));
                    setMouseState(prev => ({ ...prev, clicking: false }));

                    // Change Option
                    if (changedCat) {
                        setGalleryInfo(prev => ({ ...prev, active: activeOpt }));
                    }

                    setStep(nextStep);
                    currentStep = nextStep;

                    // Wait for the slide-in animation to finish
                    await new Promise(r => setTimeout(r, 600));
                    if (!isMounted) break;

                    // Move mouse away
                    setMouseState({ visible: false, x: 450, y: 500, clicking: false });
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        };

        runLoop();

        return () => {
            isMounted = false; // Gracefully shut down loop on unmount
        };
    }, []);

    // Content Wrapper Animation
    const getContentStyle = () => {
        let transform = `translateZ(0px) scale(1) translateX(0) translateY(0)`;
        let opacity = 1;
        let transition = 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        let filter = 'drop-shadow(0 0 0 rgba(0,0,0,0))';

        switch (animating) {
            case 'lifting':
                transform = `translateZ(40px) scale(1.02) translateX(0) translateY(-5px)`;
                filter = 'drop-shadow(0 15px 20px rgba(0,0,0,0.15))';
                break;
            case 'flyOut':
                transform = `translateZ(40px) scale(1.02) translateX(-200px) translateY(-5px)`;
                filter = 'drop-shadow(0 15px 20px rgba(0,0,0,0.15))';
                opacity = 0;
                transition = 'all 400ms ease-in';
                break;
            case 'prepIn':
                transform = `translateZ(40px) scale(1.02) translateX(200px) translateY(-5px)`;
                opacity = 0;
                transition = 'none';
                break;
            case 'flyIn':
                transform = `translateZ(40px) scale(1.02) translateX(0) translateY(-5px)`;
                filter = 'drop-shadow(0 15px 20px rgba(0,0,0,0.15))';
                transition = 'all 400ms ease-out';
                break;
            case 'dropping':
                transform = `translateZ(0px) scale(1) translateX(0) translateY(0)`;
                break;
            default:
                break;
        }

        return { transform, opacity, transition, filter };
    };

    const currentConfig = SEQUENCE[step];
    const ActiveLayoutComponent = currentConfig.layoutComponent;

    return (
        <section className="relative w-full min-h-[900px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden py-32 font-sans">

            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-lime-500/10 blur-[150px] rounded-full -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />

            {/* BIG BACKGROUND TEXT */}
            <div className="absolute bottom-0 md:-bottom-4 left-0 pl-4 md:pl-10 text-[90px] md:text-[140px] font-black text-white/[0.03] whitespace-nowrap z-0 pointer-events-none transition-all duration-700 ease-in-out select-none leading-none tracking-tighter origin-bottom">
                {currentConfig.name.toUpperCase()}
            </div>

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 relative z-10">

                {/* LEFT COPY & CTA */}
                <div className="flex flex-col gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-lime-400 text-xs font-bold uppercase tracking-widest mb-6">
                            <Zap size={14} className="fill-lime-500" /> Real-time Layout Engine
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-6">
                            <span className="text-[#80FF00]">More freedom of</span><br />
                            creating a custom<br />ATS friendly CV Layout.
                        </h2>
                        <p className="text-lg text-gray-400 leading-relaxed max-w-lg mb-2">
                            Don't be constrained by rigid templates. Our intelligent Mix & Match engine allows you to seamlessly combine over 70 premium blocks. Every snippet instantly adapts its typography, spacing, and colors to match your global design context perfectly.
                        </p>
                    </div>

                    <div className="mt-4">
                        <button 
                            onClick={() => window.location.href = '/editor'}
                            className="inline-flex items-center justify-center gap-3 bg-lime-500 hover:bg-lime-400 text-[#141810] font-bold py-4 px-10 rounded-full text-lg transition-all shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:shadow-[0_0_30px_rgba(132,204,22,0.5)] transform hover:-translate-y-1 w-max"
                        >
                            Start creating
                            <Wand2 size={20} className="text-[#141810]" />
                        </button>
                    </div>
                </div>

                {/* RIGHT 3D STAGE */}
                <div
                    ref={containerRef}
                    className="w-full h-[500px] md:h-[600px] lg:h-[700px] xl:h-[800px] relative perspective-1200 cursor-crosshair group flex items-center justify-center responsive-3d-stage mt-10 lg:mt-0"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Main Container */}
                    <div
                        className="w-[340px] h-[480px] relative transform-style-3d transition-transform duration-200 ease-out"
                        style={{ transform: `scale(var(--stage-scale, 1)) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)` }}
                    >
                        {/* Ambient Background Glow (Stays static) */}
                        <div className="absolute inset-[-30px] bg-slate-400 blur-3xl rounded-[30px] transform translateZ(-20px) opacity-30 group-hover:opacity-50 transition-all duration-700" />

                        {/* The Document Base (Always White, Static) */}
                        <div className="absolute inset-0 border shadow-2xl rounded-sm transform translateZ(0px) bg-white border-gray-200 overflow-hidden" />

                        {/* --- CV LAYOUT CONTENTS (Animated Container) --- */}
                        <div
                            className="absolute inset-0 w-full h-full overflow-hidden rounded-sm bg-transparent"
                            style={getContentStyle()}
                        >
                            <ActiveLayoutComponent config={currentConfig} />
                        </div>

                        {/* Non-obstructing Snippet Gallery (Visible during snippet changes) */}
                        <div
                            className={`absolute right-[-160px] top-1/2 -translate-y-[60%] flex flex-col gap-2 w-36 transition-all duration-500 transform translateZ(50px) ${galleryInfo ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8 pointer-events-none'}`}
                        >
                            <div className="text-lime-400 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Wand2 size={12} /> {galleryInfo?.category} Variations
                            </div>
                            {galleryInfo?.options.map(opt => (
                                <div key={opt} className={`px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${opt === galleryInfo.active ? 'bg-lime-500 text-[#141810] border-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.3)] scale-105' : 'bg-[#111] text-gray-400 border-[#222]'}`}>
                                    {opt.replace('-', ' ')}
                                </div>
                            ))}
                        </div>

                        {/* Simulated Mouse Cursor */}
                        <SimulatedCursor state={mouseState} />

                    </div>
                </div>

            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .perspective-1200 { perspective: 1200px; }
        .transform-style-3d { transform-style: preserve-3d; }
        
        /* Smooth Swipe Up Animation */
        @keyframes scrollUp {
          0% { transform: translateY(30px); opacity: 0; filter: blur(3px); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
        .animate-scroll-up {
          animation: scrollUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Responsive Scale Variable for 3D Stage */
        .responsive-3d-stage { --stage-scale: 0.85; }
        @media (min-width: 640px) { .responsive-3d-stage { --stage-scale: 1; } }
        @media (min-width: 768px) { .responsive-3d-stage { --stage-scale: 1.15; } }
        @media (min-width: 1024px) { .responsive-3d-stage { --stage-scale: 1.35; } }
        @media (min-width: 1280px) { .responsive-3d-stage { --stage-scale: 1.45; } }
      `}} />
        </section>
    );
}
