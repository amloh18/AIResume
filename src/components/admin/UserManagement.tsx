'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminUserManagementSkeleton } from './AdminSkeletons';
import {
  Users, Search, Filter, MoreVertical, Trash2, Eye, Mail, CreditCard, Calendar, Globe, Crown, 
  CheckCircle, AlertCircle, ExternalLink, X, Activity, Award, TrendingUp, ArrowUpCircle, ChevronRight,
  Shield, Zap, MapPin, Clock, UserCheck, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import UserActivityModal from './UserActivityModal';
import { USER_ROLES, USER_TYPES, DEFAULT_PAGINATION_LIMIT, DEFAULT_SEARCH_DEBOUNCE_MS } from '@/lib/config/adminConstants';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
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
}

const UserManagement: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterUserType, setFilterUserType] = useState<'all' | 'registered' | 'guest'>('registered');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGINATION_LIMIT);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<User | null>(null);
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

  const handleDeleteUser = async (user: User) => {
    if (confirm(`Delete user ${user.email}?`)) {
      await fetch(`/api/admin/users/${user._id}`, { method: 'DELETE' });
      fetchUsers(true);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <AnimatePresence mode="wait">
        {selectedUserForActivity && isActivityModalOpen ? (
          <UserActivityModal
            key="activity-view"
            userId={selectedUserForActivity._id}
            isOpen={isActivityModalOpen}
            onClose={() => {
              setIsActivityModalOpen(false);
              setSelectedUserForActivity(null);
            }}
          />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-10"
          >
            {/* Command Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                  Manage <span className="text-emerald-500">Users</span>
                </h1>
                <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                  User Directory • {metrics.totalUsers.toLocaleString()} Total Users
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 w-full sm:w-64 transition-all"
                  />
                </div>
                
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white/60 focus:outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Roles: All</option>
                  {USER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                </select>

                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white/60 focus:outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="all">Plans: All</option>
                  {planConfig.plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                </select>

                <select
                  value={filterUserType}
                  onChange={(e) => setFilterUserType(e.target.value as 'all' | 'registered' | 'guest')}
                  className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white/60 focus:outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
                >
                  <option value="registered">Registered Users</option>
                  <option value="guest">Guest Users</option>
                  <option value="all">All Users</option>
                </select>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Growth', val: metrics.totalUsers, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Active', val: metrics.activeUsers, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Landed', val: metrics.jobsLanded, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { label: 'Success', val: `${metrics.successRate}%`, icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              ].map((m, i) => (
                <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col justify-between h-32 group hover:bg-white/[0.08] transition-all">
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                      <m.icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{m.label}</p>
                    <p className="text-2xl font-black text-white">{m.val.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Entities Table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">User</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Plan</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Region</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Last Login</th>
                      <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((user) => (
                      <motion.tr
                        key={user._id}
                        variants={item}
                        onClick={() => {
                          router.push(`/admin/dashboard/management-users/${user._id}`);
                        }}
                        className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black text-sm group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                              {user.firstName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-white/30 font-medium">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            user.currentPlanKey === 'free' ? 'bg-white/5 text-white/40' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {user.currentPlanKey}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${user.subscription?.status === 'active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/20'}`} />
                            <span className="text-xs font-bold text-white/60 capitalize">{user.subscription?.status || 'inactive'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-white/40">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{user.region || 'Remote'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-white/40">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">
                              {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all border border-transparent hover:border-white/10">
                              <Mail className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedUserForModal(user);
                                setIsMembershipModalOpen(true);
                              }}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/30 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user)}
                              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer */}
              <div className="p-8 bg-white/2 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                  Showing {users.length} of {metrics.totalUsers} Users
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={loadMore}
                    disabled={!hasMore || loadingMore}
                    className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/5 transition-all disabled:opacity-30"
                  >
                    {loadingMore ? 'Loading...' : hasMore ? 'Load More' : 'End of List'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Overlay */}
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
