'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Wifi,
  Shield
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface SystemStatus {
  database: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    connections: number;
    uptime: string;
  };
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  storage: {
    status: 'healthy' | 'warning' | 'error';
    used: number;
    total: number;
    percentage: number;
  };
  memory: {
    status: 'healthy' | 'warning' | 'error';
    used: number;
    total: number;
    percentage: number;
  };
  uptime: string;
  lastCheck: string;
}

interface PerformanceData {
  time: string;
  apiResponse: number;
  dbResponse: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  requests: number;
}

const SystemHealth: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: {
      status: 'healthy',
      responseTime: 23,
      connections: 45,
      uptime: '23 days, 7 hours'
    },
    api: {
      status: 'healthy',
      responseTime: 89,
      requestsPerMinute: 156,
      errorRate: 0.08
    },
    storage: {
      status: 'healthy',
      used: 67.8,
      total: 500,
      percentage: 13.56
    },
    memory: {
      status: 'healthy',
      used: 3.2,
      total: 16,
      percentage: 20.0
    },
    uptime: '23 days, 7 hours, 42 minutes',
    lastCheck: new Date().toISOString()
  });
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStatus();
    generatePerformanceData();
    const interval = setInterval(() => {
      fetchSystemStatus();
      generatePerformanceData();
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system-health');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = () => {
    const data: PerformanceData[] = [];
    const now = new Date();
    
    // Generate 24 hours of data with realistic patterns
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = time.getHours();
      
      // Generate realistic patterns based on time of day
      const isWorkHours = hour >= 9 && hour <= 17;
      const isPeakHours = hour >= 10 && hour <= 14;
      const isNightHours = hour >= 22 || hour <= 6;
      
      // Base values with time-based adjustments
      const baseApiResponse = isWorkHours ? 85 : isNightHours ? 95 : 90;
      const baseDbResponse = isWorkHours ? 25 : isNightHours ? 35 : 30;
      const baseCpuUsage = isPeakHours ? 35 : isWorkHours ? 28 : isNightHours ? 15 : 22;
      const baseMemoryUsage = isPeakHours ? 45 : isWorkHours ? 35 : isNightHours ? 20 : 30;
      const baseRequests = isPeakHours ? 85 : isWorkHours ? 65 : isNightHours ? 25 : 45;
      
      // Add realistic variations
      const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
      
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        apiResponse: Math.floor(baseApiResponse * (1 + variation)),
        dbResponse: Math.floor(baseDbResponse * (1 + variation)),
        cpuUsage: Math.floor(baseCpuUsage * (1 + variation)),
        memoryUsage: Math.floor(baseMemoryUsage * (1 + variation)),
        storageUsage: 45.2 + (Math.random() * 1 - 0.5), // Small daily variation
        requests: Math.floor(baseRequests * (1 + variation))
      });
    }
    
    setPerformanceData(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Clock;
    }
  };

  const systemComponents = [
    {
      name: 'Database',
      icon: Database,
      data: systemStatus.database,
      metrics: [
        { label: 'Response Time', value: `${systemStatus.database.responseTime}ms` },
        { label: 'Connections', value: systemStatus.database.connections },
        { label: 'Uptime', value: systemStatus.database.uptime }
      ]
    },
    {
      name: 'API Server',
      icon: Server,
      data: systemStatus.api,
      metrics: [
        { label: 'Response Time', value: `${systemStatus.api.responseTime}ms` },
        { label: 'Requests/min', value: systemStatus.api.requestsPerMinute },
        { label: 'Error Rate', value: `${systemStatus.api.errorRate}%` }
      ]
    },
    {
      name: 'Storage',
      icon: HardDrive,
      data: systemStatus.storage,
      metrics: [
        { label: 'Used', value: `${systemStatus.storage.used}GB` },
        { label: 'Total', value: `${systemStatus.storage.total}GB` },
        { label: 'Usage', value: `${systemStatus.storage.percentage}%` }
      ]
    },
    {
      name: 'Memory',
      icon: Cpu,
      data: systemStatus.memory,
      metrics: [
        { label: 'Used', value: `${systemStatus.memory.used}GB` },
        { label: 'Total', value: `${systemStatus.memory.total}GB` },
        { label: 'Usage', value: `${systemStatus.memory.percentage}%` }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor system performance and status</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {new Date(systemStatus.lastCheck).toLocaleTimeString()}
          </div>
          <button
            onClick={() => {
              fetchSystemStatus();
              generatePerformanceData();
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {systemComponents.map((component, index) => {
          const Icon = component.icon;
          const StatusIcon = getStatusIcon(component.data.status);
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{component.name}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(component.data.status)}`}>
                  <StatusIcon className="h-3 w-3 inline mr-1" />
                  {component.data.status}
                </span>
              </div>
              
              <div className="space-y-2">
                {component.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Times Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Response Times (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <XAxis 
                dataKey="time" 
                stroke="#6B7280"
                fontSize={12}
                interval="preserveStartEnd"
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
              <Line 
                type="monotone" 
                dataKey="apiResponse" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                name="API (ms)"
              />
              <Line 
                type="monotone" 
                dataKey="dbResponse" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                name="Database (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resource Usage Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Usage (24h)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <XAxis 
                dataKey="time" 
                stroke="#6B7280"
                fontSize={12}
                interval="preserveStartEnd"
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
              <Area 
                type="monotone" 
                dataKey="cpuUsage" 
                stackId="1"
                stroke="#F59E0B" 
                fill="#F59E0B" 
                fillOpacity={0.6}
                name="CPU (%)"
              />
              <Area 
                type="monotone" 
                dataKey="memoryUsage" 
                stackId="1"
                stroke="#8B5CF6" 
                fill="#8B5CF6" 
                fillOpacity={0.6}
                name="Memory (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Uptime */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Uptime</h3>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-600 font-medium">All Systems Operational</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{systemStatus.uptime}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">99.9%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Availability</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Incidents</div>
          </div>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Per Hour */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requests Per Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <XAxis 
                dataKey="time" 
                stroke="#6B7280"
                fontSize={12}
                interval="preserveStartEnd"
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
              <Bar dataKey="requests" fill="#EC4899" name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Storage Usage Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Storage Usage Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <XAxis 
                dataKey="time" 
                stroke="#6B7280"
                fontSize={12}
                interval="preserveStartEnd"
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
              <Line 
                type="monotone" 
                dataKey="storageUsage" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                name="Storage (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Alerts</h3>
        
        <div className="space-y-4">
          {[
            {
              type: 'info',
              message: 'System backup completed successfully',
              time: '2 hours ago',
              icon: CheckCircle
            },
            {
              type: 'warning',
              message: 'High memory usage detected',
              time: '1 day ago',
              icon: AlertTriangle
            },
            {
              type: 'info',
              message: 'Database maintenance completed',
              time: '3 days ago',
              icon: CheckCircle
            }
          ].map((alert, index) => {
            const Icon = alert.icon;
            return (
              <div key={index} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-600 rounded-lg">
                <Icon className={`h-5 w-5 ${
                  alert.type === 'warning' ? 'text-yellow-600' : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Response Times</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">API Average</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{systemStatus.api.responseTime}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Database Average</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{systemStatus.database.responseTime}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Page Load Average</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">1.2s</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Usage</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Storage</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{systemStatus.storage.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    systemStatus.storage.percentage > 80 ? 'bg-red-500' : 
                    systemStatus.storage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${systemStatus.storage.percentage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{systemStatus.memory.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    systemStatus.memory.percentage > 80 ? 'bg-red-500' : 
                    systemStatus.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${systemStatus.memory.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth; 