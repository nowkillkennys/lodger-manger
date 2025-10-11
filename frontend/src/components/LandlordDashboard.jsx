import React, { useState, useEffect } from 'react';
import { Home, Users, CreditCard, Calendar, Settings, LogOut, Bell, Plus, Eye, FileText, TrendingUp, Clock, AlertCircle, Download, AlertTriangle, DollarSign, X } from 'lucide-react';
import axios from 'axios';
import StatCard from './StatCard';
import PaymentSchedule from './PaymentSchedule';
import PaymentCalendar from './PaymentCalendar';
import { API_URL } from '../config';
import AddressDisplay from './AddressDisplay';
import { showSuccess, showError, showWarning } from '../utils/toast';

/**
 * Parse a free-text address into structured components
 * This is a best-effort parser for UK addresses
 */
function parseAddress(addressString) {
  if (!addressString || typeof addressString !== 'string') {
    return {
      house_number: '',
      street_name: '',
      city: '',
      county: '',
      postcode: ''
    };
  }

  const address = addressString.trim();

  // Extract postcode (UK format: e.g., SW1A 1AA, M1 1AA, etc.)
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
  const postcodeMatch = address.match(postcodeRegex);
  let postcode = '';
  let addressWithoutPostcode = address;

  if (postcodeMatch) {
    postcode = postcodeMatch[1].toUpperCase();
    addressWithoutPostcode = address.replace(postcodeMatch[0], '').trim();
  }

  // Split by commas to get address components
  const parts = addressWithoutPostcode.split(',').map(p => p.trim()).filter(p => p);

  let house_number = '';
  let street_name = '';
  let city = '';
  let county = '';

  if (parts.length >= 1) {
    // First part contains the full street address
    street_name = parts[0];
  }

  if (parts.length >= 2) {
    city = parts[1];
  }

  if (parts.length >= 3) {
    county = parts[2];
  }

  return {
    house_number,
    street_name,
    city,
    county,
    postcode
  };
}


// Deductions History Component
const DeductionsHistory = ({ tenancyId }) => {
  console.log('DeductionsHistory render for tenancyId:', tenancyId);
   const [tenancyDeductions, setTenancyDeductions] = useState([]);
   const [fundsSummary, setFundsSummary] = useState(null);
   const [loadingDeductions, setLoadingDeductions] = useState(true);

   useEffect(() => {
     const fetchDeductions = async () => {
    console.log('DeductionsHistory useEffect running for tenancyId:', tenancyId);
       try {
         const [deductionsRes, fundsRes] = await Promise.all([
           axios.get(`${API_URL}/api/tenancies/${tenancyId}/deductions`, {
             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
           }),
           axios.get(`${API_URL}/api/tenancies/${tenancyId}/available-funds`, {
             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
           })
         ]);
         setTenancyDeductions(deductionsRes.data.deductions || []);
         setFundsSummary(fundsRes.data);
       } catch (error) {
         console.error('Error fetching deductions:', error);
       } finally {
         setLoadingDeductions(false);
       }
     };
     fetchDeductions();
   }, [tenancyId]);

   if (loadingDeductions) {
     return (
       <div className="mt-6 pt-6 border-t">
         <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Deductions & Funds</h4>
         <p className="text-sm text-gray-500">Loading...</p>
       </div>
     );
   }

   const handleGenerateStatement = async (deductionId) => {
     try {
       await axios.post(
         `${API_URL}/api/deductions/${deductionId}/generate-statement`,
         {},
         { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
       );
       showSuccess('Statement generated successfully');
       // Refresh
       const deductionsRes = await axios.get(`${API_URL}/api/tenancies/${tenancyId}/deductions`, {
         headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
       });
       setTenancyDeductions(deductionsRes.data.deductions || []);
     } catch (error) {
       showError('Failed to generate statement');
     }
   };

   return (
     <div className="mt-6 pt-6 border-t">
       <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Deductions & Funds</h4>

       {fundsSummary && (
         <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
           <div>
             <p className="text-xs text-blue-700">Original Deposit</p>
             <p className="font-bold text-blue-900">£{fundsSummary.original_deposit.toFixed(2)}</p>
           </div>
           <div>
             <p className="text-xs text-blue-700">Original Advance Rent</p>
             <p className="font-bold text-blue-900">£{fundsSummary.original_advance.toFixed(2)}</p>
           </div>
           <div>
             <p className="text-xs text-green-700">Remaining Deposit</p>
             <p className="font-bold text-green-900">£{fundsSummary.available_deposit.toFixed(2)}</p>
           </div>
           <div>
             <p className="text-xs text-green-700">Remaining Advance Rent</p>
             <p className="font-bold text-green-900">£{fundsSummary.available_advance.toFixed(2)}</p>
           </div>
         </div>
       )}

       {tenancyDeductions.length > 0 ? (
         <div className="space-y-2 max-h-64 overflow-y-auto">
           {tenancyDeductions.map((deduction, idx) => (
             <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
               <div className="flex justify-between items-start">
                 <div className="flex-1">
                   <span className="inline-block px-2 py-0.5 bg-orange-200 text-orange-900 text-xs font-semibold rounded mb-1">
                     {deduction.deduction_type.replace('_', ' ').toUpperCase()}
                   </span>
                   <p className="text-sm font-medium text-gray-900">{deduction.description}</p>
                   <div className="flex gap-4 text-xs text-gray-600 mt-1">
                     <span>Date: {new Date(deduction.created_at).toLocaleDateString('en-GB')}</span>
                     {parseFloat(deduction.amount_from_deposit) > 0 && (
                       <span>Deposit: £{parseFloat(deduction.amount_from_deposit).toFixed(2)}</span>
                     )}
                     {parseFloat(deduction.amount_from_advance) > 0 && (
                       <span>Advance: £{parseFloat(deduction.amount_from_advance).toFixed(2)}</span>
                     )}
                   </div>
                 </div>
                 <p className="font-bold text-base text-red-600 ml-3">-£{parseFloat(deduction.amount).toFixed(2)}</p>
               </div>
               {deduction.statement_path ? (
                 <a
                   href={`${API_URL}${deduction.statement_path}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                 >
                   <Download className="w-3 h-3" />
                   View Statement
                 </a>
               ) : (
                 <button
                   onClick={() => handleGenerateStatement(deduction.id)}
                   className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                 >
                   <Download className="w-3 h-3" />
                   Generate Statement
                 </button>
               )}
             </div>
           ))}
         </div>
       ) : (
         <p className="text-sm text-gray-500">No deductions recorded</p>
       )}
     </div>
   );
 };

const LandlordDashboard = ({ user, onLogout }) => {
  console.log('LandlordDashboard render start');
   const [activeTab, setActiveTab] = useState('overview');
  const [tenancies, setTenancies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lodgers, setLodgers] = useState([]);
  const [lodgerFilter, setLodgerFilter] = useState('all');
  const [showCreateLodger, setShowCreateLodger] = useState(false);
  const [newLodger, setNewLodger] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [showCreateTenancy, setShowCreateTenancy] = useState(false);
  const [newTenancy, setNewTenancy] = useState(() => {
    const parsedAddress = parseAddress(user.address || '');
    return {
      lodger_id: '',
      property_house_number: parsedAddress.house_number,
      property_street_name: parsedAddress.street_name,
      property_city: parsedAddress.city,
      property_county: parsedAddress.county,
      property_postcode: parsedAddress.postcode,
      room_description: '',
      start_date: '',
      initial_term_months: 6,
      monthly_rent: '',
      initial_payment: '',
      deposit_applicable: false,
      deposit_amount: '',
      payment_type: 'cycle',
      payment_frequency: '4-weekly',
      payment_day_of_month: 1,
      shared_areas: {
        kitchen: false,
        bathroom: false,
        living_room: false,
        garden: false
      }
    };
  });
  const [selectedTenancy, setSelectedTenancy] = useState(null);
  const [showTenancyModal, setShowTenancyModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    reason: '',
    sub_reason: '',
    notice_period_days: 28,
    additional_notes: ''
  });
  const [showBreachModal, setShowBreachModal] = useState(false);
  const [breachForm, setBreachForm] = useState({
    breach_type: '',
    breach_description: '',
    additional_notes: ''
  });
  const [activeBreachNotices, setActiveBreachNotices] = useState([]);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extensionForm, setExtensionForm] = useState({
    extension_months: 6,
    new_monthly_rent: '',
    notes: ''
  });
  const [showCancelOfferModal, setShowCancelOfferModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    activeTenancies: 0,
    monthlyIncome: 0,
    upcomingPayments: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showEditLodger, setShowEditLodger] = useState(false);
  const [editLodger, setEditLodger] = useState(null);
  const parsedAddress = parseAddress(user.address || '');
  const [profileForm, setProfileForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    house_number: parsedAddress.house_number,
    street_name: parsedAddress.street_name,
    city: parsedAddress.city,
    county: parsedAddress.county,
    postcode: parsedAddress.postcode,
    rooms: user.rooms || [],
    bank_account_number: user.bank_account_number || '',
    bank_sort_code: user.bank_sort_code || '',
    payment_reference: user.payment_reference || ''
  });
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false);
  const [selectedTenancyForPayments, setSelectedTenancyForPayments] = useState(null);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentConfirmForm, setPaymentConfirmForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: ''
  });
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionForm, setDeductionForm] = useState({
    deduction_type: 'damage',
    description: '',
    amount: '',
    deduct_from_deposit: '',
    deduct_from_advance: '',
    notes: ''
  });
  const [availableFunds, setAvailableFunds] = useState(null);
  const [deductions, setDeductions] = useState([]);
  const [landlordProfile, setLandlordProfile] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [resetRequests, setResetRequests] = useState([]);
  const [showResetRequestModal, setShowResetRequestModal] = useState(false);
  const [resetRequestForm, setResetRequestForm] = useState({
    request_type: 'forgot_password',
    details: ''
  });
  const [showClaimLodgerModal, setShowClaimLodgerModal] = useState(false);
  const [claimStep, setClaimStep] = useState('email'); // 'email' or 'confirm'
  const [claimLodgerForm, setClaimLodgerForm] = useState({
    lodger_email: ''
  });
  const [lodgerPreview, setLodgerPreview] = useState(null);
  console.log('LandlordDashboard all hooks initialized');

  useEffect(() => {
    fetchDashboardData();
    fetchLandlordProfile();
  }, []);

  // Update newTenancy address fields when landlordProfile is loaded
  useEffect(() => {
    if (landlordProfile) {
      setNewTenancy(prev => ({
        ...prev,
        property_house_number: landlordProfile.house_number || '',
        property_street_name: landlordProfile.street_name || '',
        property_city: landlordProfile.city || '',
        property_county: landlordProfile.county || '',
        property_postcode: landlordProfile.postcode || ''
      }));
    }
  }, [landlordProfile]);

  // Update profileForm when landlordProfile is loaded
   useEffect(() => {
     if (landlordProfile) {
       setProfileForm({
         full_name: landlordProfile.full_name || '',
         email: landlordProfile.email || '',
         phone: landlordProfile.phone || '',
         house_number: landlordProfile.house_number || '',
         street_name: landlordProfile.street_name || '',
         city: landlordProfile.city || '',
         county: landlordProfile.county || '',
         postcode: landlordProfile.postcode || '',
         rooms: landlordProfile.rooms || [],
         bank_account_number: landlordProfile.bank_account_number || '',
         bank_sort_code: landlordProfile.bank_sort_code || '',
         payment_reference: landlordProfile.payment_reference || ''
       });
     }
   }, [landlordProfile]);

  // Fetch breach notices when tenancies are loaded
  useEffect(() => {
    if (tenancies.length > 0) {
      fetchBreachNotices();
    }
  }, [tenancies]);

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

  const hasActiveTenancy = (lodgerId) => {
    return tenancies.some(tenancy => tenancy.lodger_id === lodgerId && ['active', 'draft', 'extended'].includes(tenancy.status));
  };

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
        axios.get(`${API_URL}/api/users/lodgers`, config)
      ]);

      // Handle tenancies
      if (responses[0].status === 'fulfilled') {
        const fetchedTenancies = responses[0].value.data;
        setTenancies(fetchedTenancies);
        // Auto-select first tenancy if none selected
        if (fetchedTenancies.length > 0 && !selectedTenancy) {
          setSelectedTenancy(fetchedTenancies[0]);
        }
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

  const fetchLandlordProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLandlordProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch landlord profile:', error);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/reset-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResetRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch reset requests:', error);
    }
  };

  const handleSubmitResetRequest = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/reset-requests`, resetRequestForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Reset request submitted successfully! An administrator will review your request.');
      setShowResetRequestModal(false);
      setResetRequestForm({ request_type: 'forgot_password', details: '' });
      fetchResetRequests(); // Refresh the list
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to submit reset request');
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
      showError(error.response?.data?.error || 'Failed to create lodger');
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
        property_house_number: newTenancy.property_house_number,
        property_street_name: newTenancy.property_street_name,
        property_city: newTenancy.property_city,
        property_county: newTenancy.property_county,
        property_postcode: newTenancy.property_postcode,
        room_description: newTenancy.room_description,
        start_date: newTenancy.start_date,
        initial_term_months: parseInt(newTenancy.initial_term_months),
        monthly_rent: parseFloat(newTenancy.monthly_rent),
        initial_payment: parseFloat(newTenancy.initial_payment),
        deposit_applicable: newTenancy.deposit_applicable,
        deposit_amount: newTenancy.deposit_applicable ? parseFloat(newTenancy.deposit_amount) : 0,
        payment_type: newTenancy.payment_type,
        payment_frequency: newTenancy.payment_frequency,
        payment_day_of_month: newTenancy.payment_day_of_month,
        shared_areas: selectedSharedAreas
      };

      await axios.post(`${API_URL}/api/tenancies`, tenancyData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Reset form and refresh data
      const resetAddress = parseAddress(landlordProfile?.address || user.address || '');
      setNewTenancy({
        lodger_id: '',
        property_house_number: resetAddress.house_number,
        property_street_name: resetAddress.street_name,
        property_city: resetAddress.city,
        property_county: resetAddress.county,
        property_postcode: resetAddress.postcode,
        room_description: '',
        start_date: '',
        initial_term_months: 6,
        monthly_rent: '',
        initial_payment: '',
        deposit_applicable: false,
        deposit_amount: '',
        payment_type: 'cycle',
        payment_frequency: '4-weekly',
        payment_day_of_month: 1,
        shared_areas: {
          kitchen: false,
          bathroom: false,
          living_room: false,
          garden: false
        }
      });
      setShowCreateTenancy(false);
      fetchDashboardData();
      showSuccess('Tenancy created successfully!');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to create tenancy');
    }
  };

  const handleGiveNotice = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      // Prepare notice data
      const noticeData = {
        reason: noticeForm.reason,
        sub_reason: noticeForm.sub_reason,
        notice_period_days: noticeForm.notice_period_days,
        additional_notes: noticeForm.additional_notes
      };

      await axios.post(
        `${API_URL}/api/tenancies/${selectedTenancy.id}/notice`,
        noticeData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset form and refresh data
      setNoticeForm({
        reason: '',
        sub_reason: '',
        notice_period_days: 28,
        additional_notes: ''
      });
      setShowNoticeModal(false);
      setSelectedTenancy(null);
      fetchDashboardData();

      const immediateTermination = noticeForm.notice_period_days === 0;
      showSuccess(immediateTermination
        ? 'IMMEDIATE TERMINATION NOTICE: The tenancy has been terminated immediately. Please contact authorities if necessary.'
        : 'Notice has been given successfully. The lodger will be notified.');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to give notice');
    }
  };

  const handleBreachNotice = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const breachData = {
        breach_type: breachForm.breach_type,
        breach_description: breachForm.breach_description,
        additional_notes: breachForm.additional_notes
      };

      await axios.post(
        `${API_URL}/api/tenancies/${selectedTenancy.id}/breach-notice`,
        breachData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setBreachForm({
        breach_type: '',
        breach_description: '',
        additional_notes: ''
      });
      setShowBreachModal(false);
      setSelectedTenancy(null);
      fetchDashboardData();
      fetchBreachNotices();

      showSuccess('Breach notice issued successfully. The lodger has 7 days to remedy the breach.');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to issue breach notice');
    }
  };

  const handleCancelOffer = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/tenancies/${selectedTenancy.id}/cancel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowCancelOfferModal(false);
      setSelectedTenancy(null);
      fetchDashboardData();

      showSuccess('Tenancy offer cancelled successfully. The lodger has been notified.');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to cancel tenancy offer');
    }
  };

  const fetchBreachNotices = async () => {
    try {
      const token = localStorage.getItem('token');
      const allNotices = [];

      for (const tenancy of tenancies) {
        const response = await axios.get(
          `${API_URL}/api/tenancies/${tenancy.id}/notices`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const breachNotices = response.data.filter(
          n => n.notice_type === 'breach' && n.status === 'active'
        );
        allNotices.push(...breachNotices);
      }

      setActiveBreachNotices(allNotices);
    } catch (error) {
      console.error('Failed to fetch breach notices:', error);
    }
  };

  const handleRemedyBreach = async (noticeId) => {
    const notes = prompt('Enter notes about how the breach was remedied (optional):');
    if (notes === null) return; // User cancelled

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/api/notices/${noticeId}/remedy`,
        { remedy_notes: notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('Breach marked as remedied successfully!');
      fetchBreachNotices();
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to mark breach as remedied');
    }
  };

  const handleEscalateBreach = async (noticeId) => {
    if (!confirm('Are you sure you want to escalate this breach to a 7-day termination notice? This cannot be undone.')) {
      return;
    }

    const notes = prompt('Enter escalation notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/notices/${noticeId}/escalate`,
        { escalation_notes: notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('Breach escalated to 7-day termination notice successfully!');
      fetchBreachNotices();
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to escalate breach notice');
    }
  };

  const handleOfferExtension = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const extensionData = {
        extension_months: parseInt(extensionForm.extension_months),
        new_monthly_rent: parseFloat(extensionForm.new_monthly_rent),
        notes: extensionForm.notes
      };

      await axios.post(
        `${API_URL}/api/tenancies/${selectedTenancy.id}/offer-extension`,
        extensionData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setExtensionForm({
        extension_months: 6,
        new_monthly_rent: '',
        notes: ''
      });
      setShowExtensionModal(false);
      setSelectedTenancy(null);
      fetchDashboardData();

      showSuccess('Extension offer sent successfully! The lodger will be notified.');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to offer extension');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      // Send individual address fields to backend
      const { house_number, street_name, city, county, postcode, ...formData } = profileForm;
      const dataToSend = {
        ...formData,
        house_number,
        street_name,
        city,
        county,
        postcode
      };

      const response = await axios.put(`${API_URL}/api/users/profile`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the landlordProfile state with the response data
      setLandlordProfile(response.data);

      // Update profileForm to reflect the saved changes
      setProfileForm({
        full_name: response.data.full_name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        house_number: response.data.house_number || '',
        street_name: response.data.street_name || '',
        city: response.data.city || '',
        county: response.data.county || '',
        postcode: response.data.postcode || '',
        rooms: response.data.rooms || [],
        bank_account_number: response.data.bank_account_number || '',
        bank_sort_code: response.data.bank_sort_code || '',
        payment_reference: response.data.payment_reference || ''
      });

      // Refresh dashboard data to update all UI components
      fetchDashboardData();

      // Update localStorage to keep user object in sync
      const updatedUser = {
        ...JSON.parse(localStorage.getItem('user') || '{}'),
        full_name: response.data.full_name,
        email: response.data.email,
        phone: response.data.phone
      };
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (parseError) {
        console.error('Failed to update localStorage user data:', parseError);
        // Reinitialize with fresh data if parsing fails
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      showSuccess('Profile updated successfully!');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleEditLodgerSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/users/${editLodger.id}`, {
        full_name: editLodger.full_name,
        email: editLodger.email,
        phone: editLodger.phone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditLodger(false);
      setEditLodger(null);
      fetchDashboardData();
      showSuccess('Lodger information updated successfully!');
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to update lodger');
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
          showError('This lodger is already assigned to a landlord');
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
      await axios.post(`${API_URL}/api/users/claim-lodger`, {
        lodger_email: claimLodgerForm.lodger_email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Lodger successfully claimed and assigned to you!');
      setShowClaimLodgerModal(false);
      setClaimStep('email');
      setClaimLodgerForm({ lodger_email: '' });
      setLodgerPreview(null);
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to claim lodger');
    }
  };

  const handleClaimModalClose = () => {
    setShowClaimLodgerModal(false);
    setClaimStep('email');
    setClaimLodgerForm({ lodger_email: '' });
    setLodgerPreview(null);
  };


  const handleUnlinkLodger = async (lodgerId) => {
    if (!confirm('Are you sure you want to unlink this lodger? They will no longer be associated with you.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/users/${lodgerId}/unlink`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccess('Lodger successfully unlinked!');
      fetchDashboardData();
    } catch (error) {
      showError(error.response?.data?.error || 'Failed to unlink lodger');
    }
  };

  const handleBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/backup`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Create a blob from the response data
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lodger-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Backup downloaded successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      showError(error.response?.data?.error || 'Failed to create backup');
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Are you sure you want to restore from this backup? This will update your profile settings.')) {
      e.target.value = '';
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('backup', file);

      const response = await axios.post(`${API_URL}/api/restore`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      showSuccess(response.data.message + (response.data.note ? '\n\n' + response.data.note : ''));

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Restore error:', error);
      showError(error.response?.data?.error || 'Failed to restore backup');
    } finally {
      e.target.value = '';
    }
  };


  const handleOpenConfirmPayment = (payment) => {
    setSelectedPayment(payment);
    setPaymentConfirmForm({
      amount: payment.rent_due || '',
      payment_method: 'bank_transfer',
      payment_reference: '',
      notes: ''
    });
    setShowConfirmPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/payments/${selectedPayment.id}/confirm`,
        paymentConfirmForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showSuccess('Payment confirmed successfully!');
      setShowConfirmPaymentModal(false);
      setSelectedPayment(null);
      setPaymentConfirmForm({
        amount: '',
        payment_method: 'bank_transfer',
        payment_reference: '',
        notes: ''
      });
      fetchDashboardData(); // Refresh the data
    } catch (error) {
      console.error('Payment confirmation error:', error);
      showError(error.response?.data?.error || 'Failed to confirm payment');
    }
  };

  const handleSendReminder = async (payment) => {
    if (!confirm(`Send payment reminder to ${payment.lodger_name}?\n\nThis will notify them about payment #${payment.payment_number} due on ${new Date(payment.due_date).toLocaleDateString('en-GB')}.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/payments/${payment.id}/remind`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showSuccess('Payment reminder sent successfully!');
    } catch (error) {
      console.error('Send reminder error:', error);
      showError(error.response?.data?.error || 'Failed to send payment reminder');
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
    } else if (notification.type === 'notice_given') {
      setActiveTab('tenancies');
    } else if (notification.type === 'tenancy_expiring') {
      setActiveTab('tenancies');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

  // Show Payment Schedule if a tenancy is selected
  if (showPaymentSchedule && selectedTenancyForPayments) {
    return (
      <PaymentSchedule
        tenancy={selectedTenancyForPayments}
        onBack={() => {
          setShowPaymentSchedule(false);
          setSelectedTenancyForPayments(null);
          fetchDashboardData();
        }}
      />
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
            {['overview', 'lodgers', 'tenancies', 'payments', 'calendar', 'profile', 'support', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-4 border-b-2 transition font-medium capitalize ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'profile' ? 'My Profile' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div onClick={() => setActiveTab('tenancies')} className="cursor-pointer">
                <StatCard
                  title="Active Tenancies"
                  value={stats.activeTenancies || tenancies.length}
                  icon={<Users className="w-6 h-6 text-indigo-600" />}
                  color="bg-indigo-50"
                />
              </div>
              <div onClick={() => setActiveTab('calendar')} className="cursor-pointer">
                <StatCard
                  title="Monthly Income"
                  value={`£${stats.monthlyIncome || 0}`}
                  icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                  color="bg-green-50"
                />
              </div>
              <div onClick={() => setActiveTab('payments')} className="cursor-pointer">
                <StatCard
                  title="Upcoming Payments"
                  value={stats.upcomingPayments || 0}
                  icon={<Clock className="w-6 h-6 text-orange-600" />}
                  color="bg-orange-50"
                />
              </div>
              <div onClick={() => setActiveTab('payments')} className="cursor-pointer">
                <StatCard
                  title="Overdue Payments"
                  value={stats.overduePayments || 0}
                  icon={<AlertCircle className="w-6 h-6 text-red-600" />}
                  color="bg-red-50"
                />
              </div>
            </div>

            {/* Active Breach Notices Alert */}
            {activeBreachNotices.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-red-900 mb-2">
                      Active Breach Notices ({activeBreachNotices.length})
                    </h3>
                    <div className="space-y-3">
                      {activeBreachNotices.map((notice) => {
                        const remedyDeadline = new Date(notice.remedy_deadline);
                        const daysLeft = Math.ceil((remedyDeadline - new Date()) / (1000 * 60 * 60 * 24));
                        const isOverdue = daysLeft < 0;

                        return (
                          <div key={notice.id} className="bg-white rounded-lg p-4 border border-red-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {notice.given_to_name}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notice.breach_clause === 'non_payment' ? 'Non-payment of rent' :
                                   notice.breach_clause === 'damage_to_property' ? 'Damage to property' :
                                   notice.breach_clause === 'nuisance' ? 'Causing nuisance' :
                                   notice.breach_clause === 'unauthorized_occupants' ? 'Unauthorized occupants' :
                                   notice.breach_clause === 'smoking' ? 'Smoking in property' :
                                   notice.breach_clause === 'pets' ? 'Unauthorized pets' :
                                   'Other breach'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Issued: {new Date(notice.notice_date).toLocaleDateString('en-GB')}
                                </p>
                              </div>
                              <div className="text-right">
                                {isOverdue ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                    Overdue by {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {notice.notice_letter_path && (
                                <a
                                  href={`${API_URL}${notice.notice_letter_path}`}
                                  download
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 inline-flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  Download Notice Letter
                                </a>
                              )}
                              <button
                                onClick={() => handleRemedyBreach(notice.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                              >
                                Mark as Remedied
                              </button>
                              {isOverdue && (
                                <button
                                  onClick={() => handleEscalateBreach(notice.id)}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                                >
                                  Escalate to Termination (7 days)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Tenancies and Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Tenancies */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Active Tenancies</h3>
                  {tenancies.length > 0 && (
                    <button
                      onClick={() => setActiveTab('tenancies')}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View All →
                    </button>
                  )}
                </div>
                {tenancies.length > 0 ? (
                  <div className="space-y-3">
                    {tenancies.slice(0, 2).map((tenancy) => (
                      <div
                        key={tenancy.id}
                        onClick={() => setActiveTab('tenancies')}
                        className="rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition border border-gray-200"
                      >
                        {/* Mini Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-base">{tenancy.lodger_name || 'Lodger Name'}</p>
                              <p className="text-xs text-indigo-100 mt-0.5">{tenancy.room_description || 'Lodger Room'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                tenancy.status === 'active' ? 'bg-green-500 text-white' :
                                tenancy.status === 'draft' ? 'bg-yellow-500 text-white' :
                                tenancy.status === 'extended' ? 'bg-purple-500 text-white' :
                                'bg-gray-500 text-white'
                              }`}>
                                {tenancy.status || 'active'}
                              </span>
                              {tenancy.lodger_signature && (
                                <span className="px-2 py-0.5 bg-green-500 text-white rounded text-xs font-semibold flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                  Signed
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4 mt-3 pt-3 border-t border-indigo-500">
                            <div>
                              <p className="text-xs text-indigo-200">Rent</p>
                              <p className="font-bold text-sm">£{parseFloat(tenancy.monthly_rent || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-indigo-200">Start</p>
                              <p className="font-semibold text-xs">{tenancy.start_date ? new Date(tenancy.start_date).toLocaleDateString('en-GB') : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        {/* Quick Links */}
                        <div className="bg-gray-50 px-4 py-2 flex items-center justify-center gap-2 text-xs text-indigo-600 font-medium">
                          <span>Click to view all actions</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active tenancies</p>
                    <button
                      onClick={() => setActiveTab('tenancies')}
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
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClaimLodgerModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg"
                >
                  <Users className="w-5 h-5" />
                  Claim Existing Lodger
                </button>
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
            </div>

            {tenancies.filter(t => t.status === 'active' || t.status === 'draft').length >= 2 && (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
                <strong>Limit Reached:</strong> You have reached the maximum of 2 active tenancies. Terminate an existing tenancy to create a new lodger account.
              </div>
            )}

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setLodgerFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  lodgerFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({lodgers.length})
              </button>
              <button
                onClick={() => setLodgerFilter('active')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  lodgerFilter === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Active ({lodgers.filter(l => hasActiveTenancy(l.id)).length})
              </button>
              <button
                onClick={() => setLodgerFilter('inactive')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  lodgerFilter === 'inactive' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Inactive ({lodgers.filter(l => !hasActiveTenancy(l.id)).length})
              </button>
            </div>

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
            {(() => {
              const filteredLodgers = lodgers.filter(lodger => {
                if (lodgerFilter === 'all') return true;
                const hasActive = hasActiveTenancy(lodger.id);
                return lodgerFilter === 'active' ? hasActive : !hasActive;
              });

              return filteredLodgers.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenancy Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredLodgers.map((lodger) => (
                        <tr key={lodger.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{lodger.full_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{lodger.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{lodger.phone || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                hasActiveTenancy(lodger.id) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {hasActiveTenancy(lodger.id) ? 'Active Tenancy' : 'No Active Tenancy'}
                              </span>
                              {lodger.landlord_id && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  Assigned to You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(lodger.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditLodger({
                                    id: lodger.id,
                                    full_name: lodger.full_name,
                                    email: lodger.email,
                                    phone: lodger.phone || ''
                                  });
                                  setShowEditLodger(true);
                                }}
                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                              >
                                Edit
                              </button>
                              {lodger.landlord_id && (
                                <button
                                  onClick={() => handleUnlinkLodger(lodger.id)}
                                  className="text-red-600 hover:text-red-900 font-medium text-sm"
                                >
                                  Unlink
                                </button>
                              )}
                            </div>
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
              );
            })()}
          </div>
        )}

        {/* Tenancies Tab */}
        {activeTab === 'tenancies' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Tenancies</h2>
                {tenancies.length > 0 && (
                  <div className="flex items-center gap-2">
                    {tenancies.map((tenancy, index) => (
                      <button
                        key={tenancy.id}
                        onClick={() => setSelectedTenancy(tenancy)}
                        className={`px-4 py-2 rounded-lg font-semibold transition ${
                          selectedTenancy?.id === tenancy.id
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tenancy.lodger_name || `Tenancy ${index + 1}`}
                      </button>
                    ))}
                  </div>
                )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">Property Address *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">House Number</label>
                        <input
                          type="text"
                          value={newTenancy.property_house_number}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          placeholder="123"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Street Name</label>
                        <input
                          type="text"
                          value={newTenancy.property_street_name}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          placeholder="Main Street"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={newTenancy.property_city}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          placeholder="London"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">County</label>
                        <input
                          type="text"
                          value={newTenancy.property_county}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          placeholder="Greater London"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                        <input
                          type="text"
                          value={newTenancy.property_postcode}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          placeholder="SW1A 1AA"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Auto-filled from your profile</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Description *</label>
                    <select
                      required
                      value={newTenancy.room_description}
                      onChange={(e) => setNewTenancy({...newTenancy, room_description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a room</option>
                      {landlordProfile?.rooms?.map((room, index) => (
                        <option key={index} value={room.name}>{room.name}</option>
                      ))}
                    </select>
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

                  {/* Payment Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Payment Type *</label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                        <input
                          type="radio"
                          name="payment_type"
                          value="cycle"
                          checked={newTenancy.payment_type === 'cycle'}
                          onChange={(e) => setNewTenancy({...newTenancy, payment_type: e.target.value})}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">Cycle-based</div>
                          <div className="text-sm text-gray-600">Payments every X weeks/months</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                        <input
                          type="radio"
                          name="payment_type"
                          value="calendar"
                          checked={newTenancy.payment_type === 'calendar'}
                          onChange={(e) => setNewTenancy({...newTenancy, payment_type: e.target.value, payment_frequency: 'monthly'})}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">Calendar-based</div>
                          <div className="text-sm text-gray-600">Payments on specific day of month</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Conditional Payment Fields */}
                  {newTenancy.payment_type === 'cycle' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Frequency *</label>
                      <select
                        required
                        value={newTenancy.payment_frequency}
                        onChange={(e) => setNewTenancy({...newTenancy, payment_frequency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="bi-weekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="4-weekly">4-weekly</option>
                      </select>
                      {newTenancy.payment_frequency !== 'monthly' && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-800">
                            <strong>Note:</strong> For non-monthly frequencies, the lodger will pay a calculated amount based on:
                            <span className="font-mono font-semibold"> Monthly Rent × Payment Days ÷ 30.44</span>
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Examples: Weekly (7 days) = Monthly Rent × 7 ÷ 30.44 | 4-weekly (28 days) = Monthly Rent × 28 ÷ 30.44
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Day of Month *</label>
                      <select
                        required
                        value={newTenancy.payment_day_of_month}
                        onChange={(e) => setNewTenancy({...newTenancy, payment_day_of_month: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                          payment_type: 'cycle',
                          payment_frequency: '4-weekly',
                          payment_day_of_month: 1,
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
              selectedTenancy ? (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-8">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold">{selectedTenancy.lodger_name}</h3>
                          <p className="text-sm text-indigo-100 mt-2">{selectedTenancy.room_description || 'Lodger Room'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            selectedTenancy.status === 'active' ? 'bg-green-500 text-white' :
                            selectedTenancy.status === 'draft' ? 'bg-yellow-500 text-white' :
                            selectedTenancy.status === 'extended' ? 'bg-purple-500 text-white' :
                            'bg-gray-500 text-white'
                          }`}>
                            {selectedTenancy.status || 'active'}
                          </span>
                          {selectedTenancy.lodger_signature ? (
                            <span className="px-3 py-1.5 bg-green-500 text-white rounded text-sm font-semibold flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                              Signed
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 bg-orange-400 text-white rounded text-sm font-semibold">
                              Pending Signature
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-indigo-500">
                        <div>
                          <p className="text-sm text-indigo-200">Monthly Rent</p>
                          <p className="text-2xl font-bold">£{parseFloat(selectedTenancy.monthly_rent).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-indigo-200">Start Date</p>
                          <p className="text-lg font-semibold">{selectedTenancy.start_date ? new Date(selectedTenancy.start_date).toLocaleDateString('en-GB') : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-indigo-200">Property</p>
                          <AddressDisplay address={selectedTenancy.property_address} className="text-sm font-medium" />
                        </div>
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div className="p-8 space-y-6">
                      {/* Quick Actions */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quick Actions</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => {
                              setShowTenancyModal(true);
                            }}
                            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-semibold text-base"
                          >
                            <Eye className="w-5 h-5" />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTenancyForPayments(selectedTenancy);
                              setShowPaymentSchedule(true);
                            }}
                            className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-base"
                          >
                            <CreditCard className="w-5 h-5" />
                            Payments
                          </button>
                          {selectedTenancy.signed_agreement_path && (
                            <a
                              href={`${API_URL}${selectedTenancy.signed_agreement_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-base"
                            >
                              <FileText className="w-5 h-5" />
                              Agreement
                            </a>
                          )}
                          {!selectedTenancy.lodger_signature && (
                            <button
                              onClick={() => setShowCancelOfferModal(true)}
                              className="flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-base"
                            >
                              <X className="w-5 h-5" />
                              Cancel Offer
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedTenancy.status === 'active' && (
                        <>
                          {/* Tenancy Management */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Tenancy Management</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => {
                                  setExtensionForm({
                                    extension_months: 6,
                                    new_monthly_rent: selectedTenancy.monthly_rent,
                                    notes: ''
                                  });
                                  setShowExtensionModal(true);
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-base"
                              >
                                <Clock className="w-5 h-5" />
                                Offer Extension
                              </button>
                              <button
                                onClick={() => {
                                  setShowNoticeModal(true);
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-base"
                              >
                                <Bell className="w-5 h-5" />
                                Give Notice to End
                              </button>
                            </div>
                          </div>

                          {/* Issues & Documents */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Issues & Documents</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                onClick={() => {
                                  setShowBreachModal(true);
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-base"
                              >
                                <AlertTriangle className="w-5 h-5" />
                                Issue Breach Notice
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await axios.get(`${API_URL}/api/tenancies/${selectedTenancy.id}/available-funds`, {
                                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                    });
                                    setAvailableFunds(response.data);
                                    setDeductionForm({
                                      deduction_type: 'damage',
                                      description: '',
                                      amount: '',
                                      deduct_from_deposit: '',
                                      deduct_from_advance: '',
                                      notes: ''
                                    });
                                    setShowDeductionModal(true);
                                  } catch (error) {
                                    console.error('Error fetching available funds:', error);
                                    showError('Failed to load deduction form');
                                  }
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-base"
                              >
                                <DollarSign className="w-5 h-5" />
                                Record Deduction
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Deductions History */}
                      <DeductionsHistory tenancyId={selectedTenancy.id} />
                    </div>
                  </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Tenancy</h3>
                  <p className="text-gray-600">Choose a tenancy from the buttons above to view details and actions</p>
                </div>
              )
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Tenancies Yet</h3>
                <p className="text-gray-600 mb-6">Create your first tenancy to get started</p>
                <button
                  onClick={() => setShowCreateTenancy(true)}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.length > 0 ? (
                    payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">#{payment.payment_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(payment.due_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{payment.lodger_name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">£{parseFloat(payment.rent_due || 0).toFixed(2)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${
                          payment.balance > 0 ? 'text-green-600' : payment.balance < 0 ? 'text-red-600' : ''
                        }`}>
                          £{parseFloat(payment.balance || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.payment_status === 'paid' || payment.payment_status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : payment.payment_status === 'submitted'
                              ? 'bg-blue-100 text-blue-700'
                              : payment.payment_status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {payment.payment_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {payment.payment_status !== 'paid' && payment.payment_status !== 'confirmed' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSendReminder(payment)}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-1"
                                title="Send payment reminder"
                              >
                                <Bell className="w-4 h-4" />
                                Remind
                              </button>
                              <button
                                onClick={() => handleOpenConfirmPayment(payment)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                title="Mark payment as received"
                              >
                                Mark Received
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Confirmed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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
            <h2 className="text-2xl font-bold mb-6">Payment Calendar</h2>

            {/* Calendar Component */}
            <PaymentCalendar payments={payments} tenancies={tenancies} />
          </div>
        )}

        {/* My Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">My Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="07700900000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Address *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">House Number</label>
                        <input
                          type="text"
                          value={profileForm.house_number}
                          onChange={(e) => setProfileForm({...profileForm, house_number: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="123"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Street Name</label>
                        <input
                          type="text"
                          value={profileForm.street_name}
                          onChange={(e) => setProfileForm({...profileForm, street_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Main Street"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={profileForm.city}
                          onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="London"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">County</label>
                        <input
                          type="text"
                          value={profileForm.county}
                          onChange={(e) => setProfileForm({...profileForm, county: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Greater London"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                        <input
                          type="text"
                          value={profileForm.postcode}
                          onChange={(e) => setProfileForm({...profileForm, postcode: e.target.value.toUpperCase()})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="SW1A 1AA"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">This address will auto-fill in new tenancy agreements</p>
                  </div>
                </div>

                {/* Rooms Management Section */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Rooms Management</h3>
                  <p className="text-sm text-gray-600 mb-4">Manage up to 2 rooms in your property. Room details will be used when creating tenancy agreements.</p>

                  <div className="space-y-4">
                    {profileForm.rooms.map((room, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Room {index + 1} Description
                          </label>
                          <input
                            type="text"
                            value={room.name || ''}
                            onChange={(e) => {
                              const newRooms = [...profileForm.rooms];
                              newRooms[index] = { ...room, name: e.target.value };
                              setProfileForm({ ...profileForm, rooms: newRooms });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder={`e.g., Double room with ensuite`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newRooms = profileForm.rooms.filter((_, i) => i !== index);
                            setProfileForm({ ...profileForm, rooms: newRooms });
                          }}
                          className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                          title="Remove room"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {profileForm.rooms.length < 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newRooms = [...profileForm.rooms, { name: '' }];
                          setProfileForm({ ...profileForm, rooms: newRooms });
                        }}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 rounded-lg transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Room
                      </button>
                    )}

                    {profileForm.rooms.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No rooms added yet. Click "Add Room" to get started.</p>
                    )}
                  </div>
                </div>

                {/* Payment Details Section */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Details</h3>
                  <p className="text-sm text-gray-600 mb-4">These details will be shown to lodgers when they submit rent payments</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account Number</label>
                      <input
                        type="text"
                        value={profileForm.bank_account_number}
                        onChange={(e) => setProfileForm({...profileForm, bank_account_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="12345678"
                        maxLength="20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort Code</label>
                      <input
                        type="text"
                        value={profileForm.bank_sort_code}
                        onChange={(e) => setProfileForm({...profileForm, bank_sort_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="12-34-56"
                        maxLength="10"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Reference</label>
                      <input
                        type="text"
                        value={profileForm.payment_reference}
                        onChange={(e) => setProfileForm({...profileForm, payment_reference: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., RENT-[LODGER NAME] or Reference Number"
                      />
                      <p className="text-xs text-gray-500 mt-1">Optional: Specify how lodgers should reference their payments</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Account Support</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Get help with account issues and password resets
                </p>
              </div>
              <button
                onClick={() => {
                  setShowResetRequestModal(true);
                  fetchResetRequests(); // Refresh requests when opening modal
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5" />
                Submit Reset Request
              </button>
            </div>

            {/* Your Reset Requests */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Your Reset Requests</h3>
              {resetRequests.length > 0 ? (
                <div className="space-y-3">
                  {resetRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium capitalize">{request.request_type.replace('_', ' ')}</h4>
                          <p className="text-sm text-gray-600">
                            Submitted: {new Date(request.created_at).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          request.status === 'completed' ? 'bg-green-100 text-green-700' :
                          request.status === 'denied' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {request.status}
                        </span>
                      </div>

                      {request.details && (
                        <p className="text-sm text-gray-700 mb-2">{request.details}</p>
                      )}

                      {request.admin_response && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Admin Response:</p>
                          <p className="text-sm text-blue-800">{request.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No reset requests submitted yet</p>
              )}
            </div>

            {/* Help Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Need Help?</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-1">Forgot Password?</h4>
                  <p>Submit a password reset request and an administrator will help you regain access to your account.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Account Locked?</h4>
                  <p>If your account is locked due to too many failed login attempts, submit a reset request for assistance.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Data Issues?</h4>
                  <p>If you're experiencing data corruption or other account issues, describe the problem in your reset request.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Response Time</h4>
                  <p>Reset requests are typically processed within 24-48 hours. You'll receive a notification when your request is handled.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>

            {/* Backup & Restore Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Backup & Restore</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Download a backup of all your data including profile, tenancies, payments, and notices.
                  You can restore your profile settings from a previous backup.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Backup Button */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Download className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Backup Data</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Download all your data as a JSON file
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleBackup}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                    >
                      Download Backup
                    </button>
                  </div>

                  {/* Restore Button */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Restore Profile</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Restore profile settings from a backup file
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestore}
                      className="hidden"
                      id="restore-file"
                    />
                    <label
                      htmlFor="restore-file"
                      className="w-full block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-center cursor-pointer"
                    >
                      Upload Backup File
                    </label>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Backups include all your data (profile, tenancies, payments, notices)</li>
                        <li>Restore currently only updates profile settings for safety</li>
                        <li>Store backup files securely - they contain sensitive information</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Reset Request Modal */}
      {showResetRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Submit Reset Request</h2>
              <p className="text-sm opacity-90 mt-1">Request help with account issues</p>
            </div>

            <form onSubmit={handleSubmitResetRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Request Type *
                </label>
                <select
                  required
                  value={resetRequestForm.request_type}
                  onChange={(e) => setResetRequestForm({...resetRequestForm, request_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="forgot_password">Forgot Password</option>
                  <option value="account_locked">Account Locked</option>
                  <option value="data_corruption">Data Corruption</option>
                  <option value="account_transfer">Account Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Details (Optional)
                </label>
                <textarea
                  value={resetRequestForm.details}
                  onChange={(e) => setResetRequestForm({...resetRequestForm, details: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Please describe your issue in detail..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p>Your request will be reviewed by an administrator. Response time is typically 24-48 hours.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetRequestModal(false);
                    setResetRequestForm({ request_type: 'forgot_password', details: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Claim Existing Lodger Modal */}
      {showClaimLodgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">
                {claimStep === 'email' ? 'Claim Existing Lodger' : 'Confirm Claim'}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {claimStep === 'email'
                  ? 'Enter the lodger\'s email address to claim them'
                  : 'Review lodger details before confirming'
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
                      <p className="text-xs">Enter the exact email address of the lodger you want to claim. Their information will only be shown after verification.</p>
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

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <p className="font-semibold mb-1">⚠️ Important Notes:</p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>You can only claim lodgers who are not already assigned to another landlord</li>
                    <li>You must have available tenancy slots (maximum 2 active tenancies)</li>
                    <li>The lodger will be notified of the claim</li>
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
                      <p className="text-sm text-green-700 mt-1">Review the details below before confirming the claim</p>
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
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="font-medium">{new Date(lodgerPreview.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
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
                    <li>The lodger will be assigned to your landlord account</li>
                    <li>You'll be able to create tenancies for this lodger</li>
                    <li>The lodger will receive a notification about the claim</li>
                    <li>You can create up to 2 tenancies with this lodger</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleClaimLodgerConfirm}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    Confirm Claim
                  </button>
                  <button
                    onClick={() => {
                      setClaimStep('email');
                      setLodgerPreview(null);
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
                    <p className="font-medium"><AddressDisplay address={selectedTenancy.address || selectedTenancy.property_address} /></p>
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
                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto">
                        <img
                          src={selectedTenancy.photo_id_path}
                          alt="Lodger Photo ID"
                          className="rounded shadow-lg mx-auto block"
                          style={{ maxWidth: '100%', height: 'auto' }}
                          onError={(e) => {
                            console.error('Image failed to load:', selectedTenancy.photo_id_path);
                          }}
                          onLoad={(e) => {
                            console.log('Image loaded successfully:', selectedTenancy.photo_id_path);
                          }}
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

              {/* Deductions Section */}
              <DeductionsHistory tenancyId={selectedTenancy.id} />

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
                        showSuccess('Agreement approved and PDF generated successfully!');
                        setShowTenancyModal(false);
                        fetchDashboardData();
                      } catch (error) {
                        showError(error.response?.data?.error || 'Failed to approve agreement');
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

            <form onSubmit={handleGiveNotice} className="p-6 space-y-5">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                <strong>Important:</strong> Select reason, then specific sub-reason, then notice period.
              </div>

              {/* Step 1: Main Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="bg-indigo-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">1</span>
                  Reason for Termination *
                </label>
                <select
                  required
                  value={noticeForm.reason}
                  onChange={(e) => {
                    setNoticeForm({
                      ...noticeForm,
                      reason: e.target.value,
                      sub_reason: '',
                      notice_period_days: 28
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a reason...</option>
                  <option value="breach">Breach of Agreement</option>
                  <option value="end_term">End of Agreed Term</option>
                  <option value="landlord_needs">Landlord Needs</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Step 2: Sub-reason based on main reason */}
              {noticeForm.reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="bg-indigo-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">2</span>
                    Specific Reason *
                  </label>
                  <select
                    required
                    value={noticeForm.sub_reason}
                    onChange={(e) => {
                      setNoticeForm({
                        ...noticeForm,
                        sub_reason: e.target.value,
                        notice_period_days: 28
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select specific reason...</option>

                    {noticeForm.reason === 'breach' && (
                      <>
                        <option value="violence">Violence or threats</option>
                        <option value="criminal_activity">Criminal activity on premises</option>
                        <option value="non_payment">Non-payment of rent</option>
                        <option value="damage_to_property">Damage to property</option>
                        <option value="nuisance">Causing nuisance to others</option>
                        <option value="unauthorized_occupants">Unauthorized occupants</option>
                        <option value="other_breach">Other breach of terms</option>
                      </>
                    )}

                    {noticeForm.reason === 'end_term' && (
                      <>
                        <option value="initial_term_ending">Initial term ending</option>
                        <option value="no_renewal">Not renewing agreement</option>
                      </>
                    )}

                    {noticeForm.reason === 'landlord_needs' && (
                      <>
                        <option value="property_sale">Selling the property</option>
                        <option value="personal_use">Need property for personal use</option>
                        <option value="renovation">Major renovation required</option>
                      </>
                    )}

                    {noticeForm.reason === 'other' && (
                      <option value="other_reason">Other (specify in notes)</option>
                    )}
                  </select>
                </div>
              )}

              {/* Step 3: Notice Period */}
              {noticeForm.sub_reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="bg-indigo-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-xs mr-2">3</span>
                    Notice Period *
                  </label>
                  <select
                    required
                    value={noticeForm.notice_period_days}
                    onChange={(e) => setNoticeForm({...noticeForm, notice_period_days: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>0 days (Immediate)</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={28}>28 days (Standard)</option>
                  </select>

                  {noticeForm.notice_period_days === 0 ? (
                    <div className="mt-3 bg-red-50 border-2 border-red-400 rounded-lg p-3">
                      <p className="text-sm font-bold text-red-900 mb-1">⚠️ IMMEDIATE TERMINATION</p>
                      <p className="text-xs text-red-800">
                        The tenancy will be terminated immediately. The lodger must vacate the property now.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-2">
                      Tenancy will end on: <strong>{new Date(Date.now() + noticeForm.notice_period_days * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>
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
                      reason: '',
                      sub_reason: '',
                      notice_period_days: 28,
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

      {/* Breach Notice Modal */}
      {showBreachModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Issue Breach Notice</h2>
              <p className="text-sm opacity-90 mt-1">Lodger: {selectedTenancy.lodger_name}</p>
              <p className="text-xs opacity-80 mt-1">7 days to remedy, then 7 days to terminate if not remedied</p>
            </div>

            <form onSubmit={handleBreachNotice} className="p-6 space-y-5">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <strong>Breach Notice Process:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Lodger receives 7 days to remedy the breach</li>
                  <li>If remedied, you can mark it as resolved</li>
                  <li>If not remedied after 7 days, you can escalate to a 7-day termination notice</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Breach *
                </label>
                <select
                  required
                  value={breachForm.breach_type}
                  onChange={(e) => setBreachForm({...breachForm, breach_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select breach type...</option>
                  <option value="non_payment">Non-payment of rent</option>
                  <option value="damage_to_property">Damage to property</option>
                  <option value="nuisance">Causing nuisance to others</option>
                  <option value="unauthorized_occupants">Unauthorized occupants</option>
                  <option value="smoking">Smoking in the property</option>
                  <option value="pets">Unauthorized pets</option>
                  <option value="other">Other breach of terms</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breach Description *
                </label>
                <textarea
                  required
                  value={breachForm.breach_description}
                  onChange={(e) => setBreachForm({...breachForm, breach_description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={4}
                  placeholder="Describe the breach in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={breachForm.additional_notes}
                  onChange={(e) => setBreachForm({...breachForm, additional_notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Any additional information or instructions..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p><strong>Remedy Deadline:</strong> {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}</p>
                <p className="text-xs mt-1">The lodger will have 7 days from today to remedy this breach.</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <strong>Formal Notice Letter:</strong>
                </p>
                <p className="text-xs mt-1">A formal breach notice letter will be automatically generated as a PDF document. You can download it after issuing the notice.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Issue Breach Notice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBreachModal(false);
                    setSelectedTenancy(null);
                    setBreachForm({
                      breach_type: '',
                      breach_description: '',
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

      {/* Extension Offer Modal */}
      {showExtensionModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="bg-purple-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Offer Tenancy Extension</h2>
              <p className="text-sm opacity-90 mt-1">Lodger: {selectedTenancy.lodger_name}</p>
            </div>

            <form onSubmit={handleOfferExtension} className="p-6 space-y-5">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800">
                <strong>Current Tenancy:</strong>
                <p className="text-xs mt-1">Start Date: {new Date(selectedTenancy.start_date).toLocaleDateString('en-GB')}</p>
                <p className="text-xs">
                  Current End Date: {selectedTenancy.end_date
                    ? new Date(selectedTenancy.end_date).toLocaleDateString('en-GB')
                    : new Date(new Date(selectedTenancy.start_date).setMonth(new Date(selectedTenancy.start_date).getMonth() + selectedTenancy.initial_term_months)).toLocaleDateString('en-GB')
                  }
                </p>
                <p className="text-xs">Current Rent: £{parseFloat(selectedTenancy.monthly_rent).toFixed(2)}/month</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extension Period *
                </label>
                <select
                  required
                  value={extensionForm.extension_months}
                  onChange={(e) => setExtensionForm({...extensionForm, extension_months: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  New end date will be: {new Date(
                    new Date(selectedTenancy.end_date || new Date(selectedTenancy.start_date).setMonth(new Date(selectedTenancy.start_date).getMonth() + selectedTenancy.initial_term_months))
                      .setMonth(new Date(selectedTenancy.end_date || new Date(selectedTenancy.start_date).setMonth(new Date(selectedTenancy.start_date).getMonth() + selectedTenancy.initial_term_months)).getMonth() + parseInt(extensionForm.extension_months))
                  ).toLocaleDateString('en-GB')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suggested Rent Increase (Pro-rated)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(() => {
                    const currentRent = parseFloat(selectedTenancy.monthly_rent);
                    const months = parseInt(extensionForm.extension_months);

                    // Calculate pro-rated increases based on 5% max per annum
                    // 3 months = 1.25%, 6 months = 2.5%, 12 months = 5%
                    const percentages = [
                      { label: 'None', value: 0 },
                      { label: `${(3 * months / 12).toFixed(2)}%`, value: (3 * months / 12) },
                      { label: `${(4 * months / 12).toFixed(2)}%`, value: (4 * months / 12) },
                      { label: `${(5 * months / 12).toFixed(2)}%`, value: (5 * months / 12) }
                    ];

                    return percentages.map((option, idx) => {
                      const newRent = currentRent * (1 + option.value / 100);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setExtensionForm({...extensionForm, new_monthly_rent: newRent.toFixed(2)})}
                          className="px-3 py-2 border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition text-xs font-semibold"
                        >
                          {option.label}
                          <div className="text-xs font-normal mt-1">£{newRent.toFixed(2)}</div>
                        </button>
                      );
                    });
                  })()}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Quick options based on {extensionForm.extension_months} month extension period. Maximum {(5 * parseInt(extensionForm.extension_months) / 12).toFixed(2)}% (pro-rated from 5% annual cap).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={extensionForm.new_monthly_rent}
                  onChange={(e) => setExtensionForm({...extensionForm, new_monthly_rent: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter new monthly rent"
                />
                <div className="mt-2 space-y-1">
                  {(() => {
                    const currentRent = parseFloat(selectedTenancy.monthly_rent);
                    const newRent = parseFloat(extensionForm.new_monthly_rent);
                    const maxAllowedRent = currentRent * 1.05;
                    const increasePercent = ((newRent - currentRent) / currentRent) * 100;

                    if (newRent > currentRent) {
                      // Rent increase
                      if (newRent > maxAllowedRent) {
                        // Exceeds 5% cap
                        return (
                          <div className="bg-red-50 border border-red-300 rounded p-3 text-xs">
                            <p className="text-red-800 font-semibold">❌ Exceeds Agreement Limit</p>
                            <p className="text-red-700 mt-1">
                              Increase of {increasePercent.toFixed(2)}% exceeds the 5% annual limit (Clause 9.3)
                            </p>
                            <p className="text-red-600 mt-1">
                              Maximum allowed rent: £{maxAllowedRent.toFixed(2)}
                            </p>
                          </div>
                        );
                      } else {
                        // Within 5% cap
                        return (
                          <div className="bg-green-50 border border-green-300 rounded p-3 text-xs">
                            <p className="text-green-800 font-semibold">✓ Within Agreement Limit</p>
                            <p className="text-green-700 mt-1">
                              Increase of {increasePercent.toFixed(2)}% is within the 5% annual cap (Clause 9.3)
                            </p>
                            <p className="text-green-600 mt-1">
                              Increase: £{(newRent - currentRent).toFixed(2)}/month
                            </p>
                          </div>
                        );
                      }
                    } else if (newRent < currentRent) {
                      // Rent decrease
                      return (
                        <p className="text-xs text-blue-600">
                          ℹ️ Rent decrease: £{(currentRent - newRent).toFixed(2)}/month
                        </p>
                      );
                    } else {
                      // No change
                      return (
                        <p className="text-xs text-gray-500">
                          No rent change
                        </p>
                      );
                    }
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={extensionForm.notes}
                  onChange={(e) => setExtensionForm({...extensionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Any additional information or terms..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-sm text-yellow-900 mb-4">
                <p className="font-semibold">📋 Rent Review Policy (Clause 9.3)</p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                  <li>Maximum rent increase: <strong>5% per annum</strong> or CPI (whichever is lower)</li>
                  <li>Lodger has <strong>14 days</strong> to accept or terminate after receiving offer</li>
                  <li>Automatic acceptance if no response within 14 days</li>
                  <li>Lodger can terminate with 1 month notice if they reject the increase</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <strong>What happens next:</strong>
                </p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                  <li>The lodger will receive a notification about your extension offer</li>
                  <li>A formal offer letter (PDF) will be generated automatically</li>
                  <li>They have 14 days to accept or reject the offer</li>
                  <li>If accepted, the tenancy end date and rent will be updated</li>
                  <li>If rejected or no response, they can give 1 month notice to leave</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Send Extension Offer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExtensionModal(false);
                    setSelectedTenancy(null);
                    setExtensionForm({
                      extension_months: 6,
                      new_monthly_rent: '',
                      notes: ''
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

      {/* Payment Confirmation Modal */}
      {showConfirmPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Confirm Payment Received</h2>
              <p className="text-sm opacity-90 mt-1">Payment #{selectedPayment.payment_number} - {selectedPayment.lodger_name}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{new Date(selectedPayment.due_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Due:</span>
                  <span className="font-bold text-lg">£{parseFloat(selectedPayment.rent_due).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Received *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentConfirmForm.amount}
                    onChange={(e) => setPaymentConfirmForm({...paymentConfirmForm, amount: e.target.value})}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={paymentConfirmForm.payment_method}
                  onChange={(e) => setPaymentConfirmForm({...paymentConfirmForm, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="standing_order">Standing Order</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentConfirmForm.payment_reference}
                  onChange={(e) => setPaymentConfirmForm({...paymentConfirmForm, payment_reference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="e.g. Transaction ID, cheque number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentConfirmForm.notes}
                  onChange={(e) => setPaymentConfirmForm({...paymentConfirmForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Any additional notes about this payment..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  Confirm Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmPaymentModal(false);
                    setSelectedPayment(null);
                    setPaymentConfirmForm({
                      amount: '',
                      payment_method: 'bank_transfer',
                      payment_reference: '',
                      notes: ''
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lodger Modal */}
      {showEditLodger && editLodger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Edit Lodger Information</h2>
              <p className="text-sm opacity-90 mt-1">Update contact details for {editLodger.full_name}</p>
            </div>

            <form onSubmit={handleEditLodgerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editLodger.full_name}
                  onChange={(e) => setEditLodger({...editLodger, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={editLodger.email}
                  onChange={(e) => setEditLodger({...editLodger, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editLodger.phone}
                  onChange={(e) => setEditLodger({...editLodger, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="07700900000"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditLodger(false);
                    setEditLodger(null);
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

      {/* Deduction Modal */}
      {showDeductionModal && selectedTenancy && availableFunds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
            <div className="bg-orange-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-2xl font-bold">Record Deduction</h2>
              <p className="text-sm opacity-90 mt-1">Lodger: {selectedTenancy.lodger_name}</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const formData = new FormData();
                formData.append('deduction_type', deductionForm.deduction_type);
                formData.append('description', deductionForm.description);
                formData.append('amount', deductionForm.amount);
                formData.append('deduct_from_deposit', deductionForm.deduct_from_deposit);
                formData.append('deduct_from_advance', deductionForm.deduct_from_advance);
                formData.append('notes', deductionForm.notes);

                await axios.post(
                  `${API_URL}/api/tenancies/${selectedTenancy.id}/deductions`,
                  formData,
                  { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );

                showSuccess('Deduction recorded successfully');
                setShowDeductionModal(false);
                fetchDashboardData();
              } catch (error) {
                console.error('Error creating deduction:', error);
                showError(error.response?.data?.error || 'Failed to create deduction');
              }
            }} className="p-6 space-y-5">

              {/* Available Funds Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <h3 className="font-semibold text-blue-900 mb-2">Available Funds</h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-blue-700">Original Deposit:</p>
                    <p className="font-bold text-blue-900">£{availableFunds.original_deposit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-blue-700">Original Advance Rent:</p>
                    <p className="font-bold text-blue-900">£{availableFunds.original_advance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Available Deposit:</p>
                    <p className="font-bold text-green-900">£{availableFunds.available_deposit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Available Advance Rent:</p>
                    <p className="font-bold text-green-900">£{availableFunds.available_advance.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-blue-700">Total Available:</p>
                  <p className="font-bold text-lg text-blue-900">£{availableFunds.total_available.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deduction Type *
                </label>
                <select
                  required
                  value={deductionForm.deduction_type}
                  onChange={(e) => setDeductionForm({...deductionForm, deduction_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="damage">Property Damage</option>
                  <option value="unpaid_rent">Unpaid Rent</option>
                  <option value="cleaning">Cleaning Costs</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={deductionForm.description}
                  onChange={(e) => setDeductionForm({...deductionForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Describe the reason for this deduction..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Deduction Amount (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={deductionForm.amount}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    setDeductionForm({...deductionForm, amount: e.target.value});
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  max={availableFunds.total_available}
                />
                {parseFloat(deductionForm.amount) > availableFunds.total_available && (
                  <p className="text-red-600 text-xs mt-1">⚠️ Amount exceeds available funds</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deduct from Deposit (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deductionForm.deduct_from_deposit}
                    onChange={(e) => {
                      const depositAmount = parseFloat(e.target.value) || 0;
                      const totalAmount = parseFloat(deductionForm.amount) || 0;
                      setDeductionForm({
                        ...deductionForm,
                        deduct_from_deposit: e.target.value,
                        deduct_from_advance: (totalAmount - depositAmount).toFixed(2)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                    max={availableFunds.available_deposit}
                  />
                  {parseFloat(deductionForm.deduct_from_deposit) > availableFunds.available_deposit && (
                    <p className="text-red-600 text-xs mt-1">Exceeds available deposit</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deduct from Advance Rent (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={deductionForm.deduct_from_advance}
                    onChange={(e) => {
                      const advanceAmount = parseFloat(e.target.value) || 0;
                      const totalAmount = parseFloat(deductionForm.amount) || 0;
                      setDeductionForm({
                        ...deductionForm,
                        deduct_from_advance: e.target.value,
                        deduct_from_deposit: (totalAmount - advanceAmount).toFixed(2)
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                    max={availableFunds.available_advance}
                  />
                  {parseFloat(deductionForm.deduct_from_advance) > availableFunds.available_advance && (
                    <p className="text-red-600 text-xs mt-1">Exceeds available advance</p>
                  )}
                </div>
              </div>

              {(() => {
                const depositAmt = parseFloat(deductionForm.deduct_from_deposit) || 0;
                const advanceAmt = parseFloat(deductionForm.deduct_from_advance) || 0;
                const totalAmt = parseFloat(deductionForm.amount) || 0;
                const allocated = depositAmt + advanceAmt;

                if (totalAmt > 0 && Math.abs(allocated - totalAmt) > 0.01) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                      ⚠️ Allocation mismatch: Total £{totalAmt.toFixed(2)}, Allocated £{allocated.toFixed(2)}
                    </div>
                  );
                } else if (totalAmt > 0 && allocated === totalAmt) {
                  return (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-800">
                      ✓ Allocation correct: £{depositAmt.toFixed(2)} from deposit + £{advanceAmt.toFixed(2)} from advance = £{totalAmt.toFixed(2)}
                    </div>
                  );
                }
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={deductionForm.notes}
                  onChange={(e) => setDeductionForm({...deductionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <strong>What happens next:</strong>
                </p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                  <li>The lodger will be notified of this deduction</li>
                  <li>You can generate a formal deduction statement PDF</li>
                  <li>The available funds will be updated immediately</li>
                  <li>This deduction will be tracked in the tenancy record</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
                >
                  Record Deduction
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeductionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Offer Modal */}
      {showCancelOfferModal && selectedTenancy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Cancel Tenancy Offer</h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to cancel this tenancy offer?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  <p className="font-semibold mb-2">Warning:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>This action cannot be undone</li>
                    <li>The lodger will be notified immediately</li>
                    <li>All payment schedule data will be deleted</li>
                    <li>The tenancy record will be permanently removed</li>
                  </ul>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Lodger:</strong> {selectedTenancy.lodger_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Start Date:</strong> {new Date(selectedTenancy.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelOffer}
                  className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Yes, Cancel Offer
                </button>
                <button
                  onClick={() => setShowCancelOfferModal(false)}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordDashboard;