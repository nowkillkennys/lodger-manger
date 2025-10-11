import React, { useState, useEffect } from 'react';
import { Home, Users, Settings, LogOut, Bell, Plus, Eye, FileText, TrendingUp, Clock, AlertCircle, Download, AlertTriangle, DollarSign, Shield, UserCheck, UserX, Key, RefreshCw, Crown, Database, Activity } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { showSuccess, showError } from '../utils/toast';

/**
 * System Admin Dashboard Component
 * Provides complete system administration features for the System Administrator only
 * Enhanced version of AdminDashboard.jsx with exclusive system-admin capabilities
 */
const SystemAdminDashboard = ({ user, onLogout }) => {
  console.log('SystemAdminDashboard.jsx - Component loaded for user:', user?.email);
  console.log('SystemAdminDashboard.jsx - User type:', user?.user_type);
  console.log('SystemAdminDashboard.jsx - User email:', user?.email);

  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState({
    totalLandlords: 0,
    totalLodgers: 0,
    totalTenancies: 0,
    totalRevenue: 0,
    totalAdmins: 0
  });
  const [landlords, setLandlords] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [factoryResetPassword, setFactoryResetPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '', message: '', type: 'info', target_audience: 'all', expires_at: ''
  });

  // Broadcast state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    subject: '', message: '', target_role: 'all'
  });

  // Monitoring state
  const [systemHealth, setSystemHealth] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [apiAnalytics, setApiAnalytics] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [activityTimeRange, setActivityTimeRange] = useState('24h');
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('24h');
  const [logTimeRange, setLogTimeRange] = useState('24h');
  const [activeMonitoringTab, setActiveMonitoringTab] = useState('health');
  const [searchFilters, setSearchFilters] = useState({
    search: '', role: '', status: ''
  });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '', password: '', full_name: '', phone: '', user_type: 'lodger', landlord_id: '', landlord_email: ''
  });

  // System-admin specific state
  const [subAdmins, setSubAdmins] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [availableLandlords, setAvailableLandlords] = useState([]);
  const [showClaimLodgerModal, setShowClaimLodgerModal] = useState(false);
  const [claimStep, setClaimStep] = useState('email');
  const [claimLodgerForm, setClaimLodgerForm] = useState({
    lodger_email: '',
    assign_to_landlord_id: '',
    assign_to_landlord_email: ''
  });
  const [assignMethod, setAssignMethod] = useState('email');
  const [lodgerPreview, setLodgerPreview] = useState(null);
  const [showUnlinkUsersModal, setShowUnlinkUsersModal] = useState(false);
  const [unlinkForm, setUnlinkForm] = useState({
    lodger_email: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // System Administrator identification
  const isSystemAdministrator = user?.user_type === 'sys_admin';

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    if (activeTab === 'monitoring') {
      fetchActivityFeed();
      fetchApiAnalytics();
      if (activeMonitoringTab === 'logs') fetchSystemLogs();
    }
  }, [activeTab, activityTimeRange, analyticsTimeRange, activeMonitoringTab, logTimeRange]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotificationDropdown && !event.target.closest('.notification-container')) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationDropdown]);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch all data in parallel
      const responses = await Promise.allSettled([
        axios.get(`${API_URL}/api/admin/stats`, config),
        axios.get(`${API_URL}/api/admin/landlords-with-lodgers`, config),
        axios.get(`${API_URL}/api/admin/reset-requests`, config),
        axios.get(`${API_URL}/api/notifications`, config),
        axios.get(`${API_URL}/api/users`, config)
      ]);

      // Handle system stats
      if (responses[0].status === 'fulfilled') {
        setSystemStats(responses[0].value.data);
      }

      // Handle landlords with lodgers
      if (responses[1].status === 'fulfilled') {
        setLandlords(responses[1].value.data);
      }

      // Handle reset requests
      if (responses[2].status === 'fulfilled') {
        setResetRequests(responses[2].value.data);
      }

      // Handle notifications
      if (responses[3].status === 'fulfilled') {
        setNotifications(responses[3].value.data);
      }

      // Handle users
      if (responses[4].status === 'fulfilled') {
        const allUsers = responses[4].value.data;
        setUsers(allUsers);

        // Separate sub-admins for system-admin management
        const adminUsers = allUsers.filter(u => u.user_type === 'admin' && u.email !== 'admin@example.com');
        setSubAdmins(adminUsers);
      }

    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryReset = async () => {
    if (!factoryResetPassword) {
      showError('Please enter your password to confirm factory reset');
      return;
    }

    if (confirmText !== 'FACTORY RESET') {
      showError('Please type "FACTORY RESET" exactly to confirm');
      return;
    }

    const confirmed = confirm(
      '🚨 COMPLETE DATABASE RESET 🚨\n\n' +
      'This will DROP ALL TABLES and recreate them from scratch:\n' +
      '• All tenancies, payments, lodgers, notices will be DELETED\n' +
      '• Database schema will be completely rebuilt\n' +
      '• Admin account will be recreated\n' +
      '• You will need to set admin password and run setup again\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to proceed?'
    );

    if (!confirmed) {
      setFactoryResetPassword('');
      setConfirmText('');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/factory-reset`, {
        password: factoryResetPassword,
        confirm_text: confirmText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess(response.data.message + (response.data.note ? '\n\n' + response.data.note : ''));

      // Clear fields
      setFactoryResetPassword('');
      setConfirmText('');

      // Log out and redirect to login (which will trigger setup flow)
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('Factory reset error:', error);
      showError(error.response?.data?.error || 'Failed to perform factory reset');
      setFactoryResetPassword('');
      setConfirmText('');
    }
  };

  const handleDeleteUser = (user) => {
    // System Administrator can delete any user including other admins
    setEditingUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteUser = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/users/${editingUser.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('User deleted successfully');
      setShowDeleteModal(false);
      setEditingUser(null);
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleCreateSubAdmin = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
      showError('Please fill in all required fields');
      return;
    }

    if (newUserForm.password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/auth/register`, {
        ...newUserForm,
        user_type: 'admin'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Sub-admin created successfully');
      setShowAddUserModal(false);
      setNewUserForm({ email: '', password: '', full_name: '', phone: '', user_type: 'lodger', landlord_id: '', landlord_email: '' });
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create sub-admin');
    }
  };

  const fetchAvailableLandlords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users/landlords`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableLandlords(response.data);
    } catch (error) {
      console.error('Fetch landlords error:', error);
    }
  };

  const handleClaimLodgerEmailSubmit = async (e) => {
    e.preventDefault();
    if (!claimLodgerForm.lodger_email) {
      showError('Please enter lodger email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(claimLodgerForm.lodger_email)) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const lodgerResult = await axios.get(`${API_URL}/api/users/lodgers?email=${encodeURIComponent(claimLodgerForm.lodger_email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const lodgers = lodgerResult.data.filter(u => u.user_type === 'lodger');
      const foundLodger = lodgers.find(l => l.email.toLowerCase() === claimLodgerForm.lodger_email.toLowerCase());

      if (foundLodger) {
        if (foundLodger.landlord_id) {
          showError('This lodger is already linked to a landlord');
          return;
        }
        setLodgerPreview(foundLodger);
        setClaimStep('confirm');
      } else {
        showError('Lodger not found with this email address');
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to find lodger');
    }
  };

  const handleClaimLodgerConfirm = async () => {
    try {
      const token = localStorage.getItem('token');

      if (assignMethod === 'email' && claimLodgerForm.assign_to_landlord_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(claimLodgerForm.assign_to_landlord_email)) {
          showError('Please enter a valid landlord email address');
          return;
        }

        await axios.post(`${API_URL}/api/users/${lodgerPreview.id}/claim`, {
          landlord_email: claimLodgerForm.assign_to_landlord_email
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else if (assignMethod === 'id' && claimLodgerForm.assign_to_landlord_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(claimLodgerForm.assign_to_landlord_id)) {
          showError('Please enter a valid landlord ID (UUID format)');
          return;
        }

        await axios.post(`${API_URL}/api/users/${lodgerPreview.id}/claim`, {
          landlord_id: claimLodgerForm.assign_to_landlord_id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/users/claim-lodger`, {
          lodger_email: claimLodgerForm.lodger_email
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      showSuccess(`Lodger successfully linked and assigned!`);
      setShowClaimLodgerModal(false);
      setClaimStep('email');
      setClaimLodgerForm({ lodger_email: '', assign_to_landlord_id: '', assign_to_landlord_email: '' });
      setLodgerPreview(null);
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to link lodger');
    }
  };

  const handleUnlinkLodger = async (lodgerId) => {
    if (!confirm('Are you sure you want to unlink this lodger? They will no longer be associated with their current landlord.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/users/${lodgerId}/unlink`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Lodger successfully unlinked!');
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to unlink lodger');
    }
  };

  // Import other handlers from AdminDashboard.jsx
  const handleResetRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/reset-requests/${requestId}/action`, {
        action: action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess(`Reset request ${action} successfully`);
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to process reset request');
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(
          `${API_URL}/api/notifications/${notification.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      } catch (error) {
        console.error('Mark notification as read error:', error);
      }
    }

    setShowNotificationDropdown(false);
    if (notification.type === 'payment_reminder' || notification.type === 'payment_received') {
      setActiveTab('overview');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${editingUser.id}`, {
        email: editingUser.email,
        full_name: editingUser.full_name,
        phone: editingUser.phone,
        is_active: editingUser.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = (user) => {
    setEditingUser(user);
    setNewPassword('');
    setShowPasswordResetModal(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/users/${editingUser.id}/reset-password`, {
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Password reset successfully');
      setShowPasswordResetModal(false);
      setEditingUser(null);
      setNewPassword('');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${user.id}`, {
        is_active: !user.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleCreateAnnouncement = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/announcements`, announcementForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess('Announcement created successfully');
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', message: '', type: 'info', target_audience: 'all', expires_at: '' });
      fetchAnnouncementsData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create announcement');
    }
  };

  const handleSendBroadcast = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/announcements/broadcast`, broadcastForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showSuccess(`Broadcast sent to ${response.data.recipient_count} users`);
      setShowBroadcastModal(false);
      setBroadcastForm({ subject: '', message: '', target_role: 'all' });
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to send broadcast');
    }
  };

  const fetchAnnouncementsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/announcements/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Fetch announcements error:', error);
    }
  };

  const fetchMonitoringData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [healthRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/monitoring/health`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/monitoring/users/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSystemHealth(healthRes.data);
      setUserStats(statsRes.data);
    } catch (error) {
      console.error('Fetch monitoring data error:', error);
    }
  };

  const fetchActivityFeed = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/monitoring/activity-feed?limit=50&time_range=${activityTimeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivityFeed(response.data.activities || []);
    } catch (error) {
      console.error('Fetch activity feed error:', error);
    }
  };

  const fetchApiAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const [analyticsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/api/monitoring/analytics?time_range=${analyticsTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/monitoring/analytics/summary?time_range=${analyticsTimeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setApiAnalytics(summaryRes.data);
    } catch (error) {
      console.error('Fetch API analytics error:', error);
    }
  };

  const fetchSystemLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/monitoring/logs?time_range=${logTimeRange}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSystemLogs(response.data.logs || []);
    } catch (error) {
      console.error('Fetch system logs error:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navigation Bar for System Admin */}
      <nav className="bg-gradient-to-r from-red-600 to-red-700 border-b border-red-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
              <Crown className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">System Administrator</h1>
              <p className="text-xs text-red-100">Complete System Control</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative notification-container">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2 text-white hover:text-red-100 hover:bg-red-800 rounded-lg transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-yellow-400 text-red-900 text-xs rounded-full flex items-center justify-center px-1 font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Enhanced Notification Dropdown */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 bg-red-50">
                    <h3 className="font-semibold text-red-900">System Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">{unreadCount} unread</p>
                    )}
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                              !notification.is_read ? 'bg-red-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                notification.type === 'payment_reminder' ? 'bg-orange-100' :
                                notification.type === 'payment_received' ? 'bg-green-100' :
                                notification.type === 'notice_given' ? 'bg-red-100' :
                                'bg-blue-100'
                              }`}>
                                <Bell className={`w-4 h-4 ${
                                  notification.type === 'payment_reminder' ? 'text-orange-600' :
                                  notification.type === 'payment_received' ? 'text-green-600' :
                                  notification.type === 'notice_given' ? 'text-red-600' :
                                  'text-blue-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className={`text-sm font-medium ${
                                    !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  {!notification.is_read && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {notification.message}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-12 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => setShowNotificationDropdown(false)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-white bg-opacity-10 rounded-lg backdrop-blur-sm">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{user.fullName}</p>
                <p className="text-xs text-red-100">System Administrator</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-white hover:text-red-200 hover:bg-red-800 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Tab Navigation for System Admin */}
        <div className="mb-6 border-b-2 border-red-200">
          <nav className="flex gap-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'System Overview', icon: Activity },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'sub-admins', label: 'Sub-Admins', icon: Shield },
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'monitoring', label: 'System Monitor', icon: Database },
              { id: 'reset-requests', label: 'Reset Requests', icon: RefreshCw },
              { id: 'settings', label: 'System Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-1 py-4 border-b-2 transition font-medium capitalize whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* System Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Enhanced System Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Landlords</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalLandlords}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Lodgers</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalLodgers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Home className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Tenancies</p>
                    <p className="text-2xl font-bold text-gray-900">{systemStats.totalTenancies}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">£{systemStats.totalRevenue}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sub-Admins</p>
                    <p className="text-2xl font-bold text-gray-900">{subAdmins.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Reset Requests */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Recent Reset Requests</h3>
                  <button
                    onClick={() => setActiveTab('reset-requests')}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    View All →
                  </button>
                </div>
                {resetRequests.length > 0 ? (
                  <div className="space-y-3">
                    {resetRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{request.landlord_name}</p>
                          <p className="text-sm text-gray-600">{request.request_type.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            request.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {request.status}
                          </span>
                          <button
                            onClick={() => handleResetRequestAction(request.id, 'view')}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No reset requests</p>
                )}
              </div>

              {/* Sub-Admins Overview */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Sub-Administrators</h3>
                  <button
                    onClick={() => setActiveTab('sub-admins')}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Manage →
                  </button>
                </div>
                {subAdmins.length > 0 ? (
                  <div className="space-y-3">
                    {subAdmins.slice(0, 3).map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-red-900">{admin.full_name}</p>
                          <p className="text-sm text-red-700">{admin.email}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Sub-Admin
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 mb-3">No sub-admins created yet</p>
                    <button
                      onClick={() => setActiveTab('sub-admins')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                    >
                      Create First Sub-Admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sub-Admins Management Tab */}
        {activeTab === 'sub-admins' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Sub-Administrator Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Create and manage sub-administrators with limited system access
                </p>
              </div>
              <button
                onClick={() => {
                  setNewUserForm({ email: '', password: '', full_name: '', phone: '', user_type: 'admin' });
                  setShowAddUserModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                <Plus className="w-5 h-5" />
                Create Sub-Admin
              </button>
            </div>

            {subAdmins.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">All Sub-Admins</h3>
                  <p className="text-sm text-gray-600">Manage sub-admin accounts and permissions</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Administrator
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                  <Shield className="w-5 h-5 text-red-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {admin.full_name}
                                </div>
                                <div className="text-sm text-red-600 font-medium">
                                  Sub-Administrator
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{admin.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{admin.phone || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {admin.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(admin.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleEditUser(admin)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleResetPassword(admin)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(admin)}
                                className={`${
                                  admin.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                                }`}
                              >
                                {admin.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(admin)}
                                className="text-red-600 hover:text-red-900 font-medium"
                                title="Delete this sub-admin"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Sub-Admins Yet</h3>
                <p className="text-gray-600 mb-6">Create sub-admin accounts to delegate system management tasks</p>
                <button
                  onClick={() => {
                    setNewUserForm({ email: '', password: '', full_name: '', phone: '', user_type: 'admin' });
                    setShowAddUserModal(true);
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Sub-Admin
                </button>
              </div>
            )}
          </div>
        )}

        {/* Include other tabs from AdminDashboard.jsx but with system-admin enhancements */}
        {/* Users Tab - Enhanced for System Admin */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Complete User Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Full system access to all user accounts and relationships
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowClaimLodgerModal(true);
                    fetchAvailableLandlords();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <UserCheck className="w-5 h-5" />
                  Link Users
                </button>
                <button
                  onClick={() => setShowUnlinkUsersModal('email')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <UserX className="w-5 h-5" />
                  Unlink Users
                </button>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  Add User
                </button>
              </div>
            </div>

            {/* Enhanced User Table */}
            {users.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">All System Users</h3>
                  <p className="text-sm text-gray-600">Complete user management with system-admin privileges</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Landlord Link
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                  user.user_type === 'admin' ? 'bg-red-100' :
                                  user.user_type === 'landlord' ? 'bg-blue-100' :
                                  'bg-green-100'
                                }`}>
                                  <span className={`text-sm font-medium ${
                                    user.user_type === 'admin' ? 'text-red-700' :
                                    user.user_type === 'landlord' ? 'text-blue-700' :
                                    'text-green-700'
                                  }`}>
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.user_type === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : user.user_type === 'landlord'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {user.user_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.user_type === 'lodger' ? (
                              user.landlord_id ? (
                                <div className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-green-600" />
                                  <div className="text-sm">
                                    <div className="text-green-700 font-medium">
                                      {user.landlord_name || `Landlord #${user.landlord_id}`}
                                    </div>
                                    <div className="text-green-600 text-xs">
                                      {user.landlord_email}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                                  <span className="text-sm text-gray-500">
                                    Unassigned
                                  </span>
                                </div>
                              )
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleResetPassword(user)}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`${
                                  user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                                }`}
                              >
                                {user.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              {user.user_type === 'lodger' && !user.landlord_id && (
                                <button
                                  onClick={() => {
                                    setClaimLodgerForm({
                                      lodger_email: user.email,
                                      assign_to_landlord_id: ''
                                    });
                                    setLodgerPreview(user);
                                    setClaimStep('confirm');
                                    setShowClaimLodgerModal(true);
                                    fetchAvailableLandlords();
                                  }}
                                  className="text-green-600 hover:text-green-900 font-medium"
                                  title="Link this lodger"
                                >
                                  Link
                                </button>
                              )}
                              {user.user_type === 'lodger' && user.landlord_id && (
                                <button
                                  onClick={() => handleUnlinkLodger(user.id)}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                  title="Unlink this lodger from their landlord"
                                >
                                  Unlink
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className={`font-medium ${
                                  user.user_type === 'admin' && user.email === 'admin@example.com'
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-red-600 hover:text-red-900'
                                }`}
                                title={
                                  user.user_type === 'admin' && user.email === 'admin@example.com'
                                    ? 'Cannot delete System Administrator'
                                    : 'Delete this user'
                                }
                                disabled={user.user_type === 'admin' && user.email === 'admin@example.com'}
                              >
                                {user.user_type === 'admin' && user.email === 'admin@example.com' ? 'Protected' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Users Yet</h3>
                <p className="text-gray-600">Users will appear here once they register</p>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab with Factory Reset */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">System Administration</h2>

            {/* Backup & Export Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">System Backup & Export</h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Export Full Database</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Download a complete JSON export of all platform data including users, tenancies, payments, and more.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const response = await axios.get(`${API_URL}/api/admin/backup/json`, {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: 'blob'
                          });

                          const blob = new Blob([response.data], { type: 'application/json' });
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `lodger-manager-backup-${new Date().toISOString()}.json`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          showError('Failed to download backup: ' + (error.response?.data?.error || error.message));
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download JSON Backup
                    </button>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">PostgreSQL Database Dump</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Download a PostgreSQL SQL dump file for complete database restoration.
                    </p>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const response = await axios.get(`${API_URL}/api/admin/backup/database`, {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: 'blob'
                          });

                          const blob = new Blob([response.data], { type: 'application/sql' });
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', `lodger-manager-db-${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          showError('Failed to download database dump: ' + (error.response?.data?.error || error.message));
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download SQL Dump
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>💡 Tip:</strong> Regular backups are recommended before making significant changes or performing factory resets. Store backups securely outside the server.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Factory Reset Section - System Admin Exclusive */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4 text-red-600">System Control Center</h3>
              <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start gap-3 mb-4">
                  <Crown className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900 mb-2">Complete Factory Reset</h4>
                    <p className="text-sm text-red-800 mb-3">
                      This will completely reset the database by dropping all tables and recreating them from scratch.
                      ALL data will be permanently deleted including tenancies, payments, lodgers, and notices.
                      Only your admin account will remain. This action cannot be undone!
                    </p>

                    <div className="space-y-3">
                      <div className="bg-white border border-red-300 rounded-lg p-3">
                        <p className="text-sm font-semibold text-red-900 mb-2">Enter your password:</p>
                        <input
                          type="password"
                          value={factoryResetPassword}
                          onChange={(e) => setFactoryResetPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Enter system administrator password"
                        />
                      </div>

                      <div className="bg-white border border-red-300 rounded-lg p-3">
                        <p className="text-sm font-semibold text-red-900 mb-2">Type "FACTORY RESET" to confirm:</p>
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="FACTORY RESET"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded-lg">
                      <p className="text-sm font-bold text-red-900 mb-1">⚠️ FINAL WARNING</p>
                      <p className="text-xs text-red-800">
                        This will drop all database tables and recreate them. After reset, you will need to set the admin password again and complete the setup wizard.
                      </p>
                    </div>

                    <button
                      onClick={handleFactoryReset}
                      disabled={!factoryResetPassword || confirmText !== 'FACTORY RESET'}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Complete Factory Reset - Drop & Recreate Database
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Include other modals and components from AdminDashboard.jsx */}
        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Type *</label>
                  <select
                    value={newUserForm.user_type}
                    onChange={(e) => {
                      setNewUserForm({ ...newUserForm, user_type: e.target.value, landlord_id: '', landlord_email: '' });
                      if (e.target.value === 'lodger') {
                        fetchAvailableLandlords();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="lodger">Lodger</option>
                    <option value="landlord">Landlord</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Landlord assignment for lodgers */}
                {newUserForm.user_type === 'lodger' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Landlord Email *</label>
                    <input
                      type="email"
                      value={newUserForm.landlord_email || ''}
                      onChange={(e) => setNewUserForm({ ...newUserForm, landlord_email: e.target.value, landlord_id: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="landlord@example.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the email address of an existing landlord account
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={newUserForm.user_type === 'admin' ? handleCreateSubAdmin : handleAddUser}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                >
                  Create User
                </button>
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUserForm({ email: '', password: '', full_name: '', phone: '', user_type: 'lodger', landlord_id: '', landlord_email: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Delete User</h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{editingUser.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{editingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Role</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      editingUser.user_type === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : editingUser.user_type === 'landlord'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {editingUser.user_type}
                    </span>
                  </div>
                  {editingUser.user_type === 'lodger' && editingUser.landlord_id && (
                    <div>
                      <p className="text-sm text-gray-600">Linked to Landlord</p>
                      <p className="font-medium text-red-600">
                        {editingUser.landlord_name || `Landlord #${editingUser.landlord_id}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Warning:</strong> This will permanently delete the user account and all associated data.
                  {editingUser.user_type === 'lodger' && editingUser.landlord_id && ' The landlord-lodger association will be automatically removed.'}
                  {editingUser.user_type === 'admin' && editingUser.email !== 'admin@example.com' && ' This admin user and all their permissions will be removed.'}
                  {editingUser.user_type === 'admin' && editingUser.email === 'admin@example.com' && ' You cannot delete the System Administrator account.'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDeleteUser}
                  disabled={editingUser.user_type === 'admin' && editingUser.email === 'admin@example.com'}
                  className={`flex-1 py-2 px-4 rounded-lg transition font-semibold ${
                    editingUser.user_type === 'admin' && editingUser.email === 'admin@example.com'
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {editingUser.user_type === 'admin' && editingUser.email === 'admin@example.com' ? 'Cannot Delete' : 'Delete User'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Include other modals as needed */}
      </div>
    </div>
  );
};

export default SystemAdminDashboard;