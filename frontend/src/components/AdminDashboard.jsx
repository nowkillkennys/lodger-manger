import React, { useState, useEffect } from 'react';
import { Home, Users, Settings, LogOut, Bell, Plus, Eye, FileText, TrendingUp, Clock, AlertCircle, Download, AlertTriangle, DollarSign, Shield, UserCheck, UserX, Key, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { showSuccess, showError } from '../utils/toast';

/**
 * Admin Dashboard Component
 * Provides system-wide administration features for admin users
 */
const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState({
    totalLandlords: 0,
    totalLodgers: 0,
    totalTenancies: 0,
    totalRevenue: 0
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
  const [availableLandlords, setAvailableLandlords] = useState([]);
  const [showClaimLodgerModal, setShowClaimLodgerModal] = useState(false);
  const [claimStep, setClaimStep] = useState('email'); // 'email' or 'confirm'
  const [claimLodgerForm, setClaimLodgerForm] = useState({
    lodger_email: '',
    assign_to_landlord_id: '', // Keep for backward compatibility
    assign_to_landlord_email: '' // Admin can assign to specific landlord by email
  });
  const [assignMethod, setAssignMethod] = useState('email'); // 'email' or 'id'
  const [lodgerPreview, setLodgerPreview] = useState(null);
  const [showUnlinkUsersModal, setShowUnlinkUsersModal] = useState(false); // false, 'email', or 'confirm'
  const [unlinkForm, setUnlinkForm] = useState({
    lodger_email: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
        setUsers(responses[4].value.data);
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

  const handleResetRequestAction = async (requestId, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/reset-requests/${requestId}/action`, {
        action: action
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess(`Reset request ${action} successfully`);
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Reset request action error:', error);
      showError(error.response?.data?.error || 'Failed to process reset request');
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(
          `${API_URL}/api/notifications/${notification.id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        // Update local state
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        ));
      } catch (error) {
        console.error('Mark notification as read error:', error);
      }
    }

    // Navigate to relevant tab based on notification type
    setShowNotificationDropdown(false);

    if (notification.type === 'payment_reminder' || notification.type === 'payment_received') {
      setActiveTab('overview');
    } else if (notification.type === 'notice_given') {
      setActiveTab('overview');
    } else if (notification.type === 'tenancy_expiring') {
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
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Update user error:', error);
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
      console.error('Reset password error:', error);
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
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Toggle user status error:', error);
      showError(error.response?.data?.error || 'Failed to update user status');
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

  const handleAddUser = async () => {
    if (!newUserForm.email || !newUserForm.password || !newUserForm.full_name) {
      showError('Please fill in all required fields');
      return;
    }

    if (newUserForm.password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    // If creating a lodger, landlord_email is required
    if (newUserForm.user_type === 'lodger' && !newUserForm.landlord_email) {
      showError('Please enter a landlord email address for the lodger');
      return;
    }

    // Validate landlord email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newUserForm.user_type === 'lodger' && !emailRegex.test(newUserForm.landlord_email)) {
      showError('Please enter a valid landlord email address');
      return;
    }

    try {
       const token = localStorage.getItem('token');

       // Prepare the data to send - use landlord_email instead of landlord_id
       const { landlord_id, ...formData } = newUserForm;
       const submitData = {
         ...formData,
         landlord_email: newUserForm.user_type === 'lodger' ? newUserForm.landlord_email : undefined
       };

       await axios.post(`${API_URL}/api/auth/register`, submitData, {
         headers: { Authorization: `Bearer ${token}` }
       });

       showSuccess('User created successfully');
       setShowAddUserModal(false);
       setNewUserForm({ email: '', password: '', full_name: '', phone: '', user_type: 'lodger', landlord_id: '', landlord_email: '' });
       fetchAdminData(); // Refresh data
     } catch (error) {
       console.error('Add user error:', error);
       showError(error.response?.data?.error || 'Failed to create user');
     }
  };

  const handleClaimLodgerEmailSubmit = async (e) => {
    e.preventDefault();
    if (!claimLodgerForm.lodger_email) {
      showError('Please enter lodger email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(claimLodgerForm.lodger_email)) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      // First, try to find the lodger by email to show preview
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
        // Show confirmation step with lodger details
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

      // If admin specified a landlord assignment, use the claim by ID endpoint
      if (assignMethod === 'email' && claimLodgerForm.assign_to_landlord_email) {
        // Validate landlord email format
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
        // Validate landlord ID format (UUID)
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
        // Use email-based claiming
        await axios.post(`${API_URL}/api/users/claim-lodger`, {
          lodger_email: claimLodgerForm.lodger_email
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      showSuccess(`Lodger successfully linked and assigned to ${response.data.landlord?.full_name || 'landlord'}!`);
      setShowClaimLodgerModal(false);
      setClaimStep('email');
      setClaimLodgerForm({ lodger_email: '', assign_to_landlord_id: '', assign_to_landlord_email: '' });
      setLodgerPreview(null);
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to link lodger');
    }
  };

  const handleClaimModalClose = () => {
    setShowClaimLodgerModal(false);
    setClaimStep('email');
    setAssignMethod('email');
    setClaimLodgerForm({ lodger_email: '', assign_to_landlord_id: '', assign_to_landlord_email: '' });
    setLodgerPreview(null);
  };

  const handleUnlinkUsersEmailSubmit = async (e) => {
    e.preventDefault();
    if (!unlinkForm.lodger_email) {
      showError('Please enter lodger email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(unlinkForm.lodger_email)) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      // First, try to find the lodger by email to show preview
      const token = localStorage.getItem('token');
      const lodgerResult = await axios.get(`${API_URL}/api/users/lodgers?email=${encodeURIComponent(unlinkForm.lodger_email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const lodgers = lodgerResult.data.filter(u => u.user_type === 'lodger');
      const foundLodger = lodgers.find(l => l.email.toLowerCase() === unlinkForm.lodger_email.toLowerCase());

      if (foundLodger) {
        if (!foundLodger.landlord_id) {
          showError('This lodger is not currently assigned to any landlord');
          return;
        }
        // Show confirmation step with lodger details
        setUnlinkForm({ ...unlinkForm, lodgerToUnlink: foundLodger });
        setShowUnlinkUsersModal('confirm');
      } else {
        showError('Lodger not found with this email address');
      }
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to find lodger');
    }
  };

  const handleUnlinkUsersConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/users/${unlinkForm.lodgerToUnlink.id}/unlink`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Lodger successfully unlinked!');
      setShowUnlinkUsersModal(false);
      setUnlinkForm({ lodger_email: '' });
      fetchAdminData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to unlink lodger');
    }
  };

  const handleUnlinkUsersClose = () => {
    setShowUnlinkUsersModal(false);
    setUnlinkForm({ lodger_email: '', lodgerToUnlink: null });
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

  const handleDeleteUser = (user) => {
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

  // Announcement handlers
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
      console.error('Create announcement error:', error);
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
      console.error('Send broadcast error:', error);
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
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">System Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative notification-container">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{unreadCount} unread</p>
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
                              !notification.is_read ? 'bg-blue-50' : ''
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
                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
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
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.userType}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8 overflow-x-auto">
            {['overview', 'users', 'announcements', 'monitoring', 'reset-requests', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-4 border-b-2 transition font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'reset-requests' ? 'Reset Requests' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
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

              <div className="bg-white rounded-lg shadow p-6">
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

              <div className="bg-white rounded-lg shadow p-6">
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

              <div className="bg-white rounded-lg shadow p-6">
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
            </div>

            {/* Recent Reset Requests */}
            <div className="bg-white rounded-lg shadow p-6">
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
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage system users and their accounts
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowClaimLodgerModal(true);
                    fetchAvailableLandlords(); // Refresh landlords list when opening modal
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

            {/* Search Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Search & Filter Users</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchFilters.search}
                  onChange={(e) => setSearchFilters({...searchFilters, search: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={searchFilters.role}
                  onChange={(e) => setSearchFilters({...searchFilters, role: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Roles</option>
                  <option value="landlord">Landlords</option>
                  <option value="lodger">Lodgers</option>
                  <option value="admin">Admins</option>
                </select>
                <select
                  value={searchFilters.status}
                  onChange={(e) => setSearchFilters({...searchFilters, status: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {users.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">All Users</h3>
                  <p className="text-sm text-gray-600">Manage user accounts and permissions</p>
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
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
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
                                className="text-red-800 hover:text-red-900 font-medium"
                                title="Delete this user"
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
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Users Yet</h3>
                <p className="text-gray-600">Users will appear here once they register</p>
              </div>
            )}
          </div>
        )}

        {/* Reset Requests Tab */}
        {activeTab === 'reset-requests' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Account Reset Requests</h2>

            {resetRequests.length > 0 ? (
              <div className="space-y-4">
                {resetRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{request.landlord_name}</h3>
                        <p className="text-sm text-gray-600">{request.request_type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">
                          Requested: {new Date(request.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'approved' ? 'bg-green-100 text-green-700' :
                        request.status === 'denied' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {request.status}
                      </span>
                    </div>

                    {request.details && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Details:</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{request.details}</p>
                      </div>
                    )}

                    {request.admin_response && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Admin Response:</h4>
                        <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">{request.admin_response}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResetRequestAction(request.id, 'password_reset')}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleResetRequestAction(request.id, 'contact_landlord')}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Contact Landlord
                        </button>
                        <button
                          onClick={() => handleResetRequestAction(request.id, 'deny')}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Deny Request
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reset Requests</h3>
                <p className="text-gray-600">Account reset requests from landlords will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Announcements & Broadcasts</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Post announcements and send messages to users
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAnnouncementModal(true);
                    fetchAnnouncementsData();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  New Announcement
                </button>
                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Bell className="w-5 h-5" />
                  Send Broadcast
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Active Announcements</h3>
              {announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              announcement.type === 'info' ? 'bg-blue-100 text-blue-700' :
                              announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                              announcement.type === 'success' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {announcement.type}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {announcement.target_audience}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{announcement.message}</p>
                          <p className="text-xs text-gray-500">
                            Created by {announcement.created_by_name} on {new Date(announcement.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No announcements yet</p>
              )}
            </div>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">System Monitoring</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor system health, performance, and user activity
                </p>
              </div>
              <button
                onClick={() => {
                  fetchMonitoringData();
                  if (activeMonitoringTab === 'activity') fetchActivityFeed();
                  if (activeMonitoringTab === 'analytics') fetchApiAnalytics();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh All
              </button>
            </div>

            {/* Monitoring Sub-navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex gap-1 p-1">
                  {[
                    { id: 'health', label: 'System Health', icon: Shield },
                    { id: 'statistics', label: 'User Statistics', icon: Users },
                    { id: 'activity', label: 'Recent Activity', icon: Clock },
                    { id: 'analytics', label: 'API Analytics', icon: TrendingUp },
                    { id: 'logs', label: 'System Logs', icon: FileText }
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveMonitoringTab(subTab.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition flex-1 justify-center ${
                        activeMonitoringTab === subTab.id
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <subTab.icon className="w-4 h-4" />
                      {subTab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* System Health Sub-tab */}
                {activeMonitoringTab === 'health' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">System Health Overview</h3>
                      <button
                        onClick={fetchMonitoringData}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Health
                      </button>
                    </div>

                    {systemHealth ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <Shield className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">System Status</p>
                                <p className="text-xl font-bold text-green-600 capitalize">{systemHealth.status}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Home className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Database Size</p>
                                <p className="text-xl font-bold text-blue-600">{systemHealth.database.size}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Clock className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Uptime</p>
                                <p className="text-xl font-bold text-purple-600">{systemHealth.system.uptime_formatted}</p>
                              </div>
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg border ${
                            systemHealth.system.memory.used_percent > 80 ? 'bg-red-50 border-red-200' :
                            systemHealth.system.memory.used_percent > 60 ? 'bg-yellow-50 border-yellow-200' :
                            'bg-indigo-50 border-indigo-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                systemHealth.system.memory.used_percent > 80 ? 'bg-red-100' :
                                systemHealth.system.memory.used_percent > 60 ? 'bg-yellow-100' :
                                'bg-indigo-100'
                              }`}>
                                <div className={`w-5 h-5 ${
                                  systemHealth.system.memory.used_percent > 80 ? 'text-red-600' :
                                  systemHealth.system.memory.used_percent > 60 ? 'text-yellow-600' :
                                  'text-indigo-600'
                                }`}>
                                  💾
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">RAM Usage</p>
                                <p className={`text-xl font-bold ${
                                  systemHealth.system.memory.used_percent > 80 ? 'text-red-600' :
                                  systemHealth.system.memory.used_percent > 60 ? 'text-yellow-600' :
                                  'text-indigo-600'
                                }`}>
                                  {systemHealth.system.memory.used_mb}MB / {systemHealth.system.memory.total_mb}MB
                                </p>
                                <p className={`text-sm ${
                                  systemHealth.system.memory.used_percent > 80 ? 'text-red-600' :
                                  systemHealth.system.memory.used_percent > 60 ? 'text-yellow-600' :
                                  'text-indigo-600'
                                }`}>
                                  {systemHealth.system.memory.used_percent}%
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg border ${
                            systemHealth.system.cpu.usage_percent > 70 ? 'bg-red-50 border-red-200' :
                            systemHealth.system.cpu.usage_percent > 50 ? 'bg-yellow-50 border-yellow-200' :
                            'bg-cyan-50 border-cyan-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                systemHealth.system.cpu.usage_percent > 70 ? 'bg-red-100' :
                                systemHealth.system.cpu.usage_percent > 50 ? 'bg-yellow-100' :
                                'bg-cyan-100'
                              }`}>
                                <div className={`w-5 h-5 ${
                                  systemHealth.system.cpu.usage_percent > 70 ? 'text-red-600' :
                                  systemHealth.system.cpu.usage_percent > 50 ? 'text-yellow-600' :
                                  'text-cyan-600'
                                }`}>
                                  ⚡
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">CPU Usage</p>
                                <p className={`text-xl font-bold ${
                                  systemHealth.system.cpu.usage_percent > 70 ? 'text-red-600' :
                                  systemHealth.system.cpu.usage_percent > 50 ? 'text-yellow-600' :
                                  'text-cyan-600'
                                }`}>
                                  {systemHealth.system.cpu.usage_percent}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* System Resources Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className={`p-4 rounded-lg border ${
                            systemHealth.system.disk.used_percent > 85 ? 'bg-red-50 border-red-200' :
                            systemHealth.system.disk.used_percent > 70 ? 'bg-yellow-50 border-yellow-200' :
                            'bg-emerald-50 border-emerald-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                systemHealth.system.disk.used_percent > 85 ? 'bg-red-100' :
                                systemHealth.system.disk.used_percent > 70 ? 'bg-yellow-100' :
                                'bg-emerald-100'
                              }`}>
                                <div className={`w-5 h-5 ${
                                  systemHealth.system.disk.used_percent > 85 ? 'text-red-600' :
                                  systemHealth.system.disk.used_percent > 70 ? 'text-yellow-600' :
                                  'text-emerald-600'
                                }`}>
                                  💿
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Disk Usage</p>
                                <p className={`text-xl font-bold ${
                                  systemHealth.system.disk.used_percent > 85 ? 'text-red-600' :
                                  systemHealth.system.disk.used_percent > 70 ? 'text-yellow-600' :
                                  'text-emerald-600'
                                }`}>
                                  {systemHealth.system.disk.used_gb}GB / {systemHealth.system.disk.total_gb}GB
                                </p>
                                <p className={`text-sm ${
                                  systemHealth.system.disk.used_percent > 85 ? 'text-red-600' :
                                  systemHealth.system.disk.used_percent > 70 ? 'text-yellow-600' :
                                  'text-emerald-600'
                                }`}>
                                  {systemHealth.system.disk.used_percent}% used
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <div className="w-5 h-5 text-gray-600">🔧</div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Node Version</p>
                                <p className="text-lg font-semibold text-gray-900">{systemHealth.system.node_version}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <div className="w-5 h-5 text-gray-600">🖥️</div>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Platform</p>
                                <p className="text-lg font-semibold text-gray-900 capitalize">{systemHealth.system.platform}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-gray-50 rounded-lg border">
                            <Users className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-600">Users</p>
                            <p className="text-lg font-semibold">{systemHealth.database.tables.users_count}</p>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg border">
                            <Home className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-600">Tenancies</p>
                            <p className="text-lg font-semibold">{systemHealth.database.tables.tenancies_count}</p>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg border">
                            <DollarSign className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-600">Payments</p>
                            <p className="text-lg font-semibold">{systemHealth.database.tables.payments_count}</p>
                          </div>
                          <div className="text-center p-4 bg-gray-50 rounded-lg border">
                            <FileText className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                            <p className="text-sm text-gray-600">Notices</p>
                            <p className="text-lg font-semibold">{systemHealth.database.tables.notices_count}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Loading system health...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* User Statistics Sub-tab */}
                {activeMonitoringTab === 'statistics' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">User Statistics</h3>
                      <button
                        onClick={fetchMonitoringData}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Stats
                      </button>
                    </div>

                    {userStats ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">{userStats.total_users}</p>
                          </div>
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">Active Users</p>
                            <p className="text-2xl font-bold text-green-600">{userStats.active_users}</p>
                          </div>
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">New This Week</p>
                            <p className="text-2xl font-bold text-blue-600">{userStats.new_this_week}</p>
                          </div>
                          <div className="p-4 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">New This Month</p>
                            <p className="text-2xl font-bold text-purple-600">{userStats.new_this_month}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                            <p className="text-sm text-gray-600">Landlords</p>
                            <p className="text-lg font-semibold text-blue-700">{userStats.landlords}</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                            <UserCheck className="w-6 h-6 mx-auto mb-2 text-green-600" />
                            <p className="text-sm text-gray-600">Lodgers</p>
                            <p className="text-lg font-semibold text-green-700">{userStats.lodgers}</p>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                            <Shield className="w-6 h-6 mx-auto mb-2 text-red-600" />
                            <p className="text-sm text-gray-600">Admins</p>
                            <p className="text-lg font-semibold text-red-700">{userStats.admins}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Loading user statistics...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Activity Sub-tab */}
                {activeMonitoringTab === 'activity' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Recent Activity Feed</h3>
                      <div className="flex gap-2">
                        <select
                          value={activityTimeRange}
                          onChange={(e) => setActivityTimeRange(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="1h">Last Hour</option>
                          <option value="24h">Last 24 Hours</option>
                          <option value="7d">Last 7 Days</option>
                        </select>
                        <button
                          onClick={fetchActivityFeed}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                          <RefreshCw className="w-5 h-5" />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {activityFeed.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                        {activityFeed.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                activity.status_code >= 200 && activity.status_code < 300 ? 'bg-green-500' :
                                activity.status_code >= 400 ? 'bg-red-500' :
                                activity.status_code >= 300 ? 'bg-yellow-500' : 'bg-gray-500'
                              }`}></div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    activity.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                    activity.method === 'POST' ? 'bg-green-100 text-green-700' :
                                    activity.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                    activity.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {activity.method}
                                  </span>
                                  <span className="font-medium text-gray-900 text-sm">
                                    {activity.endpoint}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {activity.full_name && (
                                    <span className="text-xs text-gray-600">
                                      by {activity.full_name}
                                    </span>
                                  )}
                                  {activity.user_role && (
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      activity.user_role === 'admin' ? 'bg-red-100 text-red-700' :
                                      activity.user_role === 'landlord' ? 'bg-blue-100 text-blue-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {activity.user_role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {activity.status_code}
                              </div>
                              <div className="text-xs text-gray-600">
                                {activity.response_time_ms}ms
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No recent activity</p>
                      </div>
                    )}
                  </div>
                )}

                {/* API Analytics Sub-tab */}
                {activeMonitoringTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">API Performance Analytics</h3>
                      <div className="flex gap-2">
                        <select
                          value={analyticsTimeRange}
                          onChange={(e) => setAnalyticsTimeRange(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        >
                          <option value="24h">Last 24 Hours</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                        </select>
                        <button
                          onClick={fetchApiAnalytics}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <TrendingUp className="w-5 h-5" />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {apiAnalytics ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-gray-600">Total Requests</p>
                            <p className="text-2xl font-bold text-blue-600">{apiAnalytics.total_requests || 0}</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-gray-600">Success Rate</p>
                            <p className="text-2xl font-bold text-green-600">
                              {apiAnalytics.total_requests ? Math.round((apiAnalytics.successful_requests / apiAnalytics.total_requests) * 100) : 0}%
                            </p>
                          </div>
                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-gray-600">Error Rate</p>
                            <p className="text-2xl font-bold text-red-600">{apiAnalytics.error_rate || 0}%</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm text-gray-600">Avg Response</p>
                            <p className="text-2xl font-bold text-purple-600">{apiAnalytics.avg_response_time || 0}ms</p>
                          </div>
                        </div>

                        {/* Top Endpoints */}
                        {apiAnalytics.top_endpoints && apiAnalytics.top_endpoints.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Top Endpoints</h4>
                            <div className="space-y-2">
                              {apiAnalytics.top_endpoints.slice(0, 5).map((endpoint, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                      endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                      endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {endpoint.method}
                                    </span>
                                    <span className="font-medium text-gray-900 text-sm">
                                      {endpoint.endpoint}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                      {endpoint.request_count} requests
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {Math.round(endpoint.avg_response_time)}ms avg
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Loading API analytics...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* System Logs Sub-tab */}
                {activeMonitoringTab === 'logs' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">System Logs</h3>
                      <div className="flex gap-2">
                        <select
                          value={logTimeRange}
                          onChange={(e) => setLogTimeRange(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="1h">Last Hour</option>
                          <option value="24h">Last 24 Hours</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                        </select>
                        <button
                          onClick={fetchSystemLogs}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        >
                          <RefreshCw className="w-5 h-5" />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {systemLogs.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-gray-900 text-gray-100 font-mono text-sm">
                        {systemLogs.map((log, index) => (
                          <div key={index} className={`p-3 border-b border-gray-700 last:border-b-0 ${
                            log.level === 'ERROR' ? 'bg-red-900 bg-opacity-20' :
                            log.level === 'WARN' ? 'bg-yellow-900 bg-opacity-20' :
                            log.level === 'INFO' ? 'bg-blue-900 bg-opacity-20' :
                            'bg-gray-800'
                          }`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    log.level === 'ERROR' ? 'bg-red-600 text-white' :
                                    log.level === 'WARN' ? 'bg-yellow-600 text-white' :
                                    log.level === 'INFO' ? 'bg-blue-600 text-white' :
                                    'bg-gray-600 text-white'
                                  }`}>
                                    {log.level}
                                  </span>
                                  <span className="text-gray-400 text-xs">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-gray-200 break-words">
                                  {log.message}
                                </div>
                                {log.details && (
                                  <div className="mt-2 text-gray-400 text-xs">
                                    {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No logs available for the selected time range</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">System Settings</h2>

            {/* Backup & Export Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Backup & Export</h3>
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

            {/* Factory Reset Section */}
            <div className="pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h3>
              <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
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
                          placeholder="Enter admin password"
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

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit User</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.full_name}
                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveUser}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
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

        {/* Password Reset Modal */}
        {showPasswordResetModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Reset Password</h3>
              <p className="text-sm text-gray-600 mb-4">
                Reset password for <strong>{editingUser.full_name}</strong> ({editingUser.email})
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleConfirmPasswordReset}
                  disabled={!newPassword || newPassword.length < 6}
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Reset Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setEditingUser(null);
                    setNewPassword('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
                  onClick={handleAddUser}
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

        {/* Announcement Modal */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Announcement title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={announcementForm.message}
                    onChange={(e) => setAnnouncementForm({...announcementForm, message: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Announcement message"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="success">Success</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                    <select
                      value={announcementForm.target_audience}
                      onChange={(e) => setAnnouncementForm({...announcementForm, target_audience: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Users</option>
                      <option value="landlord">Landlords Only</option>
                      <option value="lodger">Lodgers Only</option>
                      <option value="admin">Admins Only</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateAnnouncement}
                  disabled={!announcementForm.title || !announcementForm.message}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setAnnouncementForm({ title: '', message: '', type: 'info', target_audience: 'all', expires_at: '' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Modal */}
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Send Broadcast Message</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={broadcastForm.subject}
                    onChange={(e) => setBroadcastForm({...broadcastForm, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Message subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Broadcast message"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                  <select
                    value={broadcastForm.target_role}
                    onChange={(e) => setBroadcastForm({...broadcastForm, target_role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Users</option>
                    <option value="landlord">Landlords Only</option>
                    <option value="lodger">Lodgers Only</option>
                  </select>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    This will send a notification to all selected users
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSendBroadcast}
                  disabled={!broadcastForm.subject || !broadcastForm.message}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                >
                  Send Broadcast
                </button>
                <button
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastForm({ subject: '', message: '', target_role: 'all' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Claim Existing Lodger Modal */}
        {showClaimLodgerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
                <h2 className="text-xl font-bold">
                  {claimStep === 'email' ? 'Link Users' : 'Confirm Link'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {claimStep === 'email'
                    ? 'Enter the lodger\'s email address to link them to a landlord'
                    : 'Review lodger details before confirming the link'
                  }
                </p>
              </div>

              {claimStep === 'email' ? (
                /* Email Entry Step */
                <form onSubmit={handleClaimLodgerEmailSubmit} className="p-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold mb-1">Privacy-First Approach</p>
                        <p className="text-xs">Enter the exact email address of the lodger you want to link. Their information will only be shown after verification.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lodger Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={claimLodgerForm.lodger_email}
                      onChange={(e) => setClaimLodgerForm({...claimLodgerForm, lodger_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="lodger@example.com"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be the exact email address of an existing lodger account</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assign to Landlord (Optional)
                    </label>

                    {/* Method Selection */}
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="email"
                          checked={assignMethod === 'email'}
                          onChange={(e) => setAssignMethod(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">By Email</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="id"
                          checked={assignMethod === 'id'}
                          onChange={(e) => setAssignMethod(e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">By ID</span>
                      </label>
                    </div>

                    {assignMethod === 'email' ? (
                      <div>
                        <input
                          type="email"
                          value={claimLodgerForm.assign_to_landlord_email || ''}
                          onChange={(e) => setClaimLodgerForm({...claimLodgerForm, assign_to_landlord_email: e.target.value, assign_to_landlord_id: ''})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="landlord@example.com"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter landlord email address</p>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={claimLodgerForm.assign_to_landlord_id || ''}
                          onChange={(e) => setClaimLodgerForm({...claimLodgerForm, assign_to_landlord_id: e.target.value, assign_to_landlord_email: ''})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="12345678-1234-1234-1234-123456789012"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter landlord ID (UUID format)</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <p className="font-semibold mb-1">⚠️ Important Notes:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      <li>You can only link lodgers who are not already assigned to another landlord</li>
                      <li>If assigning to a landlord by email, they must have available tenancy slots (max 2)</li>
                      <li>The lodger will be notified of the link</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      Find Lodger
                    </button>
                    <button
                      type="button"
                      onClick={handleClaimModalClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Confirmation Step */
                <div className="p-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                        ✓
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900">Lodger Found!</h3>
                        <p className="text-sm text-green-700 mt-1">Review the details below before confirming the link</p>
                      </div>
                    </div>
                  </div>

                  {lodgerPreview && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-semibold text-lg">{lodgerPreview.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{lodgerPreview.email}</p>
                      </div>
                      {lodgerPreview.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{lodgerPreview.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Account Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          lodgerPreview.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {lodgerPreview.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Current Landlord</p>
                        {lodgerPreview.landlord_id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="font-medium text-green-700">
                                {lodgerPreview.landlord_name || `Landlord #${lodgerPreview.landlord_id}`}
                              </p>
                              <p className="text-xs text-green-600">{lodgerPreview.landlord_email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">Unassigned</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Created</p>
                        <p className="font-medium">{new Date(lodgerPreview.created_at).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  )}

                  {(claimLodgerForm.assign_to_landlord_email || claimLodgerForm.assign_to_landlord_id) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">Assignment Details:</p>
                      <p className="text-sm text-blue-800">
                        This lodger will be immediately assigned to:{' '}
                        <strong>
                          {assignMethod === 'email'
                            ? claimLodgerForm.assign_to_landlord_email
                            : `Landlord ID: ${claimLodgerForm.assign_to_landlord_id}`
                          }
                        </strong>
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <strong>What happens next:</strong>
                    </p>
                    <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                      <li>The lodger will be {claimLodgerForm.assign_to_landlord_email ? 'assigned to the specified landlord' : 'linked but remain unassigned'}</li>
                      <li>You'll be able to manage this lodger from the admin panel</li>
                      <li>The lodger will receive a notification about the link</li>
                      <li>If assigned to a landlord, they can create tenancies for this lodger</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={handleClaimLodgerConfirm}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      Confirm Link
                    </button>
                    <button
                      onClick={() => {
                        setClaimStep('email');
                        setAssignMethod('email');
                        setLodgerPreview(null);
                        setClaimLodgerForm({ lodger_email: '', assign_to_landlord_id: '', assign_to_landlord_email: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
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
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDeleteUser}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Delete User
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

        {/* Unlink Users Modal */}
        {showUnlinkUsersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
                <h2 className="text-xl font-bold">
                  {showUnlinkUsersModal === 'email' ? 'Unlink Users' : 'Confirm Unlink'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {showUnlinkUsersModal === 'email'
                    ? 'Enter the lodger\'s email address to unlink them from their landlord'
                    : 'Review lodger details before confirming the unlink'
                  }
                </p>
              </div>

              {showUnlinkUsersModal === 'email' ? (
                /* Email Entry Step */
                <form onSubmit={handleUnlinkUsersEmailSubmit} className="p-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold mb-1">Privacy-First Approach</p>
                        <p className="text-xs">Enter the exact email address of the lodger you want to unlink. Their information will only be shown after verification.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lodger Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={unlinkForm.lodger_email}
                      onChange={(e) => setUnlinkForm({...unlinkForm, lodger_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      placeholder="lodger@example.com"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">Must be the exact email address of an existing lodger account</p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <p className="font-semibold mb-1">⚠️ Important Notes:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      <li>You can only unlink lodgers who are currently assigned to a landlord</li>
                      <li>Unlinking will remove the landlord-lodger association</li>
                      <li>The lodger will be notified of the change</li>
                      <li>Active tenancies may be affected - use with caution</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                    >
                      Find Lodger
                    </button>
                    <button
                      type="button"
                      onClick={handleUnlinkUsersClose}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Confirmation Step */
                <div className="p-6 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        ⚠️
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-900">Confirm Unlink</h3>
                        <p className="text-sm text-red-700 mt-1">Review the details below before confirming the unlink</p>
                      </div>
                    </div>
                  </div>

                  {unlinkForm.lodgerToUnlink && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Lodger Name</p>
                        <p className="font-semibold text-lg">{unlinkForm.lodgerToUnlink.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{unlinkForm.lodgerToUnlink.email}</p>
                      </div>
                      {unlinkForm.lodgerToUnlink.phone && (
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{unlinkForm.lodgerToUnlink.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Currently Assigned To</p>
                        <div className="flex items-center gap-2 mt-1">
                          <UserX className="w-4 h-4 text-red-600" />
                          <div>
                            <p className="font-medium text-red-600">
                              {unlinkForm.lodgerToUnlink.landlord_name || `Landlord #${unlinkForm.lodgerToUnlink.landlord_id}`}
                            </p>
                            <p className="text-xs text-red-500">{unlinkForm.lodgerToUnlink.landlord_email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <strong>Warning - This Action:</strong>
                    </p>
                    <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                      <li>Will permanently remove the landlord-lodger association</li>
                      <li>May affect active tenancy agreements</li>
                      <li>Will notify the lodger of the change</li>
                      <li>Cannot be undone without re-linking the users</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={handleUnlinkUsersConfirm}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                    >
                      Confirm Unlink
                    </button>
                    <button
                      onClick={() => {
                        setShowUnlinkUsersModal('email');
                        setUnlinkForm({ ...unlinkForm, lodgerToUnlink: null });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
       </div>
     </div>
   );
 };

export default AdminDashboard;