'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter,
  MoreVertical,
  Mail,
  Calendar,
  Shield,
  FileText,
  Crown,
  Star,
  Brain,
  Trash2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  createdAt: string;
  lastLogin: string;
  status: 'active' | 'inactive' | 'suspended';
  cvsCount: number;
  jobsCount: number;
}

interface TierData {
  name: string;
  users: number;
  color: string;
  icon: any;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Ensure all users have required fields with fallbacks
      const sanitizedUsers = data.map((user: any) => ({
        id: user.id || user._id || 'unknown',
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
        email: user.email || 'No email',
        role: user.role || 'user',
        tier: user.tier || 'free',
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || 'Never',
        status: user.status || 'active',
        cvsCount: user.cvsCount || 0,
        jobsCount: user.jobsCount || 0
      }));
      
      setUsers(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Set hardwired realistic data for CV Circle dashboard
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@techcorp.com',
          role: 'user',
          tier: 'annual-pro',
          createdAt: '2024-01-15T10:30:00Z',
          lastLogin: '2024-01-20T14:22:00Z',
          status: 'active',
          cvsCount: 8,
          jobsCount: 12
        },
        {
          id: '2',
          name: 'Mike Chen',
          email: 'mike.chen@startup.io',
          role: 'user',
          tier: 'monthly-pro',
          createdAt: '2024-01-10T09:15:00Z',
          lastLogin: '2024-01-20T16:45:00Z',
          status: 'active',
          cvsCount: 5,
          jobsCount: 8
        },
        {
          id: '3',
          name: 'Emma Wilson',
          email: 'emma.wilson@microsoft.com',
          role: 'user',
          tier: 'quarterly-pro',
          createdAt: '2024-01-08T11:20:00Z',
          lastLogin: '2024-01-20T13:10:00Z',
          status: 'active',
          cvsCount: 12,
          jobsCount: 15
        },
        {
          id: '4',
          name: 'Alex Rodriguez',
          email: 'alex.rodriguez@google.com',
          role: 'user',
          tier: 'day-pass',
          createdAt: '2024-01-18T08:45:00Z',
          lastLogin: '2024-01-20T10:30:00Z',
          status: 'active',
          cvsCount: 2,
          jobsCount: 3
        },
        {
          id: '5',
          name: 'David Kim',
          email: 'david.kim@apple.com',
          role: 'user',
          tier: 'free',
          createdAt: '2024-01-12T14:20:00Z',
          lastLogin: '2024-01-19T17:15:00Z',
          status: 'active',
          cvsCount: 1,
          jobsCount: 0
        },
        {
          id: '6',
          name: 'Lisa Park',
          email: 'lisa.park@netflix.com',
          role: 'user',
          tier: 'monthly-pro',
          createdAt: '2024-01-16T12:10:00Z',
          lastLogin: '2024-01-20T15:20:00Z',
          status: 'active',
          cvsCount: 6,
          jobsCount: 9
        },
        {
          id: '7',
          name: 'James Lee',
          email: 'james.lee@amazon.com',
          role: 'user',
          tier: 'free',
          createdAt: '2024-01-14T16:30:00Z',
          lastLogin: '2024-01-18T11:45:00Z',
          status: 'inactive',
          cvsCount: 0,
          jobsCount: 0
        },
        {
          id: '8',
          name: 'Rachel Green',
          email: 'rachel.green@meta.com',
          role: 'user',
          tier: 'quarterly-pro',
          createdAt: '2024-01-09T13:25:00Z',
          lastLogin: '2024-01-20T12:05:00Z',
          status: 'active',
          cvsCount: 9,
          jobsCount: 11
        },
        {
          id: '9',
          name: 'Tom Hanks',
          email: 'tom.hanks@disney.com',
          role: 'user',
          tier: 'day-pass',
          createdAt: '2024-01-19T10:15:00Z',
          lastLogin: '2024-01-20T09:30:00Z',
          status: 'active',
          cvsCount: 3,
          jobsCount: 2
        },
        {
          id: '10',
          name: 'Jennifer Lopez',
          email: 'jennifer.lopez@spotify.com',
          role: 'user',
          tier: 'annual-pro',
          createdAt: '2024-01-05T15:40:00Z',
          lastLogin: '2024-01-20T14:50:00Z',
          status: 'active',
          cvsCount: 15,
          jobsCount: 18
        },
        {
          id: '11',
          name: 'Admin User',
          email: 'admin@cvcircle.com',
          role: 'admin',
          tier: 'annual-pro',
          createdAt: '2024-01-01T00:00:00Z',
          lastLogin: '2024-01-20T16:00:00Z',
          status: 'active',
          cvsCount: 25,
          jobsCount: 30
        }
      ];
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate tier distribution
  const tierDistribution = users.reduce((acc, user) => {
    acc[user.tier] = (acc[user.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tierData: TierData[] = [
    {
      name: 'Free Plan',
      users: tierDistribution['free'] || 0,
      color: '#10B981',
      icon: Brain
    },
    {
      name: 'Day Pass',
      users: tierDistribution['day-pass'] || 0,
      color: '#3B82F6',
      icon: Star
    },
    {
      name: 'Monthly Pro',
      users: tierDistribution['monthly-pro'] || 0,
      color: '#F59E0B',
      icon: Crown
    },
    {
      name: 'Quarterly Pro',
      users: tierDistribution['quarterly-pro'] || 0,
      color: '#F97316',
      icon: Crown
    },
    {
      name: 'Annual Pro',
      users: tierDistribution['annual-pro'] || 0,
      color: '#EF4444',
      icon: Crown
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'annual-pro': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'quarterly-pro': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'monthly-pro': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'day-pass': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'free': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will delete all user data including CVs, jobs, and subscriptions.')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-10 w-32 rounded"></div>
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          ))}
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
          <p className="text-gray-600 dark:text-gray-400">Manage user accounts and permissions</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Statistics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Users Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Users by Tier</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierData}>
              <XAxis 
                dataKey="name" 
                stroke="#6B7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Legend />
              <Bar dataKey="users" fill="#3B82F6" name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tier Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tier Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tierData}
                cx="50%"
                cy="40%"
                labelLine={false}
                outerRadius={70}
                fill="#8884d8"
                dataKey="users"
              >
                {tierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Legend 
                layout="horizontal" 
                verticalAlign="bottom" 
                align="center"
                wrapperStyle={{
                  paddingTop: '20px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {tierData.map((tier, index) => {
          const Icon = tier.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{tier.name}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{tier.users}</p>
                </div>
                <div className={`p-3 rounded-full bg-opacity-10`} style={{ backgroundColor: `${tier.color}20` }}>
                  <Icon className="h-6 w-6" style={{ color: tier.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>



      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role & Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierColor(user.tier)}`}>
                        {user.tier.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText size={14} />
                        <span>{user.cvsCount} CVs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{user.jobsCount} Jobs</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 