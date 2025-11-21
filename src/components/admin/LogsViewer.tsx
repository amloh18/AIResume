'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  FileText,
  Brain,
  Activity,
  CreditCard,
  Upload,
  Settings,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { LogType, LogStatus } from '@/models/ActivityLog';

interface ActivityLog {
  _id: string;
  logType: LogType;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  resource?: {
    type: string;
    id?: string;
    name?: string;
  };
  action: string;
  status: LogStatus;
  errorMessage?: string;
  aiMetadata?: {
    model?: string;
    tokensUsed?: number;
    cost?: number;
  };
  apiMetadata?: {
    requestSize?: number;
    responseSize?: number;
    errorCode?: string;
  };
  exportMetadata?: {
    format?: string;
    fileSize?: number;
  };
  paymentMetadata?: {
    amount?: number;
    currency?: string;
    provider?: string;
  };
  adminMetadata?: {
    adminEmail?: string;
    actionType?: string;
  };
  tags?: string[];
}

interface LogMetrics {
  totalLogs: number;
  byType: Record<LogType, number>;
  byStatus: Record<LogStatus, number>;
  errorRate: number;
  avgResponseTime: number;
  totalAIUsage: {
    tokens: number;
    cost: number;
    requests: number;
  };
}

export default function LogsViewer() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<LogMetrics | null>(null);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  
  // Filters
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchMetrics();
  }, [currentPage, logTypeFilter, statusFilter, timeRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(timeRange);
      const params = new URLSearchParams({
        limit: String(pageSize),
        skip: String((currentPage - 1) * pageSize),
        startDate: startDate.toISOString(),
      });

      if (logTypeFilter !== 'all') {
        params.append('logType', logTypeFilter);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchTerm) {
        params.append('action', searchTerm);
      }

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server');
      }

      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/admin/logs/metrics?range=${timeRange}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setMetrics(data.metrics);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const getStartDate = (range: 'today' | '7d' | '30d' | '90d'): Date => {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getLogTypeIcon = (logType: LogType) => {
    switch (logType) {
      case 'api':
        return <Activity className="w-4 h-4" />;
      case 'ai':
        return <Brain className="w-4 h-4" />;
      case 'user_action':
        return <FileText className="w-4 h-4" />;
      case 'admin_action':
        return <Settings className="w-4 h-4" />;
      case 'payment':
        return <CreditCard className="w-4 h-4" />;
      case 'export':
        return <Upload className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getLogTypeColor = (logType: LogType) => {
    switch (logType) {
      case 'api':
        return 'text-blue-400 bg-blue-500/20';
      case 'ai':
        return 'text-purple-400 bg-purple-500/20';
      case 'user_action':
        return 'text-green-400 bg-green-500/20';
      case 'admin_action':
        return 'text-orange-400 bg-orange-500/20';
      case 'payment':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'export':
        return 'text-cyan-400 bg-cyan-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusBadge = (status: LogStatus) => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Warning
          </span>
        );
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
          <p className="text-gray-400 text-sm mt-1">Monitor system activity and user actions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchLogs();
              fetchMetrics();
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Total Logs</div>
              <div className="text-2xl font-bold text-white">{metrics.totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Error Rate</div>
              <div className="text-2xl font-bold text-white">{metrics.errorRate.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Response Time</div>
              <div className="text-2xl font-bold text-white">{metrics.avgResponseTime}ms</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="text-sm text-gray-400 mb-1">AI Usage</div>
              <div className="text-lg font-bold text-white">
                {metrics.totalAIUsage.tokens.toLocaleString()} tokens
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ${metrics.totalAIUsage.cost.toFixed(4)} / {metrics.totalAIUsage.requests} requests
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 tablet:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Log Type</label>
            <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all" className="text-white focus:bg-gray-800">All Types</SelectItem>
                <SelectItem value="api" className="text-white focus:bg-gray-800">API</SelectItem>
                <SelectItem value="ai" className="text-white focus:bg-gray-800">AI</SelectItem>
                <SelectItem value="user_action" className="text-white focus:bg-gray-800">User Actions</SelectItem>
                <SelectItem value="admin_action" className="text-white focus:bg-gray-800">Admin Actions</SelectItem>
                <SelectItem value="payment" className="text-white focus:bg-gray-800">Payments</SelectItem>
                <SelectItem value="export" className="text-white focus:bg-gray-800">Exports</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all" className="text-white focus:bg-gray-800">All Status</SelectItem>
                <SelectItem value="success" className="text-white focus:bg-gray-800">Success</SelectItem>
                <SelectItem value="failed" className="text-white focus:bg-gray-800">Failed</SelectItem>
                <SelectItem value="warning" className="text-white focus:bg-gray-800">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Time Range</label>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="today" className="text-white focus:bg-gray-800">Today</SelectItem>
                <SelectItem value="7d" className="text-white focus:bg-gray-800">Last 7 Days</SelectItem>
                <SelectItem value="30d" className="text-white focus:bg-gray-800">Last 30 Days</SelectItem>
                <SelectItem value="90d" className="text-white focus:bg-gray-800">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Search</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search action..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">Timestamp</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">User</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">Action</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-300">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <React.Fragment key={log._id}>
                      <tr 
                        className="border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors"
                        onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                      >
                        <td className="p-4">
                          <div className={`flex items-center gap-2 px-2 py-1 rounded ${getLogTypeColor(log.logType)}`}>
                            {getLogTypeIcon(log.logType)}
                            <span className="text-xs capitalize">{log.logType.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300 text-sm">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="p-4 text-gray-300 text-sm">
                          {log.userEmail || log.adminMetadata?.adminEmail || 'System'}
                        </td>
                        <td className="p-4 text-gray-300 text-sm">
                          {log.action}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="p-4">
                          <button className="text-blue-400 hover:text-blue-300">
                            {expandedLog === log._id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log._id && (
                        <tr>
                          <td colSpan={6} className="p-4 bg-gray-900">
                            <div className="space-y-2 text-sm">
                              {log.endpoint && (
                                <div>
                                  <span className="text-gray-400">Endpoint:</span>
                                  <span className="text-white ml-2">{log.method} {log.endpoint}</span>
                                </div>
                              )}
                              {log.responseTime && (
                                <div>
                                  <span className="text-gray-400">Response Time:</span>
                                  <span className="text-white ml-2">{log.responseTime}ms</span>
                                </div>
                              )}
                              {log.statusCode && (
                                <div>
                                  <span className="text-gray-400">Status Code:</span>
                                  <span className="text-white ml-2">{log.statusCode}</span>
                                </div>
                              )}
                              {log.resource && (
                                <div>
                                  <span className="text-gray-400">Resource:</span>
                                  <span className="text-white ml-2">
                                    {log.resource.type} {log.resource.name ? `(${log.resource.name})` : ''}
                                  </span>
                                </div>
                              )}
                              {log.aiMetadata && (
                                <div>
                                  <span className="text-gray-400">AI:</span>
                                  <span className="text-white ml-2">
                                    {log.aiMetadata.model} - {log.aiMetadata.tokensUsed} tokens - ${log.aiMetadata.cost?.toFixed(4)}
                                  </span>
                                </div>
                              )}
                              {log.paymentMetadata && (
                                <div>
                                  <span className="text-gray-400">Payment:</span>
                                  <span className="text-white ml-2">
                                    {log.paymentMetadata.currency} {log.paymentMetadata.amount} via {log.paymentMetadata.provider}
                                  </span>
                                </div>
                              )}
                              {log.exportMetadata && (
                                <div>
                                  <span className="text-gray-400">Export:</span>
                                  <span className="text-white ml-2">
                                    {log.exportMetadata.format} - {(log.exportMetadata.fileSize || 0) / 1024}KB
                                  </span>
                                </div>
                              )}
                              {log.errorMessage && (
                                <div>
                                  <span className="text-red-400">Error:</span>
                                  <span className="text-red-300 ml-2">{log.errorMessage}</span>
                                </div>
                              )}
                              {log.tags && log.tags.length > 0 && (
                                <div>
                                  <span className="text-gray-400">Tags:</span>
                                  <span className="text-white ml-2">{log.tags.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

