import React, { useState, useEffect } from 'react';
import { Home, Users, CreditCard, Calendar, Settings, LogOut, Bell, Plus, Eye, FileText, TrendingUp, Clock, AlertCircle } from 'lucide-react';
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
              <h2 className="text-2xl font-bold">Tenancies</h2>
              <button 
                onClick={onNewTenancy} 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg"
              >
                <Plus className="w-5 h-5" />
                New Tenancy
              </button>
            </div>

            {tenancies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tenancies.map((tenancy) => (
                  <div key={tenancy.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{tenancy.lodgerFullName || tenancy.lodgerName}</h3>
                        <p className="text-sm text-gray-600">{tenancy.address}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {tenancy.status || 'active'}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">{tenancy.startDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monthly Rent:</span>
                        <span className="font-medium">£{tenancy.monthlyRent}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="flex-1 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm">
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button className="flex-1 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 text-sm">
                        <FileText className="w-4 h-4" />
                        Agreement
                      </button>
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
    </div>
  );
};

export default LandlordDashboard;