'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Shield, AlertCircle, CheckCircle2, Server, Key, HelpCircle, ArrowRight, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (data: { provider: string; emailAddress: string; syncStatus: string }) => void;
  initialTab?: 'email' | 'calendar';
}

export const EmailConnectModal: React.FC<EmailConnectModalProps> = ({
  isOpen,
  onClose,
  onConnected,
  initialTab = 'email'
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'calendar'>(initialTab);
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'outlook' | 'imap'>('gmail');
  
  // Custom Domain inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(465);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync details state (for preview)
  const [successDetails, setSuccessDetails] = useState<{ provider: string; emailAddress: string }>({ provider: '', emailAddress: '' });

  // Update default host values when custom domain email is typed (e.g. user@example.com -> imap.example.com / smtp.example.com)
  useEffect(() => {
    if (emailProvider === 'imap' && emailInput.includes('@')) {
      const domain = emailInput.split('@')[1];
      if (domain) {
        if (!imapHost) setImapHost(`imap.${domain}`);
        if (!smtpHost) setSmtpHost(`smtp.${domain}`);
      }
    }
  }, [emailInput, emailProvider]);

  // Listen for message events from the popup window
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'email-sync-success') {
        const { provider, emailAddress } = event.data;
        setSuccessDetails({ provider, emailAddress });
        setSuccess(true);
        if (onConnected) {
          onConnected({ provider, emailAddress, syncStatus: 'connected' });
        }
        toast.success(`Connected to ${emailAddress} via ${provider.toUpperCase()}`);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [onConnected]);

  if (!isOpen) return null;

  // Handle Gmail / Outlook simulated or real OAuth popup
  const handleOAuthConnect = async (provider: 'gmail' | 'outlook') => {
    setLoading(true);
    setError('');
    
    const popupWidth = 500;
    const popupHeight = 650;
    const left = window.screen.width / 2 - popupWidth / 2;
    const top = window.screen.height / 2 - popupHeight / 2;

    try {
      const res = await fetch(`/api/tracker/emails/auth?provider=${provider}`);
      const data = await res.json();
      
      if (data.success && data.authUrl) {
        const popup = window.open(
          data.authUrl,
          `${provider}-email-auth`,
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        const checkPopupClosed = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkPopupClosed);
            setLoading(false);
          }
        }, 1000);
      } else {
        setError(data.error || `Failed to initiate real ${provider.toUpperCase()} integration.`);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || `Failed to generate real ${provider.toUpperCase()} authentication URL.`);
      setLoading(false);
    }
  };

  // Handle Custom Domain IMAP/SMTP connection
  const handleCustomConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput || !imapHost || !smtpHost) {
      setError('Please fill in all connection details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tracker/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          provider: 'imap',
          emailAddress: emailInput,
          password: passwordInput,
          imapHost,
          imapPort,
          smtpHost,
          smtpPort
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessDetails({ provider: 'imap', emailAddress: emailInput });
        setSuccess(true);
        if (onConnected) {
          onConnected({ provider: 'imap', emailAddress: emailInput, syncStatus: 'connected' });
        }
        toast.success(`Successfully connected custom domain email ${emailInput}`);
      } else {
        setError(data.error || 'Failed to authenticate custom IMAP/SMTP credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Google Calendar Auth Flow
  const handleCalendarConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/calendar/auth');
      const data = await response.json();
      if (data.success) {
        const popupWidth = 500;
        const popupHeight = 600;
        const left = window.screen.width / 2 - popupWidth / 2;
        const top = window.screen.height / 2 - popupHeight / 2;

        const popup = window.open(
          data.authUrl,
          'google-calendar-auth',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        const checkClosed = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkClosed);
            setLoading(false);
            if (onConnected) {
              onConnected({ provider: 'calendar', emailAddress: 'Google Calendar', syncStatus: 'connected' });
            }
            setSuccessDetails({ provider: 'google', emailAddress: 'Google Calendar Account' });
            setSuccess(true);
            toast.success('Google Calendar connected successfully!');
          }
        }, 1000);
      } else {
        setError('Failed to initiate calendar authentication.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to Google Calendar.');
      setLoading(false);
    }
  };

  const resetModalState = () => {
    setSuccess(false);
    setError('');
    setLoading(false);
    setEmailInput('');
    setPasswordInput('');
    setImapHost('');
    setSmtpHost('');
  };

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1050] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden text-gray-900 dark:text-white flex flex-col max-h-[90vh]"
      >
        {/* Header bar */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-600 dark:text-lime-400">
              {activeTab === 'email' ? <Mail className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-h3 font-bold tracking-tight text-gray-900 dark:text-white">Sync Integration</h3>
              <p className="text-small text-gray-500 dark:text-gray-400">Automate your application tracking journey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-white" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/5">
            <button
              onClick={() => { setActiveTab('email'); resetModalState(); }}
              className={`flex-1 py-2 text-small font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 ${
                activeTab === 'email' 
                  ? 'bg-[#80FF00] text-black shadow-md' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email Sync</span>
            </button>
            <button
              onClick={() => { setActiveTab('calendar'); resetModalState(); }}
              className={`flex-1 py-2 text-small font-bold rounded-xl transition duration-150 flex items-center justify-center gap-1.5 ${
                activeTab === 'calendar' 
                  ? 'bg-[#80FF00] text-black shadow-md' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Calendar Sync</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-small rounded-2xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            /* SUCCESS PANEL */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mx-auto animate-pulse">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-body font-bold text-gray-900 dark:text-white">Connection Established!</h4>
                <p className="text-small text-gray-600 dark:text-gray-400 px-8">
                  {activeTab === 'email' 
                    ? `Successfully synchronized recruiter tracking for ${successDetails.emailAddress} (${successDetails.provider.toUpperCase()})`
                    : 'Successfully connected Google Calendar. Application events will keep synchronized automatically.'}
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-lime-500 hover:bg-lime-600 text-black rounded-xl text-small font-bold transition shadow-lg shadow-lime-500/15"
                >
                  Done
                </button>
              </div>
            </motion.div>
          ) : activeTab === 'calendar' ? (
            /* CALENDAR SYNC PANEL */
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-small font-bold text-gray-900 dark:text-white">Google Calendar</h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Keep application tracking events up-to-date</p>
                  </div>
                </div>

                <div className="text-small text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
                  <p>When connected, calendar sync will:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Add recruiters interview dates, followups, and deadlines.</li>
                    <li>Update events automatically as you progress stages in job cards.</li>
                    <li>Synchronize events with notification alerts to keep you prepared.</li>
                  </ul>
                </div>

                <button
                  onClick={handleCalendarConnect}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-small font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Authorize Google Calendar</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* EMAIL SYNC PANEL */
            <div className="space-y-6">
              {/* Provider Buttons Selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['gmail', 'outlook', 'imap'] as const).map((provider) => {
                  const isActive = emailProvider === provider;
                  return (
                    <button
                      key={provider}
                      onClick={() => { setEmailProvider(provider); setError(''); }}
                      className={`py-3 px-2 rounded-2xl border text-small font-bold flex flex-col items-center gap-2 transition duration-200 ${
                        isActive 
                          ? 'bg-[#80FF00]/10 border-[#80FF00]/50 text-gray-900 dark:text-white font-black' 
                          : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {provider === 'gmail' && (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6l8 5 8-5v2l-8 5-8-5V6z"/>
                        </svg>
                      )}
                      {provider === 'outlook' && (
                        <div className="grid grid-cols-2 gap-0.5 w-4.5 h-4.5">
                          <div className="bg-[#F25022] w-1.5 h-1.5"></div>
                          <div className="bg-[#7FBA00] w-1.5 h-1.5"></div>
                          <div className="bg-[#00A4EF] w-1.5 h-1.5"></div>
                          <div className="bg-[#FFB900] w-1.5 h-1.5"></div>
                        </div>
                      )}
                      {provider === 'imap' && <Server className="h-5 w-5 text-lime-600 dark:text-lime-400" />}
                      <span className="capitalize">{provider === 'imap' ? 'Custom Domain' : provider}</span>
                    </button>
                  );
                })}
              </div>

              {emailProvider !== 'imap' ? (
                /* OAuth connect card for Gmail/Outlook */
                <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 flex items-center justify-center">
                      <Shield className="h-4.5 w-4.5 text-lime-600 dark:text-lime-400" />
                    </div>
                    <div>
                      <h4 className="text-small font-bold text-gray-800 dark:text-gray-200">Secure Token Authentication</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Redirects to official authorization consent</p>
                    </div>
                  </div>

                  <p className="text-small text-gray-600 dark:text-gray-400 leading-relaxed">
                    Connecting your {emailProvider === 'gmail' ? 'Gmail' : 'Outlook'} account enables AI Resume to automatically detect and index inbound application updates. Your credentials are never stored directly.
                  </p>

                  <button
                    onClick={() => handleOAuthConnect(emailProvider)}
                    disabled={loading}
                    className="w-full py-3 bg-lime-500 hover:bg-lime-600 text-black text-small font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-lime-500/15"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Connect {emailProvider === 'gmail' ? 'Gmail' : 'Outlook'} Inbox</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* IMAP/SMTP Custom domain form */
                <form onSubmit={handleCustomConnect} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@yourdomain.com"
                        className="w-full text-small px-4 py-3 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                        App Password / Credentials
                        <span className="cursor-help" title="Use your account's dedicated application password, not your primary login password if MFA is enabled.">
                          <HelpCircle size={12} className="text-gray-500 hover:text-gray-300" />
                        </span>
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full text-small px-4 py-3 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* IMAP config */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        IMAP Incoming Host
                      </label>
                      <input
                        type="text"
                        required
                        value={imapHost}
                        onChange={(e) => setImapHost(e.target.value)}
                        placeholder="imap.yourdomain.com"
                        className="w-full text-small px-4 py-3 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        IMAP Port
                      </label>
                      <input
                        type="number"
                        required
                        value={imapPort}
                        onChange={(e) => setImapPort(parseInt(e.target.value) || 993)}
                        placeholder="993"
                        className="w-full text-small px-4 py-3 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* SMTP config */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        SMTP Outgoing Host
                      </label>
                      <input
                        type="text"
                        required
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.yourdomain.com"
                        className="w-full text-small px-4 py-3 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                        SMTP Port
                      </label>
                      <input
                        type="number"
                        required
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(parseInt(e.target.value) || 465)}
                        placeholder="465"
                        className="w-full text-small px-4 py-3 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#80FF00] hover:bg-[#99FF33] text-black text-small font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#80FF00]/15 mt-2"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Test & Connect Account</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-gray-50 dark:bg-white/2.5 border-t border-gray-200 dark:border-white/5 text-[10px] text-center text-gray-500 dark:text-gray-400 select-none shrink-0">
          🔒 Secure authentication. Your sync credentials are fully encrypted at rest.
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
export default EmailConnectModal;
