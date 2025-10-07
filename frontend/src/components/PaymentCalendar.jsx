import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PaymentCalendar = ({ payments, tenancies }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Navigate years
  const previousYear = () => setCurrentYear(currentYear - 1);
  const nextYear = () => setCurrentYear(currentYear + 1);

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group payments by month
  const paymentsByMonth = useMemo(() => {
    const grouped = {};

    // Initialize all 12 months
    for (let i = 0; i < 12; i++) {
      grouped[i] = [];
    }

    // Group payments by month
    payments.forEach(payment => {
      const dueDate = new Date(payment.due_date);
      if (dueDate.getFullYear() === currentYear) {
        const month = dueDate.getMonth();
        grouped[month].push({
          ...payment,
          day: dueDate.getDate(),
          date: dueDate
        });
      }
    });

    // Sort payments by day within each month
    Object.keys(grouped).forEach(month => {
      grouped[month].sort((a, b) => a.day - b.day);
    });

    return grouped;
  }, [payments, currentYear]);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 border-green-500 text-green-800';
      case 'submitted':
        return 'bg-blue-50 border-blue-500 text-blue-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800';
      case 'overdue':
        return 'bg-red-50 border-red-500 text-red-800';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-800';
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-600 text-white';
      case 'submitted':
        return 'bg-blue-600 text-white';
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'overdue':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // Get ordinal suffix for date (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Calculate year statistics
  const yearStats = useMemo(() => {
    const yearPayments = payments.filter(payment => {
      const dueDate = new Date(payment.due_date);
      return dueDate.getFullYear() === currentYear;
    });

    return {
      total: yearPayments.length,
      paid: yearPayments.filter(p => p.payment_status === 'paid').length,
      pending: yearPayments.filter(p => p.payment_status === 'pending').length,
      submitted: yearPayments.filter(p => p.payment_status === 'submitted').length,
      overdue: yearPayments.filter(p => p.payment_status === 'overdue').length,
      totalDue: yearPayments.reduce((sum, p) => sum + parseFloat(p.rent_due || 0), 0),
      totalPaid: yearPayments.reduce((sum, p) => sum + parseFloat(p.rent_paid || 0), 0)
    };
  }, [payments, currentYear]);

  return (
    <div className="space-y-6">
      {/* Year Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900">{currentYear}</h3>

        <div className="flex items-center gap-2">
          <button
            onClick={previousYear}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Previous Year"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCurrentYear(new Date().getFullYear())}
            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
          >
            This Year
          </button>

          <button
            onClick={nextYear}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Next Year"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Year Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-600 font-medium">Total Payments</div>
          <div className="text-2xl font-bold text-blue-900">{yearStats.total}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs text-green-600 font-medium">Paid</div>
          <div className="text-2xl font-bold text-green-900">{yearStats.paid}</div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-xs text-yellow-600 font-medium">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">{yearStats.pending}</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-purple-600 font-medium">Submitted</div>
          <div className="text-2xl font-bold text-purple-900">{yearStats.submitted}</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-xs text-red-600 font-medium">Overdue</div>
          <div className="text-2xl font-bold text-red-900">{yearStats.overdue}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span>Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Submitted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-600 rounded"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span>Overdue</span>
        </div>
      </div>

      {/* 12 Month Grid - Payment Dates Only */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthNames.map((monthName, monthIndex) => {
          const monthPayments = paymentsByMonth[monthIndex];

          return (
            <div key={monthIndex} className="bg-white border-2 border-gray-200 rounded-lg p-4">
              {/* Month name */}
              <h4 className="text-lg font-bold text-gray-800 mb-3 pb-2 border-b">
                {monthName}
              </h4>

              {/* Payment dates */}
              {monthPayments.length > 0 ? (
                <div className="space-y-2">
                  {monthPayments.map((payment, idx) => {
                    const tenancy = tenancies.find(t => t.id === payment.tenancy_id);
                    const isToday =
                      payment.day === new Date().getDate() &&
                      monthIndex === new Date().getMonth() &&
                      currentYear === new Date().getFullYear();

                    return (
                      <div
                        key={idx}
                        className={`border-l-4 rounded p-3 ${getStatusColor(payment.payment_status)} ${
                          isToday ? 'ring-2 ring-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {payment.day}
                              <sup className="text-sm">{getOrdinalSuffix(payment.day)}</sup>
                            </span>
                            {isToday && (
                              <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
                                Today
                              </span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-semibold uppercase ${getStatusBadge(payment.payment_status)}`}>
                            {payment.payment_status}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {tenancy?.lodger_name || 'Unknown Lodger'}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-lg font-bold text-gray-900">
                            £{parseFloat(payment.rent_due).toFixed(2)}
                          </div>
                          {payment.rent_paid > 0 && (
                            <div className="text-sm text-gray-600">
                              Paid: £{parseFloat(payment.rent_paid).toFixed(2)}
                            </div>
                          )}
                        </div>

                        {payment.payment_reference && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            Ref: {payment.payment_reference}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No payments scheduled
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Year Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-bold text-gray-900 mb-3">Year {currentYear} Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Due This Year</div>
            <div className="text-2xl font-bold text-gray-900">
              £{yearStats.totalDue.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Received This Year</div>
            <div className="text-2xl font-bold text-green-600">
              £{yearStats.totalPaid.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCalendar;
