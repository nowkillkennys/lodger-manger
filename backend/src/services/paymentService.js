const { pool } = require('../config/database');
const paymentCalculator = require('../utils/paymentCalculator');

async function extendPaymentSchedule(client, tenancyId) {
  const tenancy = await client.query('SELECT * FROM tenancies WHERE id = $1', [tenancyId]);
  const tenancyData = tenancy.rows[0];

  if (!tenancyData) {
    throw new Error('Tenancy not found');
  }

  const lastPayment = await client.query(
    'SELECT * FROM payment_schedule WHERE tenancy_id = $1 ORDER BY due_date DESC LIMIT 1',
    [tenancyId]
  );

  if (lastPayment.rows.length === 0) {
    return;
  }

  const lastDueDate = new Date(lastPayment.rows[0].due_date);
  const endDate = tenancyData.end_date ? new Date(tenancyData.end_date) : null;

  if (!endDate || lastDueDate >= endDate) {
    return;
  }

  const schedule = paymentCalculator.generatePaymentSchedule({
    startDate: new Date(lastDueDate.getTime() + 24 * 60 * 60 * 1000),
    endDate: endDate,
    paymentFrequency: tenancyData.payment_frequency,
    rentAmount: parseFloat(tenancyData.rent_amount)
  });

  for (const payment of schedule) {
    await client.query(
      `INSERT INTO payment_schedule (tenancy_id, due_date, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [tenancyId, payment.dueDate, payment.amount]
    );
  }
}

async function getPaymentSchedule(tenancyId) {
  const result = await pool.query(
    `SELECT * FROM payment_schedule
     WHERE tenancy_id = $1
     ORDER BY due_date ASC`,
    [tenancyId]
  );
  return result.rows;
}

async function getPaymentSummary(tenancyId) {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total_payments,
       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_payments,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
       SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_payments,
       SUM(amount) as total_amount,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
       SUM(CASE WHEN status = 'pending' OR status = 'overdue' THEN amount ELSE 0 END) as outstanding_amount
     FROM payment_schedule
     WHERE tenancy_id = $1`,
    [tenancyId]
  );
  return result.rows[0];
}

module.exports = {
  extendPaymentSchedule,
  getPaymentSchedule,
  getPaymentSummary
};
