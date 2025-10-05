import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import axios from 'axios';
import toast from 'react-hot-toast';

const AttendanceModule = () => {
  const { user } = useAuthStore();
  const [attendanceStatus, setAttendanceStatus] = useState({
    checked_in: false,
    checked_out: false,
    check_in_time: null,
    check_out_time: null,
  });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState('');
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    fetchAttendanceStatus();
    fetchAttendanceLogs();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.log('Location access denied:', error);
          setLocation('Location not available');
        }
      );
    }
    
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const response = await axios.get('/api/attendance/status');
      setAttendanceStatus(response.data);
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    }
  };

  const fetchAttendanceLogs = async () => {
    try {
      const response = await axios.get('/api/attendance/logs');
      setAttendanceLogs(response.data);
    } catch (error) {
      console.error('Error fetching attendance logs:', error);
      toast.error('Failed to load attendance logs');
    }
  };

  const handleCheckIn = async () => {
    if (attendanceStatus.checked_in) {
      toast.error('Already checked in today');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post('/api/attendance/log', {
        action: 'check_in',
        location: location
      });
      toast.success('Checked in successfully!');
      fetchAttendanceStatus();
      fetchAttendanceLogs();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error(error.response?.data?.detail || 'Failed to check in');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceStatus.checked_in) {
      toast.error('Please check in first');
      return;
    }
    
    if (attendanceStatus.checked_out) {
      toast.error('Already checked out today');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post('/api/attendance/log', {
        action: 'check_out',
        location: location
      });
      toast.success('Checked out successfully!');
      fetchAttendanceStatus();
      fetchAttendanceLogs();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error(error.response?.data?.detail || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkingHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut) - new Date(checkIn);
    return (diff / (1000 * 60 * 60)).toFixed(2); // Convert to hours
  };

  const getAttendanceStatusBadge = (date) => {
    const dayLogs = attendanceLogs.filter(log => log.date === date);
    const checkIn = dayLogs.find(log => log.action === 'check_in');
    const checkOut = dayLogs.find(log => log.action === 'check_out');
    
    if (!checkIn) {
      return {
        status: 'Absent',
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-3 w-3" />
      };
    }
    
    if (checkIn && checkOut) {
      return {
        status: 'Present',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle2 className="h-3 w-3" />
      };
    }
    
    return {
      status: 'Incomplete',
      color: 'bg-yellow-100 text-yellow-800',
      icon: <AlertTriangle className="h-3 w-3" />
    };
  };

  // Get current week days for weekly view
  const currentWeek = eachDayOfInterval({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date())
  });

  // Group logs by date
  const logsByDate = attendanceLogs.reduce((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {});

  // Get today's logs
  const today = new Date().toISOString().split('T')[0];
  const todaysLogs = logsByDate[today] || [];
  const todaysCheckIn = todaysLogs.find(log => log.action === 'check_in');
  const todaysCheckOut = todaysLogs.find(log => log.action === 'check_out');

  return (
    <div className="space-y-6" data-testid="attendance-module">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Tracking</h1>
          <p className="text-gray-600 mt-1">Track your daily work attendance</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-gray-600">
            {format(currentTime, 'EEEE, MMMM dd, yyyy')}
          </div>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Today's Status</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Check In */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              attendanceStatus.checked_in ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <LogIn className={`h-8 w-8 ${
                attendanceStatus.checked_in ? 'text-green-600' : 'text-gray-400'
              }`} />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Check In</h3>
            {attendanceStatus.check_in_time ? (
              <p className="text-lg font-semibold text-green-600">
                {format(parseISO(attendanceStatus.check_in_time), 'HH:mm')}
              </p>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
                data-testid="check-in-btn"
              >
                {loading ? 'Checking In...' : 'Check In'}
              </button>
            )}
          </div>
          
          {/* Working Hours */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Working Hours</h3>
            <p className="text-lg font-semibold text-blue-600">
              {calculateWorkingHours(attendanceStatus.check_in_time, attendanceStatus.check_out_time)} hrs
            </p>
          </div>
          
          {/* Check Out */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              attendanceStatus.checked_out ? 'bg-orange-100' : 'bg-gray-100'
            }`}>
              <LogOut className={`h-8 w-8 ${
                attendanceStatus.checked_out ? 'text-orange-600' : 'text-gray-400'
              }`} />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Check Out</h3>
            {attendanceStatus.checked_out ? (
              <p className="text-lg font-semibold text-orange-600">
                {format(parseISO(attendanceStatus.check_out_time), 'HH:mm')}
              </p>
            ) : (
              <button
                onClick={handleCheckOut}
                disabled={loading || !attendanceStatus.checked_in}
                className="btn-secondary disabled:opacity-50"
                data-testid="check-out-btn"
              >
                {loading ? 'Checking Out...' : 'Check Out'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('today')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'today'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="today-tab"
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Today
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'weekly'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="weekly-tab"
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            This Week
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            data-testid="history-tab"
          >
            <User className="h-4 w-4 inline mr-2" />
            History
          </button>
        </nav>
      </div>

      {/* Today Tab */}
      {activeTab === 'today' && (
        <div className="card" data-testid="today-attendance">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Today's Activity</h2>
          
          {todaysLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity today</h3>
              <p className="text-gray-600">Start by checking in to track your attendance.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((log, index) => (
                <div key={`${log.log_id}-${index}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${
                      log.action === 'check_in' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {log.action === 'check_in' ? (
                        <LogIn className={`h-5 w-5 ${
                          log.action === 'check_in' ? 'text-green-600' : 'text-orange-600'
                        }`} />
                      ) : (
                        <LogOut className={`h-5 w-5 ${
                          log.action === 'check_in' ? 'text-green-600' : 'text-orange-600'
                        }`} />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {log.action.replace('_', ' ')}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(log.timestamp), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  {log.location && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="text-sm font-medium text-gray-900">{log.location}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === 'weekly' && (
        <div className="card" data-testid="weekly-attendance">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">This Week's Summary</h2>
          
          <div className="grid grid-cols-7 gap-4">
            {currentWeek.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayLogs = logsByDate[dateStr] || [];
              const checkIn = dayLogs.find(log => log.action === 'check_in');
              const checkOut = dayLogs.find(log => log.action === 'check_out');
              const statusBadge = getAttendanceStatusBadge(dateStr);
              
              return (
                <div key={dateStr} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-lg font-bold text-gray-900 mb-3">
                    {format(day, 'dd')}
                  </div>
                  
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${statusBadge.color}`}>
                    {statusBadge.icon}
                    <span className="ml-1">{statusBadge.status}</span>
                  </div>
                  
                  {checkIn && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-600">In: {format(parseISO(checkIn.timestamp), 'HH:mm')}</div>
                      {checkOut && (
                        <div className="text-xs text-gray-600">Out: {format(parseISO(checkOut.timestamp), 'HH:mm')}</div>
                      )}
                      {checkIn && checkOut && (
                        <div className="text-xs font-medium text-blue-600">
                          {calculateWorkingHours(checkIn.timestamp, checkOut.timestamp)}h
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card" data-testid="attendance-history">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Attendance History</h2>
          
          {attendanceLogs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
              <p className="text-gray-600">Your attendance history will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(logsByDate)
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .slice(0, 10) // Show last 10 days
                .map(([date, logs]) => {
                  const checkIn = logs.find(log => log.action === 'check_in');
                  const checkOut = logs.find(log => log.action === 'check_out');
                  const workingHours = calculateWorkingHours(
                    checkIn?.timestamp,
                    checkOut?.timestamp
                  );
                  const statusBadge = getAttendanceStatusBadge(date);
                  
                  return (
                    <div key={date} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">
                            {format(parseISO(date), 'EEEE, MMMM dd, yyyy')}
                          </h4>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon}
                            <span className="ml-1">{statusBadge.status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {workingHours > 0 ? `${workingHours} hours` : '-'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Check In:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {checkIn ? format(parseISO(checkIn.timestamp), 'HH:mm:ss') : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Check Out:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {checkOut ? format(parseISO(checkOut.timestamp), 'HH:mm:ss') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceModule;
