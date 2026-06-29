'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Send, Mail, CreditCard, HelpCircle, Copy, Check, ExternalLink, Star } from 'lucide-react';

interface Message {
  id: string;
  sender: 'mori' | 'user';
  text: string;
  smartCard?: 'plans' | 'invoices' | 'contact' | 'cancel_solutions' | 'billing_solution' | 'tech_solution' | 'general_solution' | 'feedback_card';
  department?: 'finance' | 'help' | 'support' | 'hello' | 'feedback';
  timestamp: Date;
}

export default function MoriAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [cancelLayer, setCancelLayer] = useState(0); // 0 = none, 1-4 for cancellation flow layers
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  
  // Rating states inside chat panel
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load active state from localStorage on mount and listen to trigger event
  useEffect(() => {
    const active = localStorage.getItem('mori_assistant_active') === 'true';
    setIsOpen(active);

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const active = typeof detail === 'boolean' ? detail : !!detail?.active;
      setIsOpen(active);
      
      if (active) {
        setIsMinimized(false);
      }
    };

    window.addEventListener('mori-assistant-toggle', handleToggle);
    return () => {
      window.removeEventListener('mori-assistant-toggle', handleToggle);
    };
  }, []);

  // Initialize messages if list is empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'mori',
          text: "Hello! I am Mori, your virtual assistant. How can I help you today? Please select one of the topics below so I can guide you to a solution.",
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isMinimized]);

  const handleClose = () => {
    localStorage.setItem('mori_assistant_active', 'false');
    setIsOpen(false);
    setCancelLayer(0);
    window.dispatchEvent(new CustomEvent('mori-assistant-toggle', { detail: false }));
  };

  const addMoriMessage = (text: string, smartCard?: Message['smartCard'], department?: Message['department']) => {
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'mori',
          text,
          smartCard,
          department,
          timestamp: new Date()
        }
      ]);
    }, 600);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const getEmailDetails = (dept: 'finance' | 'help' | 'support' | 'hello' | 'feedback') => {
    const details = {
      finance: {
        email: 'finance@cvcircle.io',
        name: 'Billing & Finance',
        subject: 'Billing and Invoice Query',
        body: 'Hello Finance Team,\n\nI have a question regarding my subscription/invoices. [Provide details here].\n\nThank you.'
      },
      help: {
        email: 'help@cvcircle.io',
        name: 'Technical Support',
        subject: 'Technical Assistance Request',
        body: 'Hello Support Team,\n\nI am experiencing a technical issue with [describe feature or issue].\n\nThank you.'
      },
      support: {
        email: 'support@cvcircle.io',
        name: 'Customer Support',
        subject: 'Customer Assistance Query',
        body: 'Hello CVCircle Team,\n\nI need assistance with my account. [Describe your query].\n\nThank you.'
      },
      hello: {
        email: 'hello@cvcircle.io',
        name: 'General Inquiries',
        subject: 'General Inquiry / Partnership',
        body: 'Hello CVCircle Team,\n\nI would like to query about [general topic].\n\nThank you.'
      },
      feedback: {
        email: 'feedback@cvcircle.io',
        name: 'Feedback & Testimonial Support',
        subject: `CVCircle User Testimonial: ${rating}-Star Rating`,
        body: `Dear CVCircle Team,\n\nHere is my rating and testimonial for my experience using the platform:\n\nRating: ${rating} / 5 Stars\nComment: ${feedbackComment || 'No additional comments.'}\n\nThank you!`
      }
    };
    return details[dept];
  };

  const handleOptionSelect = (option: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text: option,
        timestamp: new Date()
      }
    ]);

    if (option.includes('Plan') || option.toLowerCase().includes('pricing')) {
      setCancelLayer(0);
      addMoriMessage(
        "Here is a summary of our premium subscription plans. Note that you can manage or upgrade your active plans inside your settings dashboard.",
        'plans'
      );
    } else if (option.includes('Invoice') || option.toLowerCase().includes('receipt')) {
      setCancelLayer(0);
      addMoriMessage(
        "Almost all invoice issues can be resolved directly by downloading them from settings. Here are the step-by-step instructions:",
        'invoices'
      );
    } else if (option.includes('Contact') || option.toLowerCase().includes('support') || option.toLowerCase().includes('email')) {
      setCancelLayer(0);
      addMoriMessage(
        "What specific issue are you experiencing? I'd like to help you resolve it directly before routing you to an email inbox.",
        'general_solution'
      );
    } else if (option.includes('Cancel') || option.toLowerCase().includes('delete') || option.toLowerCase().includes('downgrade')) {
      setCancelLayer(1);
      addMoriMessage(
        "We are truly sorry to see you go! Let us know why you are considering cancelling.",
        'cancel_solutions'
      );
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text: userText,
        timestamp: new Date()
      }
    ]);
    setInputValue('');

    const lowerText = userText.toLowerCase();

    if (lowerText.includes('cancel') || lowerText.includes('delete') || lowerText.includes('downgrade')) {
      setCancelLayer(1);
      addMoriMessage(
        "We are truly sorry to see you go! Let us know why you are considering cancelling.",
        'cancel_solutions'
      );
    } else if (lowerText.includes('thank') || lowerText.includes('thanks') || lowerText.includes('solved') || lowerText.includes('perfect') || lowerText.includes('great')) {
      setCancelLayer(0);
      addMoriMessage(
        "I'm so glad we could resolve that for you! If you have a quick moment, we would love to receive a rating and review regarding your experience.",
        'feedback_card'
      );
    } else if (lowerText.includes('plan') || lowerText.includes('pricing') || lowerText.includes('cost')) {
      setCancelLayer(0);
      addMoriMessage("Here are details of our premium plans:", 'plans');
    } else if (lowerText.includes('invoice') || lowerText.includes('receipt') || lowerText.includes('download')) {
      setCancelLayer(0);
      addMoriMessage("Instructions to download your receipts/invoices:", 'invoices');
    } else if (lowerText.includes('refund') || lowerText.includes('billing') || lowerText.includes('charge')) {
      setCancelLayer(0);
      addMoriMessage(
        "For billing issues: subscriptions renew automatically. If you cancelled, no future charges will occur. If you still have questions or need a refund, we can escalate.",
        'billing_solution'
      );
    } else if (lowerText.includes('bug') || lowerText.includes('error') || lowerText.includes('technical') || lowerText.includes('broken') || lowerText.includes('upload') || lowerText.includes('parse')) {
      setCancelLayer(0);
      addMoriMessage(
        "Most upload and parsing errors are solved by converting files to standard PDF or DOCX (max 10MB) and avoiding nested layout tables. Try clearing your browser cache as well.",
        'tech_solution'
      );
    } else {
      setCancelLayer(0);
      addMoriMessage(
        "Let me know if this is related to billing, technical errors, or generic account settings so I can help you solve it directly.",
        'general_solution'
      );
    }
  };

  const handleCancelSolutionSelect = (reason: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text: `Reason: ${reason}`,
        timestamp: new Date()
      }
    ]);

    if (reason === 'Too Expensive') {
      setCancelLayer(2);
      addMoriMessage(
        "We understand billing concerns. We offer a permanent Free Tier that preserves all your data. Alternatively, contact Finance to see if you qualify for promotional discount plans.",
        'cancel_solutions'
      );
    } else if (reason === 'Technical Issues') {
      setCancelLayer(2);
      addMoriMessage(
        "Most technical issues are quickly resolved by our engineers. Would you like to reach our Tech Support desk directly?",
        'cancel_solutions'
      );
    } else {
      setCancelLayer(3);
      addMoriMessage(
        "To ensure you don't lose access to premium templates, we recommend switching to the Free Tier instead of full deletion. Would you prefer this?",
        'cancel_solutions'
      );
    }
  };

  const handleCancelFlowStep = (action: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text: action,
        timestamp: new Date()
      }
    ]);

    if (action === 'Downgrade to Free' || action === 'Keep Free Tier') {
      setCancelLayer(0);
      addMoriMessage(
        "Excellent choice! Your subscription will transition to the Free Tier at the end of the billing period. We'd love to hear your feedback on CVCircle to help us improve.",
        'feedback_card'
      );
    } else if (action === 'Contact Finance') {
      setCancelLayer(0);
      addMoriMessage("Contact our finance desk using the one-click template below:", 'contact', 'finance');
    } else if (action === 'Contact Tech Support') {
      setCancelLayer(0);
      addMoriMessage("Contact our help desk using the one-click template below:", 'contact', 'help');
    } else if (action === 'Proceed to Cancel' || action === 'Still Cancel') {
      if (cancelLayer === 2) {
        setCancelLayer(3);
        addMoriMessage(
          "Got it. Note that deleting your account deletes all your saved career logs permanently. Would you prefer to simply downgrade and keep your data?",
          'cancel_solutions'
        );
      } else {
        setCancelLayer(4);
        addMoriMessage(
          "Understood. To finalize: \n1. Click 'Cancel' under your active plan card in settings or email finance@cvcircle.io. \n2. For deletion: click 'Delete Account' at the bottom of the Account settings panel."
        );
      }
    }
  };

  const handleEscalateToEmail = (dept: 'finance' | 'help' | 'support' | 'feedback') => {
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text: dept === 'feedback' ? "I'd like to share feedback" : "I still need to send an email",
        timestamp: new Date()
      }
    ]);
    addMoriMessage(
      dept === 'feedback' ? "Thank you! Click below to send your testimonial." : "Escalating to email. Here is the department-specific compose card:", 
      'contact', 
      dept
    );
  };

  const handleSelectRating = (selected: number) => {
    setRating(selected);
  };

  const handleSubmitFeedback = () => {
    const deptDetails = getEmailDetails('feedback');
    const mailtoUrl = `mailto:${deptDetails.email}?subject=${encodeURIComponent(deptDetails.subject)}&body=${encodeURIComponent(deptDetails.body)}`;
    window.location.href = mailtoUrl;

    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: 'user',
        text: `Submitted rating: ${rating} Stars`,
        timestamp: new Date()
      }
    ]);
    
    addMoriMessage("Thank you so much for your feedback! Your review has been prepared in your email client to send to our feedback inbox.");
    setRating(0);
    setFeedbackComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col font-sans">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 bg-slate-955 hover:bg-slate-900 border border-slate-800 rounded-full overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105"
          title="Open Mori Assistant"
        >
          <img
            src="/images/favicon.png"
            alt="Mori"
            className="w-10 h-10 object-cover"
          />
        </button>
      ) : (
        <div className="w-[360px] sm:w-[400px] h-[650px] bg-white dark:bg-[#12161a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
          
          {/* Header */}
          <div className="p-4 bg-slate-950 text-white flex items-center justify-between shrink-0 shadow-md border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src="/images/favicon.png"
                  alt="Mori"
                  className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-lime-500 border-2 border-slate-950 rounded-full animate-pulse"></span>
              </div>
              <div>
                <h4 className="font-bold text-xs tracking-wide">Mori Assistant</h4>
                <p className="text-[9px] text-gray-400">Billing & Account Support</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 dark:bg-slate-800 text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#1d232a] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.text.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}

                  {/* Inline Initial Chips inside the Welcome Message */}
                  {msg.id === 'welcome' && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-850">
                      {['Understand Plans', 'Invoice Question', 'Contact Support', 'Cancel Account'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleOptionSelect(opt)}
                          className="px-2.5 py-1 text-[10px] border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full font-semibold transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Smart Cards */}
                {msg.sender === 'mori' && msg.smartCard && (
                  <div className="w-full mt-2">
                    {msg.smartCard === 'plans' && (
                      <div className="bg-white dark:bg-[#1d232a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm space-y-2.5">
                        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                          <CreditCard className="w-4 h-4 text-lime-500" />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Subscription Plans</span>
                        </div>
                        <div className="space-y-2">
                          <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex justify-between font-bold text-xs text-gray-800 dark:text-gray-200">
                              <span>Focused Plan</span>
                              <span className="text-lime-600 dark:text-lime-400">$9.99/mo</span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Perfect for resume editing, ATS optimization, and cover letter builder.</p>
                          </div>
                          <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex justify-between font-bold text-xs text-gray-800 dark:text-gray-200">
                              <span>Smart Quarterly</span>
                              <span className="text-lime-600 dark:text-lime-400">$59.99/3months</span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Includes AI coaching, LinkedIn enhancer, and bot auto-submittals.</p>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => handleEscalateToEmail('finance')}
                            className="w-full text-center text-[10px] text-gray-500 hover:text-lime-600 transition-colors font-medium"
                          >
                            Have a custom billing plan inquiry? Email Finance
                          </button>
                        </div>
                      </div>
                    )}

                    {msg.smartCard === 'invoices' && (
                      <div className="bg-white dark:bg-[#1d232a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm space-y-2.5">
                        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                          <HelpCircle className="w-4 h-4 text-lime-500" />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Invoice Help</span>
                        </div>
                        <ul className="text-[11px] text-gray-600 dark:text-gray-300 space-y-1.5 list-disc pl-4">
                          <li>Navigate to settings page billing tab.</li>
                          <li>Locate the <strong>Payment History</strong> table.</li>
                          <li>Click the download icon in the right column of your invoice.</li>
                          <li>A beautifully generated PDF receipt from Morigrid Labs will download.</li>
                        </ul>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => handleEscalateToEmail('finance')}
                            className="w-full text-center text-[10px] text-gray-500 hover:text-lime-600 transition-colors font-medium"
                          >
                            Receipt not showing up? Email Finance
                          </button>
                        </div>
                      </div>
                    )}

                    {msg.smartCard === 'billing_solution' && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <button
                          onClick={() => handleOptionSelect('Invoice Question')}
                          className="w-full p-2 border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1d232a] text-left text-[11px] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors"
                        >
                          How do I download my invoice?
                        </button>
                        <button
                          onClick={() => handleEscalateToEmail('finance')}
                          className="w-full p-2 bg-slate-900 dark:bg-slate-800 text-white text-center text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Issue unresolved. Email Finance Department
                        </button>
                      </div>
                    )}

                    {msg.smartCard === 'tech_solution' && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <button
                          onClick={() => handleEscalateToEmail('help')}
                          className="w-full p-2 bg-slate-900 dark:bg-slate-800 text-white text-center text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Still not working. Email Tech Support
                        </button>
                      </div>
                    )}

                    {msg.smartCard === 'general_solution' && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <button
                          onClick={() => handleOptionSelect('Understand Plans')}
                          className="w-full p-2 border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1d232a] text-left text-[11px] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-slate-50 transition-colors"
                        >
                          Explain subscription pricing & plans
                        </button>
                        <button
                          onClick={() => handleEscalateToEmail('support')}
                          className="w-full p-2 bg-slate-900 dark:bg-slate-800 text-white text-center text-[11px] font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Connect with Support Email
                        </button>
                      </div>
                    )}

                    {msg.smartCard === 'feedback_card' && (
                      <div className="bg-white dark:bg-[#1d232a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                          <Star className="w-4 h-4 text-lime-500 fill-lime-500" />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Rate Your Experience</span>
                        </div>
                        
                        {rating === 0 ? (
                          <div className="space-y-3">
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">How would you rate the assistance you received today?</p>
                            <div className="flex items-center justify-center gap-2 py-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => handleSelectRating(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(0)}
                                  className="p-1 transition-transform transform hover:scale-125"
                                >
                                  <Star
                                    className={`w-6 h-6 ${
                                      star <= (hoverRating || rating)
                                        ? 'text-lime-500 fill-lime-500'
                                        : 'text-gray-300 dark:text-gray-700'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg justify-center border border-gray-100 dark:border-gray-850">
                              <span className="text-[11px] text-gray-500">Your Rating:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3.5 h-3.5 ${
                                      star <= rating
                                        ? 'text-lime-500 fill-lime-500'
                                        : 'text-gray-300 dark:text-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>

                            <textarea
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              placeholder="Write a brief testimonial... (optional)"
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-800 resize-none h-16 text-gray-850 dark:text-white"
                            />

                            <button
                              onClick={handleSubmitFeedback}
                              className="w-full py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-center text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
                            >
                              Submit Testimonial to feedback@cvcircle.io
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.smartCard === 'contact' && msg.department && (() => {
                      const deptDetails = getEmailDetails(msg.department);
                      const mailtoUrl = `mailto:${deptDetails.email}?subject=${encodeURIComponent(deptDetails.subject)}&body=${encodeURIComponent(deptDetails.body)}`;
                      return (
                        <div className="bg-white dark:bg-[#1d232a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 shadow-sm space-y-3">
                          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                            <Mail className="w-4 h-4 text-lime-500" />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Contact {deptDetails.name}
                            </span>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg space-y-1 text-[11px] border border-gray-100 dark:border-gray-800/80">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 font-semibold">Email:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-gray-800 dark:text-gray-300 select-all">{deptDetails.email}</span>
                                <button
                                  onClick={() => handleCopyEmail(deptDetails.email)}
                                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 transition-colors"
                                  title="Copy Email"
                                >
                                  {copiedEmail === deptDetails.email ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500 font-semibold">Subject:</span>
                              <p className="text-gray-700 dark:text-gray-300 italic">{deptDetails.subject}</p>
                            </div>
                          </div>

                          <a
                            href={mailtoUrl}
                            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-lime-500 dark:hover:bg-lime-600 text-white dark:text-slate-950 font-semibold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Compose Email Template
                          </a>
                        </div>
                      );
                    })()}

                    {msg.smartCard === 'cancel_solutions' && (
                      <div className="space-y-1.5 mt-2">
                        {cancelLayer === 1 && (
                          <div className="grid grid-cols-2 gap-2">
                            {['Too Expensive', 'Technical Issues', 'Other'].map(reason => (
                              <button
                                key={reason}
                                onClick={() => handleCancelSolutionSelect(reason)}
                                className="p-2 border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1d232a] hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold rounded-lg text-gray-700 dark:text-gray-300 transition-colors text-center"
                              >
                                {reason}
                              </button>
                            ))}
                          </div>
                        )}

                        {cancelLayer === 2 && (
                          <div className="flex flex-col gap-2">
                            {messages[messages.length - 2]?.text?.includes('Expensive') ? (
                              <>
                                <button
                                  onClick={() => handleCancelFlowStep('Downgrade to Free')}
                                  className="w-full p-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-[11px] font-semibold rounded-lg transition-colors text-center"
                                >
                                  Downgrade to Free Tier ($0/mo)
                                </button>
                                <button
                                  onClick={() => handleCancelFlowStep('Contact Finance')}
                                  className="w-full p-2 border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#1d232a] hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold rounded-lg text-gray-700 dark:text-gray-300 transition-colors text-center animate-pulse"
                                >
                                  Connect to Finance for Discounts
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCancelFlowStep('Contact Tech Support')}
                                className="w-full p-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-[11px] font-semibold rounded-lg transition-colors text-center"
                              >
                                Email Tech Support (help@cvcircle.io)
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelFlowStep('Proceed to Cancel')}
                              className="w-full p-1.5 text-gray-400 hover:text-red-500 text-[10px] transition-colors text-center"
                            >
                              Still Proceed to Cancel
                            </button>
                          </div>
                        )}

                        {cancelLayer === 3 && (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleCancelFlowStep('Keep Free Tier')}
                              className="w-full p-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-[11px] font-semibold rounded-lg transition-colors text-center"
                            >
                              Keep Free Tier (Preserve My Resumes)
                            </button>
                            <button
                              onClick={() => handleCancelFlowStep('Still Cancel')}
                              className="w-full p-1.5 text-gray-400 hover:text-red-500 text-[10px] transition-colors text-center"
                            >
                              Still Cancel & Delete All Data
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#181e24] flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Mori Assistant..."
              className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-800"
            />
            <button
              type="submit"
              className="p-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl transition-colors shadow-md border border-gray-800"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
