import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    leaveRequests: { pending: 0, approved: 0, rejected: 0 },
    expenseRequests: { pending: 0, approved: 0, rejected: 0 },
    attendanceToday: null,
    leaveBalance: {},
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch leave requests
      const leaveResponse = await axios.get('/api/leave/requests');
      const leaves = leaveResponse.data;
      
      // Fetch expense requests (placeholder)
      // const expenseResponse = await axios.get('/api/expense/requests');
      
      // Calculate stats
      const leaveStats = {
        pending: leaves.filter(l => l.status === 'pending').length,
        approved: leaves.filter(l => l.status === 'approved').length,
        rejected: leaves.filter(l => l.status === 'rejected').length,
      };
      
      setStats({
        leaveRequests: leaveStats,
        expenseRequests: { pending: 2, approved: 5, rejected: 1 }, // Mock data
        attendanceToday: null,
        leaveBalance: { 'Casual Leave': 8, 'Sick Leave': 6, 'Annual Leave': 15 }, // Mock data
      });
      
      // Set recent activity
      const activities = [
        { id: 1, type: 'leave', action: 'Leave request submitted', time: '2 hours ago', status: 'pending' },
        { id: 2, type: 'expense', action: 'Expense claim approved', time: '1 day ago', status: 'approved' },
        { id: 3, type: 'attendance', action: 'Checked in', time: 'Today 9:15 AM', status: 'completed' },
      ];
      setRecentActivity(activities);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      name: 'Apply for Leave',
      description: 'Submit a new leave request',
      icon: Calendar,
      href: '/leave',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      name: 'Submit Expense',
      description: 'Add new expense claim',
      icon: CreditCard,
      href: '/expense',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      name: 'Check Attendance',
      description: 'View attendance records',
      icon: Clock,
      href: '/attendance',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.full_name?.split(' ')[0]}!</h2>
            <p className="text-primary-100">Here's what's happening with your account today.</p>
          </div>
          <div className="text-right">
            <p className="text-primary-100 text-sm">Today</p>
            <p className="text-xl font-semibold">{format(new Date(), 'MMM dd, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.name}
              href={action.href}
              className={`${action.color} text-white p-6 rounded-xl transition-all duration-200 hover:transform hover:scale-105 hover:shadow-lg group`}
              data-testid={`quick-action-${action.name.toLowerCase().replace(' ', '-')}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{action.name}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
                <Icon className="h-8 w-8 opacity-80 group-hover:opacity-100" />
              </div>
            </a>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Leave Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leave Requests</h3>
            <Calendar className="h-6 w-6 text-primary-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="status-pending">{stats.leaveRequests.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Approved</span>
              <span className="status-approved">{stats.leaveRequests.approved}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rejected</span>
              <span className="status-rejected">{stats.leaveRequests.rejected}</span>
            </div>
          </div>
        </div>

        {/* Expense Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Expense Claims</h3>
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="status-pending">{stats.expenseRequests.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Approved</span>
              <span className="status-approved">{stats.expenseRequests.approved}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rejected</span>
              <span className="status-rejected">{stats.expenseRequests.rejected}</span>
            </div>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Leave Balance</h3>
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div className="space-y-2">
            {Object.entries(stats.leaveBalance).map(([type, days]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{type}</span>
                <span className="text-sm font-medium text-gray-900">{days} days</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Status</h3>
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">9:15 AM</p>
              <p className="text-sm text-gray-600">Check-in Time</p>
            </div>
            <button className="btn-primary w-full" data-testid="check-out-btn">
              <Clock className="h-4 w-4 mr-2" />
              Check Out
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <FileText className="h-6 w-6 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(activity.status)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
              <span className={`status-${activity.status}`}>
                {activity.status}
              </span>
            </div>
          ))}
        </div>
        
        {recentActivity.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
