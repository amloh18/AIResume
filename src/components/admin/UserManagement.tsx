'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUserManagementSkeleton } from './AdminSkeletons';
import {
  Users, Search, Filter, MoreVertical, Trash2, Eye, Mail, CreditCard,
  CheckCircle, XCircle, Clock, Download, ChevronRight, UserCheck, Sparkles,
  ArrowUpRight, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import UserActivityModal from './UserActivityModal';
import { USER_ROLES, DEFAULT_PAGINATION_LIMIT, DEFAULT_SEARCH_DEBOUNCE_MS } from '@/lib/config/adminConstants';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { format } from 'date-fns';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  isAnonymous?: boolean;
  role: string;
  currentPlanKey: string;
  subscription: {
    status: string;
    provider: string;
    currentPeriodEnd?: string;
    interval: string;
  };
  createdAt: string;
  phone?: string;
  location?: string;
  lastLogin?: string;
  region?: string;
  usage?: {
    cvJourneyCount?: number;
    cvCreatedCount?: number;
  };
  onboarding?: {
    confidence_score?: number;
  };
}

interface UserManagementProps {
  searchQuery?: string;
}

const UserManagement: React.FC<UserManagementProps> = ({ searchQuery }) => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery || '');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterUserType, setFilterUserType] = useState<'all' | 'registered' | 'guest'>('registered');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGINATION_LIMIT);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<User | null>(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    jobsLanded: 0,
    successRate: 0
  });
  const [planConfig, setPlanConfig] = useState<{
    plans: string[];
    planDisplayNames: Record<string, string>;
  }>({
    plans: [],
    planDisplayNames: {}
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof searchQuery === 'string') {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!mounted) return;
    Promise.all([
      fetchUsers(true),
      fetchMetrics(),
      fetchPlanConfig()
    ]);
  }, [mounted]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), DEFAULT_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    fetchUsers(true);
  }, [debouncedSearch, filterRole, filterPlan, filterUserType, mounted]);

  // Close actions menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-actions-menu') && !target.closest('.user-actions-btn')) {
        setActiveMenuUserId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchPlanConfig = async () => {
    try {
      const response = await fetch('/api/admin/config/plans');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlanConfig({
            plans: data.plans || [],
            planDisplayNames: data.planDisplayNames || {}
          });
        }
      }
    } catch (error) {
      console.error('Error fetching plan config:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics({
          totalUsers: data.totalUsers || 0,
          activeUsers: typeof data.activeUsers === 'number' ? data.activeUsers : 0,
          jobsLanded: typeof data.jobsLanded === 'number' ? data.jobsLanded : 0,
          successRate: typeof data.successRate === 'number' ? data.successRate : 0
        });
      }
    } catch (error) {}
  };

  const fetchUsers = async (reset: boolean = false) => {
    try {
      setError(null);
      const nextPage = reset ? 1 : page;
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterRole && filterRole !== 'all') params.set('role', filterRole);
      if (filterPlan && filterPlan !== 'all') params.set('plan', filterPlan);
      if (filterUserType && filterUserType !== 'all') params.set('userType', filterUserType);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
      const contentType = response.headers.get('content-type');

      if (response.ok && contentType?.includes('application/json')) {
        const data = await response.json();
        const newUsers: User[] = data.users || data || [];
        if (reset) {
          setUsers(newUsers);
          setPage(1);
        } else {
          setUsers(prev => {
            const seen = new Set(prev.map(u => u._id));
            return [...prev, ...newUsers.filter(u => !seen.has(u._id))];
          });
        }
        setHasMore(Boolean(data.pagination && nextPage < data.pagination.pages));
      } else {
        setError('Failed to sync directory');
      }
    } catch (error) {
      setError('Connection interrupted');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      setPage(prev => prev + 1);
      await fetchUsers(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (confirm(`Permanently delete user ${user.email} and all data?`)) {
      await fetch(`/api/admin/users/${user._id}`, { method: 'DELETE' });
      fetchUsers(true);
    }
  };

  const handleExportData = () => {
    if (!users.length) return;
    const headers = ['User ID', 'Name', 'Email', 'Plan', 'Status', 'Plan Tier', 'Score', 'Region', 'Last Login'];
    const rows = users.map(u => {
      const status = getUserStatus(u);
      const score = calculateScore(u);
      const tasks = u.usage?.cvJourneyCount || u.usage?.cvCreatedCount || 12;
      return [
        u._id,
        `"${u.firstName} ${u.lastName}"`,
        u.email,
        u.currentPlanKey || 'free',
        status,
        tasks,
        score,
        u.region || 'Remote',
        u.lastLogin ? new Date(u.lastLogin).toISOString() : 'Never'
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `buildairesume-users-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUserStatus = (user: User): 'active' | 'inactive' | 'idle' => {
    if (user.subscription?.status === 'active') return 'active';
    if (!user.lastLogin) return 'inactive';
    const lastLoginTime = new Date(user.lastLogin).getTime();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (now - lastLoginTime < sevenDays) return 'active';
    if (now - lastLoginTime < thirtyDays) return 'idle';
    return 'inactive';
  };

  const calculateScore = (user: User): number => {
    if (user.onboarding?.confidence_score) return user.onboarding.confidence_score;
    let score = 20;
    if (user.firstName && user.lastName) score += 20;
    if (user.avatar) score += 10;
    if (user.currentPlanKey && user.currentPlanKey !== 'free') score += 25;
    if (user.lastLogin) score += 15;
    if (user.region) score += 10;
    return Math.min(score, 98);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">

      {/* 2. Search & Filter Bar (FlowMate Layout) */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl p-2.5 sm:p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent pl-9 pr-4 py-1 text-xs text-white placeholder-white/30 focus:outline-none"
          />
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-white/5 pt-2 md:pt-0 md:pl-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white/70 focus:outline-none hover:bg-white/10 transition-all cursor-pointer"
          >
            <option value="all">Roles: All</option>
            {USER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>

          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white/70 focus:outline-none hover:bg-white/10 transition-all cursor-pointer"
          >
            <option value="all">Plans: All</option>
            {planConfig.plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}
          </select>

          <select
            value={filterUserType}
            onChange={(e) => setFilterUserType(e.target.value as 'all' | 'registered' | 'guest')}
            className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white/70 focus:outline-none hover:bg-white/10 transition-all cursor-pointer"
          >
            <option value="registered">Registered</option>
            <option value="guest">Guest</option>
            <option value="all">All Types</option>
          </select>

          <button
            onClick={handleExportData}
            title="Export filtered users"
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Download size={13} className="text-white/50" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* 3. High-Density Users Table (FlowMate Layout) */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        {loading && users.length === 0 ? (
          <div className="p-8">
            <AdminUserManagementSkeleton />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-5 py-3 text-xs font-semibold text-white/40">User</th>
                  <th className="px-5 py-3 text-xs font-semibold text-white/40">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-white/40">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-white/40 text-center">Plan</th>
                  <th className="px-5 py-3 text-xs font-semibold text-white/40">Productivity Score</th>
                  <th className="px-5 py-3 text-xs font-semibold text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const status = getUserStatus(user);
                  const score = calculateScore(user);

                  return (
                    <tr
                      key={user._id}
                      onClick={() => {
                        router.push(`/admin/dashboard/management-users/${user._id}`);
                      }}
                      className="group cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      {/* 1. User Avatar + Name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm">
                              {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate block">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email */}
                      <td className="px-5 py-3 text-xs text-white/60 font-normal truncate max-w-[200px]">
                        {user.email}
                      </td>

                      {/* 3. Status Pill Badge (FlowMate exact styling) */}
                      <td className="px-5 py-3">
                        {status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <CheckCircle size={12} className="shrink-0" />
                            <span>Active</span>
                          </span>
                        ) : status === 'inactive' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-400">
                            <XCircle size={12} className="shrink-0" />
                            <span>Inactive</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
                            <Clock size={12} className="shrink-0" />
                            <span>Idle</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Plan Badge */}
                      <td className="px-5 py-3 text-center">
                        {(() => {
                          const plan = user.currentPlanKey || 'free';
                          const isFree = plan === 'free' || plan === 'FREE' || plan === '';
                          return isFree ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-white/50">
                              Free
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 capitalize">
                              {plan}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 5. Productivity / Health Score Gradient Bar */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-28 sm:w-36 h-2 bg-white/5 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#38bdf8] rounded-full transition-all duration-500"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white/80 w-6 text-right">
                            {score}
                          </span>
                        </div>
                      </td>

                      {/* 6. Row Actions Menu */}
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveMenuUserId(activeMenuUserId === user._id ? null : user._id)}
                            className="user-actions-btn p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <MoreVertical size={15} />
                          </button>

                          <AnimatePresence>
                            {activeMenuUserId === user._id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                transition={{ duration: 0.12 }}
                                className="user-actions-menu absolute right-0 mt-1 w-44 rounded-xl bg-[#161a24] border border-white/10 shadow-2xl p-1.5 z-40 divide-y divide-white/5 backdrop-blur-xl"
                              >
                                <div className="space-y-0.5 pb-1">
                                  <button
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      router.push(`/admin/dashboard/management-users/${user._id}`);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left"
                                  >
                                    <Eye size={13} className="text-emerald-400" />
                                    <span>View User 360</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      setSelectedUserForModal(user);
                                      setIsMembershipModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left"
                                  >
                                    <CreditCard size={13} className="text-blue-400" />
                                    <span>Change Plan</span>
                                  </button>
                                </div>
                                <div className="pt-1">
                                  <button
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      handleDeleteUser(user);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete User</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Table Footer / Pagination */}
        <div className="px-5 py-3.5 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-xs text-white/40">
          <p className="font-medium">
            Showing {users.length} of {metrics.totalUsers.toLocaleString()} Users
          </p>
          <div className="flex gap-2">
            <button
              onClick={loadMore}
              disabled={!hasMore || loadingMore}
              className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : hasMore ? 'Load More' : 'End of Directory'}
            </button>
          </div>
        </div>
      </div>

      {/* Universal Payment / Plan Modal */}
      {selectedUserForModal && (
        <UniversalPaymentModal
          isOpen={isMembershipModalOpen}
          onClose={() => {
            setIsMembershipModalOpen(false);
            setSelectedUserForModal(null);
          }}
          currentUserPlan={selectedUserForModal.currentPlanKey}
          onSuccess={() => {
            setIsMembershipModalOpen(false);
            fetchUsers(true);
          }}
          adminMode={true}
          subjectUserId={selectedUserForModal._id}
        />
      )}
    </div>
  );
};

export default UserManagement;
