import React, { useState, useEffect } from 'react';
import { Home, Bell, LogOut, DollarSign, Clock, Send, Wrench, FileText, Download, Eye, Info } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const LodgerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tenancy, setTenancy] = useState(null);
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [nextPayment, setNextPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLodgerData();
  }, []);

  const fetchLodgerData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const responses = await Promise.allSettled([
        axios.get(`${API_URL}/api/tenancies/my-tenancy`, config),
        axios.get(`${API_URL}/api/payments/my-payments`, config),
        axios.get(`${API_URL}/api/dashboard/lodger`, config)
      ]);

      if (responses[0].status === 'fulfilled') {
        setTenancy(responses[0].value.data);
      }

      if (responses[1].status === 'fulfilled') {
        setPayments(responses[1].value.data);
      }

      if (responses[2].status === 'fulfilled') {
        const dashData = responses[2].value.data;
        setBalance(dashData.currentBalance || 0);
        setNextPayment(dashData.nextPayment || null);
      }

    } catch (error) {
      console.error('Failed to fetch lodger data:', error);
    } finally {
      setLoading(false);
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
              <p className="text-xs text-gray-500">Tenant Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500">Lodger</p>
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
            {['overview', 'payments', 'agreement', 'maintenance'].map((tab) => (
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
          <>
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white mb-6">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {user.fullName}!</h2>
              <p className="text-indigo-100">
                {tenancy ? `Your tenancy at ${tenancy.address}` : 'Loading your tenancy details...'}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  £{Math.abs(balance)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {balance >= 0 ? 'Credit' : 'Owed'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Next Payment</p>
                <p className="text-2xl font-bold">
                  {nextPayment ? nextPayment.dueDate : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {nextPayment ? `£${nextPayment.amount} due` : 'No upcoming payments'}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <Home className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
                <p className="text-2xl font-bold">
                  £{tenancy?.monthlyRent || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Every 28 days</p>
              </div>
            </div>

            {/* Recent Payments & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Payments</h3>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.slice(0, 3).map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Payment #{payment.paymentNumber}</p>
                          <p className="text-xs text-gray-600">{payment.dueDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">£{payment.rentDue}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            payment.status === 'paid' || payment.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-gray-500">No payment history yet</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition text-left">
                    <div className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="font-medium">Submit Payment</p>
                        <p className="text-xs text-gray-600">Notify landlord of payment sent</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition text-left">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="font-medium">Request Maintenance</p>
                        <p className="text-xs text-gray-600">Report an issue</p>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={() => setActiveTab('agreement')}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="font-medium">View Agreement</p>
                        <p className="text-xs text-gray-600">See your tenancy details</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Payment History</h2>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.length > 0 ? (
                    payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">#{payment.paymentNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{payment.dueDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap">£{payment.rentDue}</td>
                        <td className="px-6 py-4 whitespace-nowrap">£{payment.rentPaid}</td>
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
                        No payment history available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Agreement Tab */}
        {activeTab === 'agreement' && tenancy && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Tenancy Agreement</h2>

            {/* Header Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Your Agreement</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Reference: {tenancy.agreementReference || 'N/A'}
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>

              {/* Agreement Details */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Property:</span>
                  <span className="text-sm font-medium text-gray-900">{tenancy.address}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Start Date:</span>
                  <span className="text-sm font-medium text-gray-900">{tenancy.startDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Term:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {tenancy.termMonths || 6} months rolling contract
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Monthly Rent:</span>
                  <span className="text-sm font-medium text-gray-900">£{tenancy.monthlyRent}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payment Cycle:</span>
                  <span className="text-sm font-medium text-gray-900">Every 28 days</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Deposit:</span>
                  <span className="text-sm font-medium text-gray-900">£{tenancy.depositAmount || 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium capitalize">{tenancy.status || 'active'}</span>
                </div>
              </div>
            </div>

            {/* Important Terms */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Important Terms</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">This is a licence agreement, not a tenancy</p>
                    <p className="text-blue-700 mt-1">
                      You do not have exclusive possession of your room. The householder retains the right to access.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Notice Period</p>
                    <p className="text-blue-700 mt-1">
                      Either party can terminate with 28 days written notice ending on a payment day.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Info className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Utilities Included</p>
                    <p className="text-blue-700 mt-1">
                      Gas, electric, water, basic internet, and council tax are included in your rent.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Maintenance Requests</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Maintenance request system coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LodgerDashboard;