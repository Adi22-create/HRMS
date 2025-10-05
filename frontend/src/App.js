import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import LeaveManagement from './components/Leave/LeaveManagement';
import ExpenseManagement from './components/Expense/ExpenseManagement';
import AttendanceModule from './components/Attendance/AttendanceModule';
import ReportsModule from './components/Reports/ReportsModule';
import AdminPanel from './components/Admin/AdminPanel';
import Layout from './components/Layout/Layout';

function App() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Login />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/expense" element={<ExpenseManagement />} />
            <Route path="/attendance" element={<AttendanceModule />} />
            <Route path="/reports" element={<ReportsModule />} />
            {(user?.role === 'admin' || user?.role === 'hr') && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;
