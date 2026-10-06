'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ = () => {
  const [openItems, setOpenItems] = useState<number[]>([1]);

  const faqData: FAQItem[] = [
    {
      id: 1,
      question: "What is AIResume and how does it help me get hired?",
      answer: "AIResume is an all-in-one AI career workspace designed to help you land interviews faster. It builds ATS-optimized resumes from scratch or improves existing ones, generates tailored cover letters matching job descriptions, simulates interview prep, and tracks all your job applications in a single Kanban dashboard."
    },
    {
      id: 2,
      question: "How does the real-time ATS scoring & keyword optimization work?",
      answer: "When you paste a target job description, our engine analyzes essential hard and soft skills, industry keywords, and ATS parsing criteria. It gives you a real-time match score and precise, actionable bullet point recommendations so your resume consistently beats automated filters and ranks at the top of recruiter pipelines."
    },
    {
      id: 3,
      question: "Can I start from scratch or upload my existing resume?",
      answer: "Both! You can upload an existing PDF or DOCX file for instant AI restructuring and keyword enhancement, or build a brand-new resume step-by-step using our Mori AI Career Assistant with industry-tested, ATS-compliant templates."
    },
    {
      id: 4,
      question: "How do the Application Tracker and Auto Applications work?",
      answer: "The Application Tracker organizes every job in an intuitive Kanban pipeline from 'Saved' to 'Interviewing' and 'Offer'. With Auto Applications, our system automatically tailors your CV and cover letter for each specific role and streamlines submissions, saving you dozens of repetitive hours."
    },
    {
      id: 5,
      question: "What is the difference between the Starter and Focused plans?",
      answer: "The Starter plan ($0 for monthly with limited usage, or $2/mo yearly) gives you core studio editing, standard templates, live ATS scoring, and 10 tracked applications. The Focused plan ($9.99/mo or $7/mo billed yearly) unlocks unlimited AI usage, automated applications, the LinkedIn Profile Enhancer, Interview Prep, and 24/7 priority support."
    },
    {
      id: 6,
      question: "What happens to my documents if I cancel or change my plan?",
      answer: "Your documents are always 100% yours. If you downgrade or cancel your subscription, you retain full access to view, edit, and download all previously created resumes and cover letters as PDF and DOCX files without any watermarks or restrictions."
    },
    {
      id: 7,
      question: "What payment methods and currencies do you support?",
      answer: "We support all major international Credit and Debit Cards (Visa, Mastercard, AMEX), UPI, and regional payment methods via secure SSL-encrypted processing. Prices in non-USD currencies are calculated with live exchange rates with no hidden fees."
    }
  ];

  const toggleItem = (id: number) => {
    setOpenItems(prev => {
      const newItems = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id];
      return newItems;
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  return (
    <section id="faq" className="relative py-28 bg-[#0a0a0c] overflow-hidden">
      {/* Background Ambient Glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 20%, rgba(1, 63, 46, 0.2) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 80% 60%, rgba(20, 184, 166, 0.08) 0%, transparent 65%),
            linear-gradient(180deg, #0e1013 0%, #0a0a0c 50%, #060708 100%)
          `,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* Section Header */}
        <motion.div
          className="text-left mb-14"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          {/* Decorative squiggle */}
          <motion.div
            className="mb-6 flex justify-start"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
              <path
                d="M2 12C6 6 10 18 14 12C18 6 22 18 26 12C30 6 34 18 38 12C42 6 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
          <h2 className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] text-left tracking-tighter mb-4 text-4xl! tracking-normal!">
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">
              Questions
            </span>
          </h2>
          <p className="text-sm tablet:text-base text-gray-400 max-w-3xl leading-relaxed font-light text-left">
            Everything you need to know about our plans, ATS tools, and auto application features.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          className="space-y-3.5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {faqData.map((item) => {
            const isOpen = openItems.includes(item.id);

            return (
              <div key={item.id} className="group">
                <div
                  className={`relative backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isOpen
                      ? 'bg-[#111317]/90 border-emerald-500/30 shadow-[0_4px_20px_rgba(1,63,46,0.2)]'
                      : 'bg-white/[0.02] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Question Button */}
                  <button
                    className="w-full px-6 py-5 text-left flex items-center justify-between focus:outline-none transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleItem(item.id);
                    }}
                  >
                    <h3
                      className={`text-sm tablet:text-base font-semibold pr-4 transition-colors duration-300 ${
                        isOpen ? 'text-white' : 'text-gray-200 group-hover:text-white'
                      }`}
                    >
                      {item.question}
                    </h3>
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                        isOpen
                          ? 'bg-[#36D39B] text-white border-[#36D39B] rotate-180 scale-105 shadow-[0_0_12px_rgba(54,211,155,0.4)]'
                          : 'bg-emerald-500/10 text-[#36D39B] border-emerald-500/25 rotate-0 scale-100 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/40'
                      }`}
                    >
                      <ChevronDown size={16} strokeWidth={2.5} className="transition-colors" />
                    </div>
                  </button>

                  {/* Answer Content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-5 pt-1">
                      <div className="border-t border-white/[0.06] pt-3.5">
                        <p className="text-gray-300/90 leading-relaxed text-xs tablet:text-sm font-normal">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <p className="text-gray-400 mb-3 text-xs">Still have questions?</p>
          <motion.a
            href="mailto:support@buildairesume.com?subject=FAQ%20Support%20Inquiry"
            className="group text-[#36D39B] hover:text-emerald-300 font-semibold transition-colors duration-300 inline-flex items-center gap-2 text-xs"
            whileHover={{ x: 3 }}
          >
            <span>Contact our support team</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
