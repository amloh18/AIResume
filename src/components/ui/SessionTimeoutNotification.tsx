'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import SessionManager from '@/lib/utils/sessionManager';

interface SessionTimeoutNotificationProps {
  onLogout: () => void;
}

const SessionTimeoutNotification: React.FC<SessionTimeoutNotificationProps> = ({ onLogout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute warning
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const sessionManager = SessionManager.getInstance();
    const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const WARNING_TIME = 60 * 1000; // 1 minute warning

    const checkSession = () => {
      const timeSinceActivity = Date.now() - sessionManager.getLastActivity();
      const timeUntilTimeout = SESSION_TIMEOUT - timeSinceActivity;

      if (timeUntilTimeout <= WARNING_TIME && timeUntilTimeout > 0) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilTimeout / 1000));
      } else if (timeUntilTimeout <= 0) {
        handleLogout();
      } else {
        setShowWarning(false);
      }
    };

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showWarning && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (timeLeft <= 0) {
      handleLogout();
    }
  }, [showWarning, timeLeft]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    const sessionManager = SessionManager.getInstance();
    sessionManager.forceLogout();
    onLogout();
  };

  const handleExtendSession = () => {
    const sessionManager = SessionManager.getInstance();
    sessionManager.updateActivity();
    setShowWarning(false);
    setTimeLeft(60);
  };

  if (!showWarning) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 right-4 z-50 max-w-sm"
        initial={{ opacity: 0, x: 300, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.8 }}
        transition={{ duration: 0.3, type: "spring" }}
      >
        <div className="bg-red-600 text-white rounded-lg shadow-lg p-4 border border-red-500">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-200 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Session Timeout Warning</h3>
              <p className="text-red-100 text-xs mb-3">
                Your session will expire in <span className="font-mono font-bold">{timeLeft}s</span> due to inactivity.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleExtendSession}
                  className="bg-white text-red-600 px-3 py-1 rounded text-xs font-medium hover:bg-red-50 transition-colors"
                >
                  Stay Logged In
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="bg-red-700 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SessionTimeoutNotification;
