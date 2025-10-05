import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Plus,
  CreditCard,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Paperclip,
  Eye,
  Check,
  X,
  FileText,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

const ExpenseManagement = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('submit');
  const [categories, setCategories] = useState([]);
  const [expenseRequests, setExpenseRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  
  // Form state for submitting expense
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    amount: '',
    expense_date: '',
    description: '',
  });
  
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchExpenseRequests();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/expense/categories');
      setCategories(response.data);
      if (response.data.length > 0) {
        setExpenseForm(prev => ({ ...prev, category_id: response.data[0].category_id }));
      }
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      toast.error('Failed to load expense categories');
    }
  };

  const fetchExpenseRequests = async () => {
    try {
      const response = await axios.get('/api/expense/requests');
      setExpenseRequests(response.data);
    } catch (error) {
      console.error('Error fetching expense requests:', error);
      toast.error('Failed to load expense requests');
    }
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.category_id || !expenseForm.amount || !expenseForm.expense_date || !expenseForm.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(expenseForm.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/expense/request', expenseForm);
      const requestId = response.data.request_id;
      
      // Upload receipt if provided
      if (receiptFile) {
        await uploadReceipt(requestId, receiptFile);
      }
      
      toast.success('Expense request submitted successfully!');
      setExpenseForm({
        category_id: categories[0]?.category_id || '',
        amount: '',
        expense_date: '',
        description: '',
      });
      setReceiptFile(null);
      fetchExpenseRequests(); // Refresh the list
      setActiveTab('requests'); // Switch to requests tab
    } catch (error) {
      console.error('Error submitting expense:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit expense request');
    } finally {
      setLoading(false);
    }
  };

  const uploadReceipt = async (requestId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploadingReceipt(requestId);
      await axios.post(`/api/expense/upload-receipt/${requestId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Receipt uploaded successfully!');
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setUploadingReceipt(null);
    }
  };

  const handleApproveReject = async (requestId, status) => {
    try {
      await axios.put(`/api/expense/requests/${requestId}?status=${status}`);
      toast.success(`Expense request ${status} successfully`);
      fetchExpenseRequests();
    } catch (error) {
      console.error('Error updating expense request:', error);
      toast.error('Failed to update expense request');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, and PDF files are allowed');
        return;
      }
      
      setReceiptFile(file);
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

  const selectedCategory = categories.find(cat => cat.category_id === expenseForm.category_id);

  return (
    <div className="space-y-6" data-testid="expense-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600 mt-1">Submit expense claims and manage reimbursements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submit'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="submit-expense-tab"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Submit Expense
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="expense-requests-tab"
          >
            <FileText className="h-4 w-4 inline mr-2" />
            My Expenses ({expenseRequests.filter(r => r.user_id === user?.user_id).length})
          </button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={() => setActiveTab('approve')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approve'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="approve-expense-tab"
            >
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Approvals ({expenseRequests.filter(r => r.status === 'pending').length})
            </button>
          )}
        </nav>
      </div>

      {/* Submit Expense Tab */}
      {activeTab === 'submit' && (
        <div className="card" data-testid="submit-expense-form">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Submit New Expense Claim</h2>
          
          <form onSubmit={handleSubmitExpense} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="label">Expense Category *</label>
              <select
                value={expenseForm.category_id}
                onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                className="input-field"
                required
                data-testid="expense-category-select"
              >
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name} (Max: ${category.max_amount_per_month}/month)
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCategory.description} • Max limit: ${selectedCategory.max_amount_per_month}/month
                </p>
              )}
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Amount *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="input-field pl-10"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    data-testid="expense-amount-input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Expense Date *</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="input-field"
                  max={new Date().toISOString().split('T')[0]}
                  required
                  data-testid="expense-date-input"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label">Description *</label>
              <textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="input-field"
                rows={4}
                placeholder="Please provide details about this expense..."
                required
                data-testid="expense-description-input"
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <label className="label">Receipt/Proof {selectedCategory?.requires_receipt && '*'}</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Receipt className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="btn-secondary">
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Receipt File
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleFileChange}
                        data-testid="receipt-upload-input"
                      />
                    </label>
                    <p className="text-sm text-gray-600">
                      Upload JPEG, PNG, or PDF (Max 5MB)
                    </p>
                  </div>
                  
                  {receiptFile && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg inline-flex items-center space-x-2">
                      <Paperclip className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-900">{receiptFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {selectedCategory?.requires_receipt && (
                <p className="text-sm text-amber-600 mt-2">* Receipt is required for this category</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || (selectedCategory?.requires_receipt && !receiptFile)}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-expense-btn"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Submit Expense Claim
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expense Requests Tab */}
      {activeTab === 'requests' && (
        <div className="card" data-testid="expense-requests-list">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">My Expense Claims</h2>
          
          {expenseRequests.filter(r => r.user_id === user?.user_id).length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expense claims</h3>
              <p className="text-gray-600 mb-4">You haven't submitted any expense claims yet.</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="btn-primary"
              >
                Submit Expense
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseRequests.filter(r => r.user_id === user?.user_id).map((request) => (
                <div key={request.request_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(request.status)}
                      <span className={`status-${request.status}`}>{request.status}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm font-medium text-gray-900">{request.category_name}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-bold text-gray-900">${request.amount}</span>
                      <span className="text-sm text-gray-500">
                        {format(parseISO(request.submitted_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Expense Date:</span>
                      <span className="ml-2 font-medium">
                        {format(parseISO(request.expense_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-600">Receipt:</span>
                      {request.receipt_url ? (
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}${request.receipt_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary-600 hover:text-primary-800 font-medium flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Receipt
                        </a>
                      ) : (
                        <span className="ml-2 text-gray-400">No receipt</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-600 text-sm">Description:</span>
                    <p className="text-gray-900 mt-1">{request.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Approvals Tab (for managers/admin) */}
      {activeTab === 'approve' && (user?.role === 'admin' || user?.role === 'manager') && (
        <div className="card" data-testid="expense-approvals">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Expense Approvals</h2>
          
          {expenseRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">All expense claims have been processed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenseRequests.filter(r => r.status === 'pending').map((request) => (
                <div key={request.request_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{request.user_name}</h4>
                      <p className="text-sm text-gray-600">{request.employee_id} • {request.category_name}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl font-bold text-gray-900">${request.amount}</span>
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Expense Date:</span>
                      <span className="ml-2 font-medium">
                        {format(parseISO(request.expense_date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Submitted:</span>
                      <span className="ml-2 font-medium">
                        {format(parseISO(request.submitted_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <span className="text-gray-600 text-sm">Description:</span>
                    <p className="text-gray-900 mt-1">{request.description}</p>
                  </div>
                  
                  {request.receipt_url && (
                    <div className="flex items-center">
                      <span className="text-gray-600 text-sm">Receipt:</span>
                      <a
                        href={`${process.env.REACT_APP_BACKEND_URL}${request.receipt_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary-600 hover:text-primary-800 font-medium flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Receipt
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
