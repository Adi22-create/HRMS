import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Users,
  Building2,
  Calendar,
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  Settings,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showCreateLeaveType, setShowCreateLeaveType] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '',
    description: '',
    max_days_per_year: '',
    carry_forward_days: '',
    is_paid: true,
    requires_approval: true,
  });

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'hr') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes, leaveTypesRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/departments'),
        axios.get('/api/leave/types')
      ]);
      
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
      setLeaveTypes(leaveTypesRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.description) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await axios.post('/api/admin/departments', deptForm);
      toast.success('Department created successfully!');
      setDeptForm({ name: '', description: '' });
      setShowCreateDept(false);
      fetchAdminData();
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Failed to create department');
    }
  };

  const handleCreateLeaveType = async (e) => {
    e.preventDefault();
    if (!leaveTypeForm.name || !leaveTypeForm.description || !leaveTypeForm.max_days_per_year) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await axios.post('/api/leave/types', {
        ...leaveTypeForm,
        max_days_per_year: parseInt(leaveTypeForm.max_days_per_year),
        carry_forward_days: parseInt(leaveTypeForm.carry_forward_days) || 0,
      });
      toast.success('Leave type created successfully!');
      setLeaveTypeForm({
        name: '',
        description: '',
        max_days_per_year: '',
        carry_forward_days: '',
        is_paid: true,
        requires_approval: true,
      });
      setShowCreateLeaveType(false);
      fetchAdminData();
    } catch (error) {
      console.error('Error creating leave type:', error);
      toast.error('Failed to create leave type');
    }
  };

  const handleDeleteLeaveType = async (typeId) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/leave-types/${typeId}`);
      toast.success('Leave type deleted successfully!');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting leave type:', error);
      toast.error('Failed to delete leave type');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      hr: 'bg-purple-100 text-purple-800',
      employee: 'bg-green-100 text-green-800',
    };
    return badges[role] || badges.employee;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if user has admin access
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return (
      <div className="card text-center py-12">
        <Shield className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">Manage users, departments, and system settings</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="h-4 w-4" />
          <span>Administrator Access</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Users</p>
              <p className="text-2xl font-bold text-blue-900">{users.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Departments</p>
              <p className="text-2xl font-bold text-green-900">{departments.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Leave Types</p>
              <p className="text-2xl font-bold text-purple-900">{leaveTypes.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Active Admins</p>
              <p className="text-2xl font-bold text-orange-900">
                {users.filter(u => u.role === 'admin' || u.role === 'hr').length}
              </p>
            </div>
            <Settings className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="users-tab"
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="departments-tab"
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Departments ({departments.length})
          </button>
          <button
            onClick={() => setActiveTab('leave-types')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'leave-types'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="leave-types-tab"
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Leave Types ({leaveTypes.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card" data-testid="users-management">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          </div>
          
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Users will appear here when they register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.employee_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleBadge(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-6" data-testid="departments-management">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Department Management</h2>
              <button
                onClick={() => setShowCreateDept(!showCreateDept)}
                className="btn-primary"
                data-testid="create-dept-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </button>
            </div>
            
            {showCreateDept && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Department</h3>
                <form onSubmit={handleCreateDepartment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Department Name *</label>
                      <input
                        type="text"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        className="input-field"
                        placeholder="Enter department name"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Description *</label>
                      <input
                        type="text"
                        value={deptForm.description}
                        onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                        className="input-field"
                        placeholder="Enter description"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button type="submit" className="btn-primary">
                      Create Department
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateDept(false);
                        setDeptForm({ name: '', description: '' });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No departments</h3>
                <p className="text-gray-600 mb-4">Create your first department to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.dept_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-5 w-5 text-gray-600" />
                        <h4 className="font-medium text-gray-900">{dept.name}</h4>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{dept.description}</p>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(dept.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Types Tab */}
      {activeTab === 'leave-types' && (
        <div className="space-y-6" data-testid="leave-types-management">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Leave Type Management</h2>
              <button
                onClick={() => setShowCreateLeaveType(!showCreateLeaveType)}
                className="btn-primary"
                data-testid="create-leave-type-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Leave Type
              </button>
            </div>
            
            {showCreateLeaveType && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Leave Type</h3>
                <form onSubmit={handleCreateLeaveType} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Leave Type Name *</label>
                      <input
                        type="text"
                        value={leaveTypeForm.name}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
                        className="input-field"
                        placeholder="e.g., Personal Leave"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Max Days Per Year *</label>
                      <input
                        type="number"
                        value={leaveTypeForm.max_days_per_year}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, max_days_per_year: e.target.value })}
                        className="input-field"
                        placeholder="e.g., 15"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Carry Forward Days</label>
                      <input
                        type="number"
                        value={leaveTypeForm.carry_forward_days}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, carry_forward_days: e.target.value })}
                        className="input-field"
                        placeholder="e.g., 5"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="label">Description *</label>
                      <input
                        type="text"
                        value={leaveTypeForm.description}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })}
                        className="input-field"
                        placeholder="Brief description"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={leaveTypeForm.is_paid}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, is_paid: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Paid Leave</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={leaveTypeForm.requires_approval}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, requires_approval: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Requires Approval</span>
                    </label>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button type="submit" className="btn-primary">
                      Create Leave Type
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateLeaveType(false);
                        setLeaveTypeForm({
                          name: '',
                          description: '',
                          max_days_per_year: '',
                          carry_forward_days: '',
                          is_paid: true,
                          requires_approval: true,
                        });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {leaveTypes.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leave types</h3>
                <p className="text-gray-600 mb-4">Create your first leave type to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveTypes.map((type) => (
                  <div key={type.type_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        <h4 className="font-medium text-gray-900">{type.name}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteLeaveType(type.type_id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete leave type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Days:</span>
                        <span className="font-medium text-gray-900">{type.max_days_per_year}/year</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Carry Forward:</span>
                        <span className="font-medium text-gray-900">{type.carry_forward_days} days</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          type.is_paid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {type.is_paid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Approval:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          type.requires_approval ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {type.requires_approval ? 'Required' : 'Auto'}
                        </span>
                      </div>
                      
                      {/* Features */}
                      <div className="flex space-x-2 mt-3">
                        {type.supports_half_day && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Half Day
                          </span>
                        )}
                        {type.supports_wfh && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            WFH
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
