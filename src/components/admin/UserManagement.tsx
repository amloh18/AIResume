'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminUserManagementSkeleton } from './AdminSkeletons';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  CreditCard,
  Calendar,
  Globe,
  Crown,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Send,
  Gift,
  X,
  Activity,
  Award,
  TrendingUp,
  ArrowUpCircle
} from 'lucide-react';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import UserActivityModal from './UserActivityModal';
import { USER_ROLES, DEFAULT_PAGINATION_LIMIT, DEFAULT_SEARCH_DEBOUNCE_MS, PAYMENT_PROVIDERS } from '@/lib/config/adminConstants';

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
  // Profile information
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  // Settings information
  company?: string;
  timezone?: string;
  languagePreference?: string;
  // Admin tracking fields
  lastLogin?: string;
  region?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGINATION_LIMIT);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<User | null>(null);
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
    // Run all initial fetches in parallel for better performance
    Promise.all([
      fetchUsers(true),
      fetchMetrics(),
      fetchPlanConfig()
    ]);
  }, []);

  // Debounce search to reduce API calls
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), DEFAULT_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchPlanConfig = async () => {
    try {
      const response = await fetch('/api/admin/config/plans');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setPlanConfig({
              plans: data.plans || [],
              planDisplayNames: data.planDisplayNames || {}
            });
          }
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
      const url = `/api/admin/users?${params.toString()}`;
      console.log('🔍 Fetching users from admin API...', url);
      const response = await fetch(url, { cache: 'no-store' });
      console.log('📥 Response status:', response.status);

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (response.ok) {
        if (!isJson) {
          throw new Error('Server returned non-JSON response');
        }
        const data = await response.json();
        console.log('📥 Response data:', data);
        console.log('👥 Users found:', data.users ? data.users.length : 0);
        const newUsers: User[] = data.users || data || [];
        if (reset) {
          setUsers(newUsers);
          setPage(1);
        } else {
          setUsers(prev => {
            // Deduplicate by _id when appending
            const seen = new Set(prev.map(u => u._id));
            const merged = [...prev, ...newUsers.filter(u => !seen.has(u._id))];
            return merged;
          });
        }
        setHasMore(Boolean(data.pagination && nextPage < data.pagination.pages));
        setError(null);
      } else {
        // Try to parse error if JSON, otherwise use status text
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If JSON parse fails, use default error message
          }
        }
        console.error('❌ API Error:', errorMessage);
        console.error('❌ Response status:', response.status);
        setUsers([]);
        setError(`Failed to fetch users: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setUsers([]);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // React to filters/search changes
  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    setPage(1);
    fetchUsers(true);
  }, [debouncedSearch, filterRole, filterPlan]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchUsers(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          // Parse the metrics from the API response
          setMetrics({
            totalUsers: data.totalUsers || 0,
            activeUsers: typeof data.activeUsers === 'number' ? data.activeUsers : parseInt(data.activeUsers?.replace(/[^\d]/g, '') || '0') || 0,
            jobsLanded: typeof data.jobsLanded === 'number' ? data.jobsLanded : parseInt(data.jobsLanded?.replace(/[^\d]/g, '') || '0') || 0,
            successRate: typeof data.successRate === 'number' ? data.successRate : parseInt(data.successRate?.replace(/[^\d]/g, '') || '0') || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleChangePlan = (user: User) => {
    setSelectedUserForModal(user);
    setIsMembershipModalOpen(true);
  };

  const handleSendCheckoutLink = async (user: User, planKey: string) => {
    try {
      const response = await fetch(`/api/admin/users/${user._id}/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          delivery: 'email'
        })
      });

      if (response.ok) {
        alert('Checkout link sent to user email!');
      }
    } catch (error) {
      console.error('Error sending checkout link:', error);
    }
  };

  const handleCompPlan = async (user: User) => {
    const planKey = prompt(`Enter plan key (available plans: ${planConfig.plans.join(', ')}):`);
    const note = prompt('Enter reason for complimentary plan:');

    if (planKey && note) {
      try {
        const response = await fetch(`/api/admin/users/${user._id}/plan/complimentary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planKey,
            note
          })
        });

        if (response.ok) {
          alert('Complimentary plan applied!');
          fetchUsers();
        }
      } catch (error) {
        console.error('Error applying complimentary plan:', error);
      }
    }
  };

  const handleCancelSubscription = async (user: User) => {
    if (!confirm(`Are you sure you want to cancel the plan for ${user.email}?`)) {
      return;
    }

    const when = confirm('Cancel now or at period end?') ? 'now' : 'period_end';
    const note = prompt('Enter cancellation reason:');

    if (note) {
      try {
        const response = await fetch(`/api/admin/users/${user._id}/subscription/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            when,
            note
          })
        });

        if (response.ok) {
          alert('Subscription cancelled!');
          fetchUsers();
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.error || 'Failed to cancel subscription'}`);
        }
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        alert('Failed to cancel subscription. Please try again.');
      }
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`⚠️ WARNING: This will permanently delete user ${user.email} and all their data.\n\nThis action cannot be undone. Are you absolutely sure?`)) {
      return;
    }

    const confirmation = prompt(`Type "DELETE" to confirm deletion of ${user.email}:`);
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled. Confirmation text did not match.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('User deleted successfully!');
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to delete user'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const getPlanDisplayName = (planKey: string) => {
    return planConfig.planDisplayNames[planKey] || planKey;
  };

  const getProviderIcon = (provider: string) => {
    if (!PAYMENT_PROVIDERS.includes(provider as any)) {
      return <AlertCircle size={14} className="text-gray-400" />;
    }

    switch (provider) {
      case 'stripe':
        return <CreditCard size={14} className="text-blue-400" />;
      case 'razorpay':
        return <ExternalLink size={14} className="text-orange-400" />;
      case 'none':
        return <Crown size={14} className="text-gray-400" />;
      default:
        return <AlertCircle size={14} className="text-gray-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'inactive':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'cancelled':
        return <X size={14} className="text-gray-500" />;
      default:
        return <AlertCircle size={14} className="text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesPlan = filterPlan === 'all' || user.currentPlanKey === filterPlan;

    return matchesSearch && matchesRole && matchesPlan;
  });

  // Always show the structure, only skeleton the data portions

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error Loading Users
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
            <button
              onClick={() => fetchUsers(true)}
              className="mt-3 text-sm bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage user accounts and subscriptions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mt-1"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalUsers.toLocaleString()}</p>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Users</p>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mt-1"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeUsers.toLocaleString()}+</p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <Activity size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Jobs Landed</p>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mt-1"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.jobsLanded.toLocaleString()}+</p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Award size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Success Rate</p>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16 mt-1"></div>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.successRate}%</p>
              )}
            </div>
            <div className="w-12 h-12 bg-lime-100 dark:bg-lime-900 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-lime-600 dark:text-lime-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Plans</option>
          {planConfig.plans.map((planKey) => (
            <option key={planKey} value={planKey}>
              {planConfig.planDisplayNames[planKey] || planKey}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Current Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Next Renewal/Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {users.length === 0 ? 'No users found' : 'No users match your filters'}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {users.length === 0
                          ? 'There are no users in the database. Check the console for errors or create some users.'
                          : 'Try adjusting your search or filter criteria.'
                        }
                      </p>
                      {users.length === 0 && (
                        <button
                          onClick={() => fetchUsers(true)}
                          className="text-lime-600 hover:text-lime-700 font-medium"
                        >
                          Refresh
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setSelectedUserForActivity(user);
                      setIsActivityModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {user._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {getPlanDisplayName(user.currentPlanKey)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getProviderIcon(user.subscription?.provider || 'none')}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {user.subscription?.provider || 'none'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.subscription?.status || 'inactive')}
                        <span className="text-sm text-gray-900 dark:text-white capitalize">
                          {user.subscription?.status || 'inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(user.subscription?.currentPeriodEnd || '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.region || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => handleCancelSubscription(user)}
                          className="text-orange-600 hover:text-orange-900 p-2 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                          title="Cancel Plan"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => handleChangePlan(user)}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Admin Upgrade"
                        >
                          <ArrowUpCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Load More / Paging Controls */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Showing {filteredUsers.length} of {users.length} loaded
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMore}
              disabled={!hasMore || loadingMore}
              className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : hasMore ? 'Load More' : 'No More'}
            </button>
          </div>
        </div>
      </div>

      {/* Membership Modal */}
      {selectedUserForModal && (
        <UniversalPaymentModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          currentUserPlan={selectedUserForModal.currentPlanKey}
          onSuccess={() => {
            setIsMembershipModalOpen(false);
            fetchUsers();
          }}
          adminMode={true}
          subjectUserId={selectedUserForModal._id}
        />
      )}

      {/* User Activity Modal */}
      {selectedUserForActivity && (
        <UserActivityModal
          userId={selectedUserForActivity._id}
          userName={`${selectedUserForActivity.firstName} ${selectedUserForActivity.lastName}`}
          userEmail={selectedUserForActivity.email}
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false);
            setSelectedUserForActivity(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement; 