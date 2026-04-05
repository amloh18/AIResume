import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    GripVertical, FileJson, Bold, Italic,
    Underline, List, Trash2, ChevronUp, ChevronDown, Monitor,
    Plus, RefreshCw, X, PlusCircle, Image as ImageIcon, Wand2,
    LayoutTemplate, AlignJustify, Columns, Sidebar, ArrowLeft,
    AlignLeft, AlignCenter, AlignRight, Minus, Quote, Star, Circle, Palette, Download,
    Sun, Moon, FileText, CheckCircle, Briefcase, BookOpen, Target, Globe, Heart
} from 'lucide-react';

// ==========================================
// DEFAULT DATA MODEL (CVCIRCLE STANDARD)
// ==========================================
const initialData = {
    sectionTitles: {
        summary: "Profile",
        experience: "Professional Experience",
        education: "Education",
        skills: "Skills",
        expertise: "Expertise",
        contact: "Contact",
        projects: "Projects",
        certifications: "Certifications",
        awards: "Awards",
        languages: "Languages",
        interests: "Interests",
        publications: "Publications",
        volunteer: "Volunteer Experience",
        references: "References"
    },
    basics: {
        name: "Amarjot Singh Lohia",
        title: "Senior Data Scientist",
        email: "amarjot.singh@example.com",
        phone: "+91 9876543210",
        location: "Ahmedabad, Gujarat",
        website: "cvcircle.com",
        summary: "Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact. Proven expertise in scoping and deploying end-to-end machine learning models, leveraging advanced techniques in Python, R, and SQL to drive multi-million dollar revenue growth and operational efficiency.",
        avatar: "https://i.pravatar.cc/150?u=amarjot",
        showAvatar: false
    },
    experience: [
        {
            id: "exp1",
            company: "TechNova Solutions",
            role: "Senior Data Analyst",
            date: "Jan 2021 - Present",
            description: "<ul><li>Architected and implemented a modular and scalable data pipeline using Apache Kafka, enhancing data presentation capabilities by 40%.</li><li>Optimized user interaction workflows for data dashboards by identifying and rectifying performance bottlenecks.</li><li>Spearheaded key predictive modeling initiatives yielding a 25% increase in operational efficiency across 3 global teams.</li></ul>"
        },
        {
            id: "exp2",
            company: "Innovate AI",
            role: "Customer Insights Analyst",
            date: "Mar 2017 - Dec 2020",
            description: "<ul><li>Optimized marketing spend and product strategy through data-driven insights, impacting 20% of the customer base.</li><li>Led the development and execution of comprehensive customer segmentation strategies using PowerBI and Tableau.</li></ul>"
        },
        {
            id: "exp3",
            company: "DataTech Analytics",
            role: "Junior Analyst",
            date: "Jun 2015 - Feb 2017",
            description: "<ul><li>Created automated reporting structures, decreasing manual entry times by 40 hours per month.</li><li>Collaborated with data engineering teams to migrate legacy databases to AWS infrastructure securely.</li></ul>"
        }
    ],
    education: [
        {
            id: "edu1",
            institution: "University of California, Berkeley",
            degree: "M.S. Data Science",
            date: "2013 - 2015",
            description: "Graduated with Honors. Focus on Systems Architecture and Machine Learning Algorithms."
        },
        {
            id: "edu2",
            institution: "Stanford University",
            degree: "B.S. Computer Science",
            date: "2009 - 2013",
            description: "Minor in Statistical Analysis. Dean's List all semesters. Led the University Data Science Club."
        }
    ],
    projects: [
        {
            id: "prj1",
            name: "Sales Forecasting Model",
            role: "Lead Analyst",
            date: "2022 - Present",
            description: "<ul><li>Developed a predictive model using XGBoost to forecast quarterly sales, reducing error margin by 15%.</li><li>Integrated the model into the company's primary CRM dashboard via a secure Python REST API.</li></ul>"
        },
        {
            id: "prj2",
            name: "Customer Churn Analyzer",
            role: "Data Scientist",
            date: "2021",
            description: "<ul><li>Built an end-to-end pipeline analyzing user behavior to predict churn with 89% accuracy.</li></ul>"
        }
    ],
    certifications: [
        { id: "cert1", name: "AWS Certified Data Analytics", issuer: "Amazon Web Services", date: "2023" },
        { id: "cert2", name: "Google Professional Data Engineer", issuer: "Google Cloud", date: "2021" },
        { id: "cert3", name: "Certified Kubernetes Administrator", issuer: "CNCF", date: "2020" }
    ],
    awards: [
        { id: "awd1", name: "Excellence in Analytics Award", issuer: "Innovate AI", date: "2019" },
        { id: "awd2", name: "Top Contributor", issuer: "Open Source Data Org", date: "2018" }
    ],
    skills: {
        languages: "Python, R, SQL, JavaScript, HTML/CSS",
        frameworks: "TensorFlow, PyTorch, React, Node.js",
        tools: "Tableau, PowerBI, Docker, Git, AWS, GCP"
    },
    languages: "English (Native), Hindi (Fluent), Punjabi (Fluent), Spanish (Basic)",
    interests: "Open-source contributing, Photography, Chess, Bouldering, Machine Learning Research",
    publications: [
        { id: "pub1", title: "Predictive Analytics in Modern E-commerce", publisher: "Journal of Data Science", date: "Oct 2022", description: "Co-authored a comprehensive paper detailing modern algorithmic approaches to cart abandonment." },
        { id: "pub2", title: "Scaling Node.js Microservices", publisher: "Tech Architecture Weekly", date: "Jan 2020", description: "Published a guide on effectively utilizing Docker and Kubernetes for high-availability systems." }
    ],
    volunteer: [
        { id: "vol1", organization: "Data for Good", role: "Lead Mentor", date: "2019 - Present", description: "<ul><li>Mentoring underprivileged students in fundamental programming and data visualization skills.</li></ul>" },
        { id: "vol2", organization: "Global Tech Rescue", role: "IT Consultant", date: "2017 - 2019", description: "<ul><li>Provided pro-bono database management solutions for international disaster relief NGOs.</li></ul>" }
    ],
    references: [
        { id: "ref1", name: "Dr. Jonathan Crane", role: "CTO at TechNova Solutions", contact: "j.crane@technova.com | +1 555-0192" },
        { id: "ref2", name: "Sarah Jenkins", role: "VP of Engineering at Innovate AI", contact: "s.jenkins@innovateai.io | +1 555-9012" }
    ]
};

// ==========================================
// UNIFIED TYPOGRAPHY SYSTEM
// ==========================================
const TYPOGRAPHY = {
    name: "cv-name font-bold leading-tight tracking-tight",
    nameNarrow: "cv-name-narrow font-bold leading-tight tracking-tight",
    role: "cv-role font-semibold tracking-widest uppercase cv-accent-text",
    contact: "cv-contact font-medium tracking-wide",
    sectionTitle: "cv-heading font-extrabold uppercase tracking-[0.15em]",
    itemTitle: "cv-title font-bold",
    itemSubtitle: "cv-subtitle font-semibold italic",
    date: "cv-date font-bold tracking-widest uppercase cv-accent-text",
    body: "cv-body cv-prose",
};

// ==========================================
// TITLE STYLES REGISTRY
// ==========================================
const TITLE_STYLES = {
    'standard': ({ children, isDark }) => <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 border-b-[1.5px] pb-1.5 cv-item-avoid ${isDark ? 'text-white border-slate-700' : 'cv-accent-border text-gray-900'}`}>{children}</h3>,
    'minimal': ({ children, isDark }) => <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 cv-item-avoid ${isDark ? 'text-white' : 'cv-accent-text'}`}>{children}</h3>,
    'accent': ({ children, isDark }) => <h3 className={`${TYPOGRAPHY.sectionTitle} mb-3 border-b-[1.5px] pb-1.5 cv-item-avoid ${isDark ? 'text-white border-slate-700' : 'text-gray-900 border-gray-900'}`}>{children}</h3>,
    'boxed': ({ children, isDark }) => <div className={`inline-block border px-2 py-1 mb-3 ${TYPOGRAPHY.date} cv-item-avoid ${isDark ? 'border-slate-500 text-slate-200' : 'border-gray-800 text-gray-800'}`}>{children}</div>,
    'sidebar-default': ({ children, isDark }) => <h3 className={`${TYPOGRAPHY.sectionTitle} mb-2 border-b pb-1 cv-item-avoid ${isDark ? 'text-slate-300 border-slate-600' : 'text-gray-800 border-gray-300'}`}>{children}</h3>,
    'designer': ({ children, isDark }) => <h3 className={`${TYPOGRAPHY.sectionTitle} mb-4 cv-item-avoid ${isDark ? 'text-white' : 'text-gray-800'}`}>{children}</h3>,
    'lines': ({ children, isDark }) => <div className="flex items-center gap-4 mb-4 cv-item-avoid"><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div><h3 className={`${TYPOGRAPHY.sectionTitle} mb-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h3><div className={`h-px flex-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div></div>,
};

// ==========================================
// REUSABLE ENTRY WRAPPER
// ==========================================
const ListEntry = ({ collection, index, moveEntry, deleteEntry, children }) => (
    <div className="relative group/entry cv-item">
        <div className="absolute -left-8 top-0 opacity-0 group-hover/entry:opacity-100 flex flex-col gap-1 transition-opacity no-print z-50 bg-white shadow-xl border border-gray-200 rounded-md p-1 scale-90 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); moveEntry(collection, index, -1); }} className="text-gray-500 hover:bg-gray-100 hover:text-emerald-600 p-1 rounded transition-colors" title="Move Up"><ChevronUp size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); moveEntry(collection, index, 1); }} className="text-gray-500 hover:bg-gray-100 hover:text-emerald-600 p-1 rounded transition-colors" title="Move Down"><ChevronDown size={14} /></button>
            <div className="w-full h-px bg-gray-200 my-0.5"></div>
            <button onClick={(e) => { e.stopPropagation(); deleteEntry(collection, index); }} className="text-gray-500 hover:bg-red-50 hover:text-red-600 p-1 rounded transition-colors" title="Delete Entry"><Trash2 size={14} /></button>
        </div>
        {children}
    </div>
);

// ==========================================
// 70+ PREMIUM SNIPPET REGISTRY
// ==========================================
const SNIPPETS = {
    // === HEADERS (7) ===
    'header-minimal': {
        id: 'header-minimal', name: 'Minimal Center', category: 'Header', render: ({ data, Editable, zoneId, isDark }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className={`text-center pb-4 border-b ${isDark ? 'border-slate-700 text-gray-300' : 'border-gray-200 text-gray-600'} mb-4 snippet-anim cv-keep-with-next`}>
                    {data.basics.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`mx-auto rounded-full object-cover shadow-md mb-3 ${isNarrow ? 'w-24 h-24' : 'w-20 h-20'} ${isDark ? 'border-2 border-slate-700' : ''}`} />}
                    <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'} mb-1 uppercase tracking-widest`}><Editable path="basics.name" /></h1>
                    <h2 className={`${TYPOGRAPHY.role} ${isDark ? 'text-gray-400' : ''} mb-3`}><Editable path="basics.title" /></h2>
                    <div className={`flex flex-wrap justify-center ${isNarrow ? 'flex-col gap-1.5' : 'gap-4'} ${TYPOGRAPHY.contact}`}>
                        <span><Editable path="basics.email" breakAll /></span> {!isNarrow && <span>•</span>} <span><Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>•</span>} <span><Editable path="basics.location" nowrap /></span>
                    </div>
                </div>
            );
        }
    },
    'header-split': {
        id: 'header-split', name: 'Split Modern', category: 'Header', render: ({ data, Editable, zoneId, isDark }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className={`flex ${isNarrow ? 'flex-col gap-4 text-center items-center' : 'justify-between items-end'} pb-4 border-b-[1.5px] ${isDark ? 'border-slate-600' : 'border-slate-800'} mb-4 snippet-anim w-full cv-keep-with-next`}>
                    <div className={`flex ${isNarrow ? 'flex-col text-center items-center' : 'items-center text-left'} gap-4 min-w-0`}>
                        {data.basics.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shrink-0 shadow-md ${isNarrow ? 'w-24 h-24' : 'w-16 h-16'}`} />}
                        <div className="min-w-0">
                            <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-slate-800'} mb-1.5`}><Editable path="basics.name" /></h1>
                            <h2 className={`${TYPOGRAPHY.role} ${isDark ? 'text-slate-400' : 'text-slate-600'}`}><Editable path="basics.title" /></h2>
                        </div>
                    </div>
                    <div className={`${isNarrow ? 'text-center w-full mt-2' : 'text-right'} ${TYPOGRAPHY.contact} flex flex-col gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'} shrink-0`}>
                        <span><Editable path="basics.email" breakAll /></span><span><Editable path="basics.phone" nowrap /></span><span><Editable path="basics.website" breakAll /></span>
                    </div>
                </div>
            );
        }
    },
    'header-avatar': {
        id: 'header-avatar', name: 'Avatar Left Bold', category: 'Header', render: ({ data, Editable, zoneId, isDark }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className={`flex ${isNarrow ? 'flex-col items-center text-center' : 'items-center'} gap-5 pb-5 mb-5 snippet-anim w-full cv-keep-with-next`}>
                    {data.basics.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full shadow-lg object-cover shrink-0 ${isNarrow ? 'w-28 h-28' : 'w-24 h-24'} ${isDark ? 'border-2 border-slate-700' : 'border-4 border-white'}`} />}
                    <div className="min-w-0 w-full">
                        <h1 className={`${isNarrow ? TYPOGRAPHY.nameNarrow : TYPOGRAPHY.name} ${isDark ? 'text-white' : 'text-gray-900'} mb-1.5`}><Editable path="basics.name" /></h1>
                        <h2 className={`${TYPOGRAPHY.role} mb-3`}><Editable path="basics.title" /></h2>
                        <div className={`flex flex-wrap ${isNarrow ? 'flex-col gap-1.5 justify-center' : 'gap-3'} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                            <span><Editable path="basics.email" breakAll /></span> {!isNarrow && <span>|</span>} <span><Editable path="basics.location" nowrap /></span>
                        </div>
                    </div>
                </div>
            );
        }
    },
    'header-boxed': {
        id: 'header-boxed', name: 'Elegant Box', category: 'Header', render: ({ data, Editable, zoneId, isDark }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="text-center pb-5 mb-5 snippet-anim w-full flex flex-col items-center cv-keep-with-next">
                    <div className={`inline-block border-[2px] px-8 py-3 mb-4 tracking-[0.25em] uppercase ${isDark ? 'border-white text-white' : 'border-gray-900 text-gray-900'}`}>
                        <h1 className={`${isNarrow ? 'text-xl' : 'text-2xl'} font-bold`}><Editable path="basics.name" nowrap /></h1>
                    </div>
                    <h2 className={`${TYPOGRAPHY.role} mb-5 ${isDark ? 'text-gray-400' : ''}`}><Editable path="basics.title" /></h2>
                    {data.basics.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`mx-auto rounded-full object-cover shadow-xl mb-4 ${isNarrow ? 'w-28 h-28' : 'w-24 h-24'} ${isDark ? 'border-2 border-slate-700' : 'border-[4px] border-white'}`} />}
                </div>
            );
        }
    },
    'header-executive': {
        id: 'header-executive', name: 'Executive Stacked', category: 'Header', render: ({ data, Editable, zoneId, isDark }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className={`pb-4 mb-5 border-b-[1.5px] ${isDark ? 'border-slate-700' : 'border-gray-900'} snippet-anim w-full cv-keep-with-next`}>
                    <div className={`flex ${isNarrow ? 'flex-col gap-4' : 'justify-between items-start'} w-full`}>
                        <div className="min-w-0 w-full">
                            <h1 className={`${isNarrow ? 'text-2xl text-center' : 'text-3xl uppercase'} font-extrabold tracking-widest mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Editable path="basics.name" /></h1>
                            <div className={`flex flex-wrap ${isNarrow ? 'flex-col text-center gap-1.5' : 'gap-3'} ${TYPOGRAPHY.contact} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                <span><Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>/</span>}
                                <span><Editable path="basics.email" breakAll /></span> {!isNarrow && <span>/</span>}
                                <span><Editable path="basics.website" breakAll /></span>
                            </div>
                        </div>
                        {data.basics.showAvatar && !isNarrow && <img src={data.basics.avatar} alt="Avatar" className={`rounded object-cover shadow-md shrink-0 w-20 h-24 ${isDark ? 'border border-slate-600' : ''}`} />}
                    </div>
                </div>
            );
        }
    },
    'header-accent': {
        id: 'header-accent', name: 'Accent Side Bar', category: 'Header', render: ({ data, Editable, zoneId, isDark, Title }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="snippet-anim w-full mb-8 cv-keep-with-next">
                    <div className={`flex ${isNarrow ? 'flex-col gap-6' : 'justify-between items-center'}`}>
                        <div className={`min-w-0 ${isNarrow ? 'w-full text-center' : 'w-2/3'}`}>
                            <h1 className={`${isNarrow ? 'text-3xl' : 'text-4xl'} font-light tracking-widest uppercase mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}><Editable path="basics.name" /></h1>
                            <h2 className={`${TYPOGRAPHY.role} tracking-[0.25em]`}><Editable path="basics.title" /></h2>
                        </div>
                        <div className={`flex items-stretch gap-4 ${isNarrow ? 'w-full justify-center text-center' : 'text-right'}`}>
                            {!isNarrow && <div className="flex flex-col justify-center"><Title titleKey="contact" overrideClass={`${TYPOGRAPHY.contact} tracking-widest uppercase mb-0 ${isDark ? 'text-gray-400' : 'text-gray-800'}`} /></div>}
                            <div className="w-1.5 cv-accent-bg shrink-0 rounded-full"></div>
                            <div className={`${TYPOGRAPHY.contact} flex flex-col justify-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span><Editable path="basics.phone" nowrap /></span><span><Editable path="basics.email" breakAll /></span><span><Editable path="basics.location" nowrap /></span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    },
    'header-creative': {
        id: 'header-creative', name: 'Creative Block', category: 'Header', render: ({ data, Editable, zoneId, isDark }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className={`p-6 rounded-xl mb-6 snippet-anim cv-keep-with-next cv-accent-bg text-white shadow-lg`}>
                    <div className={`flex ${isNarrow ? 'flex-col gap-4 text-center' : 'justify-between items-center'} w-full`}>
                        <div className="min-w-0 w-full">
                            <h1 className={`${isNarrow ? 'text-2xl' : 'text-4xl'} font-black tracking-tight mb-1`}><Editable path="basics.name" /></h1>
                            <h2 className={`text-sm font-semibold tracking-widest uppercase opacity-90 mb-4`}><Editable path="basics.title" /></h2>
                            <div className={`flex flex-wrap ${isNarrow ? 'flex-col gap-1' : 'gap-4'} text-xs font-medium opacity-90`}>
                                <span><Editable path="basics.phone" nowrap /></span> {!isNarrow && <span>•</span>}
                                <span><Editable path="basics.email" breakAll /></span> {!isNarrow && <span>•</span>}
                                <span><Editable path="basics.location" nowrap /></span>
                            </div>
                        </div>
                        {data.basics.showAvatar && <img src={data.basics.avatar} alt="Avatar" className={`rounded-full object-cover shrink-0 shadow-2xl border-4 border-white/20 ${isNarrow ? 'w-24 h-24 mx-auto mt-4' : 'w-24 h-24'}`} />}
                    </div>
                </div>
            );
        }
    },

    // === SUMMARIES (6) ===
    'summary-clean': {
        id: 'summary-clean', name: 'Clean Paragraph', category: 'Summary', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="summary" />
                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div>
            </div>
        )
    },
    'summary-highlight': {
        id: 'summary-highlight', name: 'Left Accent Highlight', category: 'Summary', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="summary" />
                <div className={`p-4 border-l-[4px] rounded-r-lg cv-accent-border cv-keep-with-next shadow-sm ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`${TYPOGRAPHY.body} italic ${isDark ? 'text-slate-200' : 'text-gray-800'}`}><Editable path="basics.summary" multiline /></div>
                </div>
            </div>
        )
    },
    'summary-quote': {
        id: 'summary-quote', name: 'Quotation Mark', category: 'Summary', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim flex gap-4 items-start cv-section">
                <div className={`shrink-0 pt-1 cv-accent-text opacity-50`}><Quote size={28} fill="currentColor" /></div>
                <div className="flex-1">
                    <Title titleKey="summary" />
                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div>
                </div>
            </div>
        )
    },
    'summary-centered': {
        id: 'summary-centered', name: 'Centered Block', category: 'Summary', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim text-center cv-section">
                <Title titleKey="summary" overrideClass={`${TYPOGRAPHY.sectionTitle} text-center mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'} mx-auto`}><Editable path="basics.summary" multiline /></div>
            </div>
        )
    },
    'summary-boxed': {
        id: 'summary-boxed', name: 'Border Box', category: 'Summary', render: ({ Editable, isDark, Title }) => (
            <div className={`mb-6 snippet-anim border p-5 rounded-xl shadow-sm cv-section cv-keep-with-next ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-white'}`}>
                <Title titleKey="summary" overrideClass={`${TYPOGRAPHY.sectionTitle} mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="basics.summary" multiline /></div>
            </div>
        )
    },
    'summary-bold': {
        id: 'summary-bold', name: 'Bold Intro', category: 'Summary', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="summary" />
                <div className={`${TYPOGRAPHY.body} font-medium text-[1.1em] leading-[1.8] ${isDark ? 'text-gray-200' : 'text-gray-800'}`}><Editable path="basics.summary" multiline /></div>
            </div>
        )
    },

    // === EXPERIENCE (6) ===
    'experience-standard': {
        id: 'experience-standard', name: 'Standard Flow', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="experience" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.experience.map((exp, idx) => (
                            <ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className="cv-keep-with-next">
                                    <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4>
                                        <span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`experience.${idx}.date`} nowrap /></span>
                                    </div>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'experience-split': {
        id: 'experience-split', name: 'Split Columns', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="experience" />
                    <div className="flex flex-col gap-5 cv-gap-lg">
                        {data.experience.map((exp, idx) => (
                            <ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}>
                                        <div className={`${TYPOGRAPHY.date}`}><Editable path={`experience.${idx}.date`} nowrap /></div>
                                    </div>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}>
                                        <div className="cv-keep-with-next">
                                            <h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.company`} nowrap />,</h4>
                                            <span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.role`} nowrap /></span>
                                        </div>
                                        <div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div>
                                    </div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'experience-harvard': {
        id: 'experience-harvard', name: 'Harvard Dense', category: 'Experience', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="experience" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.experience.map((exp, idx) => (
                            <ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        <Editable path={`experience.${idx}.company`} nowrap />, <span className="font-semibold italic"><Editable path={`experience.${idx}.role`} nowrap /></span>
                                    </h4>
                                    <span className={`${TYPOGRAPHY.date}`}><Editable path={`experience.${idx}.date`} nowrap /></span>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}><Editable path={`experience.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'experience-timeline': {
        id: 'experience-timeline', name: 'Vertical Timeline', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="experience" />
                <div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {data.experience.map((exp, idx) => (
                        <ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className="relative pl-6">
                                <div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[23px] top-1 cv-accent-border ${isDark ? 'bg-slate-900' : 'bg-white'}`}></div>
                                <div className="cv-keep-with-next">
                                    <div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`experience.${idx}.date`} nowrap /></div>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.company`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'experience-compact': {
        id: 'experience-compact', name: 'Compact Inline', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="experience" />
                <div className="flex flex-col gap-4 cv-gap-md">
                    {data.experience.map((exp, idx) => (
                        <ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                <span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`experience.${idx}.role`} nowrap /></span>
                                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>at</span>
                                <span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`experience.${idx}.company`} nowrap /></span>
                                <span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`experience.${idx}.date`} nowrap /></span>
                            </div>
                            <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'experience-accent': {
        id: 'experience-accent', name: 'Accent Ribbon', category: 'Experience', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="experience" />
                <div className="flex flex-col gap-5 cv-gap-lg">
                    {data.experience.map((exp, idx) => (
                        <ListEntry key={exp.id} collection="experience" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`pl-4 border-l-[3px] cv-accent-border`}>
                                <div className="cv-keep-with-next">
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`experience.${idx}.role`} nowrap /></h4>
                                    <div className={`flex flex-wrap gap-x-3 mb-2 mt-0.5`}>
                                        <span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`experience.${idx}.company`} nowrap /></span>
                                        <span className={`${TYPOGRAPHY.date} opacity-80`}><Editable path={`experience.${idx}.date`} nowrap /></span>
                                    </div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`experience.${idx}.description`} multiline html /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },

    // === EDUCATION (6) ===
    'education-standard': {
        id: 'education-standard', name: 'Standard Flow', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="education" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.education.map((edu, idx) => (
                            <ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className="cv-keep-with-next">
                                    <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4>
                                        <span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></span>
                                    </div>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.institution`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'education-split': {
        id: 'education-split', name: 'Split Columns', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="education" />
                    <div className="flex flex-col gap-4 cv-gap-lg">
                        {data.education.map((edu, idx) => (
                            <ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}>
                                        <div className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></div>
                                    </div>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}>
                                        <div className="cv-keep-with-next">
                                            <h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.institution`} nowrap />,</h4>
                                            <span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.degree`} nowrap /></span>
                                        </div>
                                        <div className={`${TYPOGRAPHY.body} mt-1.5 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.description`} multiline /></div>
                                    </div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'education-harvard': {
        id: 'education-harvard', name: 'Harvard Dense', category: 'Education', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="education" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.education.map((edu, idx) => (
                            <ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        <Editable path={`education.${idx}.institution`} nowrap />, <span className="font-semibold italic"><Editable path={`education.${idx}.degree`} nowrap /></span>
                                    </h4>
                                    <span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></span>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-800'}`}><Editable path={`education.${idx}.description`} multiline /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'education-timeline': {
        id: 'education-timeline', name: 'Vertical Timeline', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="education" />
                <div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {data.education.map((edu, idx) => (
                        <ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className="relative pl-6">
                                <div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[23px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div>
                                <div className="cv-keep-with-next">
                                    <div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`education.${idx}.date`} nowrap /></div>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.institution`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'education-compact': {
        id: 'education-compact', name: 'Compact Inline', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="education" />
                <div className="flex flex-col gap-4 cv-gap-md">
                    {data.education.map((edu, idx) => (
                        <ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                <span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`education.${idx}.degree`} nowrap /></span>
                                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>from</span>
                                <span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`education.${idx}.institution`} nowrap /></span>
                                <span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`education.${idx}.date`} nowrap /></span>
                            </div>
                            <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'education-blocks': {
        id: 'education-blocks', name: 'Shaded Blocks', category: 'Education', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="education" />
                <div className="flex flex-col gap-4 cv-gap-md">
                    {data.education.map((edu, idx) => (
                        <ListEntry key={edu.id} collection="education" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'} border ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}>
                                <div className="cv-keep-with-next">
                                    <div className={`flex justify-between items-baseline flex-wrap gap-x-3 mb-1`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`education.${idx}.degree`} nowrap /></h4>
                                        <span className={`${TYPOGRAPHY.date}`}><Editable path={`education.${idx}.date`} nowrap /></span>
                                    </div>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}><Editable path={`education.${idx}.institution`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`education.${idx}.description`} multiline /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },

    // === PROJECTS (6) ===
    'projects-standard': {
        id: 'projects-standard', name: 'Standard Flow', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="projects" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.projects.map((prj, idx) => (
                            <ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className="cv-keep-with-next">
                                    <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4>
                                        <span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`projects.${idx}.date`} nowrap /></span>
                                    </div>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'projects-split': {
        id: 'projects-split', name: 'Split Columns', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="projects" />
                    <div className="flex flex-col gap-5 cv-gap-lg">
                        {data.projects.map((prj, idx) => (
                            <ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}>
                                        <div className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx}.date`} nowrap /></div>
                                    </div>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}>
                                        <div className="cv-keep-with-next">
                                            <h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap />,</h4>
                                            <span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></span>
                                        </div>
                                        <div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div>
                                    </div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'projects-harvard': {
        id: 'projects-harvard', name: 'Harvard Dense', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="projects" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.projects.map((prj, idx) => (
                            <ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`cv-keep-with-next flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full mb-1`}>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        <Editable path={`projects.${idx}.name`} nowrap />, <span className="font-semibold italic"><Editable path={`projects.${idx}.role`} nowrap /></span>
                                    </h4>
                                    <span className={`${TYPOGRAPHY.date}`}><Editable path={`projects.${idx}.date`} nowrap /></span>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-800'}`}><Editable path={`projects.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'projects-timeline': {
        id: 'projects-timeline', name: 'Vertical Timeline', category: 'Projects', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="projects" />
                <div className={`border-l-2 ml-2 flex flex-col gap-5 cv-gap-lg ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {data.projects.map((prj, idx) => (
                        <ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className="relative pl-6">
                                <div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[23px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div>
                                <div className="cv-keep-with-next">
                                    <div className={`${TYPOGRAPHY.date} mb-1`}><Editable path={`projects.${idx}.date`} nowrap /></div>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.role`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'projects-compact': {
        id: 'projects-compact', name: 'Compact Inline', category: 'Projects', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="projects" />
                <div className="flex flex-col gap-4 cv-gap-md">
                    {data.projects.map((prj, idx) => (
                        <ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                <span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`projects.${idx}.name`} nowrap /></span>
                                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>|</span>
                                <span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`projects.${idx}.role`} nowrap /></span>
                                <span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`projects.${idx}.date`} nowrap /></span>
                            </div>
                            <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'projects-grid': {
        id: 'projects-grid', name: '2-Column Grid', category: 'Projects', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="projects" />
                    <div className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-4 cv-gap-md`}>
                        {data.projects.map((prj, idx) => (
                            <ListEntry key={prj.id} collection="projects" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`h-full p-4 rounded-xl border transition-colors hover:border-emerald-500/30 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className="cv-keep-with-next">
                                        <h4 className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`projects.${idx}.name`} nowrap /></h4>
                                        <div className={`flex justify-between items-baseline mb-2`}>
                                            <span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`projects.${idx}.role`} nowrap /></span>
                                            <span className={`${TYPOGRAPHY.date} text-[10px]`}><Editable path={`projects.${idx}.date`} nowrap /></span>
                                        </div>
                                    </div>
                                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`projects.${idx}.description`} multiline html /></div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },

    // === CERTIFICATIONS (5) ===
    'certifications-standard': {
        id: 'certifications-standard', name: 'Standard List', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="certifications" />
                    <div className="flex flex-col gap-4 cv-gap-sm">
                        {data.certifications.map((cert, idx) => (
                            <ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} cv-keep-with-next`}>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap /></h4>
                                    <span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`certifications.${idx}.date`} nowrap /></span>
                                </div>
                                <div className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'certifications-split': {
        id: 'certifications-split', name: 'Split Columns', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="certifications" />
                    <div className="flex flex-col gap-4 cv-gap-sm">
                        {data.certifications.map((cert, idx) => (
                            <ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex cv-keep-with-next ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0`}>
                                        <div className={`${TYPOGRAPHY.date}`}><Editable path={`certifications.${idx}.date`} nowrap /></div>
                                    </div>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap /></h4>
                                        <div className={`${TYPOGRAPHY.itemSubtitle} mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></div>
                                    </div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'certifications-harvard': {
        id: 'certifications-harvard', name: 'Harvard Dense', category: 'Certifications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="certifications" />
                    <div className="flex flex-col gap-3 cv-gap-sm">
                        {data.certifications.map((cert, idx) => (
                            <ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full cv-keep-with-next`}>
                                    <div className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        <Editable path={`certifications.${idx}.name`} nowrap />, <span className="font-normal italic"><Editable path={`certifications.${idx}.issuer`} nowrap /></span>
                                    </div>
                                    <span className={`${TYPOGRAPHY.date}`}><Editable path={`certifications.${idx}.date`} nowrap /></span>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'certifications-timeline': {
        id: 'certifications-timeline', name: 'Vertical Timeline', category: 'Certifications', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="certifications" />
                <div className={`border-l-2 ml-2 flex flex-col gap-4 cv-gap-md ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {data.certifications.map((cert, idx) => (
                        <ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className="relative pl-6 cv-keep-with-next">
                                <div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[23px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div>
                                <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`certifications.${idx}.name`} nowrap /></h4>
                                <div className={`${TYPOGRAPHY.itemSubtitle} mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></div>
                                <div className={`${TYPOGRAPHY.date} mt-1`}><Editable path={`certifications.${idx}.date`} nowrap /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'certifications-compact': {
        id: 'certifications-compact', name: 'Compact Inline', category: 'Certifications', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="certifications" />
                <div className="flex flex-col gap-3 cv-gap-sm">
                    {data.certifications.map((cert, idx) => (
                        <ListEntry key={cert.id} collection="certifications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`flex flex-wrap items-baseline gap-x-2 cv-keep-with-next ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                <span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`certifications.${idx}.name`} nowrap /></span>
                                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>by</span>
                                <span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`certifications.${idx}.issuer`} nowrap /></span>
                                <span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`certifications.${idx}.date`} nowrap /></span>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },

    // === AWARDS (5) ===
    'awards-standard': {
        id: 'awards-standard', name: 'Standard List', category: 'Awards', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="awards" />
                    <div className="flex flex-col gap-4 cv-gap-sm">
                        {data.awards.map((awd, idx) => (
                            <ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} cv-keep-with-next`}>
                                    <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`awards.${idx}.name`} nowrap /></h4>
                                    <span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`awards.${idx}.date`} nowrap /></span>
                                </div>
                                <div className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`awards.${idx}.issuer`} nowrap /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'awards-split': {
        id: 'awards-split', name: 'Split Columns', category: 'Awards', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="awards" />
                    <div className="flex flex-col gap-4 cv-gap-sm">
                        {data.awards.map((awd, idx) => (
                            <ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex cv-keep-with-next ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0`}>
                                        <div className={`${TYPOGRAPHY.date}`}><Editable path={`awards.${idx}.date`} nowrap /></div>
                                    </div>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`awards.${idx}.name`} nowrap /></h4>
                                        <div className={`${TYPOGRAPHY.itemSubtitle} mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`awards.${idx}.issuer`} nowrap /></div>
                                    </div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'awards-harvard': {
        id: 'awards-harvard', name: 'Harvard Dense', category: 'Awards', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="awards" />
                    <div className="flex flex-col gap-3 cv-gap-sm">
                        {data.awards.map((awd, idx) => (
                            <ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline'} w-full cv-keep-with-next`}>
                                    <div className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                        <Editable path={`awards.${idx}.name`} nowrap />, <span className="font-normal italic"><Editable path={`awards.${idx}.issuer`} nowrap /></span>
                                    </div>
                                    <span className={`${TYPOGRAPHY.date}`}><Editable path={`awards.${idx}.date`} nowrap /></span>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'awards-timeline': {
        id: 'awards-timeline', name: 'Vertical Timeline', category: 'Awards', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="awards" />
                <div className={`border-l-2 ml-2 flex flex-col gap-4 cv-gap-md ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    {data.awards.map((awd, idx) => (
                        <ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className="relative pl-6 cv-keep-with-next">
                                <div className={`absolute w-3 h-3 border-[3px] rounded-full -left-[23px] top-1 cv-accent-border ${isDark ? 'bg-slate-800' : 'bg-white'}`}></div>
                                <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`awards.${idx}.name`} nowrap /></h4>
                                <div className={`${TYPOGRAPHY.itemSubtitle} mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`awards.${idx}.issuer`} nowrap /></div>
                                <div className={`${TYPOGRAPHY.date} mt-1`}><Editable path={`awards.${idx}.date`} nowrap /></div>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },
    'awards-compact': {
        id: 'awards-compact', name: 'Compact Inline', category: 'Awards', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => (
            <div className="mb-6 snippet-anim cv-section">
                <Title titleKey="awards" />
                <div className="flex flex-col gap-3 cv-gap-sm">
                    {data.awards.map((awd, idx) => (
                        <ListEntry key={awd.id} collection="awards" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                            <div className={`flex flex-wrap items-baseline gap-x-2 cv-keep-with-next ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                <span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`awards.${idx}.name`} nowrap /></span>
                                <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>from</span>
                                <span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`awards.${idx}.issuer`} nowrap /></span>
                                <span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`awards.${idx}.date`} nowrap /></span>
                            </div>
                        </ListEntry>
                    ))}
                </div>
            </div>
        )
    },

    // === PUBLICATIONS (5) ===
    'publications-standard': {
        id: 'publications-standard', name: 'Standard Flow', category: 'Publications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            if (!data.publications || data.publications.length === 0) return null;
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="publications" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.publications.map((pub, idx) => (
                            <ListEntry key={pub.id} collection="publications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className="cv-keep-with-next">
                                    <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`publications.${idx}.title`} nowrap /></h4>
                                        <span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`publications.${idx}.date`} nowrap /></span>
                                    </div>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`publications.${idx}.publisher`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`publications.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'publications-split': {
        id: 'publications-split', name: 'Split Columns', category: 'Publications', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            if (!data.publications || data.publications.length === 0) return null;
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="publications" />
                    <div className="flex flex-col gap-5 cv-gap-lg">
                        {data.publications.map((pub, idx) => (
                            <ListEntry key={pub.id} collection="publications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`flex ${isNarrow ? 'flex-col gap-1.5' : 'gap-5'}`}>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[25%]'} shrink-0 cv-keep-with-next`}>
                                        <div className={`${TYPOGRAPHY.date}`}><Editable path={`publications.${idx}.date`} nowrap /></div>
                                    </div>
                                    <div className={`${isNarrow ? 'w-full' : 'w-[75%]'}`}>
                                        <div className="cv-keep-with-next">
                                            <h4 className={`${TYPOGRAPHY.itemTitle} inline-block mr-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`publications.${idx}.title`} nowrap />,</h4>
                                            <span className={`${TYPOGRAPHY.itemSubtitle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`publications.${idx}.publisher`} nowrap /></span>
                                        </div>
                                        <div className={`${TYPOGRAPHY.body} mt-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`publications.${idx}.description`} multiline html /></div>
                                    </div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },
    'publications-compact': {
        id: 'publications-compact', name: 'Compact Inline', category: 'Publications', render: ({ data, Editable, isDark, Title, moveEntry, deleteEntry }) => {
            if (!data.publications || data.publications.length === 0) return null;
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="publications" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.publications.map((pub, idx) => (
                            <ListEntry key={pub.id} collection="publications" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className={`cv-keep-with-next flex flex-wrap items-baseline gap-x-2 mb-1 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                                    <span className={`${TYPOGRAPHY.itemTitle}`}><Editable path={`publications.${idx}.title`} nowrap /></span>
                                    <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>in</span>
                                    <span className={`${TYPOGRAPHY.itemSubtitle}`}><Editable path={`publications.${idx}.publisher`} nowrap /></span>
                                    <span className={`${TYPOGRAPHY.date} ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><Editable path={`publications.${idx}.date`} nowrap /></span>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`publications.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },

    // === VOLUNTEER (5) ===
    'volunteer-standard': {
        id: 'volunteer-standard', name: 'Standard Flow', category: 'Volunteer', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            if (!data.volunteer || data.volunteer.length === 0) return null;
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="volunteer" />
                    <div className="flex flex-col gap-4 cv-gap-md">
                        {data.volunteer.map((vol, idx) => (
                            <ListEntry key={vol.id} collection="volunteer" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className="cv-keep-with-next">
                                    <div className={`flex ${isNarrow ? 'flex-col gap-1' : 'justify-between items-baseline flex-wrap gap-x-4'} mb-1`}>
                                        <h4 className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`volunteer.${idx}.role`} nowrap /></h4>
                                        <span className={`${TYPOGRAPHY.date} ${isDark ? '' : 'text-gray-500'}`}><Editable path={`volunteer.${idx}.date`} nowrap /></span>
                                    </div>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`volunteer.${idx}.organization`} nowrap /></div>
                                </div>
                                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path={`volunteer.${idx}.description`} multiline html /></div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },

    // === REFERENCES (5) ===
    'references-standard': {
        id: 'references-standard', name: 'Standard Block', category: 'References', render: ({ data, Editable, zoneId, isDark, Title, moveEntry, deleteEntry }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            if (!data.references || data.references.length === 0) return null;
            return (
                <div className="mb-6 snippet-anim cv-section">
                    <Title titleKey="references" />
                    <div className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-6 cv-gap-lg`}>
                        {data.references.map((ref, idx) => (
                            <ListEntry key={ref.id} collection="references" index={idx} moveEntry={moveEntry} deleteEntry={deleteEntry}>
                                <div className="cv-keep-with-next">
                                    <h4 className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}><Editable path={`references.${idx}.name`} nowrap /></h4>
                                    <div className={`${TYPOGRAPHY.itemSubtitle} mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path={`references.${idx}.role`} nowrap /></div>
                                    <div className={`${TYPOGRAPHY.body} font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><Editable path={`references.${idx}.contact`} nowrap /></div>
                                </div>
                            </ListEntry>
                        ))}
                    </div>
                </div>
            );
        }
    },

    // === SKILLS (6) ===
    'skills-tags': {
        id: 'skills-tags', name: 'Text Blocks', category: 'Skills', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                <Title titleKey="skills" />
                <div className="mb-3 cv-mb-sm">
                    <div className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Languages</div>
                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path="skills.languages" /></div>
                </div>
                <div className="mb-3 cv-mb-sm">
                    <div className={`${TYPOGRAPHY.itemTitle} mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Frameworks</div>
                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Editable path="skills.frameworks" /></div>
                </div>
            </div>
        )
    },
    'skills-pills': {
        id: 'skills-pills', name: 'Solid Pills', category: 'Skills', render: ({ data, isDark, Title }) => {
            const allSkills = [...data.skills.languages.split(','), ...data.skills.frameworks.split(',')].map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="skills" />
                    <div className="flex flex-wrap gap-2 cv-gap-sm">
                        {allSkills.map((skill, i) => (
                            <span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{skill}</span>
                        ))}
                    </div>
                </div>
            )
        }
    },
    'skills-boxed': {
        id: 'skills-boxed', name: 'Outline Boxes', category: 'Skills', render: ({ data, isDark, Title }) => {
            const allSkills = [...data.skills.languages.split(','), ...data.skills.frameworks.split(',')].map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="skills" />
                    <div className="flex flex-wrap gap-2 cv-gap-sm">
                        {allSkills.map((skill, i) => (
                            <span key={i} className={`px-3 py-1.5 text-xs font-medium border rounded ${isDark ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-800'}`}>{skill}</span>
                        ))}
                    </div>
                </div>
            )
        }
    },
    'skills-progress': {
        id: 'skills-progress', name: 'Progress Bars', category: 'Skills', render: ({ data, isDark, Title }) => {
            const allSkills = [...data.skills.languages.split(',')].map(s => s.trim()).filter(Boolean).slice(0, 6);
            return (
                <div className="mb-6 snippet-anim w-full cv-section cv-item-avoid">
                    <Title titleKey="expertise" />
                    <div className="flex flex-col gap-3 cv-gap-sm">
                        {allSkills.map((skill, i) => {
                            const widths = ['w-[90%]', 'w-[85%]', 'w-[75%]', 'w-[80%]', 'w-[65%]', 'w-[95%]'];
                            return (
                                <div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}>
                                    <span className={`w-1/2 truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{skill}</span>
                                    <div className={`w-1/2 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                                        <div className={`h-full cv-accent-bg ${widths[i] || 'w-[70%]'}`}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        }
    },
    'skills-dots': {
        id: 'skills-dots', name: 'Dot Rating', category: 'Skills', render: ({ data, isDark, Title }) => {
            const allSkills = [...data.skills.languages.split(',')].map(s => s.trim()).filter(Boolean).slice(0, 6);
            return (
                <div className="mb-6 snippet-anim w-full cv-section cv-item-avoid">
                    <Title titleKey="skills" />
                    <div className="grid grid-cols-1 gap-y-2 gap-x-4 cv-gap-sm">
                        {allSkills.map((skill, i) => {
                            const rating = i % 2 === 0 ? 5 : 4;
                            return (
                                <div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}>
                                    <span className={`truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{skill}</span>
                                    <div className="flex gap-1.5">
                                        {[...Array(5)].map((_, dotIdx) => (
                                            <div key={dotIdx} className={`w-2 h-2 rounded-full ${dotIdx < rating ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        }
    },
    'skills-category-inline': {
        id: 'skills-category-inline', name: 'Category Inline', category: 'Skills', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                <Title titleKey="skills" />
                <div className="flex flex-col gap-2 cv-gap-sm">
                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>Core Languages:</span>
                        <Editable path="skills.languages" />
                    </div>
                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>Frameworks:</span>
                        <Editable path="skills.frameworks" />
                    </div>
                    <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <span className={`${TYPOGRAPHY.itemTitle} ${isDark ? 'text-gray-100' : 'text-gray-900'} mr-2`}>Tools & Tech:</span>
                        <Editable path="skills.tools" />
                    </div>
                </div>
            </div>
        )
    },

    // === LANGUAGES ===
    'languages-comma': {
        id: 'languages-comma', name: 'Comma Separated', category: 'Languages', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                <Title titleKey="languages" />
                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="languages" /></div>
            </div>
        )
    },
    'languages-dots': {
        id: 'languages-dots', name: 'Dot Rating', category: 'Languages', render: ({ data, isDark, Title }) => {
            const items = data.languages.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim w-full cv-section cv-item-avoid">
                    <Title titleKey="languages" />
                    <div className="grid grid-cols-1 gap-y-2 gap-x-4 cv-gap-sm">
                        {items.map((item, i) => {
                            const rating = i % 2 === 0 ? 5 : 4;
                            return (
                                <div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}>
                                    <span className={`truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.split('(')[0]}</span>
                                    <div className="flex gap-1.5">
                                        {[...Array(5)].map((_, dotIdx) => (
                                            <div key={dotIdx} className={`w-2 h-2 rounded-full ${dotIdx < rating ? 'cv-accent-bg' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}></div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        }
    },
    'languages-bars': {
        id: 'languages-bars', name: 'Progress Bars', category: 'Languages', render: ({ data, isDark, Title }) => {
            const items = data.languages.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim w-full cv-section cv-item-avoid">
                    <Title titleKey="languages" />
                    <div className="flex flex-col gap-3 cv-gap-sm">
                        {items.map((item, i) => {
                            const widths = ['w-[95%]', 'w-[85%]', 'w-[65%]', 'w-[50%]'];
                            return (
                                <div key={i} className={`flex justify-between items-center ${TYPOGRAPHY.body}`}>
                                    <span className={`w-1/2 truncate font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{item.split('(')[0]}</span>
                                    <div className={`w-1/2 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                                        <div className={`h-full cv-accent-bg ${widths[i] || 'w-[70%]'}`}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        }
    },
    'languages-pills': {
        id: 'languages-pills', name: 'Solid Pills', category: 'Languages', render: ({ data, isDark, Title }) => {
            const items = data.languages.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="languages" />
                    <div className="flex flex-wrap gap-2 cv-gap-sm">
                        {items.map((item, i) => (
                            <span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{item.split('(')[0]}</span>
                        ))}
                    </div>
                </div>
            )
        }
    },
    'languages-list': {
        id: 'languages-list', name: 'Standard List', category: 'Languages', render: ({ data, isDark, Title, zoneId }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            const items = data.languages.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="languages" />
                    <ul className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-x-6 gap-y-2 list-none ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {items.map((item, i) => <li key={i} className={`flex justify-between border-b pb-1 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}><span className="font-medium">{item.split('(')[0]}</span><span className="italic opacity-80 text-xs">{item.split('(')[1]?.replace(')', '')}</span></li>)}
                    </ul>
                </div>
            )
        }
    },

    // === INTERESTS ===
    'interests-comma': {
        id: 'interests-comma', name: 'Comma Separated', category: 'Interests', render: ({ Editable, isDark, Title }) => (
            <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                <Title titleKey="interests" />
                <div className={`${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}><Editable path="interests" /></div>
            </div>
        )
    },
    'interests-pills': {
        id: 'interests-pills', name: 'Outline Pills', category: 'Interests', render: ({ data, isDark, Title }) => {
            const items = data.interests.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="interests" />
                    <div className="flex flex-wrap gap-2 cv-gap-sm">
                        {items.map((item, i) => (
                            <span key={i} className={`px-3 py-1.5 text-xs font-medium border rounded-full ${isDark ? 'border-slate-500 text-slate-200' : 'border-gray-400 text-gray-800'}`}>{item}</span>
                        ))}
                    </div>
                </div>
            )
        }
    },
    'interests-solid': {
        id: 'interests-solid', name: 'Solid Pills', category: 'Interests', render: ({ data, isDark, Title }) => {
            const items = data.interests.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="interests" />
                    <div className="flex flex-wrap gap-2 cv-gap-sm">
                        {items.map((item, i) => (
                            <span key={i} className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{item}</span>
                        ))}
                    </div>
                </div>
            )
        }
    },
    'interests-list': {
        id: 'interests-list', name: 'Standard List', category: 'Interests', render: ({ data, isDark, Title, zoneId }) => {
            const isNarrow = ['sidebar', 'left', 'right'].includes(zoneId);
            const items = data.interests.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="interests" />
                    <ul className={`grid ${isNarrow ? 'grid-cols-1' : 'grid-cols-2'} gap-x-6 gap-y-1.5 list-disc pl-5 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {items.map((item, i) => <li key={i} className="pl-1">{item}</li>)}
                    </ul>
                </div>
            )
        }
    },
    'interests-minimal': {
        id: 'interests-minimal', name: 'Minimal Bullets', category: 'Interests', render: ({ data, isDark, Title, zoneId }) => {
            const items = data.interests.split(',').map(s => s.trim()).filter(Boolean);
            return (
                <div className="mb-6 snippet-anim cv-section cv-item-avoid">
                    <Title titleKey="interests" />
                    <ul className={`list-none flex flex-col gap-1.5 ${TYPOGRAPHY.body} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {items.map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gray-500' : 'cv-accent-bg'}`}></div> <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        }
    },

    // === SIDEBAR SPECIFIC ===
    'sidebar-contact': {
        id: 'sidebar-contact', name: 'Contact List', category: 'Sidebar', render: ({ Editable, isDark, Title }) => (
            <div className={`mb-6 snippet-anim cv-section ${isDark ? 'text-white' : 'text-gray-900'} w-full min-w-0 cv-item-avoid`}>
                <Title titleKey="contact" />
                <div className={`flex flex-col gap-2.5 cv-gap-sm ${TYPOGRAPHY.body} ${isDark ? 'text-slate-300' : 'text-gray-700'} break-all`}>
                    <div><Editable path="basics.email" breakAll /></div>
                    <div><Editable path="basics.phone" nowrap /></div>
                    <div><Editable path="basics.location" nowrap /></div>
                    <div><Editable path="basics.website" breakAll /></div>
                </div>
            </div>
        )
    }
};

// --- TEMPLATES ---
const TEMPLATES = [
    { id: 'tpl-1', name: 'Minimalist Single', type: '1-col', titleStyle: 'minimal', zones: { main: ['header-minimal', 'summary-clean', 'experience-standard', 'education-standard', 'projects-standard', 'skills-category-inline'] } },
    { id: 'tpl-2', name: 'Modern Split', type: '2-col', titleStyle: 'standard', zones: { header: ['header-minimal'], left: ['experience-standard', 'projects-standard', 'education-standard'], right: ['summary-highlight', 'skills-pills', 'languages-comma'] } },
    { id: 'tpl-3', name: 'Professional Sidebar Left', type: 'sidebar-left', titleStyle: 'standard', sidebarTitleStyle: 'sidebar-default', zones: { sidebar: ['header-avatar', 'sidebar-contact', 'skills-pills', 'languages-dots'], main: ['summary-clean', 'experience-standard', 'projects-compact', 'education-standard'] } },
    { id: 'tpl-4', name: 'Executive Sidebar Right', type: 'sidebar-right', titleStyle: 'minimal', sidebarTitleStyle: 'sidebar-default', zones: { main: ['header-split', 'summary-clean', 'experience-timeline', 'education-standard'], sidebar: ['sidebar-contact', 'skills-category-inline', 'interests-pills'] } },
    { id: 'tpl-5', name: 'Two Column 50/50', type: '2-col', titleStyle: 'accent', zones: { header: ['header-boxed'], left: ['experience-split'], right: ['education-split', 'projects-split', 'skills-tags'] } },
    { id: 'tpl-6', name: 'Harvard Executive', type: '1-col', titleStyle: 'standard', zones: { main: ['header-executive', 'experience-harvard', 'projects-harvard', 'education-harvard', 'certifications-harvard'] } },
    { id: 'tpl-7', name: 'Designer Portfolio', type: '1-col', titleStyle: 'designer', zones: { main: ['header-accent', 'summary-clean', 'experience-designer-timeline', 'projects-designer-timeline', 'skills-pills'] } },
    { id: 'tpl-8', name: 'Split Professional', type: '1-col', titleStyle: 'accent', zones: { main: ['header-split', 'summary-clean', 'experience-split', 'projects-split', 'education-split', 'skills-dots'] } },
    { id: 'tpl-9', name: 'Creative Sidebar Left', type: 'sidebar-left-dark', titleStyle: 'minimal', sidebarTitleStyle: 'sidebar-default', zones: { sidebar: ['header-creative', 'sidebar-contact', 'skills-pills'], main: ['summary-highlight', 'experience-timeline', 'projects-compact', 'education-standard'] } },
    { id: 'tpl-10', name: 'Header & Right Sidebar', type: 'top-sidebar-right', titleStyle: 'standard', sidebarTitleStyle: 'sidebar-default', zones: { header: ['header-split'], main: ['summary-clean', 'experience-standard', 'education-standard'], sidebar: ['sidebar-contact', 'skills-pills', 'languages-comma'] } },
    { id: 'tpl-11', name: 'Header & Left Sidebar', type: 'top-sidebar-left', titleStyle: 'minimal', sidebarTitleStyle: 'sidebar-default', zones: { header: ['header-minimal'], sidebar: ['sidebar-contact', 'skills-pills'], main: ['summary-clean', 'experience-standard', 'education-standard'] } },
    { id: 'tpl-12', name: 'Modern Header Sidebar', type: 'top-sidebar-right', titleStyle: 'accent', sidebarTitleStyle: 'sidebar-default', zones: { header: ['header-accent'], main: ['summary-highlight', 'experience-split', 'education-split'], sidebar: ['sidebar-contact', 'skills-pills'] } },
    { id: 'tpl-13', name: 'Dense One-Pager', type: 'hybrid-split', titleStyle: 'standard', zones: { header: ['header-minimal'], main: ['summary-clean', 'experience-compact'], left: ['projects-compact', 'education-compact'], right: ['skills-category-inline', 'certifications-standard', 'awards-standard'] } },
    { id: 'tpl-14', name: 'Academic CV', type: '1-col', titleStyle: 'lines', zones: { main: ['header-boxed', 'summary-clean', 'education-standard', 'experience-harvard', 'publications-standard', 'references-standard'] } },
    { id: 'tpl-15', name: 'Tech Lead Left Sidebar', type: 'sidebar-left-dark', titleStyle: 'standard', sidebarTitleStyle: 'designer', zones: { sidebar: ['header-avatar', 'sidebar-contact', 'skills-tags', 'languages-bars'], main: ['summary-quote', 'experience-split', 'projects-split', 'education-compact'] } }
];

const TEMPLATE_CATEGORIES = [
    { id: 'single', name: 'Single Column', desc: 'Traditional top-to-bottom flow. Ideal for ATS compatibility.', types: ['1-col'], icon: <AlignJustify size={24} /> },
    { id: 'split', name: 'Split / Two Column', desc: 'Modern layouts separating your experience from secondary details.', types: ['2-col'], icon: <Columns size={24} /> },
    { id: 'header-sidebar', name: 'Header & Sidebar', desc: 'Full-width header combined with a compact side column.', types: ['top-sidebar-left', 'top-sidebar-right'], icon: <LayoutTemplate size={24} /> },
    { id: 'full-sidebar', name: 'Full Sidebar', desc: 'Continuous side panel that runs from top to bottom.', types: ['sidebar-left', 'sidebar-right', 'sidebar-left-dark', 'sidebar-right-dark'], icon: <Sidebar size={24} /> },
    { id: 'hybrid', name: 'Hybrid One-Pager', desc: 'Combines 1-column core sections with a 2-column bottom grid for density.', types: ['hybrid-split'], icon: <LayoutTemplate size={24} /> }
];

// --- HELPER FUNCTIONS ---
const getNestedValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const deepClone = JSON.parse(JSON.stringify(obj));
    const target = keys.reduce((acc, key) => acc[key], deepClone);
    target[lastKey] = value;
    return deepClone;
};
const generateId = () => Math.random().toString(36).substr(2, 9);
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- STATIC LAYOUT RENDERER (For Previews) ---
const StaticLayoutRenderer = ({ template, cvData, ReadOnlyWrapper }) => {
    const renderZone = (zoneId, className, isDark = false) => {
        const snippets = template.zones[zoneId] || [];
        return (
            <div className={className}>
                {snippets.map((type, index) => {
                    const SnippetComponent = SNIPPETS[type] || SNIPPETS['summary-clean'];
                    const isSidebar = ['sidebar', 'left', 'right'].includes(zoneId);
                    const styleKey = isSidebar && template.sidebarTitleStyle ? template.sidebarTitleStyle : template.titleStyle;
                    const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
                    const Title = ({ titleKey, overrideClass }) => overrideClass ? <h3 className={overrideClass}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3> : <TitleRenderer isDark={isDark}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>;
                    return <div key={index} className="pointer-events-none mb-2"><SnippetComponent.render data={cvData} Editable={ReadOnlyWrapper} zoneId={zoneId} isDark={isDark} Title={Title} moveEntry={() => { }} deleteEntry={() => { }} /></div>;
                })}
            </div>
        );
    };
    // Previews use fixed hardcoded paddings mapped proportionally to their container
    switch (template.type) {
        case '1-col': return <div className="w-full bg-white h-full cv-document" style={{ padding: '57px 76px' }}>{renderZone('main', 'w-full min-w-0')}</div>;
        case '2-col': return <div className="w-full bg-white h-full flex flex-col cv-document">{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[76px] pb-[57px] pt-[23px] gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
        case 'sidebar-left': return <div className="w-full bg-white h-full flex cv-document"><div className="w-[32%] min-w-0 bg-slate-50 border-r border-slate-200 pl-[76px] pr-[19px] py-[57px]">{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0 pl-[19px] pr-[76px] py-[57px]">{renderZone('main', 'h-full')}</div></div>;
        case 'sidebar-left-dark': return <div className="w-full bg-white h-full flex cv-document"><div className="w-[32%] min-w-0 bg-slate-800 pl-[76px] pr-[19px] py-[57px]">{renderZone('sidebar', 'h-full', true)}</div><div className="w-[68%] min-w-0 pl-[19px] pr-[76px] py-[57px]">{renderZone('main', 'h-full')}</div></div>;
        case 'sidebar-right': return <div className="w-full bg-white h-full flex cv-document"><div className="w-[68%] min-w-0 pl-[76px] pr-[19px] py-[57px]">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 bg-slate-50 border-l border-slate-200 pl-[19px] pr-[76px] py-[57px]">{renderZone('sidebar', 'h-full', false)}</div></div>;
        case 'sidebar-right-dark': return <div className="w-full bg-white h-full flex cv-document"><div className="w-[68%] min-w-0 pl-[76px] pr-[19px] py-[57px]">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 bg-slate-800 pl-[19px] pr-[76px] py-[57px]">{renderZone('sidebar', 'h-full', true)}</div></div>;
        case 'top-sidebar-left': return <div className="w-full bg-white h-full flex flex-col cv-document">{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[76px] pb-[57px] pt-[23px] gap-8"><div className="w-[32%] min-w-0 border-r border-slate-200 pr-[19px]">{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div></div></div>;
        case 'top-sidebar-right': return <div className="w-full bg-white h-full flex flex-col cv-document">{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[76px] pb-[57px] pt-[23px] gap-8"><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 border-l border-slate-200 pl-[19px]">{renderZone('sidebar', 'h-full', false)}</div></div></div>;
        case 'hybrid-split': return <div className="w-full bg-white h-full flex flex-col cv-document">{template.zones['header'] && <div className="pt-[57px] px-[76px] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="px-[76px] pt-[23px] pb-0">{renderZone('main', 'w-full min-w-0')}</div><div className="flex flex-1 px-[76px] pb-[57px] pt-[8px] gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
        default: return <div>Layout not found</div>;
    }
};

// --- COMPONENTS ---
const EditableField = ({ data, path, multiline, onChange, setFocusedRef, readOnly, nowrap, breakAll, aiIssues = [], activeIssueId, onIssueClick }) => {
    const contentRef = useRef(null);
    const [isEditing, setIsEditing] = useState(false);
    const value = getNestedValue(data, path) || '';

    useEffect(() => {
        if (!isEditing && contentRef.current) {
            let displayValue = value;
            const relevantIssues = aiIssues.filter(i => i.path === path);
            if (relevantIssues.length > 0) {
                relevantIssues.forEach(issue => {
                    if (issue.targetText) {
                        const regex = new RegExp(`(${escapeRegExp(issue.targetText)})`, 'g');
                        const highlightClass = issue.id === activeIssueId ? 'bg-yellow-300 text-black shadow-sm' : 'bg-yellow-100/70 border-b-2 border-yellow-400 cursor-pointer text-gray-900';
                        displayValue = displayValue.replace(regex, `<mark class="${highlightClass} rounded-sm px-0.5 transition-all" data-issue="${issue.id}">$1</mark>`);
                    }
                });
            }
            contentRef.current.innerHTML = displayValue;
        }
    }, [value, isEditing, aiIssues, activeIssueId, path]);

    const handleInput = () => !readOnly && contentRef.current && onChange(path, contentRef.current.innerHTML);
    const handleKeyDown = (e) => { if (!multiline && e.key === 'Enter') e.preventDefault(); };
    const handleFocus = () => { if (readOnly) return; setIsEditing(true); if (setFocusedRef) setFocusedRef(contentRef.current); };
    const handleBlur = () => { if (readOnly) return; setIsEditing(false); if (setFocusedRef) setTimeout(() => setFocusedRef(null), 200); };
    const handleClick = (e) => { if (e.target.tagName === 'MARK' && onIssueClick) onIssueClick(e.target.getAttribute('data-issue')); };

    let wrapClass = 'whitespace-normal';
    if (nowrap) wrapClass = 'whitespace-nowrap';
    if (breakAll) wrapClass = 'break-all whitespace-normal';
    if (multiline) wrapClass = 'break-words whitespace-pre-wrap';

    return (
        <span ref={contentRef} data-path={path} contentEditable={!readOnly} suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown} onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick} className={`outline-none transition-colors inline-block max-w-full ${wrapClass} ${!readOnly ? 'hover:bg-blue-50/50 focus:bg-blue-50 focus:ring-2 focus:ring-blue-300 rounded px-1 -mx-1' : ''}`} style={{ minHeight: '1em' }} />
    );
};

const FloatingToolbar = ({ targetNode, onSuggestPoint }) => {
    const [pos, setPos] = useState({ top: -1000, left: 0 });
    const [canSuggest, setCanSuggest] = useState(false);

    useEffect(() => {
        if (targetNode) {
            const rect = targetNode.getBoundingClientRect();
            setPos({ top: rect.top - 45, left: rect.left + rect.width / 2 });

            const isBulletContext = targetNode.tagName === 'LI' || targetNode.closest('li') || targetNode.closest('ul') || (targetNode.getAttribute('data-path') || '').includes('description');
            setCanSuggest(!!isBulletContext);
        } else {
            setPos({ top: -1000, left: 0 });
            setCanSuggest(false);
        }
    }, [targetNode]);

    const execCmd = (e, cmd, value = null) => { e.preventDefault(); document.execCommand('styleWithCSS', false, true); document.execCommand(cmd, false, value); };

    if (!targetNode) return null;
    return (
        <div className="fixed z-50 bg-white shadow-2xl border border-gray-200 rounded-lg flex items-center p-1.5 gap-1 transform -translate-x-1/2 transition-all duration-200 animate-fade-in-up" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.preventDefault()}>
            {canSuggest && (
                <>
                    <button onClick={(e) => { e.preventDefault(); onSuggestPoint(); }} className="p-1.5 hover:bg-emerald-100 rounded text-emerald-600 flex items-center gap-1 font-bold text-xs pr-2 border border-emerald-200" title="Suggest Contextual Point"><Wand2 size={14} /> ✨ Suggest</button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                </>
            )}
            <button onClick={(e) => execCmd(e, 'bold')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Bold"><Bold size={16} /></button>
            <button onClick={(e) => execCmd(e, 'italic')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Italic"><Italic size={16} /></button>
            <button onClick={(e) => execCmd(e, 'underline')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Underline"><Underline size={16} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button onClick={(e) => execCmd(e, 'insertUnorderedList')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Bullet List"><List size={16} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button onClick={(e) => execCmd(e, 'justifyLeft')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Align Left"><AlignLeft size={16} /></button>
            <button onClick={(e) => execCmd(e, 'justifyCenter')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Align Center"><AlignCenter size={16} /></button>
            <button onClick={(e) => execCmd(e, 'justifyRight')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Align Right"><AlignRight size={16} /></button>
            <button onClick={(e) => execCmd(e, 'justifyFull')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Justify"><AlignJustify size={16} /></button>
        </div>
    );
};

const CanvasSnippet = ({ instance, index, zoneId, cvData, EditableWrapper, moveSnippet, removeSnippet, onReplace, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, isDark, activeTemplate }) => {
    const SnippetComponent = SNIPPETS[instance.type];

    const isDropTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === index;
    const isBeingDragged = dragState?.isDragging && dragState?.sourceZoneId === zoneId && dragState?.sourceIndex === index;
    const isHeader = SnippetComponent?.category === 'Header';

    // Prevent showing drop indicator if dropping exactly over itself
    const showDropLine = isDropTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));

    const handleDragStart = (e) => {
        if (isHeader) return;

        // Create a solid drag ghost
        const ghost = e.currentTarget.cloneNode(true);
        ghost.style.backgroundColor = isDark ? '#1f2937' : '#ffffff';
        ghost.style.color = isDark ? 'white' : 'black';
        ghost.style.padding = '20px';
        ghost.style.borderRadius = '12px';
        ghost.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';
        ghost.style.width = `${e.currentTarget.offsetWidth}px`;
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 20, 20);

        e.dataTransfer.setData('application/json', JSON.stringify({ source: 'canvas', zoneId, index, instance }));

        setTimeout(() => {
            document.body.removeChild(ghost);
            document.dispatchEvent(new CustomEvent('snippet-drag-start', { detail: { zoneId, index } }));
        }, 10);
    };
    const handleDragEnd = () => document.dispatchEvent(new CustomEvent('snippet-drag-end'));

    const handleDragOver = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (isHeader) return;

        // 50% Offset Snapping calculation
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertIndex = e.clientY < midY ? index : index + 1;

        if (dragState.overZoneId !== zoneId || dragState.overIndex !== insertIndex) {
            document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: insertIndex } }));
        }
    };

    const Title = ({ titleKey, overrideClass }) => {
        const isSidebar = ['sidebar', 'left', 'right'].includes(zoneId);
        const styleKey = isSidebar && activeTemplate.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate.titleStyle;
        const Renderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
        if (overrideClass) return <h3 className={overrideClass}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></h3>;
        return <Renderer isDark={isDark}><EditableWrapper path={`sectionTitles.${titleKey}`} nowrap /></Renderer>;
    };

    if (!SnippetComponent) return null;

    return (
        <div draggable={!isHeader} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} className={`relative group/snippet transition-all duration-300 ease-in-out ${!isHeader ? 'cursor-move' : ''} snippet-anim
        ${isBeingDragged ? 'opacity-30 scale-95' : 'opacity-100 scale-100'} ${showDropLine ? 'mt-8' : 'mt-0'}`}>

            {showDropLine && (
                <div className="absolute -top-6 left-0 w-full h-4 bg-blue-100 border-2 border-dashed border-blue-400 rounded flex items-center justify-center pointer-events-none z-30"></div>
            )}

            <div className={`ring-1 ring-transparent hover:ring-blue-400 hover:shadow-sm rounded-sm transition-all`}>
                <div className="absolute right-0 top-0 opacity-0 group-hover/snippet:opacity-100 transition-opacity bg-white ring-1 ring-gray-200 shadow-lg rounded-bl-sm rounded-tr-sm flex z-20 overflow-hidden no-print">
                    {isHeader && <button onClick={onTogglePhoto} className="flex items-center gap-1 px-3 py-1.5 hover:bg-emerald-50 text-emerald-600 font-medium text-xs border-r border-gray-200" title="Toggle Photo"><ImageIcon size={14} /> Photo</button>}
                    {['Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Publications', 'Volunteer', 'References'].includes(SnippetComponent.category) && <button onClick={() => onAddListEntry(SnippetComponent.category)} className="flex items-center gap-1 px-3 py-1.5 hover:bg-emerald-50 text-emerald-600 font-medium text-xs border-r border-gray-200" title="Add Entry"><Plus size={14} /> Add</button>}
                    <button onClick={() => onReplace(zoneId, index, instance.type)} className="flex items-center gap-1 px-3 py-1.5 hover:bg-blue-50 text-blue-600 font-medium text-xs border-r border-gray-200"><RefreshCw size={14} /> Replace</button>
                    {!isHeader && (
                        <>
                            <button onClick={() => moveSnippet(zoneId, index, -1)} className="p-2 hover:bg-gray-100 text-gray-500"><ChevronUp size={16} /></button>
                            <button onClick={() => moveSnippet(zoneId, index, 1)} className="p-2 hover:bg-gray-100 text-gray-500 border-r border-gray-200"><ChevronDown size={16} /></button>
                            <button onClick={() => removeSnippet(zoneId, index)} className="p-2 hover:bg-red-50 text-red-500 border-r border-gray-200"><Trash2 size={16} /></button>
                            <div className="p-2 cursor-grab text-gray-400 bg-gray-50"><GripVertical size={16} /></div>
                        </>
                    )}
                </div>
                <div className="p-1 pointer-events-auto snippet-content">
                    <SnippetComponent.render data={cvData} Editable={EditableWrapper} zoneId={zoneId} isDark={isDark} Title={Title} moveEntry={moveEntry} deleteEntry={deleteEntry} />
                </div>
            </div>
        </div>
    );
};

const CanvasZone = ({ zoneId, blocks, cvData, EditableWrapper, handleDrop, moveSnippet, removeSnippet, onReplace, onAddSnippet, onTogglePhoto, onAddListEntry, moveEntry, deleteEntry, dragState, activeTemplate, isDark = false, className = "" }) => {
    const [isOverZone, setIsOverZone] = useState(false);
    const onDragOver = (e) => { e.preventDefault(); setIsOverZone(true); if (e.target === e.currentTarget) document.dispatchEvent(new CustomEvent('snippet-drag-over', { detail: { zoneId, index: blocks.length } })); };
    const onDragLeave = () => setIsOverZone(false);
    const onDrop = (e) => { e.preventDefault(); setIsOverZone(false); try { const dataStr = e.dataTransfer.getData('application/json'); if (dataStr) handleDrop(zoneId, JSON.parse(dataStr), dragState?.overIndex); } catch (err) { } document.dispatchEvent(new CustomEvent('snippet-drag-end')); };

    const isAppendTarget = dragState?.overZoneId === zoneId && dragState?.overIndex === blocks.length;
    // Hide if redundant drop at the end
    const showAppendLine = isAppendTarget && !(dragState.sourceZoneId === zoneId && (dragState.overIndex === dragState.sourceIndex || dragState.overIndex === dragState.sourceIndex + 1));

    return (
        <div className="relative group/zone h-full flex flex-col">
            <div className={`flex-1 min-h-[150px] transition-colors pb-10 ${isOverZone ? 'bg-gray-50/50' : ''} ${className}`} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
                {blocks.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 italic pointer-events-none border-2 border-dashed border-gray-200 rounded-lg m-2 no-print">Empty Zone</div>}
                {blocks.map((instance, index) => <CanvasSnippet key={instance.id} instance={instance} index={index} zoneId={zoneId} cvData={cvData} EditableWrapper={EditableWrapper} moveSnippet={moveSnippet} removeSnippet={removeSnippet} onReplace={onReplace} onTogglePhoto={onTogglePhoto} onAddListEntry={onAddListEntry} moveEntry={moveEntry} deleteEntry={deleteEntry} dragState={dragState} activeTemplate={activeTemplate} isDark={isDark} />)}

                {showAppendLine && <div className="w-full h-4 bg-blue-100 border-2 border-dashed border-blue-400 rounded mt-4 pointer-events-none"></div>}
            </div>
            <div className="opacity-0 group-hover/zone:opacity-100 transition-opacity flex justify-center py-4 relative z-10 -mt-8 no-print">
                <button onClick={() => onAddSnippet(zoneId)} className="flex items-center gap-2 bg-white border border-gray-300 shadow-lg text-gray-700 hover:text-emerald-600 hover:border-emerald-400 font-bold px-5 py-2.5 rounded-full text-sm transition-all transform hover:scale-105"><PlusCircle size={18} /> Add Section</button>
            </div>
        </div>
    );
};


// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
    const [cvData, setCvData] = useState(initialData);
    const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);
    const [focusedNode, setFocusedNode] = useState(null);
    const [zones, setZones] = useState({});
    const [templateAnimKey, setTemplateAnimKey] = useState(0);

    // App State (Theme & Core Styling)
    const [theme, setTheme] = useState('dark');
    const [design, setDesign] = useState({ font: 'Inter', fontSize: 12, spacing: 1.0, accentColor: '#22c55e', pageMargin: 40 });

    // Left Sidebar State
    const [activeSidebar, setActiveSidebar] = useState(null);

    // Modals & Panels state
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [replacingSnippet, setReplacingSnippet] = useState(null);
    const [dragState, setDragState] = useState({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });

    // AI Scanner & Suggestions State
    const [scanning, setScanning] = useState(false);
    const [aiIssues, setAiIssues] = useState([]);
    const [activeIssueId, setActiveIssueId] = useState(null);
    const [cvScore, setCvScore] = useState(100);
    const [pointSuggestion, setPointSuggestion] = useState(null);

    // Theme Helpers
    const isDarkUI = theme === 'dark';
    const bgApp = isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100';
    const bgNav = isDarkUI ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm';
    const bgPanel = isDarkUI ? 'bg-[#141414] border-[#2a2a2a]' : 'bg-white border-gray-200';
    const bgWorkspace = isDarkUI ? 'bg-[#1a1a1a]' : 'bg-gray-200';
    const textPrimary = isDarkUI ? 'text-gray-100' : 'text-gray-900';
    const textMuted = isDarkUI ? 'text-gray-400' : 'text-gray-500';
    const brandGreen = isDarkUI ? 'text-[#7EE787]' : 'text-emerald-600';
    const brandGreenBg = isDarkUI ? 'bg-[#7EE787] text-black' : 'bg-emerald-600 text-white';
    const btnSecondary = isDarkUI ? 'bg-[#222] text-gray-300 hover:bg-[#333] border-[#333]' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200';

    useEffect(() => {
        loadTemplate(TEMPLATES[0]);
        const handleDragStart = (e) => setDragState(prev => ({ ...prev, isDragging: true, sourceZoneId: e.detail.zoneId, sourceIndex: e.detail.index }));
        const handleDragOver = (e) => setDragState(prev => ({ ...prev, overZoneId: e.detail.zoneId, overIndex: e.detail.index }));
        const handleDragEnd = () => setDragState({ isDragging: false, sourceZoneId: null, sourceIndex: null, overZoneId: null, overIndex: null });
        document.addEventListener('snippet-drag-start', handleDragStart);
        document.addEventListener('snippet-drag-over', handleDragOver);
        document.addEventListener('snippet-drag-end', handleDragEnd);
        return () => { document.removeEventListener('snippet-drag-start', handleDragStart); document.removeEventListener('snippet-drag-over', handleDragOver); document.removeEventListener('snippet-drag-end', handleDragEnd); };
    }, []);

    const loadTemplate = (template) => {
        setActiveTemplate(template);
        const initialZones = {};
        Object.keys(template.zones).forEach(zoneId => { initialZones[zoneId] = template.zones[zoneId].map(type => ({ id: generateId(), type })); });
        setZones(initialZones);
        setIsTemplateModalOpen(false);
        setTemplateAnimKey(prev => prev + 1);
    };

    const handleDataChange = (path, value) => setCvData(prev => setNestedValue(prev, path, value));

    const EditableWrapper = useMemo(() => function Editable(props) { return <EditableField {...props} data={cvData} onChange={handleDataChange} setFocusedRef={setFocusedNode} aiIssues={aiIssues} activeIssueId={activeIssueId} onIssueClick={(id) => { setActiveIssueId(id); setActiveSidebar('ai'); }} />; }, [cvData, aiIssues, activeIssueId]);
    const ReadOnlyWrapper = useMemo(() => function Editable(props) { return <EditableField {...props} data={cvData} readOnly={true} />; }, [cvData]);

    const handleSuggestPoint = () => {
        if (!focusedNode) return;
        let path = focusedNode.getAttribute('data-path');
        if (!path) {
            const parentWithPath = focusedNode.closest('[data-path]');
            if (parentWithPath) path = parentWithPath.getAttribute('data-path');
        }
        if (!path || !path.includes('description')) return;

        const rect = focusedNode.getBoundingClientRect();
        setPointSuggestion({
            path,
            text: "Spearheaded key initiatives yielding a 25% increase in operational efficiency across multiple cross-functional teams.",
            rect: { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX }
        });
    };

    const runAIScan = () => {
        setScanning(true);
        setTimeout(() => {
            setAiIssues([
                { id: 'ai1', type: 'Impact', path: 'experience.0.description', targetText: 'enhancing front-end data presentation capabilities', suggestion: 'Weak impact statement. Highlight specific performance improvements or business value created by this pipeline.', points: 15 },
                { id: 'ai2', type: 'Formatting', path: 'skills.languages', targetText: 'HTML/CSS', suggestion: 'Group HTML/CSS under Frontend tools rather than core analytical languages to better match Data Analyst roles.', points: 5 }
            ]);
            setCvScore(80); setScanning(false);
        }, 1500);
    };

    const applyAIFix = (issue) => {
        const currentValue = getNestedValue(cvData, issue.path);
        let fixedValue = currentValue;
        if (issue.id === 'ai1') fixedValue = currentValue.replace(issue.targetText, 'enhancing front-end data presentation capabilities and reducing load times by 40%');
        if (issue.id === 'ai2') fixedValue = currentValue.replace(issue.targetText, '');
        handleDataChange(issue.path, fixedValue); setAiIssues(prev => prev.filter(i => i.id !== issue.id)); setCvScore(prev => prev + issue.points); if (activeIssueId === issue.id) setActiveIssueId(null);
    };

    const handleZoneDrop = (targetZoneId, dragData, targetIndex) => {
        setZones(prev => {
            const newZones = { ...prev }; if (!newZones[targetZoneId]) newZones[targetZoneId] = [];
            const insertIndex = targetIndex !== undefined && targetIndex !== null ? targetIndex : newZones[targetZoneId].length;
            if (dragData.source === 'canvas') {
                const { zoneId: sourceZoneId, index: sourceIndex, instance } = dragData;
                newZones[sourceZoneId].splice(sourceIndex, 1);
                let finalInsertIndex = insertIndex;
                if (sourceZoneId === targetZoneId && sourceIndex < insertIndex) finalInsertIndex -= 1;
                newZones[targetZoneId].splice(finalInsertIndex, 0, instance);
            }
            return newZones;
        });
    };

    const moveSnippet = (zoneId, index, dir) => { setZones(prev => { const newZones = { ...prev }; const list = newZones[zoneId]; if (index + dir < 0 || index + dir >= list.length) return prev; const item = list[index]; list.splice(index, 1); list.splice(index + dir, 0, item); return newZones; }); };
    const removeSnippet = (zoneId, index) => { setZones(prev => { const newZones = { ...prev }; newZones[zoneId].splice(index, 1); return newZones; }); };

    const moveEntry = (collection, index, dir) => {
        setCvData(prev => {
            const arr = [...prev[collection]];
            if (index + dir < 0 || index + dir >= arr.length) return prev;
            const item = arr[index];
            arr.splice(index, 1);
            arr.splice(index + dir, 0, item);
            return { ...prev, [collection]: arr };
        });
    };

    const deleteEntry = (collection, index) => {
        setCvData(prev => {
            const arr = [...prev[collection]];
            arr.splice(index, 1);
            return { ...prev, [collection]: arr };
        });
    };

    const handleReplaceClick = (zoneId, index, currentType) => { const category = SNIPPETS[currentType]?.category; setReplacingSnippet({ zoneId, index, currentType, category, isAdd: false }); };
    const handleAddClick = (zoneId) => setReplacingSnippet({ zoneId, isAdd: true });

    const handleAddListEntry = (type) => {
        const l = type.toLowerCase();
        if (l === 'experience') setCvData(prev => ({ ...prev, experience: [...prev.experience, { id: generateId(), company: 'New Company', role: 'Job Title', date: 'Date', description: '<ul><li>Describe your responsibilities and achievements here.</li></ul>' }] }));
        else if (l === 'education') setCvData(prev => ({ ...prev, education: [...prev.education, { id: generateId(), institution: 'Institution Name', degree: 'Degree', date: 'Date', description: 'Additional details.' }] }));
        else if (l === 'projects') setCvData(prev => ({ ...prev, projects: [...prev.projects, { id: generateId(), name: 'Project Name', role: 'Role', date: 'Date', description: '<ul><li>Project details.</li></ul>' }] }));
        else if (l === 'certifications') setCvData(prev => ({ ...prev, certifications: [...prev.certifications, { id: generateId(), name: 'Certification Name', issuer: 'Issuer', date: 'Date' }] }));
        else if (l === 'awards') setCvData(prev => ({ ...prev, awards: [...prev.awards, { id: generateId(), name: 'Award Name', issuer: 'Issuer', date: 'Date' }] }));
        else if (l === 'publications') setCvData(prev => ({ ...prev, publications: [...prev.publications, { id: generateId(), title: 'Publication Title', publisher: 'Publisher', date: 'Date', description: 'Brief summary.' }] }));
        else if (l === 'volunteer') setCvData(prev => ({ ...prev, volunteer: [...prev.volunteer, { id: generateId(), organization: 'Org Name', role: 'Role', date: 'Date', description: '<ul><li>Duties here.</li></ul>' }] }));
        else if (l === 'references') setCvData(prev => ({ ...prev, references: [...prev.references, { id: generateId(), name: 'Ref Name', role: 'Role', contact: 'Contact Info' }] }));
    };

    const executeReplaceOrAdd = (newType) => {
        if (!replacingSnippet) return;
        setZones(prev => {
            const newZones = { ...prev };
            if (replacingSnippet.isAdd) newZones[replacingSnippet.zoneId].push({ id: generateId(), type: newType });
            else newZones[replacingSnippet.zoneId][replacingSnippet.index] = { id: generateId(), type: newType };
            return newZones;
        });
        setReplacingSnippet(null);
    };

    const handleTogglePhoto = () => handleDataChange('basics.showAvatar', !cvData.basics.showAvatar);

    const renderCanvasLayout = () => {
        const layoutType = activeTemplate.type;
        const safeZones = zones || {};
        const renderZone = (zoneId, className, isDark = false) => (
            <CanvasZone zoneId={zoneId} blocks={safeZones[zoneId] || []} cvData={cvData} EditableWrapper={EditableWrapper} handleDrop={handleZoneDrop} moveSnippet={moveSnippet} removeSnippet={removeSnippet} onReplace={handleReplaceClick} onAddSnippet={handleAddClick} onTogglePhoto={handleTogglePhoto} onAddListEntry={handleAddListEntry} moveEntry={moveEntry} deleteEntry={deleteEntry} dragState={dragState} activeTemplate={activeTemplate} className={className} isDark={isDark} />
        );

        switch (layoutType) {
            case '1-col': return <div className="w-full bg-white shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm' }}><div className="flex-1 p-[var(--cv-page-margin)]">{renderZone('main', 'w-full min-w-0')}</div></div>;
            case '2-col': return <div className="w-full bg-white shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm' }}>{safeZones['header'] && <div className="pt-[var(--cv-page-margin)] px-[var(--cv-page-margin)] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[var(--cv-page-margin)] pb-[var(--cv-page-margin)] pt-[6mm] gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
            case 'sidebar-left': return <div className="w-full bg-white shadow-2xl mx-auto flex cv-document" style={{ width: '210mm', minHeight: '297mm' }}><div className="w-[32%] min-w-0 bg-slate-50 border-r border-slate-200 pl-[var(--cv-page-margin)] pr-[5mm] py-[var(--cv-page-margin)]">{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0 pl-[5mm] pr-[var(--cv-page-margin)] py-[var(--cv-page-margin)]">{renderZone('main', 'h-full')}</div></div>;
            case 'sidebar-left-dark': return <div className="w-full bg-white shadow-2xl mx-auto flex cv-document" style={{ width: '210mm', minHeight: '297mm' }}><div className="w-[32%] min-w-0 bg-slate-800 pl-[var(--cv-page-margin)] pr-[5mm] py-[var(--cv-page-margin)]">{renderZone('sidebar', 'h-full', true)}</div><div className="w-[68%] min-w-0 pl-[5mm] pr-[var(--cv-page-margin)] py-[var(--cv-page-margin)]">{renderZone('main', 'h-full')}</div></div>;
            case 'sidebar-right': return <div className="w-full bg-white shadow-2xl mx-auto flex cv-document" style={{ width: '210mm', minHeight: '297mm' }}><div className="w-[68%] min-w-0 pl-[var(--cv-page-margin)] pr-[5mm] py-[var(--cv-page-margin)]">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 bg-slate-50 border-l border-slate-200 pl-[5mm] pr-[var(--cv-page-margin)] py-[var(--cv-page-margin)]">{renderZone('sidebar', 'h-full', false)}</div></div>;
            case 'sidebar-right-dark': return <div className="w-full bg-white shadow-2xl mx-auto flex cv-document" style={{ width: '210mm', minHeight: '297mm' }}><div className="w-[68%] min-w-0 pl-[var(--cv-page-margin)] pr-[5mm] py-[var(--cv-page-margin)]">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 bg-slate-800 pl-[5mm] pr-[var(--cv-page-margin)] py-[var(--cv-page-margin)]">{renderZone('sidebar', 'h-full', true)}</div></div>;
            case 'top-sidebar-left': return <div className="w-full bg-white shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm' }}>{safeZones['header'] && <div className="pt-[var(--cv-page-margin)] px-[var(--cv-page-margin)] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[var(--cv-page-margin)] pb-[var(--cv-page-margin)] pt-[6mm] gap-8"><div className="w-[32%] min-w-0 border-r border-slate-200 pr-[5mm]">{renderZone('sidebar', 'h-full', false)}</div><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div></div></div>;
            case 'top-sidebar-right': return <div className="w-full bg-white shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm' }}>{safeZones['header'] && <div className="pt-[var(--cv-page-margin)] px-[var(--cv-page-margin)] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="flex flex-1 px-[var(--cv-page-margin)] pb-[var(--cv-page-margin)] pt-[6mm] gap-8"><div className="w-[68%] min-w-0">{renderZone('main', 'h-full')}</div><div className="w-[32%] min-w-0 border-l border-slate-200 pl-[5mm]">{renderZone('sidebar', 'h-full', false)}</div></div></div>;
            case 'hybrid-split': return <div className="w-full bg-white shadow-2xl mx-auto flex flex-col cv-document" style={{ width: '210mm', minHeight: '297mm' }}>{safeZones['header'] && <div className="pt-[var(--cv-page-margin)] px-[var(--cv-page-margin)] pb-0">{renderZone('header', 'w-full min-w-0')}</div>}<div className="px-[var(--cv-page-margin)] pt-[6mm] pb-0">{renderZone('main', 'w-full min-w-0')}</div><div className="flex flex-1 px-[var(--cv-page-margin)] pb-[var(--cv-page-margin)] pt-[2mm] gap-8"><div className="flex-1 min-w-0">{renderZone('left', 'h-full')}</div><div className="flex-1 min-w-0">{renderZone('right', 'h-full')}</div></div></div>;
            default: return <div>Layout not found</div>;
        }
    };

    return (
        <div className={`h-screen w-full flex font-sans overflow-hidden transition-colors duration-300 ${bgApp}`}>
            <FloatingToolbar targetNode={focusedNode} onSuggestPoint={handleSuggestPoint} />

            {/* LEFT VERTICAL TOOLBAR */}
            <div className={`w-20 border-r flex flex-col items-center py-6 gap-6 z-30 shrink-0 transition-colors ${bgNav}`}>
                <div className={`p-2.5 rounded-xl mb-4 ${brandGreenBg} shadow-lg`} title="CVCIRCLE Builder"><FileText size={24} /></div>

                <button onClick={() => setActiveSidebar(activeSidebar === 'design' ? null : 'design')} className={`p-3.5 rounded-2xl transition-all ${activeSidebar === 'design' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="Design & Layout"><Palette size={22} /></button>
                <button onClick={() => setIsTemplateModalOpen(true)} className={`p-3.5 rounded-2xl transition-all ${isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100'}`} title="Templates"><LayoutTemplate size={22} /></button>
                <button onClick={() => setActiveSidebar(activeSidebar === 'data' ? null : 'data')} className={`p-3.5 rounded-2xl transition-all ${activeSidebar === 'data' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="Raw Data JSON"><FileJson size={22} /></button>
                <button onClick={() => { setActiveSidebar(activeSidebar === 'ai' ? null : 'ai'); if (activeSidebar !== 'ai') runAIScan(); }} className={`p-3.5 rounded-2xl transition-all ${activeSidebar === 'ai' ? 'bg-emerald-500/20 ' + brandGreen : (isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100')}`} title="AI Review & Fixes"><Wand2 size={22} /></button>

                <div className="flex-1"></div>

                <button onClick={() => setTheme(isDarkUI ? 'light' : 'dark')} className={`p-3.5 rounded-2xl transition-all ${isDarkUI ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100'}`} title="Toggle Theme">
                    {isDarkUI ? <Sun size={22} /> : <Moon size={22} />}
                </button>
                <button onClick={() => window.print()} className={`p-3.5 rounded-2xl transition-all shadow-xl ${brandGreenBg} hover:scale-110 mt-2`} title="Save to PDF">
                    <Download size={22} />
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ACTIVE SIDEBAR PANEL (Drawer) */}
                {activeSidebar === 'design' && (
                    <div className={`w-[340px] border-r flex flex-col shadow-2xl z-20 shrink-0 transform transition-transform animate-slide-left ${bgPanel}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${bgNav}`}>
                            <h3 className={`font-bold flex items-center gap-2 text-lg ${textPrimary}`}><Palette size={20} className={brandGreen} /> Global Design</h3>
                            <button onClick={() => setActiveSidebar(null)} className={`${textMuted} hover:${textPrimary} transition-colors`}><X size={20} /></button>
                        </div>
                        <div className="p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${textMuted}`}>Typography Set</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Inter', 'Merriweather', 'Roboto Mono', 'Playfair Display'].map(f => (
                                        <button key={f} onClick={() => setDesign({ ...design, font: f })} className={`py-2 px-1 text-xs rounded border transition-colors ${design.font === f ? 'bg-emerald-500/20 border-emerald-500 ' + brandGreen : (isDarkUI ? 'bg-[#222] border-[#333] text-gray-300 hover:bg-[#333]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')}`} style={{ fontFamily: f }}>{f.split(' ')[0]}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest mb-3 flex justify-between ${textMuted}`}>
                                    <span>Base Font Size</span><span className={brandGreen}>{design.fontSize}px</span>
                                </label>
                                <input type="range" min="10" max="16" step="0.5" value={design.fontSize} onChange={(e) => setDesign({ ...design, fontSize: parseFloat(e.target.value) })} className="w-full accent-emerald-500" />
                            </div>
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest mb-3 flex justify-between ${textMuted}`}>
                                    <span>Line Spacing</span><span className={brandGreen}>{design.spacing.toFixed(1)}x</span>
                                </label>
                                <input type="range" min="0.5" max="2" step="0.1" value={design.spacing} onChange={(e) => setDesign({ ...design, spacing: parseFloat(e.target.value) })} className="w-full accent-emerald-500" />
                            </div>
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest mb-3 flex justify-between ${textMuted}`}>
                                    <span>Page Margin</span><span className={brandGreen}>{design.pageMargin}px</span>
                                </label>
                                <input type="range" min="0" max="80" step="1" value={design.pageMargin} onChange={(e) => setDesign({ ...design, pageMargin: parseInt(e.target.value) })} className="w-full accent-emerald-500" />
                            </div>
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${textMuted}`}>Accent Color</label>
                                <div className="flex gap-3 flex-wrap">
                                    {['#7EE787', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#1f2937', '#000000', '#ffffff'].map(c => (
                                        <button key={c} onClick={() => setDesign({ ...design, accentColor: c })} className={`w-8 h-8 rounded-full border-2 transition-transform ${design.accentColor === c ? 'border-white scale-125 shadow-[0_0_10px_rgba(126,231,135,0.5)]' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSidebar === 'data' && (
                    <div className={`w-[450px] border-r flex flex-col shadow-2xl z-20 shrink-0 transform transition-transform animate-slide-left ${bgPanel}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${bgNav}`}>
                            <h3 className={`font-bold flex items-center gap-2 text-lg ${textPrimary}`}><FileJson size={20} className={brandGreen} /> Raw JSON Data</h3>
                            <button onClick={() => setActiveSidebar(null)} className={`${textMuted} hover:${textPrimary} transition-colors`}><X size={20} /></button>
                        </div>
                        <textarea className={`flex-1 w-full p-6 text-sm font-mono outline-none resize-none custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a] text-emerald-400' : 'bg-gray-50 text-gray-800'}`} value={JSON.stringify(cvData, null, 2)} onChange={(e) => { try { setCvData(JSON.parse(e.target.value)); } catch (err) { } }} spellCheck={false} />
                    </div>
                )}

                {activeSidebar === 'ai' && (
                    <div className={`w-[400px] border-r flex flex-col shadow-2xl z-20 shrink-0 transform transition-transform animate-slide-left ${bgPanel}`}>
                        <div className={`p-6 border-b flex items-center justify-between ${bgNav}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-2 ${cvScore >= 80 ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-yellow-500/20 border-yellow-500 text-yellow-500'}`}>{cvScore}</div>
                                <div className="flex flex-col">
                                    <span className={`font-bold text-base tracking-widest uppercase ${textPrimary}`}>AI Review</span>
                                    <span className={`text-xs font-medium ${textMuted}`}>{aiIssues.length} optimizations found</span>
                                </div>
                            </div>
                            <button onClick={() => setActiveSidebar(null)} className={`${textMuted} hover:${textPrimary} transition-colors`}><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                            {scanning && (
                                <div className="text-center py-16 text-emerald-500 animate-pulse flex flex-col items-center">
                                    <Wand2 size={48} className="mb-4 opacity-80" />
                                    <span className="text-sm font-bold tracking-widest uppercase">Analyzing Document...</span>
                                </div>
                            )}
                            {!scanning && aiIssues.length === 0 && (
                                <div className={`text-center py-16 flex flex-col items-center ${textMuted}`}>
                                    <div className="text-6xl mb-4">✨</div>
                                    <p className="text-base font-medium">Your CV looks perfect! No issues found.</p>
                                </div>
                            )}
                            {!scanning && aiIssues.map(issue => (
                                <div key={issue.id} onMouseEnter={() => setActiveIssueId(issue.id)} onMouseLeave={() => setActiveIssueId(null)} className={`border rounded-xl p-5 transition-all ${activeIssueId === issue.id ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : (isDarkUI ? 'border-[#333] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50')}`}>
                                    <div className="flex items-start gap-2 mb-3">
                                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded flex shrink-0 ${issue.type === 'Grammar' ? 'bg-blue-500/20 text-blue-500' : issue.type === 'Impact' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-500'}`}>{issue.type}</span>
                                        <span className={`text-xs font-semibold mt-0.5 truncate ${textMuted}`}>{issue.path.split('.')[0].toUpperCase()}</span>
                                    </div>
                                    <p className={`text-sm mb-5 leading-relaxed font-medium ${textPrimary}`}>{issue.suggestion}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => applyAIFix(issue)} className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all shadow-lg ${brandGreenBg}`}>APPLY FIX</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MAIN CANVAS AREA */}
                <div className={`flex-1 overflow-auto relative py-10 flex justify-center custom-scrollbar transition-colors ${bgWorkspace}`}>
                    <div className={`fixed bottom-6 right-6 backdrop-blur px-4 py-2 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 z-40 animate-fade-in no-print ${isDarkUI ? 'bg-[#111]/80 border-[#333] text-white' : 'bg-white/80 border-gray-200 text-gray-800'}`}>
                        <Plus size={16} className={brandGreen} /> Click text to edit
                    </div>
                    <div key={templateAnimKey} className="transform origin-top transition-transform scale-90 lg:scale-100 xl:scale-110 animate-scale-up h-max pb-20">
                        <div className="cv-document-wrapper relative shadow-2xl" style={{ width: '210mm' }}>
                            <div className="cv-page-visualizer"></div>
                            {renderCanvasLayout()}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI CONTEXTUAL SUGGESTION POPUP */}
            {pointSuggestion && (
                <div className={`fixed z-50 border shadow-2xl rounded-xl p-5 w-[420px] animate-fade-in-up ${isDarkUI ? 'bg-[#1a1a1a] border-emerald-500/50' : 'bg-white border-emerald-500'}`} style={{ top: pointSuggestion.rect.top + 15, left: pointSuggestion.rect.left }}>
                    <div className={`flex items-center justify-between mb-3 ${brandGreen}`}>
                        <div className="flex items-center gap-2"><Wand2 size={16} /> <span className="text-xs font-bold uppercase tracking-widest">AI Contextual Suggestion</span></div>
                        <button onClick={() => setPointSuggestion(null)} className={`${textMuted} hover:${textPrimary} transition-colors`}><X size={16} /></button>
                    </div>
                    <p className={`text-sm mb-5 leading-relaxed ${textPrimary}`}>{pointSuggestion.text}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setPointSuggestion(null)} className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors ${btnSecondary}`}>Reject</button>
                        <button onClick={() => {
                            const currentHtml = getNestedValue(cvData, pointSuggestion.path) || '';
                            let newHtml = currentHtml;
                            if (newHtml.includes('</ul>')) { newHtml = newHtml.replace('</ul>', `<li>${pointSuggestion.text}</li></ul>`); }
                            else { newHtml += `<ul><li>${pointSuggestion.text}</li></ul>`; }
                            handleDataChange(pointSuggestion.path, newHtml);
                            setPointSuggestion(null);
                        }} className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors shadow-lg ${brandGreenBg}`}>Accept & Add Bullet</button>
                    </div>
                </div>
            )}

            {/* SINGLE-VIEW TEMPLATE MODAL */}
            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-[90vh] animate-slide-up border ${bgPanel}`}>
                        <div className={`p-6 border-b flex justify-between items-center shrink-0 ${bgNav}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg ${isDarkUI ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}><LayoutTemplate size={28} className="text-emerald-500" /></div>
                                <div><h3 className={`font-black text-2xl tracking-tight ${textPrimary}`}>Template Library</h3><p className={`text-sm mt-1 ${textMuted}`}>Select a foundation layout. All snippets can be fully customized inside.</p></div>
                            </div>
                            <button onClick={() => setIsTemplateModalOpen(false)} className={`p-2 rounded-full transition-colors ${btnSecondary}`}><X size={24} /></button>
                        </div>

                        <div className={`p-8 overflow-y-auto flex-1 custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
                            <div className="max-w-6xl mx-auto space-y-12">
                                {TEMPLATE_CATEGORIES.map(cat => {
                                    const catTemplates = TEMPLATES.filter(tpl => cat.types.includes(tpl.type));
                                    if (catTemplates.length === 0) return null;
                                    return (
                                        <div key={cat.id} className="relative">
                                            <div className={`sticky top-0 z-10 backdrop-blur-md py-4 mb-6 flex items-center gap-3 border-b ${isDarkUI ? 'border-[#222] bg-[#0a0a0a]/80 text-white' : 'border-gray-200 bg-gray-100/80 text-gray-900'}`}>
                                                <span className="text-emerald-500">{cat.icon}</span><h2 className="text-xl font-bold tracking-tight">{cat.name}</h2><span className={`text-sm font-medium ${textMuted}`}>— {cat.desc}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                                {catTemplates.map(tpl => {
                                                    const isActive = activeTemplate.id === tpl.id;
                                                    return (
                                                        <div key={tpl.id} onClick={() => loadTemplate(tpl)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-2xl ${bgPanel} ${isActive ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'hover:border-emerald-500/50 ' + (isDarkUI ? 'border-[#333]' : 'border-gray-200')}`}>
                                                            <div className={`p-3 border-b flex justify-between items-center z-10 shrink-0 ${bgNav}`}>
                                                                <div className={`font-bold text-sm tracking-wide ${textPrimary}`}>{tpl.name}</div>
                                                                {isActive && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-0.5 rounded font-bold tracking-wide uppercase">Active</span>}
                                                            </div>
                                                            <div className={`relative w-full flex justify-center items-center p-6 flex-1 overflow-hidden pointer-events-none ${isDarkUI ? 'bg-[#141414]' : 'bg-gray-50'}`}>
                                                                <div className="relative w-[200px] h-[283px] bg-white shadow-md overflow-hidden rounded-sm ring-1 ring-gray-300">
                                                                    <div className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left" style={{ transform: 'scale(0.2518)' }}>
                                                                        <StaticLayoutRenderer template={tpl} cvData={cvData} ReadOnlyWrapper={ReadOnlyWrapper} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REPLACE / ADD SNIPPET MODAL */}
            {replacingSnippet && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className={`rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up border ${isDarkUI ? 'bg-[#141414] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${isDarkUI ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                            <h3 className={`font-bold text-lg flex items-center gap-2 ${textPrimary}`}>
                                {replacingSnippet.isAdd ? <PlusCircle size={20} className="text-emerald-500" /> : <RefreshCw size={20} className="text-blue-500" />}
                                {replacingSnippet.isAdd ? `Add Snippet to Zone` : `Replace ${replacingSnippet.category}`}
                            </h3>
                            <button onClick={() => setReplacingSnippet(null)} className={`p-1.5 rounded-full transition-colors ${isDarkUI ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><X size={20} /></button>
                        </div>

                        {replacingSnippet.isAdd && (
                            <div className={`px-6 pt-5 pb-3 flex flex-wrap gap-2.5 border-b ${isDarkUI ? 'bg-[#141414] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                                {['All', 'Header', 'Summary', 'Experience', 'Education', 'Projects', 'Certifications', 'Awards', 'Skills', 'Languages', 'Interests', 'Publications', 'Volunteer', 'References', 'Sidebar'].map(cat => {
                                    if (replacingSnippet.isAdd && cat !== 'All') {
                                        const existingCategories = Object.values(zones).flat().map(z => SNIPPETS[z.type]?.category);
                                        if (existingCategories.includes(cat)) return null;
                                    }
                                    return (
                                        <button key={cat} onClick={() => setReplacingSnippet({ ...replacingSnippet, filterCategory: cat === 'All' ? null : cat })} className={`px-4 py-2 text-xs font-bold rounded-full uppercase tracking-wider transition-colors border ${replacingSnippet.filterCategory === cat || (!replacingSnippet.filterCategory && cat === 'All') ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' : (isDarkUI ? 'bg-[#222] text-gray-400 border-[#333] hover:bg-[#333]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}`}>{cat}</button>
                                    )
                                })}
                            </div>
                        )}

                        <div className={`p-6 overflow-y-auto flex-1 custom-scrollbar ${isDarkUI ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.values(SNIPPETS).filter(s => replacingSnippet.isAdd ? (!replacingSnippet.filterCategory || s.category === replacingSnippet.filterCategory) : s.category === replacingSnippet.category).map(snippet => {
                                    const targetZoneId = replacingSnippet.zoneId;
                                    const isTargetDark = activeTemplate.type.includes('dark') && targetZoneId === 'sidebar';
                                    const isSidebar = ['sidebar', 'left', 'right'].includes(targetZoneId);
                                    const styleKey = isSidebar && activeTemplate.sidebarTitleStyle ? activeTemplate.sidebarTitleStyle : activeTemplate.titleStyle;
                                    const TitleRenderer = TITLE_STYLES[styleKey] || TITLE_STYLES['standard'];
                                    return (
                                        <div key={snippet.id} onClick={() => executeReplaceOrAdd(snippet.id)} className={`group relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-xl ${isDarkUI ? 'bg-[#222]' : 'bg-white'} ${snippet.id === replacingSnippet.currentType ? 'border-emerald-500 ring-2 ring-emerald-500/20' : (isDarkUI ? 'border-[#333] hover:border-emerald-500/50' : 'border-gray-200 hover:border-emerald-500/50')}`}>
                                            <div className={`p-3 border-b flex justify-between items-center z-10 ${isDarkUI ? 'bg-[#111] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                                                <div><div className={`font-semibold text-sm ${textPrimary}`}>{snippet.name}</div><div className={`text-[10px] uppercase tracking-wider mt-0.5 ${textMuted}`}>{snippet.category}</div></div>
                                                {snippet.id === replacingSnippet.currentType && <span className="bg-emerald-500/20 text-emerald-500 text-xs px-2 py-1 rounded font-bold tracking-wide">CURRENT</span>}
                                            </div>
                                            <div className={`relative h-48 w-full bg-white overflow-hidden flex items-start justify-center`}>
                                                <div className="absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none px-8 py-6 opacity-90 group-hover:opacity-100 transition-opacity">
                                                    <snippet.render data={cvData} Editable={ReadOnlyWrapper} zoneId={targetZoneId} isDark={isTargetDark} Title={({ titleKey }) => <TitleRenderer isDark={isTargetDark}><ReadOnlyWrapper path={`sectionTitles.${titleKey}`} nowrap /></TitleRenderer>} moveEntry={() => { }} deleteEntry={() => { }} />
                                                </div>
                                                {isTargetDark && <div className="absolute inset-0 bg-slate-800 -z-10 mix-blend-multiply opacity-5"></div>}
                                            </div>
                                            <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-20">
                                                <div className="bg-emerald-600 text-white font-bold tracking-widest uppercase py-2 px-6 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                                                    {replacingSnippet.isAdd ? 'Select' : 'Replace'}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,800;1,400&family=Roboto+Mono:wght@400;600&display=swap');

        :root {
          --cv-font: ${design.font};
          --cv-base-size: ${design.fontSize}px;
          --cv-spacing: ${design.spacing};
          --cv-accent: ${design.accentColor};
          --cv-page-margin: ${design.pageMargin}px;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkUI ? '#444' : '#ccc'}; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkUI ? '#555' : '#aaa'}; }
        
        .cv-document { font-family: var(--cv-font), sans-serif; color: #1f2937; font-size: var(--cv-base-size); }
        .cv-name { font-size: calc(var(--cv-base-size) * 2.5); line-height: 1.1; }
        .cv-name-narrow { font-size: calc(var(--cv-base-size) * 2.0); line-height: 1.1; }
        .cv-role { font-size: calc(var(--cv-base-size) * 1.15); }
        .cv-heading { font-size: calc(var(--cv-base-size) * 1.1); }
        .cv-title { font-size: calc(var(--cv-base-size) * 1.05); }
        .cv-subtitle { font-size: calc(var(--cv-base-size) * 0.95); }
        .cv-date { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-contact { font-size: calc(var(--cv-base-size) * 0.85); }
        .cv-body { font-size: inherit; line-height: calc(1.6 * var(--cv-spacing)); }
        
        .cv-document p, .cv-document ul, .cv-document li { font-size: inherit !important; line-height: inherit !important; margin: 0; padding: 0; }
        .cv-prose p { margin-bottom: calc(0.3em * var(--cv-spacing)) !important; }
        .cv-prose ul { list-style-type: disc; padding-left: 1.2em; margin-top: calc(0.25em * var(--cv-spacing)) !important; margin-bottom: calc(0.25em * var(--cv-spacing)) !important; }
        .cv-prose li { margin-bottom: calc(0.15em * var(--cv-spacing)) !important; }

        [contenteditable]:empty:before { content: attr(placeholder); color: #9ca3af; pointer-events: none; display: block; }
        
        .cv-accent-text { color: var(--cv-accent) !important; }
        .cv-accent-bg { background-color: var(--cv-accent) !important; }
        .cv-accent-border { border-color: var(--cv-accent) !important; }

        .cv-document .cv-gap-sm { gap: calc(0.5rem * var(--cv-spacing)) !important; }
        .cv-document .cv-gap-md { gap: calc(0.75rem * var(--cv-spacing)) !important; }
        .cv-document .cv-gap-lg { gap: calc(1rem * var(--cv-spacing)) !important; }

        .cv-page-visualizer {
          position: absolute; inset: 0; pointer-events: none; z-index: 30;
          background-image: repeating-linear-gradient(to bottom, transparent, transparent calc(297mm - 12px), ${isDarkUI ? '#2a2b2e' : '#e5e7eb'} calc(297mm - 12px), ${isDarkUI ? '#2a2b2e' : '#e5e7eb'} calc(297mm + 12px));
        }
        
        @media print {
          @page { margin: var(--cv-page-margin); size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .cv-document-wrapper { transform: none !important; padding: 0 !important; background: transparent !important; box-shadow: none !important; margin: 0 !important; overflow: visible !important; }
          .cv-document { width: 100% !important; min-height: auto !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; display: block !important; }
          .cv-section { break-inside: auto !important; page-break-inside: auto !important; display: block !important; width: 100% !important; }
          .cv-item { break-inside: avoid !important; page-break-inside: avoid !important; break-after: auto !important; display: block !important; width: 100% !important; }
          .cv-keep-with-next { break-inside: avoid !important; page-break-inside: avoid !important; break-after: avoid !important; page-break-after: avoid !important; display: block !important; width: 100% !important; }
          .cv-item-avoid { break-inside: avoid !important; page-break-inside: avoid !important; display: block !important; }
          .cv-prose p { orphans: 3; widows: 3; }
          .cv-prose li { break-inside: avoid !important; page-break-inside: avoid !important; display: list-item !important; }
          h1, h2, h3, h4, h5, h6 { break-after: avoid !important; page-break-after: avoid !important; break-inside: avoid !important; }
          .cv-page-visualizer { display: none !important; }
        }

        @keyframes fadeInUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-fade-in-up { animation: fadeInUp 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes scaleUp { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-left { animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes snippetEntrance { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .snippet-anim { animation: snippetEntrance 0.4s ease-out forwards; }
      `}} />
        </div>
    );
}