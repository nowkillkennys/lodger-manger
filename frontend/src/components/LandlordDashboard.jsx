import React, { useState, useEffect } from 'react';
import { Home, Users, CreditCard, Calendar, Settings, LogOut, Bell, Plus, Eye, FileText, TrendingUp, Clock, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';
import StatCard from './StatCard';
import { API_URL } from '../config';

const LandlordDashboard = ({ user, onLogout, onNewTenancy }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tenancies, setTenancies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lodgers, setLodgers] = useState([]);
  const [showCreateLodger, setShowCreateLodger] = useState(false);
  const [newLodger, setNewLodger] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [showCreateTenancy, setShowCreateTenancy] = useState(false);
  const [newTenancy, setNewTenancy] = useState({
    lodger_id: '',
    property_address: user.address || '',
    room_description: '',
    start_date: '',
    initial_term_months: 6,
    monthly_rent: '',
    initial_payment: '',
    deposit_applicable: false,
    deposit_amount: '',
    shared_areas: {
      kitchen: false,
      bathroom: false,
      living_room: false,
      garden: false
    }
  });
  const [selectedTenancy, setSelectedTenancy] = useState(null);
  const [showTenancyModal, setShowTenancyModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    notice_period_days: 28,
    reason: '',
    breach_type: '',
    additional_notes: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    activeTenancies: 0,
    monthlyIncome: 0,
    upcomingPayments: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch all data (with error handling for missing endpoints)
      const responses = await Promise.allSettled([
        axios.get(`${API_URL}/api/tenancies`, config),
        axios.get(`${API_URL}/api/payments`, config),
        axios.get(`${API_URL}/api/notifications`, config),
        axios.get(`${API_URL}/api/dashboard/landlord`, config),
        axios.get(`${API_URL}/api/users`, config)
      ]);

      // Handle tenancies
      if (responses[0].status === 'fulfilled') {
        setTenancies(responses[0].value.data);
      }

      // Handle payments
      if (responses[1].status === 'fulfilled') {
        setPayments(responses[1].value.data);
      }

      // Handle notifications
      if (responses[2].status === 'fulfilled') {
        setNotifications(responses[2].value.data);
      }

      // Handle stats
      if (responses[3].status === 'fulfilled') {
        setStats(responses[3].value.data);
      }

      // Handle users/lodgers
      if (responses[4].status === 'fulfilled') {
        const allUsers = responses[4].value.data;
        setLodgers(allUsers.filter(u => u.user_type === 'lodger'));
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLodger = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/users`, {
        ...newLodger,
        user_type: 'lodger'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form and refresh data
      setNewLodger({ email: '', password: '', full_name: '', phone: '' });
      setShowCreateLodger(false);
      fetchDashboardData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create lodger');
    }
  };

  const handleCreateTenancy = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      // Prepare tenancy data
      const selectedSharedAreas = Object.keys(newTenancy.shared_areas)
        .filter(area => newTenancy.shared_areas[area])
        .map(area => area.replace('_', ' '))
        .join(', ');

      const tenancyData = {
        lodger_id: newTenancy.lodger_id,
        property_address: newTenancy.property_address,
        room_description: newTenancy.room_description,
        start_date: newTenancy.start_date,
        initial_term_months: parseInt(newTenancy.initial_term_months),
        monthly_rent: parseFloat(newTenancy.monthly_rent),
        initial_payment: parseFloat(newTenancy.initial_payment),
        deposit_applicable: newTenancy.deposit_applicable,
        deposit_amount: newTenancy.deposit_applicable ? parseFloat(newTenancy.deposit_amount) : 0,
        shared_areas: selectedSharedAreas
      };

      await axios.post(`${API_URL}/api/tenancies`, tenancyData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form and refresh data
      setNewTenancy({
        lodger_id: '',
        property_address: user.address || '',
        room_description: '',
        start_date: '',
        initial_term_months: 6,
        monthly_rent: '',
        initial_payment: '',
        deposit_applicable: false,
        deposit_amount: '',
        shared_areas: {
          kitchen: false,
          bathroom: false,
          living_room: false,
          garden: false
        }
      });
      setShowCreateTenancy(false);
      fetchDashboardData();
      alert('Tenancy created successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create tenancy');
    }
  };

  const handleGiveNotice = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      // Prepare notice data
      const noticeData = {
        notice_period_days: noticeForm.notice_period_days,
        reason: noticeForm.reason,
        breach_type: noticeForm.breach_type,
        additional_notes: noticeForm.additional_notes
      };

      await axios.post(
        `${API_URL}/api/tenancies/${selectedTenancy.id}/notice`,
        noticeData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset form and refresh data
      setNoticeForm({
        notice_period_days: 28,
        reason: '',
        breach_type: '',
        additional_notes: ''
      });
      setShowNoticeModal(false);
      setSelectedTenancy(null);
      fetchDashboardData();

      const immediateTermination = noticeForm.breach_type === 'violence' || noticeForm.breach_type === 'criminal_activity';
      alert(immediateTermination
        ? 'IMMEDIATE TERMINATION NOTICE: The tenancy has been terminated immediately due to serious breach. Please contact authorities if necessary.'
        : 'Notice has been given successfully. The lodger will be notified.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to give notice');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lodger Manager</h1>
              <p className="text-xs text-gray-500">Landlord Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
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
            {['overview', 'lodgers', 'tenancies', 'payments', 'calendar', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-4 border-b-2 transition font-medium capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard 
                title="Active Tenancies" 
                value={stats.activeTenancies || tenancies.length} 
                icon={<Users className="w-6 h-6 text-indigo-600" />} 
                color="bg-indigo-50" 
              />
              <StatCard 
                title="Monthly Income" 
                value={`£${stats.monthlyIncome || 0}`} 
                icon={<TrendingUp className="w-6 h-6 text-green-600" />} 
                color="bg-green-50" 
              />
              <StatCard 
                title="Upcoming Payments" 
                value={stats.upcomingPayments || 0} 
                icon={<Clock className="w-6 h-6 text-orange-600" />} 
                color="bg-orange-50" 
              />
              <StatCard 
                title="Overdue" 
                value={stats.overdue || 0} 
                icon={<AlertCircle className="w-6 h-6 text-red-600" />} 
                color="bg-red-50" 
              />
            </div>

            {/* Active Tenancies and Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Tenancies */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Active Tenancies</h3>
                {tenancies.length > 0 ? (
                  <div className="space-y-3">
                    {tenancies.slice(0, 3).map((tenancy) => (
                      <div key={tenancy.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <p className="font-medium">{tenancy.lodgerFullName || tenancy.lodgerName}</p>
                        <p className="text-sm text-gray-600">{tenancy.address}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">Monthly Rent</span>
                          <span className="font-semibold">£{tenancy.monthlyRent}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active tenancies</p>
                    <button 
                      onClick={onNewTenancy}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Create First Tenancy
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Notifications */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notif) => (
                      <div key={notif.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                        <Bell className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lodgers Tab */}
        {activeTab === 'lodgers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Lodgers</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Active tenancies: {tenancies.filter(t => t.status === 'active' || t.status === 'draft').length} / 2 (Maximum)
                </p>
              </div>
              <button
                onClick={() => setShowCreateLodger(true)}
                disabled={tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition shadow-lg ${
                  tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                Create Lodger Account
              </button>
            </div>

            {tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2 && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
                <strong>Limit Reached:</strong> You have reached the maximum of 2 active tenancies. Terminate an existing tenancy to create a new lodger account.
              </div>
            )}

            {/* Create Lodger Form */}
            {showCreateLodger && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Create New Lodger Account</h3>
                <form onSubmit={handleCreateLodger} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={newLodger.full_name}
                        onChange={(e) => setNewLodger({...newLodger, full_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={newLodger.email}
                        onChange={(e) => setNewLodger({...newLodger, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                      <input
                        type="text"
                        required
                        value={newLodger.password}
                        onChange={(e) => setNewLodger({...newLodger, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="Temporary password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={newLodger.phone}
                        onChange={(e) => setNewLodger({...newLodger, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="07700900000"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateLodger(false);
                        setNewLodger({ email: '', password: '', full_name: '', phone: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lodgers List */}
            {lodgers.length > 0 ? (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lodgers.map((lodger) => (
                      <tr key={lodger.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{lodger.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{lodger.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{lodger.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            lodger.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {lodger.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(lodger.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Lodgers Yet</h3>
                <p className="text-gray-600 mb-6">Create lodger accounts to manage tenancies</p>
                <button
                  onClick={() => setShowCreateLodger(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Lodger
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tenancies Tab */}
        {activeTab === 'tenancies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Tenancies</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Active tenancies: {tenancies.filter(t => t.status === 'active' || t.status === 'draft').length} / 2 (Maximum)
                </p>
              </div>
              <button
                onClick={() => setShowCreateTenancy(true)}
                disabled={tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2 || lodgers.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition shadow-lg ${
                  tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2 || lodgers.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                New Tenancy
              </button>
            </div>

            {tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2 && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
                <strong>Limit Reached:</strong> You have reached the maximum of 2 active tenancies.
              </div>
            )}

            {lodgers.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                <strong>No Lodgers:</strong> Create lodger accounts first before creating tenancies. Go to the Lodgers tab.
              </div>
            )}

            {/* Create Tenancy Form */}
            {showCreateTenancy && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Create New Tenancy</h3>
                <form onSubmit={handleCreateTenancy} className="space-y-4">
                  {/* Lodger Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Lodger *</label>
                    <select
                      required
                      value={newTenancy.lodger_id}
                      onChange={(e) => setNewTenancy({...newTenancy, lodger_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Choose a lodger...</option>
                      {lodgers.map((lodger) => (
                        <option key={lodger.id} value={lodger.id}>
                          {lodger.full_name} ({lodger.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Property Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Address *</label>
                    <textarea
                      required
                      value={newTenancy.property_address}
                      onChange={(e) => setNewTenancy({...newTenancy, property_address: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                      placeholder={user.address || "123 Main Street, London, SW1A 1AA"}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-filled from your profile</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Description *</label>
                    <input
                      type="text"
                      required
                      value={newTenancy.room_description}
                      onChange={(e) => setNewTenancy({...newTenancy, room_description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Double room with ensuite"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Shared Areas</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTenancy.shared_areas.kitchen}
                          onChange={(e) => setNewTenancy({
                            ...newTenancy,
                            shared_areas: {...newTenancy.shared_areas, kitchen: e.target.checked}
                          })}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">Kitchen</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTenancy.shared_areas.bathroom}
                          onChange={(e) => setNewTenancy({
                            ...newTenancy,
                            shared_areas: {...newTenancy.shared_areas, bathroom: e.target.checked}
                          })}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">Bathroom</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTenancy.shared_areas.living_room}
                          onChange={(e) => setNewTenancy({
                            ...newTenancy,
                            shared_areas: {...newTenancy.shared_areas, living_room: e.target.checked}
                          })}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">Living Room</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTenancy.shared_areas.garden}
                          onChange={(e) => setNewTenancy({
                            ...newTenancy,
                            shared_areas: {...newTenancy.shared_areas, garden: e.target.checked}
                          })}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">Garden</span>
                      </label>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={newTenancy.start_date}
                        onChange={(e) => setNewTenancy({...newTenancy, start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Initial Term *</label>
                      <select
                        required
                        value={newTenancy.initial_term_months}
                        onChange={(e) => setNewTenancy({...newTenancy, initial_term_months: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={3}>3 months</option>
                        <option value={6}>6 months</option>
                        <option value={12}>12 months</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent (£) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={newTenancy.monthly_rent}
                        onChange={(e) => {
                          const rent = e.target.value;
                          setNewTenancy({
                            ...newTenancy,
                            monthly_rent: rent,
                            initial_payment: rent ? (parseFloat(rent) * 2).toFixed(2) : ''
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="800.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Initial Payment (£) *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={newTenancy.initial_payment}
                        onChange={(e) => setNewTenancy({...newTenancy, initial_payment: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                        placeholder="Auto-calculated as 2x monthly rent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Typically 2x monthly rent</p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <input
                          type="checkbox"
                          checked={newTenancy.deposit_applicable}
                          onChange={(e) => setNewTenancy({...newTenancy, deposit_applicable: e.target.checked})}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Deposit Applicable
                      </label>
                      {newTenancy.deposit_applicable && (
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          value={newTenancy.deposit_amount}
                          onChange={(e) => setNewTenancy({...newTenancy, deposit_amount: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Deposit amount"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Create Tenancy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateTenancy(false);
                        setNewTenancy({
                          lodger_id: '',
                          property_address: user.address || '',
                          room_description: '',
                          start_date: '',
                          initial_term_months: 6,
                          monthly_rent: '',
                          initial_payment: '',
                          deposit_applicable: false,
                          deposit_amount: '',
                          shared_areas: {
                            kitchen: false,
                            bathroom: false,
                            living_room: false,
                            garden: false
                          }
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tenancies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenancies.map((tenancy) => (
                  <div key={tenancy.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{tenancy.lodger_name}</h3>
                        <p className="text-sm text-gray-600">{tenancy.address || tenancy.property_address}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {tenancy.status || 'active'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">{tenancy.start_date ? new Date(tenancy.start_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monthly Rent:</span>
                        <span className="font-medium">£{tenancy.monthly_rent}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTenancy(tenancy);
                            setShowTenancyModal(true);
                          }}
                          className="flex-1 border border-indigo-600 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-50 transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        {tenancy.lodger_signature && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                            ✓ Signed
                          </span>
                        )}
                        {!tenancy.lodger_signature && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            Pending
                          </span>
                        )}
                      </div>
                      {tenancy.status === 'active' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // TODO: Navigate to payment schedule
                                alert('Payment schedule coming soon');
                              }}
                              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-xs font-medium"
                            >
                              <CreditCard className="w-4 h-4" />
                              Payments
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTenancy(tenancy);
                                setShowNoticeModal(true);
                              }}
                              className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 text-xs font-medium"
                            >
                              <Bell className="w-4 h-4" />
                              Give Notice
                            </button>
                          </div>
                          {tenancy.signed_agreement_path && (
                            <a
                              href={`${API_URL}${tenancy.signed_agreement_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-xs font-medium"
                            >
                              <FileText className="w-4 h-4" />
                              View Agreement
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Tenancies Yet</h3>
                <p className="text-gray-600 mb-6">Create your first tenancy to get started</p>
                <button 
                  onClick={onNewTenancy}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Tenancy
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Payment Management</h2>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lodger</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.length > 0 ? (
                    payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">#{payment.paymentNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{payment.dueDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{payment.lodgerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">£{payment.rentDue}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          payment.balance > 0 ? 'text-green-600' : payment.balance < 0 ? 'text-red-600' : ''
                        }`}>
                          £{payment.balance}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' || payment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No payments to display
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Calendar</h2>
            <p className="text-gray-600">Calendar view coming soon...</p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        )}
      </div>

      {/* Tenancy Details Modal */}
      {showTenancyModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tenancy Agreement Details</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedTenancy.lodger_name}</p>
              </div>
              <button
                onClick={() => setShowTenancyModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Banner */}
              {selectedTenancy.lodger_signature ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Agreement Signed</h3>
                      <p className="text-sm text-green-700">
                        Signed on {selectedTenancy.signature_date ? new Date(selectedTenancy.signature_date).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      !
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900">Awaiting Lodger Signature</h3>
                      <p className="text-sm text-orange-700">
                        The lodger needs to review and accept the agreement
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agreement Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Agreement Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Property Address</p>
                    <p className="font-medium">{selectedTenancy.address || selectedTenancy.property_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Room Description</p>
                    <p className="font-medium">{selectedTenancy.room_description || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Shared Areas</p>
                    <p className="font-medium">{selectedTenancy.shared_areas || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">{selectedTenancy.start_date ? new Date(selectedTenancy.start_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Initial Term</p>
                    <p className="font-medium">{selectedTenancy.initial_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent</p>
                    <p className="font-medium">£{selectedTenancy.monthly_rent}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Initial Payment</p>
                    <p className="font-medium">£{selectedTenancy.initial_payment}</p>
                  </div>
                  {selectedTenancy.deposit_applicable && (
                    <div>
                      <p className="text-sm text-gray-600">Deposit</p>
                      <p className="font-medium">£{selectedTenancy.deposit_amount}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium capitalize">{selectedTenancy.status}</p>
                  </div>
                </div>
              </div>

              {/* Photo ID Section */}
              {selectedTenancy.lodger_signature && (
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Right to Rent Verification</h3>
                  {selectedTenancy.photo_id_path ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">Photo ID uploaded by lodger:</p>
                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center min-h-[400px]">
                        <img
                          src={`${API_URL}${selectedTenancy.photo_id_path}`}
                          alt="Lodger Photo ID"
                          className="max-w-full max-h-[600px] w-auto h-auto object-contain rounded shadow-lg"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Right to Rent verification document - Please verify authenticity
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">No photo ID uploaded</p>
                  )}
                </div>
              )}

              {/* Signature Information */}
              {selectedTenancy.lodger_signature && (
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Signature Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Lodger Signature</p>
                      <p className="font-medium text-lg italic">{selectedTenancy.lodger_signature}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date Signed</p>
                      <p className="font-medium">
                        {selectedTenancy.signature_date ? new Date(selectedTenancy.signature_date).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedTenancy.lodger_signature && !selectedTenancy.signed_agreement_path && (
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        await axios.post(
                          `${API_URL}/api/tenancies/${selectedTenancy.id}/approve`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` }}
                        );
                        alert('Agreement approved and PDF generated successfully!');
                        setShowTenancyModal(false);
                        fetchDashboardData();
                      } catch (error) {
                        alert(error.response?.data?.error || 'Failed to approve agreement');
                      }
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    Approve & Generate Agreement PDF
                  </button>
                )}
                {selectedTenancy.signed_agreement_path && (
                  <>
                    <a
                      href={`${API_URL}${selectedTenancy.signed_agreement_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold inline-flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Agreement PDF
                    </a>
                    <a
                      href={`${API_URL}${selectedTenancy.signed_agreement_path}`}
                      download
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </a>
                  </>
                )}
                <button
                  onClick={() => setShowTenancyModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Give Notice Modal */}
      {showNoticeModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-orange-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Give Notice to Terminate Tenancy</h2>
              <p className="text-sm opacity-90 mt-1">Lodger: {selectedTenancy.lodger_name}</p>
            </div>

            <form onSubmit={handleGiveNotice} className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <strong>Important:</strong> According to the Lodger Agreement, either party may terminate the tenancy by giving notice.
                The standard notice period is 28 days, but you can adjust this if agreed.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Termination *</label>
                <select
                  required
                  value={noticeForm.reason}
                  onChange={(e) => {
                    const newReason = e.target.value;
                    setNoticeForm({
                      ...noticeForm,
                      reason: newReason,
                      breach_type: '',
                      notice_period_days: newReason === 'breach_of_agreement' ? 0 : 28
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="end_of_term">End of agreed term</option>
                  <option value="property_sale">Selling the property</option>
                  <option value="personal_use">Need property for personal use</option>
                  <option value="breach_of_agreement">Breach of agreement by lodger</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {noticeForm.reason === 'breach_of_agreement' && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-2 text-red-800 mb-3">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <strong>Breach of Agreement:</strong> Please specify the type of breach. Some breaches allow immediate termination per the agreement.
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type of Breach *</label>
                    <select
                      required
                      value={noticeForm.breach_type}
                      onChange={(e) => {
                        const breachType = e.target.value;
                        const immediate = breachType === 'violence' || breachType === 'criminal_activity';
                        setNoticeForm({
                          ...noticeForm,
                          breach_type: breachType,
                          notice_period_days: immediate ? 0 : 7
                        });
                      }}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="">Select breach type...</option>
                      <option value="violence">Violence or threats (IMMEDIATE TERMINATION)</option>
                      <option value="criminal_activity">Criminal activity on premises (IMMEDIATE TERMINATION)</option>
                      <option value="non_payment">Non-payment of rent (7 days notice)</option>
                      <option value="damage_to_property">Damage to property (7 days notice)</option>
                      <option value="nuisance">Causing nuisance to others (7 days notice)</option>
                      <option value="unauthorized_occupants">Unauthorized occupants (7 days notice)</option>
                      <option value="other_breach">Other breach of terms (7 days notice)</option>
                    </select>
                  </div>

                  {(noticeForm.breach_type === 'violence' || noticeForm.breach_type === 'criminal_activity') && (
                    <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3">
                      <p className="text-sm font-bold text-red-900 mb-2">⚠️ IMMEDIATE TERMINATION</p>
                      <p className="text-xs text-red-800">
                        This breach allows for immediate termination without notice period as per the agreement.
                        The lodger must vacate the property immediately. Consider contacting the police if necessary.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {noticeForm.reason !== 'breach_of_agreement' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period (days) *</label>
                  <select
                    required
                    value={noticeForm.notice_period_days}
                    onChange={(e) => setNoticeForm({...noticeForm, notice_period_days: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={28}>28 days (Standard)</option>
                    <option value={56}>56 days</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Tenancy will end on: {new Date(Date.now() + noticeForm.notice_period_days * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}

              {noticeForm.reason === 'breach_of_agreement' && noticeForm.breach_type && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Notice Period:
                    <span className={`ml-2 font-bold ${noticeForm.notice_period_days === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {noticeForm.notice_period_days === 0 ? 'IMMEDIATE' : `${noticeForm.notice_period_days} days`}
                    </span>
                  </p>
                  {noticeForm.notice_period_days > 0 && (
                    <p className="text-xs text-gray-600">
                      Tenancy will end on: {new Date(Date.now() + noticeForm.notice_period_days * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                <textarea
                  value={noticeForm.additional_notes}
                  onChange={(e) => setNoticeForm({...noticeForm, additional_notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={4}
                  placeholder="Any additional information or instructions..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
                >
                  Give Notice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoticeModal(false);
                    setSelectedTenancy(null);
                    setNoticeForm({
                      notice_period_days: 28,
                      reason: '',
                      breach_type: '',
                      additional_notes: ''
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordDashboard;