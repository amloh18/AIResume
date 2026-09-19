'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, Tablet, Globe, LogOut, Loader2, RefreshCw } from 'lucide-react';
import toast from '@/lib/hot-toast';

interface SessionData {
  id: string;
  jti: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location?: string;
  provider: string;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
}

function getDeviceIcon(device: string) {
  switch (device) {
    case 'mobile': return <Smartphone className="w-5 h-5" />;
    case 'tablet': return <Tablet className="w-5 h-5" />;
    default: return <Monitor className="w-5 h-5" />;
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'credentials': return 'Email & Password';
    case 'google': return 'Google';
    case 'apple': return 'Apple';
    case 'linkedin': return 'LinkedIn';
    case 'passwordless': return 'Passwordless Code';
    default: return provider;
  }
}

export default function LoginSessions() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const revokeSession = async (jti: string) => {
    try {
      setRevoking(jti);
      const res = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jti }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Session revoked');
        setSessions((prev) => prev.filter((s) => s.jti !== jti));
      } else {
        toast.error(data.error || 'Failed to revoke session');
      }
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllOther = async () => {
    try {
      setRevokingAll(true);
      const res = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'All other sessions revoked');
        setSessions((prev) => prev.filter((s) => s.isCurrent));
      } else {
        toast.error(data.error || 'Failed to revoke sessions');
      }
    } catch {
      toast.error('Failed to revoke sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Login Sessions</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sessions expire after 7 days of inactivity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <button
              onClick={revokeAllOther}
              disabled={revokingAll}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {revokingAll ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Revoking...
                </span>
              ) : (
                'Log out all other sessions'
              )}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
          No active sessions found
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.jti}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                s.isCurrent
                  ? 'border-lime-200 dark:border-lime-800 bg-lime-50/50 dark:bg-lime-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                  {getDeviceIcon(s.device)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {s.browser} on {s.os}
                    </span>
                    {s.isCurrent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400">
                        This device
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <Globe className="w-3 h-3" />
                    <span>{s.ip}</span>
                    {s.location && <span>• {s.location}</span>}
                    <span>• {getProviderLabel(s.provider)}</span>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Last active: {formatTimeAgo(s.lastActiveAt)}
                    {s.createdAt !== s.lastActiveAt && (
                      <span> • Started: {formatTimeAgo(s.createdAt)}</span>
                    )}
                  </div>
                </div>
              </div>

              {!s.isCurrent && (
                <button
                  onClick={() => revokeSession(s.jti)}
                  disabled={revoking === s.jti}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Revoke this session"
                >
                  {revoking === s.jti ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
