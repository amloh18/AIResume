import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { RefreshCw, Trash2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { decryptToken } from '@/lib/auth/token-encryption';

interface LinkedInAccountSettingsProps {
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

export default function LinkedInAccountSettings({ onDisconnect, onReconnect }: LinkedInAccountSettingsProps) {
  const { data: session } = useSession();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const linkedInData = session?.user ? {
    id: (session.user as any).linkedInId,
    accessToken: (session.user as any).linkedInAccessToken,
    lastSync: (session.user as any).lastLinkedInSync || null,
  } : null;

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account? This will remove LinkedIn import and post features.')) {
      return;
    }

    setIsDisconnecting(true);
    setError(null);
    setSuccess(null);

    try {
      // In a real implementation, you would call an API to disconnect
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call onDisconnect callback if provided
      onDisconnect?.();
      
      setSuccess('LinkedIn account disconnected successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect LinkedIn account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setError(null);
    setSuccess(null);

    try {
      // Trigger OAuth flow
      onReconnect?.();
    } catch (err: any) {
      setError(err.message || 'Failed to reconnect LinkedIn account');
    } finally {
      setIsReconnecting(false);
    }
  };

  const getTokenStatus = () => {
    if (!linkedInData?.accessToken) {
      return { status: 'disconnected', message: 'Not connected' };
    }

    try {
      // Try to decrypt token to verify it's valid
      const decrypted = decryptToken(linkedInData.accessToken as string);
      if (decrypted && decrypted.length > 10) {
        return { status: 'connected', message: 'Active' };
      }
      return { status: 'invalid', message: 'Invalid token' };
    } catch (error) {
      return { status: 'invalid', message: 'Token decryption failed' };
    }
  };

  const tokenStatus = getTokenStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0a66c2]/10 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-[#0a66c2]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">LinkedIn Account</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your LinkedIn integration</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              tokenStatus.status === 'connected' ? 'bg-green-500' : 
              tokenStatus.status === 'invalid' ? 'bg-yellow-500' : 'bg-gray-300'
            }`} />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {linkedInData?.id ? 'Connected' : 'Not Connected'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tokenStatus.message}
              </p>
            </div>
          </div>
          
          {linkedInData?.lastSync && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last sync: {new Date(linkedInData.lastSync).toLocaleDateString()}
            </p>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-red-600 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-green-600 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            {success}
          </motion.div>
        )}
      </div>

      {/* LinkedIn ID */}
      {linkedInData?.id && (
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">LinkedIn ID</p>
          <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
            {linkedInData.id}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {linkedInData?.id ? (
          <>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </motion.button>
          </>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            {isReconnecting ? 'Connecting...' : 'Connect LinkedIn'}
          </motion.button>
        )}
      </div>

      {/* Features Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-500/20 p-4">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Available Features</p>
        <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Import CV from LinkedIn profile
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Post enhanced content to LinkedIn
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Sync profile updates
          </li>
        </ul>
      </div>
    </div>
  );
}
