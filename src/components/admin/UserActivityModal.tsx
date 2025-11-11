'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Briefcase, Mail, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserActivityData {
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    registrationDate: string;
    lastActive: string;
  };
  metrics: {
    masterCV: boolean;
    cvCount: number;
    coverLetterCount: number;
    jobCount: number;
    journeyCount: number;
    totalDocuments: number;
    estimatedSessionTimeMinutes: number;
    estimatedSessionTimeHours: number;
  };
  activity: {
    recentCVs: Array<{
      title: string;
      isMaster: boolean;
      lastModified: string;
    }>;
    recentJourneys: Array<{
      jobTitle: string;
      company: string;
      status: string;
      lastWorkedOn: string;
    }>;
  };
}

interface UserActivityModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserActivityModal({
  userId,
  userName,
  userEmail,
  isOpen,
  onClose,
}: UserActivityModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserActivityData | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserActivity();
    }
  }, [isOpen, userId]);

  const fetchUserActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity`);

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch user activity');
          } catch {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server');
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch user activity');
      }
    } catch (err: any) {
      console.error('Error fetching user activity:', err);
      setError(err.message || 'Failed to load user activity');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
            <div>
              <h2 className="text-2xl font-bold text-white">User Activity</h2>
              <p className="text-gray-400 text-sm mt-1">
                {userName} ({userEmail})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-400">Loading user activity...</span>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={fetchUserActivity}
                  className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : data ? (
              <div className="space-y-6">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-gray-400">Master CV</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.metrics.masterCV ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-lg font-bold text-white">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-lg font-bold text-white">No</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-gray-400">CVs</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{data.metrics.cvCount}</div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-gray-400">Cover Letters</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{data.metrics.coverLetterCount}</div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-gray-400">Jobs</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{data.metrics.jobCount}</div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-5 h-5 text-lime-400" />
                      <span className="text-sm text-gray-400">Journeys</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{data.metrics.journeyCount}</div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-yellow-400" />
                      <span className="text-sm text-gray-400">Total Documents</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{data.metrics.totalDocuments}</div>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm text-gray-400">Time in App</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatDuration(data.metrics.estimatedSessionTimeMinutes)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ~{data.metrics.estimatedSessionTimeHours} hours
                    </div>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>

                  {/* Recent CVs */}
                  {data.activity.recentCVs.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Recent CVs ({data.activity.recentCVs.length})
                      </h4>
                      <div className="space-y-2">
                        {data.activity.recentCVs.slice(0, 5).map((cv, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {cv.isMaster && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                  Master
                                </span>
                              )}
                              <span className="text-gray-300">{cv.title}</span>
                            </div>
                            <span className="text-gray-500">
                              {formatDate(cv.lastModified)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Journeys */}
                  {data.activity.recentJourneys.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Recent Journeys ({data.activity.recentJourneys.length})
                      </h4>
                      <div className="space-y-2">
                        {data.activity.recentJourneys.slice(0, 5).map((journey, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-300">
                                {journey.jobTitle} at {journey.company}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                journey.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                journey.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {journey.status}
                              </span>
                            </div>
                            <span className="text-gray-500">
                              {formatDate(journey.lastWorkedOn)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Account Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Registration Date:</span>
                      <div className="text-white mt-1">{formatDate(data.user.registrationDate)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Active:</span>
                      <div className="text-white mt-1">{formatDate(data.user.lastActive)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

