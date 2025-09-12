'use client';

import React, { useState, useEffect } from 'react';
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
  TrendingUp
} from 'lucide-react';
import MembershipModal from '@/components/payment/MembershipModal';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(null);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    jobsLanded: 0,
    successRate: 0
  });

  useEffect(() => {
    fetchUsers();
    fetchMetrics();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const data = await response.json();
        // Parse the metrics from the API response
        setMetrics({
          totalUsers: users.length,
          activeUsers: parseInt(data.activeUsers.replace(/[^\d]/g, '')) || 0,
          jobsLanded: parseInt(data.jobsLanded.replace(/[^\d]/g, '')) || 0,
          successRate: parseInt(data.successRate.replace(/[^\d]/g, '')) || 0
        });
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
    const planKey = prompt('Enter plan key (free, day_pass, pro_monthly, pro_quarterly, pro_yearly):');
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
        }
      } catch (error) {
        console.error('Error cancelling subscription:', error);
      }
    }
  };

  const getPlanDisplayName = (planKey: string) => {
    const planNames = {
      'free': 'Free',
      'day_pass': 'Day Pass',
      'pro_monthly': 'Monthly Pro',
      'pro_quarterly': 'Quarterly Pro',
      'pro_yearly': 'Yearly Pro'
    };
    return planNames[planKey as keyof typeof planNames] || planKey;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return <CreditCard size={14} className="text-blue-600" />;
      case 'razorpay':
        return <ExternalLink size={14} className="text-orange-600" />;
      case 'none':
        return <Crown size={14} className="text-gray-600" />;
      default:
        return <AlertCircle size={14} className="text-gray-600" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalUsers.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.activeUsers.toLocaleString()}+</p>
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.jobsLanded.toLocaleString()}+</p>
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.successRate}%</p>
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
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Plans</option>
          <option value="free">Free</option>
          <option value="day_pass">Day Pass</option>
          <option value="pro_monthly">Monthly Pro</option>
          <option value="pro_quarterly">Quarterly Pro</option>
          <option value="pro_yearly">Yearly Pro</option>
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
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChangePlan(user)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Change Plan
                      </button>
                      <button
                        onClick={() => handleSendCheckoutLink(user, 'pro_monthly')}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                      >
                        <Send size={14} />
                        Send Link
                      </button>
                      <button
                        onClick={() => handleCompPlan(user)}
                        className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                      >
                        <Gift size={14} />
                        Comp Plan
                      </button>
                      <button
                        onClick={() => handleCancelSubscription(user)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Membership Modal */}
      {selectedUserForModal && (
        <MembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          currentPlanKey={selectedUserForModal.currentPlanKey}
          onSuccess={() => {
            setIsMembershipModalOpen(false);
            fetchUsers();
          }}
          adminMode={true}
          subjectUserId={selectedUserForModal._id}
        />
      )}
    </div>
  );
};

export default UserManagement; 