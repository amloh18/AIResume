'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const faqData: FAQItem[] = [
    {
      id: 1,
      question: "Can I change my plan after I've purchased it?",
      answer: "Absolutely. You can upgrade from a Monthly to a Quarterly or Lifetime plan at any time. We will prorate the cost so you only pay the difference. If you wish to downgrade, your change will take effect at the end of your current billing cycle."
    },
    {
      id: 2,
      question: "What is the real difference between the Basic and Pro ATS check?",
      answer: "Think of it this way: The Basic ATS Check ensures your CV has the correct formatting and structure to be readable by automated systems—it's about passing the first gate. The Pro ATS Optimisation is a strategic analysis that suggests keywords and phrasing to help your CV rank higher and get noticed by recruiters for specific roles. It's the difference between being compliant and being competitive."
    },
    {
      id: 3,
      question: "Are the Pro plans a one-time payment or a subscription?",
      answer: "The Daily Pass and Lifetime plan are one-time charges. The Pro Monthly and Quarterly plans are subscriptions that automatically renew to ensure your service is uninterrupted. You can easily cancel the auto-renewal at any time from your account settings, no questions asked."
    },
    {
      id: 4,
      question: "What happens to my CVs and documents if my plan ends or I cancel?",
      answer: "Your work is always yours. After your plan expires, you will still have access to view and download all the documents you created. You will revert to the Essential (Free) plan, meaning you won't be able to create new documents beyond the free limit or use Pro features until you subscribe again."
    },
    {
      id: 5,
      question: "Which plan is the right choice for me?",
      answer: "Choose Essential if you're targeting one specific role or just want to try our platform. Choose the Daily Pass for a short, intense burst of applications, like for a career fair or urgent openings. Choose Pro Monthly if you are in an active, dedicated job search right now. Choose Pro Quarterly or Lifetime if you are in a strategic, long-term search (common for senior roles) and want the absolute best value and access to future features."
    },
    {
      id: 6,
      question: "What kind of 'Future Pro Add-ons' are included with the Quarterly and Lifetime plans?",
      answer: "As we develop new premium tools to help you succeed, you get them automatically at no extra cost. This could include things like AI-powered interview practice modules, advanced portfolio builders, or enhanced career analytics to give you a continuous edge in the market."
    },
    {
      id: 7,
      question: "What payment methods do you accept?",
      answer: "We accept all major international Credit and Debit Cards, UPI (including Google Pay, PhonePe, etc.), and Net Banking from all major Bank worldwide. Our payment gateway Polar.sh is secure and encrypted."
    },
    {
      id: 8,
      question: "Is there a refund policy?",
      answer: "We are confident in the value our tools provide. For our Pro Quarterly/Pro Lifetime plan, we offer a 7-day money-back guarantee with terms (link). Due to their short-term nature, the Daily Pass and Pro Monthly are non-refundable."
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
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section id="faq" className="relative pt-32 pb-32 bg-[#141810] overflow-hidden">
      {/* Background Effects - Subtle dark glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#81ff00]/3 rounded-full blur-[150px]"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-2xl tablet:text-2xl desktop:text-4xl font-bold text-white text-center mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xs tablet:text-sm desktop:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed font-light">
            Everything you need to know about our plans, features, and policies. Can't find what you're looking for?
            <span className="text-lime-400 font-medium"> Contact our support team</span>.
          </p>
        </motion.div>


        {/* FAQ Accordion */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {faqData.map((item) => {
            const isOpen = openItems.includes(item.id);

            return (
              <div
                key={item.id}
                className="group"
              >
                <div
                  className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:border-lime-400/30 hover:shadow-lg hover:shadow-lime-400/10"
                >
                  {/* Glow Effect */}
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-lime-400/5 to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ filter: 'blur(20px)' }}
                  />

                  {/* Question Button */}
                  <button
                    className="w-full px-8 py-6 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-2 focus:ring-offset-gray-900 hover:bg-white/5 transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleItem(item.id);
                    }}
                  >
                    <h3 className="text-sm tablet:text-base desktop:text-lg font-semibold text-white pr-4 group-hover:text-lime-400 transition-colors duration-300">
                      {item.question}
                    </h3>
                    <div
                      className={`flex-shrink-0 w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ${isOpen ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                        }`}
                    >
                      <ChevronDown size={16} className="text-white" />
                    </div>
                  </button>

                  {/* Answer Content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                  >
                    <div className="px-8 pb-6">
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-white/80 leading-relaxed text-xs tablet:text-sm font-light">
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
          className="text-center mt-16"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="text-white/60 mb-6 text-xs tablet:text-sm desktop:text-base">Still have questions?</p>
          <motion.button
            className="group text-lime-400 hover:text-lime-300 font-semibold transition-colors duration-300 flex items-center gap-2 mx-auto"
            whileHover={{ x: 5 }}
          >
            <span>Contact our support team</span>
            <motion.div
              whileHover={{ rotate: 45 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown size={16} className="rotate-[-90deg]" />
            </motion.div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;
