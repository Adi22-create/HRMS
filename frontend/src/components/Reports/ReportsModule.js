import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  CreditCard,
  Users,
  Download,
  Filter,
  PieChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import axios from 'axios';
import toast from 'react-hot-toast';

const ReportsModule = () => {
  const { user } = useAuthStore();
  const [leaveData, setLeaveData] = useState({ by_status: [], by_type: [] });
  const [expenseData, setExpenseData] = useState({ by_status: [], by_category: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Colors for charts
  const COLORS = {
    primary: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    orange: '#F97316',
    indigo: '#6366F1',
  };

  const statusColors = {
    pending: COLORS.yellow,
    approved: COLORS.green,
    rejected: COLORS.red,
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [leaveResponse, expenseResponse] = await Promise.all([
        axios.get('/api/reports/leave-summary'),
        axios.get('/api/reports/expense-summary')
      ]);
      
      setLeaveData(leaveResponse.data);
      setExpenseData(expenseResponse.data);
    } catch (error) {
      console.error('Error fetching reports data:', error);
      toast.error('Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for charts
  const leaveStatusData = leaveData.by_status?.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: statusColors[item.status] || COLORS.primary
  })) || [];

  const leaveTypeData = leaveData.by_type?.map(item => ({
    name: item.type_name,
    count: item.count,
  })) || [];

  const expenseStatusData = expenseData.by_status?.map(item => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    count: item.count,
    amount: item.total_amount,
    color: statusColors[item.status] || COLORS.primary
  })) || [];

  const expenseCategoryData = expenseData.by_category?.map(item => ({
    name: item.category_name,
    count: item.count,
    amount: item.total_amount,
  })) || [];

  // Calculate totals
  const totalLeaveRequests = leaveStatusData.reduce((sum, item) => sum + item.value, 0);
  const totalExpenseAmount = expenseStatusData.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenseRequests = expenseStatusData.reduce((sum, item) => sum + item.count, 0);

  // Mock data for trends (in a real app, this would come from the API)
  const monthlyTrendsData = [
    { month: 'Jan', leaves: 15, expenses: 25000 },
    { month: 'Feb', leaves: 12, expenses: 18000 },
    { month: 'Mar', leaves: 18, expenses: 32000 },
    { month: 'Apr', leaves: 14, expenses: 28000 },
    { month: 'May', leaves: 16, expenses: 35000 },
    { month: 'Jun', leaves: 20, expenses: 30000 },
  ];

  const exportToCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Count,Amount\n"
      + data.map(row => `${row.name},${row.count || row.value},${row.amount || 0}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-module">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Insights and trends for leave and expense management</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => exportToCSV(leaveStatusData, 'leave-summary.csv')}
            className="btn-secondary text-sm"
            data-testid="export-leave-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Leave Data
          </button>
          <button
            onClick={() => exportToCSV(expenseCategoryData, 'expense-summary.csv')}
            className="btn-secondary text-sm"
            data-testid="export-expense-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Expense Data
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Leave Requests</p>
              <p className="text-2xl font-bold text-blue-900">{totalLeaveRequests}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Expense Claims</p>
              <p className="text-2xl font-bold text-green-900">{totalExpenseRequests}</p>
            </div>
            <CreditCard className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Total Expense Amount</p>
              <p className="text-2xl font-bold text-purple-900">${totalExpenseAmount.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Active Users</p>
              <p className="text-2xl font-bold text-orange-900">1</p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="overview-tab"
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('leave-reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'leave-reports'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="leave-reports-tab"
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Leave Reports
          </button>
          <button
            onClick={() => setActiveTab('expense-reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense-reports'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="expense-reports-tab"
          >
            <CreditCard className="h-4 w-4 inline mr-2" />
            Expense Reports
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="trends-tab"
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Trends
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="overview-charts">
          {/* Leave Status Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Leave Request Status</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            {leaveStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={leaveStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {leaveStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No leave data available</p>
              </div>
            )}
          </div>

          {/* Expense Status Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Expense Status Overview</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            {expenseStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [name === 'amount' ? `$${value}` : value, name === 'amount' ? 'Amount' : 'Count']} />
                  <Legend />
                  <Bar dataKey="count" fill={COLORS.primary} name="Count" />
                  <Bar dataKey="amount" fill={COLORS.green} name="Amount ($)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Reports Tab */}
      {activeTab === 'leave-reports' && (
        <div className="space-y-6" data-testid="leave-reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leave by Type */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Leave Requests by Type</h3>
              {leaveTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leaveTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No leave type data available</p>
                </div>
              )}
            </div>

            {/* Leave Status Details */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Leave Status Breakdown</h3>
              <div className="space-y-4">
                {leaveStatusData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: item.color }}></div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{item.value}</div>
                      <div className="text-sm text-gray-500">
                        {totalLeaveRequests > 0 ? ((item.value / totalLeaveRequests) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Reports Tab */}
      {activeTab === 'expense-reports' && (
        <div className="space-y-6" data-testid="expense-reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense by Category */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Expenses by Category</h3>
              {expenseCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={expenseCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => [name === 'amount' ? `$${value}` : value, name === 'amount' ? 'Amount' : 'Count']} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill={COLORS.primary} name="Count" />
                    <Bar yAxisId="right" dataKey="amount" fill={COLORS.green} name="Amount ($)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No expense category data available</p>
                </div>
              )}
            </div>

            {/* Top Expense Categories */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Expense Categories</h3>
              <div className="space-y-4">
                {expenseCategoryData
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 5)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold`} style={{ backgroundColor: COLORS.primary }}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">${item.amount?.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{item.count} claims</div>
                      </div>
                    </div>
                  ))
                }
                {expenseCategoryData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No expense data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6" data-testid="trends-reports">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trends (Sample Data)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyTrendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => [name === 'expenses' ? `$${value}` : value, name === 'expenses' ? 'Expenses' : 'Leaves']} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="leaves" stroke={COLORS.primary} strokeWidth={2} name="Leave Requests" />
                <Line yAxisId="right" type="monotone" dataKey="expenses" stroke={COLORS.green} strokeWidth={2} name="Expense Amount ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
