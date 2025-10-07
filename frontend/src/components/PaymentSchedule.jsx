import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import AddressDisplay from './AddressDisplay';


const PaymentSchedule = ({ tenancy, onBack }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: ''
  });

  const getPaymentFrequencyDisplay = (frequency) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'bi-weekly': return 'Bi-weekly';
      case 'monthly': return 'Monthly';
      case '4-weekly': return '4-Weekly';
      default: return '28 Days';
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [tenancy.id]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/tenancies/${tenancy.id}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      alert('Failed to load payment schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/payments/${selectedPayment.id}/confirm`, {
        amount: parseFloat(paymentForm.amount),
        notes: paymentForm.notes,
        payment_method: paymentForm.payment_method,
        payment_reference: paymentForm.payment_reference
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowRecordPayment(false);
      setSelectedPayment(null);
      setPaymentForm({
        amount: '',
        payment_method: 'bank_transfer',
        payment_reference: '',
        notes: ''
      });
      fetchPayments();
      alert('Payment recorded successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to record payment');
    }
  };

  const getStatusBadge = (payment) => {
    const today = new Date();
    const dueDate = new Date(payment.due_date);
    const isPaid = payment.payment_status === 'paid';
    const isSubmitted = payment.payment_status === 'submitted';
    const isOverdue = dueDate < today && !isPaid && !isSubmitted;

    if (isPaid) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Paid
        </span>
      );
    }

    if (isSubmitted) {
      return (
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Submitted - Review Needed
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Overdue
        </span>
      );
    }

    return (
      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium inline-flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, p) => sum + parseFloat(p.rent_paid || 0), 0).toFixed(2);
  };

  const calculateTotalDue = () => {
    return payments.reduce((sum, p) => sum + parseFloat(p.rent_due || 0), 0).toFixed(2);
  };

  const calculateOutstanding = () => {
    const totalDue = parseFloat(calculateTotalDue());
    const totalPaid = parseFloat(calculateTotalPaid());
    return (totalDue - totalPaid).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Payment Schedule</h1>
                <p className="text-gray-600 mt-2">
                  <strong>Lodger:</strong> {tenancy.lodger_name || tenancy.lodgerName}
                </p>
                <p className="text-gray-600">
                  <strong>Property:</strong> <AddressDisplay address={tenancy.address || tenancy.property_address} />
                </p>
                <p className="text-gray-600">
                  <strong>Monthly Rent:</strong> £{tenancy.monthly_rent || tenancy.monthlyRent}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Payment Cycle</p>
                <p className="text-2xl font-bold text-indigo-600">{getPaymentFrequencyDisplay(tenancy.payment_frequency)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">£{calculateTotalPaid()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Due</p>
                <p className="text-2xl font-bold text-gray-900">£{calculateTotalDue()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                parseFloat(calculateOutstanding()) > 0 ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <AlertCircle className={`w-6 h-6 ${
                  parseFloat(calculateOutstanding()) > 0 ? 'text-red-600' : 'text-green-600'
                }`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className={`text-2xl font-bold ${
                  parseFloat(calculateOutstanding()) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  £{calculateOutstanding()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Payment History</h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing {payments.length} payments ({getPaymentFrequencyDisplay(tenancy.payment_frequency).toLowerCase()} cycle)
            </p>
          </div>

          <div className="overflow-x-auto">
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
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        #{payment.payment_number}
                      </td>
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
                        {getStatusBadge(payment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.payment_status === 'submitted' && (
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setPaymentForm({
                                  amount: payment.lodger_submitted_amount || payment.rent_due,
                                  payment_method: payment.lodger_payment_method || 'bank_transfer',
                                  payment_reference: payment.lodger_payment_reference || '',
                                  notes: payment.lodger_notes || ''
                                });
                                setShowRecordPayment(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                            >
                              Confirm Payment
                            </button>
                            <p className="text-xs text-gray-500">
                              Lodger submitted: £{parseFloat(payment.lodger_submitted_amount || 0).toFixed(2)}
                            </p>
                          </div>
                        )}
                        {payment.payment_status !== 'paid' && payment.payment_status !== 'submitted' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setPaymentForm({
                                amount: payment.rent_due,
                                payment_method: 'bank_transfer',
                                payment_reference: '',
                                notes: ''
                              });
                              setShowRecordPayment(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 font-medium text-sm"
                          >
                            Record Payment
                          </button>
                        )}
                        {payment.payment_status === 'paid' && payment.payment_date && (
                          <span className="text-xs text-gray-500">
                            Paid: {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No payment schedule generated yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Payment Cycle Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Payments are due {getPaymentFrequencyDisplay(tenancy.payment_frequency).toLowerCase()} from the tenancy start date</li>
            <li>• First payment is typically 2 months rent (current + 1 month advance)</li>
            <li>• Balance shows: Rent Paid - Rent Due (positive = credit, negative = owed)</li>
            <li>• Record payments as they are received to keep accurate records</li>
          </ul>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showRecordPayment && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Record Payment</h2>
                <p className="text-sm opacity-90">Payment #{selectedPayment.payment_number}</p>
              </div>
              <button
                onClick={() => {
                  setShowRecordPayment(false);
                  setSelectedPayment(null);
                }}
                className="p-1 hover:bg-indigo-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Due Date:</span>
                  <span className="font-medium">{new Date(selectedPayment.due_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rent Due:</span>
                  <span className="font-medium">£{parseFloat(selectedPayment.rent_due).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Currently Paid:</span>
                  <span className="font-medium">£{parseFloat(selectedPayment.rent_paid || 0).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  required
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
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
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_reference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecordPayment(false);
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
    </div>
  );
};

export default PaymentSchedule;
