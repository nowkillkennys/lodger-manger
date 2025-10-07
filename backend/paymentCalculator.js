/**
 * Payment Calculator - 28-Day Cycle Logic
 * Handles all payment calculations for the lodger management system
 */

const moment = require('moment');

/**
 * Generate complete payment schedule for a tenancy
 * @param {Date} startDate - Tenancy start date
 * @param {number} monthlyRent - Monthly rent amount
 * @param {number} numberOfPayments - Number of payments to generate (default 52 for 1 year)
 * @param {number} depositAmount - Deposit amount (optional)
 * @param {number} cycleDays - Payment cycle in days (default 28)
 * @param {string} paymentType - 'cycle' or 'calendar'
 * @param {number} paymentDayOfMonth - Day of month for calendar payments (1-31)
 * @returns {Array} Array of payment schedule objects
 */
function generatePaymentSchedule(startDate, monthlyRent, numberOfPayments = 52, depositAmount = 0, cycleDays = 28, paymentType = 'cycle', paymentDayOfMonth = 1) {
  const schedule = [];
  let previousBalance = 0;

  if (paymentType === 'calendar') {
    // Calendar-based: first payment on start date, subsequent on payment_day_of_month
    let currentDate = moment(startDate);

    for (let i = 1; i <= numberOfPayments; i++) {
      let dueDate;

      if (i === 1) {
        // First payment: always on start date
        dueDate = currentDate.clone();
      } else {
        // Subsequent payments: on payment_day_of_month of each month
        dueDate = currentDate.clone().add(i - 1, 'month').date(paymentDayOfMonth);
      }

      const dueDateStr = dueDate.format('YYYY-MM-DD');

      // First payment is current + advance
      const rentDue = i === 1 ? monthlyRent * 2 : monthlyRent;

      // Calculate balance: Rent Paid (C) - Rent Due (B) = Balance (D)
      // For new payments, assume nothing paid yet
      const rentPaid = 0;
      const balance = previousBalance + rentPaid - rentDue;

      schedule.push({
        paymentNumber: i,
        dueDate: dueDateStr,
        rentDue: parseFloat(rentDue.toFixed(2)),
        rentPaid: parseFloat(rentPaid.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
        status: 'pending',
        previousBalance: parseFloat(previousBalance.toFixed(2))
      });

      previousBalance = balance;
    }
  } else {
    // Cycle-based: existing interval logic
    const PAYMENT_CYCLE_DAYS = cycleDays;
    let currentDate = moment(startDate);

    for (let i = 1; i <= numberOfPayments; i++) {
      const dueDate = currentDate.format('YYYY-MM-DD');

      // First payment is current + advance
      const rentDue = i === 1 ? monthlyRent * 2 : monthlyRent;

      // Calculate balance: Rent Paid (C) - Rent Due (B) = Balance (D)
      // For new payments, assume nothing paid yet
      const rentPaid = 0;
      const balance = previousBalance + rentPaid - rentDue;

      schedule.push({
        paymentNumber: i,
        dueDate: dueDate,
        rentDue: parseFloat(rentDue.toFixed(2)),
        rentPaid: parseFloat(rentPaid.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
        status: 'pending',
        previousBalance: parseFloat(previousBalance.toFixed(2))
      });

      previousBalance = balance;
      currentDate.add(PAYMENT_CYCLE_DAYS, 'days');
    }
  }

  return schedule;
}

/**
 * Calculate next payment due date from a given date
 * @param {Date} fromDate - Starting date
 * @param {number} cycleDays - Payment cycle in days (default 28)
 * @returns {string} Next payment date (YYYY-MM-DD)
 */
function calculateNextPaymentDate(fromDate, cycleDays = 28) {
  return moment(fromDate).add(cycleDays, 'days').format('YYYY-MM-DD');
}

/**
 * Calculate balance after payment
 * Formula: Balance (D) = Previous Balance + Rent Paid (C) - Rent Due (B)
 * @param {number} previousBalance - Balance carried over from previous payment
 * @param {number} rentPaid - Amount paid by lodger
 * @param {number} rentDue - Amount due for this period
 * @returns {number} New balance (positive = credit, negative = owed)
 */
function calculateBalance(previousBalance, rentPaid, rentDue) {
  const balance = previousBalance + rentPaid - rentDue;
  return parseFloat(balance.toFixed(2));
}

/**
 * Calculate pro-rata rent for partial period
 * @param {number} monthlyRent - Full monthly rent amount
 * @param {Date} startDate - Start date of period
 * @param {Date} endDate - End date of period
 * @param {number} cycleDays - Payment cycle in days (default 28)
 * @returns {number} Pro-rated rent amount
 */
function calculateProRataRent(monthlyRent, startDate, endDate, cycleDays = 28) {
  const start = moment(startDate);
  const end = moment(endDate);
  const daysInPeriod = end.diff(start, 'days') + 1;
  const dailyRate = monthlyRent / cycleDays;
  const proRataAmount = dailyRate * daysInPeriod;

  return parseFloat(proRataAmount.toFixed(2));
}

/**
 * Calculate final payment on termination
 * @param {Date} lastPaymentDate - Date of last regular payment
 * @param {Date} terminationDate - Date of termination
 * @param {number} monthlyRent - Monthly rent amount
 * @param {number} currentBalance - Current balance (credit/owed)
 * @param {number} cycleDays - Payment cycle in days (default 28)
 * @returns {Object} Final payment details
 */
function calculateFinalPayment(lastPaymentDate, terminationDate, monthlyRent, currentBalance, cycleDays = 28) {
  const proRataRent = calculateProRataRent(monthlyRent, lastPaymentDate, terminationDate, cycleDays);
  const amountDue = proRataRent - currentBalance;

  return {
    proRataRent: proRataRent,
    currentBalance: currentBalance,
    finalAmount: parseFloat(amountDue.toFixed(2)),
    daysCharged: moment(terminationDate).diff(moment(lastPaymentDate), 'days') + 1
  };
}

/**
 * Check if payment is overdue
 * @param {Date} dueDate - Payment due date
 * @param {string} status - Current payment status
 * @returns {boolean} True if overdue
 */
function isPaymentOverdue(dueDate, status) {
  if (status === 'confirmed' || status === 'paid') {
    return false;
  }
  
  const today = moment().startOf('day');
  const due = moment(dueDate).startOf('day');
  
  return due.isBefore(today);
}

/**
 * Calculate days until payment due
 * @param {Date} dueDate - Payment due date
 * @returns {number} Number of days (negative if overdue)
 */
function daysUntilDue(dueDate) {
  const today = moment().startOf('day');
  const due = moment(dueDate).startOf('day');
  
  return due.diff(today, 'days');
}

/**
 * Get payment status based on dates and confirmation
 * @param {Date} dueDate - Payment due date
 * @param {boolean} isSubmitted - Whether lodger submitted
 * @param {boolean} isConfirmed - Whether landlord confirmed
 * @returns {string} Payment status
 */
function getPaymentStatus(dueDate, isSubmitted, isConfirmed) {
  if (isConfirmed) {
    return 'confirmed';
  }
  
  if (isSubmitted) {
    return 'submitted';
  }
  
  if (isPaymentOverdue(dueDate, 'pending')) {
    return 'overdue';
  }
  
  return 'pending';
}

/**
 * Calculate total income for tax year (Rent-a-Room allowance tracking)
 * @param {Array} payments - Array of payment objects
 * @param {Date} taxYearStart - Tax year start date (April 6)
 * @param {Date} taxYearEnd - Tax year end date (April 5)
 * @returns {Object} Tax year summary
 */
function calculateTaxYearIncome(payments, taxYearStart, taxYearEnd) {
  const start = moment(taxYearStart);
  const end = moment(taxYearEnd);
  const RENT_A_ROOM_ALLOWANCE = 7500.00;
  
  const totalIncome = payments
    .filter(p => {
      const paymentDate = moment(p.paymentDate || p.dueDate);
      return paymentDate.isBetween(start, end, 'day', '[]') && p.rentPaid > 0;
    })
    .reduce((sum, p) => sum + p.rentPaid, 0);
  
  const taxableIncome = Math.max(0, totalIncome - RENT_A_ROOM_ALLOWANCE);
  
  return {
    taxYear: `${start.format('YYYY')}-${end.format('YYYY')}`,
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    allowance: RENT_A_ROOM_ALLOWANCE,
    taxableIncome: parseFloat(taxableIncome.toFixed(2)),
    remainingAllowance: parseFloat(Math.max(0, RENT_A_ROOM_ALLOWANCE - totalIncome).toFixed(2))
  };
}

/**
 * Update payment schedule after payment received
 * @param {Array} schedule - Existing payment schedule
 * @param {number} paymentNumber - Payment number to update
 * @param {number} amountPaid - Amount paid
 * @returns {Array} Updated schedule with recalculated balances
 */
function updateScheduleAfterPayment(schedule, paymentNumber, amountPaid) {
  const updatedSchedule = [...schedule];
  let carryForwardBalance = 0;
  
  for (let i = 0; i < updatedSchedule.length; i++) {
    const payment = updatedSchedule[i];
    
    if (payment.paymentNumber === paymentNumber) {
      payment.rentPaid = amountPaid;
    }
    
    // Recalculate balance for this and all subsequent payments
    if (i === 0) {
      payment.balance = payment.rentPaid - payment.rentDue;
    } else {
      payment.previousBalance = carryForwardBalance;
      payment.balance = carryForwardBalance + payment.rentPaid - payment.rentDue;
    }
    
    carryForwardBalance = payment.balance;
  }
  
  return updatedSchedule;
}

/**
 * Calculate notice period end date
 * @param {Date} noticeDate - Date notice given
 * @param {number} noticePeriodDays - Notice period in days (default 28)
 * @param {Date} lastPaymentDate - Last regular payment date
 * @param {number} cycleDays - Payment cycle in days (default 28)
 * @returns {Date} Notice period end date (must align with payment day)
 */
function calculateNoticeEndDate(noticeDate, noticePeriodDays = 28, lastPaymentDate, cycleDays = 28) {
  const minimumEndDate = moment(noticeDate).add(noticePeriodDays, 'days');

  // Find next payment date after minimum notice period
  let nextPaymentDate = moment(lastPaymentDate);

  while (nextPaymentDate.isBefore(minimumEndDate)) {
    nextPaymentDate.add(cycleDays, 'days');
  }

  return nextPaymentDate.format('YYYY-MM-DD');
}

module.exports = {
  generatePaymentSchedule,
  calculateNextPaymentDate,
  calculateBalance,
  calculateProRataRent,
  calculateFinalPayment,
  isPaymentOverdue,
  daysUntilDue,
  getPaymentStatus,
  calculateTaxYearIncome,
  updateScheduleAfterPayment,
  calculateNoticeEndDate
};