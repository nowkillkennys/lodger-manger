import React, { useState, useEffect } from 'react';
import { Home, Bell, LogOut, DollarSign, Clock, Send, Wrench, FileText, Download, Eye, Info, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import AddressDisplay from './AddressDisplay';

const LodgerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tenancy, setTenancy] = useState(null);
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [nextPayment, setNextPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [photoIdFile, setPhotoIdFile] = useState(null);
  const [photoIdPreview, setPhotoIdPreview] = useState(null);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [idExpiryDate, setIdExpiryDate] = useState('');
  const [showSubmitPayment, setShowSubmitPayment] = useState(false);
  const [editableEmail, setEditableEmail] = useState('');
  const [editablePhone, setEditablePhone] = useState('');
  const [newIdExpiry, setNewIdExpiry] = useState('');
  const [showIdViewer, setShowIdViewer] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentSubmitForm, setPaymentSubmitForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  useEffect(() => {
    fetchLodgerData();
    // Initialize editable fields from user object
    setEditableEmail(user.email || '');
    setEditablePhone(user.phoneNumber || '');
  }, []);

  const fetchLodgerData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const responses = await Promise.allSettled([
        axios.get(`${API_URL}/api/tenancies`, config),
        axios.get(`${API_URL}/api/dashboard/lodger`, config),
        axios.get(`${API_URL}/api/notifications`, config)
      ]);

      if (responses[0].status === 'fulfilled') {
        const tenancies = responses[0].value.data;
        // Lodgers should only have one active tenancy
        const currentTenancy = tenancies.length > 0 ? tenancies[0] : null;
        setTenancy(currentTenancy);

        // Show agreement modal if tenancy exists but not signed
        if (currentTenancy && !currentTenancy.lodger_signature) {
          setShowAgreementModal(true);
        }

        // Fetch payment schedule for the tenancy
        if (currentTenancy) {
          const paymentResponse = await axios.get(`${API_URL}/api/tenancies/${currentTenancy.id}/payments`, config);
          setPayments(paymentResponse.data);
        }
      }

      if (responses[1].status === 'fulfilled') {
        const dashData = responses[1].value.data;
        setBalance(dashData.currentBalance || 0);
        setNextPayment(dashData.nextPayment || null);
      }

      if (responses[2].status === 'fulfilled') {
        setNotifications(responses[2].value.data || []);
      }

    } catch (error) {
      console.error('Failed to fetch lodger data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoIdChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoIdFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoIdPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAcceptAgreement = async () => {
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    if (!photoIdFile) {
      alert('Please upload your photo ID');
      return;
    }

    if (!dateOfBirth) {
      alert('Please enter your date of birth');
      return;
    }

    if (!idExpiryDate) {
      alert('Please enter your ID expiry date');
      return;
    }

    setUploadingAgreement(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo_id', photoIdFile);
      formData.append('agreed', 'true');
      formData.append('date_of_birth', dateOfBirth);
      formData.append('id_expiry_date', idExpiryDate);

      await axios.post(`${API_URL}/api/tenancies/${tenancy.id}/accept`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setShowAgreementModal(false);
      fetchLodgerData();
      alert('Agreement accepted successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to accept agreement');
    } finally {
      setUploadingAgreement(false);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/payments/${selectedPayment.id}/submit`, {
        amount: parseFloat(paymentSubmitForm.amount),
        payment_reference: paymentSubmitForm.payment_reference,
        payment_method: paymentSubmitForm.payment_method,
        notes: paymentSubmitForm.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowSubmitPayment(false);
      setSelectedPayment(null);
      setPaymentSubmitForm({
        amount: '',
        payment_method: 'bank_transfer',
        payment_reference: '',
        notes: ''
      });
      fetchLodgerData();
      alert('Payment submitted successfully! Your landlord will review and confirm.');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit payment');
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
      setActiveTab('payments');
    } else if (notification.type === 'tenancy_expiring') {
      setActiveTab('agreement');
    } else if (notification.type === 'extension_offer') {
      setActiveTab('extension offer');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  // Show onboarding message if no tenancy exists
  if (!tenancy) {
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

        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Lodger Manager!</h2>
            <p className="text-lg text-gray-600 mb-6">
              Your landlord account has been created successfully.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left max-w-2xl mx-auto">
              <h3 className="font-semibold text-blue-900 mb-3">Next Steps:</h3>
              <ol className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Your landlord will create a tenancy agreement for you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>You'll receive access to view your tenancy details, payment schedule, and agreement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>You'll be able to submit payments and manage your tenancy</span>
                </li>
              </ol>
            </div>
            <p className="text-sm text-gray-500 mt-8">
              Please contact your landlord if you have any questions.
            </p>
          </div>
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
                                notification.type === 'tenancy_expiring' ? 'bg-red-100' :
                                'bg-blue-100'
                              }`}>
                                <Bell className={`w-4 h-4 ${
                                  notification.type === 'payment_reminder' ? 'text-orange-600' :
                                  notification.type === 'payment_received' ? 'text-green-600' :
                                  notification.type === 'tenancy_expiring' ? 'text-red-600' :
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
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
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
            {['overview', 'payments', 'agreement', 'extension offer', 'my profile', 'maintenance'].map((tab) => (
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
            {/* ID Expired Alert */}
            {user.idExpiryDate && new Date(user.idExpiryDate) < new Date() && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-1">URGENT: Your Photo ID Has Expired</h3>
                    <p className="text-sm text-red-800 mb-3">
                      Your photo ID expired on {new Date(user.idExpiryDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}. You must upload a new valid ID immediately to comply with Right to Rent requirements.
                    </p>
                    <button
                      onClick={() => setActiveTab('my profile')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      Upload New ID Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ID Expiring Soon Alert */}
            {user.idExpiryDate &&
             new Date(user.idExpiryDate) >= new Date() &&
             new Date(user.idExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-1">Warning: Your Photo ID Expires Soon</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      Your photo ID will expire on {new Date(user.idExpiryDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}. Please upload a new ID before it expires.
                    </p>
                    <button
                      onClick={() => setActiveTab('my profile')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                    >
                      Upload New ID
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Agreement Pending Alert */}
            {tenancy && !tenancy.lodger_signature && (
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-orange-900 mb-1">Action Required: Sign Your Tenancy Agreement</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      You need to review and sign your tenancy agreement before you can access all features.
                    </p>
                    <button
                      onClick={() => setShowAgreementModal(true)}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                    >
                      Review & Sign Agreement Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white mb-6">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {user.fullName}!</h2>
              <p className="text-indigo-100">
                {tenancy ? `Your tenancy at ${tenancy.property_address}` : 'Loading your tenancy details...'}
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
                  £{tenancy?.monthly_rent || 0}
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
                          <p className="font-medium">Payment #{payment.payment_number}</p>
                          <p className="text-xs text-gray-600">{new Date(payment.due_date).toLocaleDateString('en-GB')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">£{parseFloat(payment.rent_due).toFixed(2)}</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            payment.payment_status === 'paid' || payment.payment_status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.payment_status}
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
                  <button
                    onClick={() => {
                      // Find next unpaid payment (current or nearest upcoming)
                      const today = new Date();
                      const unpaidPayments = payments.filter(p =>
                        p.payment_status !== 'paid' && p.payment_status !== 'confirmed'
                      );

                      // Sort by due date
                      unpaidPayments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

                      // Get the first unpaid payment (earliest due date)
                      const nextUnpaid = unpaidPayments[0];

                      if (nextUnpaid) {
                        setSelectedPayment(nextUnpaid);
                        setPaymentSubmitForm({
                          amount: nextUnpaid.rent_due,
                          payment_method: 'bank_transfer',
                          payment_reference: '',
                          notes: ''
                        });
                        setShowSubmitPayment(true);
                      } else {
                        alert('No pending payments found');
                      }
                    }}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition text-left"
                  >
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Schedule</h2>
              <p className="text-sm text-gray-600 mt-1">
                Your 28-day payment cycle schedule. First payment is typically 2 months rent (current + advance).
              </p>
            </div>

            {/* Payment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  £{payments.reduce((sum, p) => sum + parseFloat(p.rent_paid || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-blue-600">
                  £{payments.reduce((sum, p) => sum + parseFloat(p.rent_due || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className={`text-2xl font-bold ${
                  (payments.reduce((sum, p) => sum + parseFloat(p.rent_due || 0), 0) -
                   payments.reduce((sum, p) => sum + parseFloat(p.rent_paid || 0), 0)) > 0
                    ? 'text-red-600' : 'text-green-600'
                }`}>
                  £{Math.abs(
                    payments.reduce((sum, p) => sum + parseFloat(p.rent_due || 0), 0) -
                    payments.reduce((sum, p) => sum + parseFloat(p.rent_paid || 0), 0)
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.length > 0 ? (
                    payments.map((payment) => {
                      const dueDate = new Date(payment.due_date);
                      const today = new Date();
                      const isPaid = payment.payment_status === 'paid';
                      const isOverdue = dueDate < today && !isPaid;

                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">#{payment.payment_number}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(payment.due_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            £{parseFloat(payment.rent_due).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            £{parseFloat(payment.rent_paid || 0).toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap font-semibold ${
                            parseFloat(payment.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            £{parseFloat(payment.balance).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isPaid ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Paid
                              </span>
                            ) : payment.payment_status === 'submitted' ? (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                                <Send className="w-3 h-3" />
                                Submitted
                              </span>
                            ) : isOverdue ? (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                Overdue
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!isPaid && payment.payment_status !== 'submitted' && (
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setPaymentSubmitForm({
                                    amount: payment.rent_due,
                                    payment_method: 'bank_transfer',
                                    payment_reference: '',
                                    notes: ''
                                  });
                                  setShowSubmitPayment(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                              >
                                Submit Payment
                              </button>
                            )}
                            {payment.payment_status === 'submitted' && (
                              <span className="text-xs text-gray-500">
                                Awaiting confirmation
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No payment schedule available yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Payment Information</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Rent is due every 28 days from your tenancy start date</li>
                <li>• First payment is typically 2 months rent (current period + 1 month advance)</li>
                <li>• Balance shows: Rent Paid - Rent Due (positive = credit, negative = amount you owe)</li>
                <li>• Please ensure payments are made on or before the due date</li>
                <li>• Contact your landlord if you have any questions about payments</li>
              </ul>
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
                    Tenancy ID: {tenancy.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  {tenancy.signed_agreement_path ? (
                    <>
                      <a
                        href={`${API_URL}${tenancy.signed_agreement_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        <Eye className="w-4 h-4" />
                        View Agreement PDF
                      </a>
                      <a
                        href={`${API_URL}${tenancy.signed_agreement_path}`}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </a>
                    </>
                  ) : tenancy.lodger_signature ? (
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                      disabled
                      title="Waiting for landlord approval"
                    >
                      <Download className="w-4 h-4" />
                      PDF Pending Approval
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAgreementModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                    >
                      <FileText className="w-4 h-4" />
                      Review & Sign Agreement
                    </button>
                  )}
                </div>
              </div>

              {/* Agreement Details */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Property:</span>
                  <AddressDisplay address={tenancy.property_address} className="text-sm font-medium text-gray-900" />
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Start Date:</span>
                  <span className="text-sm font-medium text-gray-900">{new Date(tenancy.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Term:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {tenancy.initial_term_months || 6} months rolling contract
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Monthly Rent:</span>
                  <span className="text-sm font-medium text-gray-900">£{tenancy.monthly_rent}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payment Cycle:</span>
                  <span className="text-sm font-medium text-gray-900">Every 28 days</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Deposit:</span>
                  <span className="text-sm font-medium text-gray-900">£{tenancy.deposit_amount || 0}</span>
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

        {/* Extension Offer Tab */}
        {activeTab === 'extension offer' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Extension Offers</h2>

            {notifications.filter(n => n.type === 'extension_offer' && n.tenancy_id === tenancy?.id).length > 0 ? (
              <div className="space-y-4">
                {notifications
                  .filter(n => n.type === 'extension_offer' && n.tenancy_id === tenancy?.id)
                  .map((notification) => {
                    // This will be populated with actual extension data from the notices API
                    return (
                      <div key={notification.id} className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-purple-900">Tenancy Extension Offer</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Received: {new Date(notification.created_at).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                            Pending Response
                          </span>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4 mb-4">
                          <p className="text-sm text-purple-900">{notification.message}</p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-sm text-blue-900">
                            <strong>Note:</strong> Please review the extension offer letter for complete details including new end date, rent amount, and terms.
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={async () => {
                              const notes = prompt('Add any notes or questions for your landlord (optional):');
                              if (notes === null) return;

                              try {
                                const token = localStorage.getItem('token');
                                // Need to get the notice ID from the notification
                                // For now, we'll need to fetch it
                                const noticesResponse = await axios.get(
                                  `${API_URL}/api/tenancies/${tenancy.id}/notices`,
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const extensionNotice = noticesResponse.data.find(
                                  n => n.notice_type === 'extension_offer' && n.extension_status === 'pending'
                                );

                                if (extensionNotice) {
                                  await axios.put(
                                    `${API_URL}/api/notices/${extensionNotice.id}/extension-response`,
                                    { response: 'accepted', notes },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  alert('Extension offer accepted! Your tenancy has been extended.');
                                  window.location.reload();
                                }
                              } catch (error) {
                                alert(error.response?.data?.error || 'Failed to accept extension offer');
                              }
                            }}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                          >
                            ✓ Accept Extension
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('Are you sure you want to reject this extension offer? Your tenancy will end on the current end date.')) {
                                return;
                              }

                              const notes = prompt('Add any notes or reasons for rejection (optional):');
                              if (notes === null) return;

                              try {
                                const token = localStorage.getItem('token');
                                const noticesResponse = await axios.get(
                                  `${API_URL}/api/tenancies/${tenancy.id}/notices`,
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                const extensionNotice = noticesResponse.data.find(
                                  n => n.notice_type === 'extension_offer' && n.extension_status === 'pending'
                                );

                                if (extensionNotice) {
                                  await axios.put(
                                    `${API_URL}/api/notices/${extensionNotice.id}/extension-response`,
                                    { response: 'rejected', notes },
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  alert('Extension offer rejected. Your tenancy will end on the current end date.');
                                  window.location.reload();
                                }
                              } catch (error) {
                                alert(error.response?.data?.error || 'Failed to reject extension offer');
                              }
                            }}
                            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
                          >
                            ✗ Reject Extension
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Extension Offers</h3>
                <p className="text-gray-600">
                  You don't have any pending extension offers at this time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* My Profile Tab */}
        {activeTab === 'my profile' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>

            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={user.fullName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={user.dateOfBirth || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={editableEmail}
                    onChange={(e) => setEditableEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editablePhone}
                    onChange={(e) => setEditablePhone(e.target.value)}
                    placeholder="07XXX XXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Expiry Date</label>
                  <input
                    type="date"
                    value={user.idExpiryDate || ''}
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${
                      user.idExpiryDate && new Date(user.idExpiryDate) < new Date()
                        ? 'border-red-300 bg-red-50 text-red-900'
                        : 'border-gray-300 bg-gray-50 text-gray-600'
                    }`}
                  />
                  {user.idExpiryDate && new Date(user.idExpiryDate) < new Date() && (
                    <p className="text-xs text-red-600 font-semibold mt-1">🚨 EXPIRED - Upload new ID immediately</p>
                  )}
                  {user.idExpiryDate &&
                   new Date(user.idExpiryDate) >= new Date() &&
                   new Date(user.idExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                    <p className="text-xs text-orange-600 mt-1">⚠️ Expires soon - please upload new ID below</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
                  <input
                    type="text"
                    value={new Date(user.createdAt || Date.now()).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    await axios.put(`${API_URL}/api/users/profile`, {
                      email: editableEmail,
                      phone_number: editablePhone
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    alert('✅ Profile updated successfully!');
                    fetchLodgerData();
                  } catch (error) {
                    alert(error.response?.data?.error || 'Failed to update profile');
                  }
                }}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
              >
                Save Changes
              </button>
            </div>

            {/* Photo ID Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo ID</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload a clear photo of your passport, driving licence, or national ID card for Right to Rent verification.
              </p>

              {tenancy?.photo_id_path && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Photo ID on file</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your photo ID was uploaded on {new Date(tenancy.lodger_signature_date || Date.now()).toLocaleDateString('en-GB')}
                  </p>
                  <button
                    onClick={() => setShowIdViewer(true)}
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Current ID
                  </button>
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h4 className="font-semibold mb-3">
                  {tenancy?.photo_id_path ? 'Upload New Photo ID' : 'Upload Photo ID'}
                </h4>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New ID Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={newIdExpiry}
                    onChange={(e) => setNewIdExpiry(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePhotoIdChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {photoIdPreview && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <img src={photoIdPreview} alt="ID Preview" className="max-w-xs rounded border" />
                  </div>
                )}
                {photoIdFile && (
                  <button
                    onClick={async () => {
                      if (!photoIdFile) {
                        alert('Please select a file to upload');
                        return;
                      }

                      if (!newIdExpiry) {
                        alert('Please enter the ID expiry date');
                        return;
                      }

                      try {
                        const token = localStorage.getItem('token');
                        const formData = new FormData();
                        formData.append('photo_id', photoIdFile);
                        formData.append('id_expiry_date', newIdExpiry);

                        await axios.post(`${API_URL}/api/tenancies/${tenancy.id}/upload-id`, formData, {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                          }
                        });

                        alert('✅ Photo ID uploaded successfully!');
                        setPhotoIdFile(null);
                        setPhotoIdPreview(null);
                        setNewIdExpiry('');
                        fetchLodgerData();
                      } catch (error) {
                        alert(error.response?.data?.error || 'Failed to upload photo ID');
                      }
                    }}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                  >
                    Upload New ID
                  </button>
                )}
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Acceptable Documents:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Valid UK or foreign passport</li>
                  <li>• UK photocard driving licence (full or provisional)</li>
                  <li>• National identity card (EEA nationals)</li>
                  <li>• Biometric residence permit</li>
                </ul>
              </div>
            </div>

            {/* Tenancy Information */}
            {tenancy && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Tenancy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
                    <AddressDisplay address={tenancy.property_address} className="text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <p className="text-gray-900">
                      {new Date(tenancy.start_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                    <p className="text-gray-900">£{tenancy.monthly_rent}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      tenancy.status === 'active' ? 'bg-green-100 text-green-700' :
                      tenancy.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tenancy.status}
                    </span>
                  </div>
                </div>
              </div>
            )}
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

      {/* Agreement Acceptance Modal */}
      {showAgreementModal && tenancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Review & Accept Tenancy Agreement</h2>
                <p className="text-sm text-gray-600 mt-1">Please review your agreement and upload photo ID</p>
              </div>
              <button
                onClick={() => setShowAgreementModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Agreement Details */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Agreement Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Property Address</p>
                    <AddressDisplay address={tenancy.property_address} className="font-medium" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Room Description</p>
                    <p className="font-medium">{tenancy.room_description || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium">{new Date(tenancy.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Initial Term</p>
                    <p className="font-medium">{tenancy.initial_term_months} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent</p>
                    <p className="font-medium">£{tenancy.monthly_rent}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Initial Payment</p>
                    <p className="font-medium">£{tenancy.initial_payment}</p>
                  </div>
                  {tenancy.deposit_applicable && (
                    <div>
                      <p className="text-sm text-gray-600">Deposit</p>
                      <p className="font-medium">£{tenancy.deposit_amount}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Agreement Text */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-6 max-h-[500px] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4 sticky top-0 bg-white pb-2 border-b">LODGER AGREEMENT - FULL TERMS</h3>
<div className="prose prose-sm max-w-none text-[11px] leading-relaxed space-y-3">
                  <p className="font-bold text-center text-sm">LODGER AGREEMENT</p>
                  <p className="font-semibold text-center">AGREEMENT FOR NON-EXCLUSIVE OR SHARED OCCUPATION</p>

                  <p className="text-gray-700">
                    This LODGER AGREEMENT is made up of the details about the parties and the agreement in Part 1,
                    the Terms and Conditions printed below in Part 2, and any Special Terms and Conditions agreed
                    between the parties which have been recorded in Part 3, whereby the Room is licensed by the
                    Householder and taken by the Lodger during the Term upon making the Accommodation Payment.
                  </p>

                  <p className="font-bold mt-3">PART 1 - PARTICULARS</p>
                  <div className="pl-3 space-y-1">
                    <p><strong>PROPERTY:</strong> <AddressDisplay address={tenancy.property_address} /></p>
                    <p><strong>ROOM:</strong> {tenancy.room_description || 'Means the room or rooms in the Property which the Householder allocates to the Lodger'}</p>
                    <p><strong>SHARED AREAS:</strong> {tenancy.shared_areas || 'Entrance hall, staircase and landings, kitchen for cooking and storage, lavatory and bathroom, sitting room, garden (where applicable)'}</p>
                    <p><strong>HOUSEHOLDER (Landlord):</strong> {user.fullName}'s Landlord</p>
                    <p><strong>LODGER:</strong> {user.fullName}</p>
                    <p><strong>START DATE:</strong> {new Date(tenancy.start_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                    <p><strong>TERM:</strong> {tenancy.initial_term_months} Months Rolling Contract until Terminated by either party</p>
                    <p><strong>INITIAL PAYMENT:</strong> £{tenancy.initial_payment} (current and month in advance payment)</p>
                    <p><strong>ACCOMMODATION PAYMENT:</strong> £{tenancy.monthly_rent} per 28 days</p>
                    <p><strong>PAYMENT DAY:</strong> The day of signing this agreement</p>
                    <p><strong>DEPOSIT:</strong> £{tenancy.deposit_amount || 0} {tenancy.deposit_applicable ? '(Applicable - Yes)' : '(Not Applicable - No)'}</p>
                  </div>

                  <p className="font-bold mt-3">EARLY TERMINATION:</p>
                  <p className="text-gray-700">
                    Either party may at any time end this Agreement earlier than the End Date by giving notice in writing of at least
                    one calendar month ending on the Payment Day. If within the rental term any deposits taken will be void unless mutually agreed by both parties.
                  </p>

                  <p className="font-bold mt-3">UTILITY COSTS:</p>
                  <p className="text-gray-700">
                    All utilities including gas, electric, water, basic internet, and Council Tax are <strong>INCLUDED</strong>.
                  </p>
                  <p className="text-gray-700">
                    <strong>Excluded Utility Cost:</strong> Television License is NOT included. If the lodger would like to view any LIVE
                    broadcast, the lodger accepts responsibility to pay for the television licence and provide evidence of purchase at their own expense (BBC iPlayer etc).
                  </p>

                  <p className="font-bold mt-4">NOW IT IS AGREED AS FOLLOWS:</p>

                  <p className="font-semibold mt-3">1. About the Licence to Occupy a Room in the Property</p>
                  <div className="pl-3 space-y-1">
                    <p>1.1. The Householder permits the Lodger to occupy the Room until either party ends the arrangement as provided for under clause 9 of this agreement.</p>
                    <p>1.2. The Lodger will occupy the Room personally and shall not share the Room with any other person, except where the Lodger has asked to share the Room with another person and the Householder has agreed in writing.</p>
                    <p>1.3. The Lodger shall have use of the Contents in the Room, an inventory of which will be prepared by the Householder and provided to the Lodger.</p>
                    <p>1.4. The Lodger may use the facilities of the Shared Areas of the Property in common with the Householder but only in conjunction with their occupation of the Room.</p>
                    <p>1.5. This agreement is <strong>NOT</strong> intended to confer exclusive possession upon the Lodger nor to create the relationship of landlord and tenant. The Lodger shall not be entitled to an assured tenancy or statutory periodic tenancy under the Housing Act 1988.</p>
                    <p>1.6. This agreement is personal to the Lodger, cannot be assigned to any other party, and can be terminated by either party on notice.</p>
                    <p>1.7. It is a condition of this agreement that the Lodger maintain a "Right to Rent" as defined by the Immigration Act 2014 at all times during the Term.</p>
                  </div>

                  <p className="font-semibold mt-3">2. Lodger Obligations</p>
                  <p className="font-medium">2.1. Payments</p>
                  <div className="pl-3 space-y-1">
                    <p>2.1.1. To pay the Accommodation Payment at the times and in the manner set out above.</p>
                    <p>2.1.2. To pay simple interest at 3% above Bank of England base rate upon any payment which is not paid within 14 days after the due date.</p>
                  </div>

                  <p className="font-medium mt-2">2.2. Utilities</p>
                  <div className="pl-3 space-y-1">
                    <p>2.2.1. To make only reasonable use of the Utilities consistent with ordinary residential use by a single occupier.</p>
                  </div>

                  <p className="font-medium mt-2">2.3. Use of the Property</p>
                  <div className="pl-3 space-y-1">
                    <p>2.3.1. Not to use or occupy the Room in any way other than as a private residence.</p>
                    <p>2.3.2. Not to let or share any rooms or take in any lodger or paying guest. With the Householder's prior permission, occasional overnight visitors allowed.</p>
                  </div>

                  <p className="font-medium mt-2">2.4. Maintenance</p>
                  <div className="pl-3 space-y-1">
                    <p>2.4.1. To keep the Room and all Shared Parts in good and clean condition.</p>
                    <p>2.4.2. To keep the Contents in good condition and not remove any articles from the Room.</p>
                    <p>2.4.3. To make good all damage to Contents and replace items broken or damaged.</p>
                  </div>

                  <p className="font-medium mt-2">2.5. Activities at the Property</p>
                  <div className="pl-3 space-y-1">
                    <p>2.5.1. Not to smoke cigarettes, cigars, pipes or any other substances in the Property - <strong>outside only</strong>.</p>
                    <p>2.5.2. To cook at the Property only in the kitchen.</p>
                    <p>2.5.3. Not to keep any pet or animal without the Householder's prior consent.</p>
                    <p>2.5.4. Not to make any alteration, addition, redecoration or painting without written consent.</p>
                    <p>2.5.5. Not to do anything which may be a nuisance or prejudice the insurance of the Property.</p>
                    <p>2.5.6. To ensure the Room is cleaned weekly and all rubbish disposed of daily with proper recycling.</p>
                  </div>

                  <p className="font-medium mt-2">2.6. Other Obligations</p>
                  <div className="pl-3 space-y-1">
                    <p>2.6.1. To comply with Right to Rent checks and provide required documents.</p>
                    <p>2.6.2. To assist with Council Tax discount/exemption applications if applicable.</p>
                  </div>

                  <p className="font-medium mt-2">2.7. At the End of Agreement</p>
                  <div className="pl-3 space-y-1">
                    <p>2.7.1. To vacate the Room and leave in same clean and tidy state (fair wear and tear excepted), returning all keys.</p>
                    <p>2.7.2. To provide forwarding address and remove all rubbish and personal items before leaving.</p>
                  </div>

                  <p className="font-semibold mt-3">3. Householder Obligations</p>
                  <div className="pl-3 space-y-1">
                    <p>3.1. To keep in good repair the structure, exterior, drains, gutters and installations for water, gas, electricity, sanitation, heating.</p>
                    <p>3.2. To keep in good repair fixtures and fittings provided for use by the Lodger.</p>
                    <p>3.3. To comply with Gas Safety Regulations 1998 - annual gas appliance checks by Gas Safe-registered installer.</p>
                    <p>3.4. To ensure furniture and furnishings comply with Fire Safety Regulations 1988.</p>
                    <p>3.5. To ensure all electrical equipment is kept in good repair.</p>
                    <p>3.6. To install and maintain smoke detectors and carbon monoxide detectors.</p>
                    <p>3.7. To ensure the Room and Shared Areas are fit for human habitation.</p>
                    <p>3.8. To pay the Council Tax for the Property during the Term.</p>
                    <p>3.9. To warrant they have permission to take in lodgers in the Property.</p>
                  </div>

                  <p className="font-semibold mt-3">4. Amicable Sharing</p>
                  <div className="pl-3 space-y-1">
                    <p>4.1. The Lodger shall use best efforts to share the use of the Room and Property amicably and peaceably with the Householder. The Lodger shall not interfere with or obstruct such shared occupation.</p>
                    <p>4.2. Both parties will respect each other's reasonable needs for privacy and decency. Nothing in this clause grants the Lodger exclusive possession.</p>
                  </div>

                  <p className="font-semibold mt-3">5. Keys</p>
                  <div className="pl-3 space-y-1">
                    <p>5.1. The Householder shall give the Lodger one set of keys to the Room and Property.</p>
                    <p>5.2. The Lodger will keep safe any keys and pay reasonable costs for any loss.</p>
                    <p>5.3. The Householder retains their own keys and may obtain free entry to the Room at any reasonable time.</p>
                  </div>

                  <p className="font-semibold mt-3">6. Deposit (if applicable)</p>
                  <div className="pl-3 space-y-1">
                    <p>6.1. The Deposit will be held by the Householder during the Term. No interest will be payable.</p>
                    <p>6.2. The Householder is NOT required to protect the Deposit with a Government approved protection scheme.</p>
                    <p>6.3. At end of Term the Deposit will be refunded less any reasonable deductions for breaches of obligations.</p>
                    <p>6.4. The Deposit shall be repaid as soon as reasonably practicable, not exceeding one month (except exceptional circumstances).</p>
                  </div>

                  <p className="font-semibold mt-3">7. Uninhabitability</p>
                  <p className="pl-3">In the event of destruction or damage making the Property uninhabitable, the Lodger shall be relieved from making Payment proportionate to the extent prevented from living in the Property (unless caused by Lodger's act or default).</p>

                  <p className="font-semibold mt-3">8. Moving to Another Room</p>
                  <div className="pl-3 space-y-1">
                    <p>8.1. The Householder may give reasonable written notice directing the Lodger to use another room of similar size and condition.</p>
                    <p>8.2. Notice must give minimum 48 hours to move or reasonable time in circumstances.</p>
                  </div>

                  <p className="font-semibold mt-3">9. Ending this Agreement</p>
                  <div className="pl-3 space-y-1">
                    <p><strong>9.1. Termination for Breach:</strong> If Lodger breaches any term, or payments are 14+ days late, or Lodger is declared bankrupt, the Householder may give 7 days notice to remedy. If breach not remedied after 7 days, landlord may terminate with further 14 days notice.</p>
                    <p><strong>9.2. Break Clause:</strong> Either party may terminate by giving one calendar month written notice expiring the day before a Payment Day. Upon expiry this Agreement shall end with no further liability except existing breaches.</p>
                    <p><strong>9.3. Behaviour Clause:</strong> If the Householder deems behaviour unacceptable, they will provide written warning notice. If behaviour not corrected, Householder may terminate with maximum 14 days notice (or immediate effect for aggressive behaviour).</p>
                    <p><strong>9.4.</strong> At end of agreement, Lodger must remove all items. Items left behind (except perishable food) will be stored for 14 days then disposed of.</p>
                  </div>

                  <p className="font-semibold mt-3">10. About the Legal Effect of this Agreement</p>
                  <div className="pl-3 space-y-1">
                    <p>10.1. If any term is held to be illegal or unenforceable, that term shall be deemed not to form part of this agreement and the remainder shall not be affected.</p>
                    <p>10.2. This agreement shall be exclusively governed by and interpreted in accordance with the laws of England and Wales, and parties agree to submit to the exclusive jurisdiction of the English Courts.</p>
                    <p>10.3. This agreement embodies the entire understanding of the parties relating to the Room and Property and all matters dealt with.</p>
                  </div>

                  <p className="font-semibold mt-3">11. Definitions and Interpretation</p>
                  <div className="pl-3 space-y-1">
                    <p>11.1. "the Room" means such room or rooms in the Property as the Householder shall allocate to the Lodger.</p>
                    <p>11.2. "the Contents" means the furniture and Householder's possessions used by the Lodger.</p>
                    <p>11.3. "Deposit" means the sum to be held as security against breaches of Lodger's obligations.</p>
                    <p>11.4. "Householder" includes successors in title to the Householder's interest in the Property.</p>
                    <p>11.5. "Lodger" means the person identified who the Householder permits to occupy a Room.</p>
                    <p>11.6. "Property" means the Property along with its exterior, common areas and all Contents.</p>
                    <p>11.7. "Shared Areas" means the rooms the Householder has agreed may be used by Lodgers.</p>
                    <p>11.8. "Accommodation Payment" means the sum payable in advance in equal instalments on Payment Days.</p>
                    <p>11.9. "Payment Day" means the days specified on which Accommodation Payment should be paid.</p>
                    <p>11.10. "Term" means a fixed term between the Start Date and End Date.</p>
                    <p>11.11. "Utilities" means electricity, gas, water, drainage, heating, telephone, television, internet and all other utilities.</p>
                  </div>

                  <p className="text-xs text-gray-500 mt-4 italic border-t pt-3">
                    Please read this entire agreement carefully. By accepting, you confirm you have read,
                    understood, and agree to all terms and conditions. This is a legally binding agreement.
                  </p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Personal Information (Required)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={idExpiryDate}
                      onChange={(e) => setIdExpiryDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Photo ID Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h3 className="font-semibold mb-3">Upload Photo ID (Required)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please upload a clear photo of your passport, driving licence, or national ID card for Right to Rent verification.
                </p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handlePhotoIdChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {photoIdPreview && (
                  <div className="mt-4">
                    <img src={photoIdPreview} alt="ID Preview" className="max-w-xs rounded border" />
                  </div>
                )}
              </div>

              {/* Agreement Checkbox */}
              <div className="border-t pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have read and agree to the terms and conditions of this lodger licence agreement. I understand this is not a tenancy and I do not have exclusive possession of the property.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleAcceptAgreement}
                  disabled={!agreedToTerms || !photoIdFile || uploadingAgreement}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    agreedToTerms && photoIdFile && !uploadingAgreement
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {uploadingAgreement ? 'Processing...' : 'Accept Agreement & Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Payment Modal */}
      {showSubmitPayment && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Submit Payment</h2>
              <p className="text-sm opacity-90">Payment #{selectedPayment.payment_number}</p>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Due Date:</span>
                  <span className="font-medium">{new Date(selectedPayment.due_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount Due:</span>
                  <span className="font-medium">£{parseFloat(selectedPayment.rent_due).toFixed(2)}</span>
                </div>
              </div>

              {/* Landlord Payment Details */}
              {(tenancy?.landlord_bank_account || tenancy?.landlord_sort_code || tenancy?.landlord_payment_reference) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Payment Details</h3>
                  <div className="space-y-1 text-sm">
                    {tenancy.landlord_bank_account && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Account Number:</span>
                        <span className="font-mono font-semibold">{tenancy.landlord_bank_account}</span>
                      </div>
                    )}
                    {tenancy.landlord_sort_code && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Sort Code:</span>
                        <span className="font-mono font-semibold">{tenancy.landlord_sort_code}</span>
                      </div>
                    )}
                    {tenancy.landlord_payment_reference && (
                      <div className="flex justify-between">
                        <span className="text-green-700">Reference:</span>
                        <span className="font-semibold">{tenancy.landlord_payment_reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Note:</strong> This notifies your landlord that you have sent payment. Make sure you've actually transferred the money before submitting!
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={paymentSubmitForm.amount}
                  onChange={(e) => setPaymentSubmitForm({...paymentSubmitForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  required
                  value={paymentSubmitForm.payment_method}
                  onChange={(e) => setPaymentSubmitForm({...paymentSubmitForm, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="standing_order">Standing Order</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
                <input
                  type="text"
                  value={paymentSubmitForm.payment_reference}
                  onChange={(e) => setPaymentSubmitForm({...paymentSubmitForm, payment_reference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Transaction reference or description"
                />
                <p className="text-xs text-gray-500 mt-1">E.g., bank transaction reference</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={paymentSubmitForm.notes}
                  onChange={(e) => setPaymentSubmitForm({...paymentSubmitForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Submit to Landlord
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSubmitPayment(false);
                    setSelectedPayment(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo ID Viewer Modal */}
      {showIdViewer && tenancy?.photo_id_path && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setShowIdViewer(false)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowIdViewer(false)}
              className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-50 hover:bg-opacity-75 text-white rounded-full transition z-10"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">Photo ID Document</h3>
              <p className="text-sm opacity-90 mt-1">
                Uploaded on {new Date(tenancy.lodger_signature_date || Date.now()).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Image Content */}
            <div className="p-6">
              <img
                src={`${API_URL}${tenancy.photo_id_path}`}
                alt="Photo ID"
                className="w-full h-auto rounded-lg"
                style={{ maxHeight: 'calc(90vh - 200px)', objectFit: 'contain' }}
              />
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Click outside or press the X to close
              </p>
              <a
                href={`${API_URL}${tenancy.photo_id_path}`}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
              >
                <Download className="w-4 h-4" />
                Download ID
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LodgerDashboard;