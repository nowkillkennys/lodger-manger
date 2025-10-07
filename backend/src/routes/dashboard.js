/**
 * Dashboard Routes
 * Provides dashboard statistics for landlords and lodgers
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * Get landlord dashboard stats
 * @route GET /api/dashboard/landlord
 * @auth Landlord/Admin only
 * @returns {Object} Dashboard statistics for landlord
 */
router.get('/landlord', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const landlordId = req.user.id;

        // Get tenancy counts
        const tenancyStats = await pool.query(
            `SELECT
                COUNT(*) as total_tenancies,
                COUNT(*) FILTER (WHERE status = 'active') as active_tenancies,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_tenancies,
                COUNT(*) FILTER (WHERE status = 'notice_given') as notice_tenancies
             FROM tenancies
             WHERE landlord_id = $1`,
            [landlordId]
        );

        // Get payment stats
        const paymentStats = await pool.query(
            `SELECT
                COUNT(*) as total_payments,
                COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_payments,
                COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payments,
                COUNT(*) FILTER (WHERE payment_status = 'submitted') as submitted_payments,
                COUNT(*) FILTER (WHERE payment_status = 'overdue') as overdue_payments,
                SUM(rent_due) as total_rent_due,
                SUM(rent_paid) as total_rent_paid
             FROM payment_schedule ps
             JOIN tenancies t ON ps.tenancy_id = t.id
             WHERE t.landlord_id = $1`,
            [landlordId]
        );

        // Get upcoming payments (next 30 days)
        const upcomingPayments = await pool.query(
            `SELECT COUNT(*) as upcoming_count
             FROM payment_schedule ps
             JOIN tenancies t ON ps.tenancy_id = t.id
             WHERE t.landlord_id = $1
             AND ps.payment_status != 'paid'
             AND ps.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
            [landlordId]
        );

        // Calculate monthly income from active tenancies
        const monthlyIncome = await pool.query(
            `SELECT COALESCE(SUM(monthly_rent), 0) as total_monthly_income
             FROM tenancies
             WHERE landlord_id = $1
             AND status = 'active'`,
            [landlordId]
        );

        const tenancyData = tenancyStats.rows[0];
        const paymentData = paymentStats.rows[0];
        const upcomingData = upcomingPayments.rows[0];
        const incomeData = monthlyIncome.rows[0];

        res.json({
            activeTenancies: parseInt(tenancyData.active_tenancies) || 0,
            totalTenancies: parseInt(tenancyData.total_tenancies) || 0,
            pendingTenancies: parseInt(tenancyData.pending_tenancies) || 0,
            noticeTenancies: parseInt(tenancyData.notice_tenancies) || 0,
            monthlyIncome: parseFloat(incomeData.total_monthly_income) || 0,
            upcomingPayments: parseInt(upcomingData.upcoming_count) || 0,
            totalPayments: parseInt(paymentData.total_payments) || 0,
            paidPayments: parseInt(paymentData.paid_payments) || 0,
            pendingPayments: parseInt(paymentData.pending_payments) || 0,
            submittedPayments: parseInt(paymentData.submitted_payments) || 0,
            overduePayments: parseInt(paymentData.overdue_payments) || 0,
            totalRentDue: parseFloat(paymentData.total_rent_due) || 0,
            totalRentPaid: parseFloat(paymentData.total_rent_paid) || 0
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});

/**
 * Get lodger dashboard stats
 * @route GET /api/dashboard/lodger
 * @auth Lodger only
 * @returns {Object} Dashboard statistics for lodger
 */
router.get('/lodger', authenticateToken, requireRole('lodger'), async (req, res) => {
    try {
        const lodgerId = req.user.id;

        // Get lodger's tenancy
        const tenancyResult = await pool.query(
            `SELECT * FROM tenancies WHERE lodger_id = $1 LIMIT 1`,
            [lodgerId]
        );

        if (tenancyResult.rows.length === 0) {
            return res.json({
                currentBalance: 0,
                nextPayment: null
            });
        }

        const tenancy = tenancyResult.rows[0];

        // Calculate current balance (sum of all balances in payment schedule)
        const balanceResult = await pool.query(
            `SELECT COALESCE(SUM(balance), 0) as total_balance
             FROM payment_schedule
             WHERE tenancy_id = $1`,
            [tenancy.id]
        );

        // Get next unpaid payment
        const nextPaymentResult = await pool.query(
            `SELECT *
             FROM payment_schedule
             WHERE tenancy_id = $1
             AND payment_status != 'paid'
             AND due_date >= CURRENT_DATE
             ORDER BY due_date ASC
             LIMIT 1`,
            [tenancy.id]
        );

        const nextPayment = nextPaymentResult.rows.length > 0 ? {
            dueDate: new Date(nextPaymentResult.rows[0].due_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }),
            amount: parseFloat(nextPaymentResult.rows[0].rent_due).toFixed(2)
        } : null;

        res.json({
            currentBalance: parseFloat(balanceResult.rows[0].total_balance) || 0,
            nextPayment
        });
    } catch (error) {
        console.error('Get lodger dashboard error:', error);
        res.status(500).json({ error: 'Failed to get lodger dashboard stats' });
    }
});

module.exports = router;
