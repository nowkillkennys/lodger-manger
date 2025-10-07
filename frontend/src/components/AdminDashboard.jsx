import React, { useState, useEffect } from 'react';
import { Home, Users, Settings, LogOut, Bell, Plus, Eye, FileText, TrendingUp, Clock, AlertCircle, Download, AlertTriangle, DollarSign, Shield, UserCheck, UserX, Key, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

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

  useEffect(() => {
    fetchAdminData();
  }, []);

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
        axios.get(`${API_URL}/api/admin/users`, config)
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
      alert('Please enter your password to confirm factory reset');
      return;
    }

    if (confirmText !== 'FACTORY RESET') {
      alert('Please type "FACTORY RESET" exactly to confirm');
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

      alert(response.data.message + '\n\n' + (response.data.note || ''));

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
      alert(error.response?.data?.error || 'Failed to perform factory reset');
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

      alert(`Reset request ${action} successfully`);
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Reset request action error:', error);
      alert(error.response?.data?.error || 'Failed to process reset request');
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
      await axios.put(`${API_URL}/api/admin/users/${editingUser.id}`, {
        email: editingUser.email,
        full_name: editingUser.full_name,
        phone: editingUser.phone,
        is_active: editingUser.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Update user error:', error);
      alert(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleResetPassword = (user) => {
    setEditingUser(user);
    setNewPassword('');
    setShowPasswordResetModal(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/admin/users/${editingUser.id}/reset-password`, {
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Password reset successfully');
      setShowPasswordResetModal(false);
      setEditingUser(null);
      setNewPassword('');
    } catch (error) {
      console.error('Reset password error:', error);
      alert(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/admin/users/${user.id}`, {
        is_active: !user.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Toggle user status error:', error);
      alert(error.response?.data?.error || 'Failed to update user status');
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
          <nav className="flex gap-8">
            {['overview', 'users', 'reset-requests', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-4 border-b-2 transition font-medium capitalize ${
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
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                <Plus className="w-5 h-5" />
                Add User
              </button>
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
                            <div className="flex gap-2">
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

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">System Settings</h2>

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
      </div>
    </div>
  );
};

export default AdminDashboard;