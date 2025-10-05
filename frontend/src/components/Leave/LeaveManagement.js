import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

const LeaveManagement = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('apply');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form state for applying leave
  const [leaveForm, setLeaveForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    duration_type: 'full_day', // 'full_day', 'half_day', 'work_from_home'
    reason: '',
  });

  useEffect(() => {
    fetchLeaveTypes();
    fetchLeaveRequests();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('/api/leave/types');
      setLeaveTypes(response.data);
      if (response.data.length > 0) {
        setLeaveForm(prev => ({ ...prev, leave_type_id: response.data[0].type_id }));
      }
    } catch (error) {
      console.error('Error fetching leave types:', error);
      toast.error('Failed to load leave types');
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const response = await axios.get('/api/leave/requests');
      setLeaveRequests(response.data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.leave_type_id || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/leave/request', leaveForm);
      toast.success('Leave request submitted successfully!');
      setLeaveForm({
        leave_type_id: leaveTypes[0]?.type_id || '',
        start_date: '',
        end_date: '',
        duration_type: 'full_day',
        reason: '',
      });
      fetchLeaveRequests(); // Refresh the list
      setActiveTab('requests'); // Switch to requests tab
    } catch (error) {
      console.error('Error submitting leave:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId, status) => {
    try {
      await axios.put(`/api/leave/requests/${requestId}?status=${status}`);
      toast.success(`Leave request ${status} successfully`);
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error updating leave request:', error);
      toast.error('Failed to update leave request');
    }
  };

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

  const selectedLeaveType = leaveTypes.find(type => type.type_id === leaveForm.leave_type_id);

  return (
    <div className="space-y-6" data-testid="leave-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Apply for leave and manage your requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('apply')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'apply'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="apply-leave-tab"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Apply for Leave
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="leave-requests-tab"
          >
            <FileText className="h-4 w-4 inline mr-2" />
            My Requests ({leaveRequests.filter(r => r.user_id === user?.user_id).length})
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => setActiveTab('approve')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approve'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="approve-leave-tab"
            >
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Approvals ({leaveRequests.filter(r => r.status === 'pending').length})
            </button>
          )}
        </nav>
      </div>

      {/* Apply Leave Tab */}
      {activeTab === 'apply' && (
        <div className="card" data-testid="apply-leave-form">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Submit New Leave Request</h2>
          
          <form onSubmit={handleSubmitLeave} className="space-y-6">
            {/* Leave Type Selection */}
            <div>
              <label className="label">Leave Type *</label>
              <select
                value={leaveForm.leave_type_id}
                onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                className="input-field"
                required
                data-testid="leave-type-select"
              >
                {leaveTypes.map((type) => (
                  <option key={type.type_id} value={type.type_id}>
                    {type.name} ({type.max_days_per_year} days/year)
                  </option>
                ))}
              </select>
              {selectedLeaveType && (
                <p className="text-sm text-gray-600 mt-1">{selectedLeaveType.description}</p>
              )}
            </div>

            {/* Duration Type */}
            <div>
              <label className="label">Duration Type *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="duration_type"
                    value="full_day"
                    checked={leaveForm.duration_type === 'full_day'}
                    onChange={(e) => setLeaveForm({ ...leaveForm, duration_type: e.target.value })}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Full Day</div>
                    <div className="text-sm text-gray-600">Complete day off</div>
                  </div>
                </label>
                
                {selectedLeaveType?.supports_half_day && (
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="duration_type"
                      value="half_day"
                      checked={leaveForm.duration_type === 'half_day'}
                      onChange={(e) => setLeaveForm({ ...leaveForm, duration_type: e.target.value })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Half Day</div>
                      <div className="text-sm text-gray-600">4 hours off</div>
                    </div>
                  </label>
                )}
                
                {selectedLeaveType?.supports_wfh && (
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="duration_type"
                      value="work_from_home"
                      checked={leaveForm.duration_type === 'work_from_home'}
                      onChange={(e) => setLeaveForm({ ...leaveForm, duration_type: e.target.value })}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Work From Home</div>
                      <div className="text-sm text-gray-600">Remote work</div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date *</label>
                <input
                  type="date"
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                  required
                  data-testid="start-date-input"
                />
              </div>
              <div>
                <label className="label">End Date *</label>
                <input
                  type="date"
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  className="input-field"
                  min={leaveForm.start_date || new Date().toISOString().split('T')[0]}
                  required
                  data-testid="end-date-input"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="label">Reason *</label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="input-field"
                rows={4}
                placeholder="Please provide a reason for your leave request..."
                required
                data-testid="leave-reason-input"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-leave-btn"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Submit Leave Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'requests' && (
        <div className="card" data-testid="leave-requests-list">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">My Leave Requests</h2>
          
          {leaveRequests.filter(r => r.user_id === user?.user_id).length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests</h3>
              <p className="text-gray-600 mb-4">You haven't submitted any leave requests yet.</p>
              <button
                onClick={() => setActiveTab('apply')}
                className="btn-primary"
              >
                Apply for Leave
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.filter(r => r.user_id === user?.user_id).map((request) => (
                <div key={request.request_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(request.status)}
                      <span className={`status-${request.status}`}>{request.status}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm font-medium text-gray-900">{request.leave_type_name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(parseISO(request.applied_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium capitalize">{request.duration_type.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Dates:</span>
                      <span className="ml-2 font-medium">
                        {format(parseISO(request.start_date), 'MMM dd')} - {format(parseISO(request.end_date), 'MMM dd')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Days:</span>
                      <span className="ml-2 font-medium">
                        {Math.ceil((new Date(request.end_date) - new Date(request.start_date)) / (1000 * 60 * 60 * 24)) + 1}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <span className="text-gray-600 text-sm">Reason:</span>
                    <p className="text-gray-900 mt-1">{request.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approvals Tab (for managers/admin) */}
      {activeTab === 'approve' && (user?.role === 'admin' || user?.role === 'manager') && (
        <div className="card" data-testid="leave-approvals">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Leave Approvals</h2>
          
          {leaveRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">All leave requests have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.request_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{request.user_name}</h4>
                      <p className="text-sm text-gray-600">{request.employee_id} • {request.leave_type_name}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveReject(request.request_id, 'approved')}
                        className="btn-primary bg-green-600 hover:bg-green-700 text-sm px-3 py-1"
                        data-testid={`approve-${request.request_id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveReject(request.request_id, 'rejected')}
                        className="btn-secondary bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1"
                        data-testid={`reject-${request.request_id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium capitalize">{request.duration_type.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Dates:</span>
                      <span className="ml-2 font-medium">
                        {format(parseISO(request.start_date), 'MMM dd')} - {format(parseISO(request.end_date), 'MMM dd')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Applied:</span>
                      <span className="ml-2 font-medium">
                        {format(parseISO(request.applied_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-600 text-sm">Reason:</span>
                    <p className="text-gray-900 mt-1">{request.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
