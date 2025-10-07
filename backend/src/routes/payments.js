/**
 * Payment Routes
 * Handles payment schedule, submission, confirmation, and reminders
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const paymentCalculator = require('../utils/paymentCalculator');

/**
 * Map payment frequency to cycle days
 * @param {string} paymentFrequency - Payment frequency
 * @returns {number} Number of days in the payment cycle
 */
function mapPaymentFrequencyToDays(paymentFrequency) {
    const frequencyMap = {
        'weekly': 7,
        'bi-weekly': 14,
        'monthly': 30,
        '4-weekly': 28
    };
    return frequencyMap[paymentFrequency] || 28;
}

/**
 * Helper function to extend payment schedule if needed
 * Automatically generates more payments when less than 6 months remain
 */
async function extendPaymentSchedule(tenancyId) {
    try {
        // Get tenancy details
        const tenancyResult = await pool.query(
            'SELECT * FROM tenancies WHERE id = $1',
            [tenancyId]
        );

        if (tenancyResult.rows.length === 0) return;

        const tenancy = tenancyResult.rows[0];

        // Only extend if tenancy is active (not terminated)
        if (tenancy.status !== 'active' && tenancy.status !== 'pending') {
            return;
        }

        // Get last payment in schedule
        const lastPaymentResult = await pool.query(
            `SELECT * FROM payment_schedule
             WHERE tenancy_id = $1
             ORDER BY due_date DESC
             LIMIT 1`,
            [tenancyId]
        );

        if (lastPaymentResult.rows.length === 0) return;

        const lastPayment = lastPaymentResult.rows[0];
        const lastDueDate = new Date(lastPayment.due_date);
        const today = new Date();

        // Calculate months until last payment
        const monthsUntilLast = (lastDueDate.getFullYear() - today.getFullYear()) * 12 +
                                (lastDueDate.getMonth() - today.getMonth());

        // If less than 6 months of payments remaining, generate 12 more months
        if (monthsUntilLast < 6) {
            console.log(`Extending payment schedule for tenancy ${tenancyId}`);

            // Map payment frequency to cycle days
            const cycleDays = mapPaymentFrequencyToDays(tenancy.payment_frequency || '4-weekly');

            // Generate next 12 months of payments
            let nextPaymentDate;
            if (tenancy.payment_type === 'calendar') {
                // For calendar payments, add months
                nextPaymentDate = new Date(lastDueDate);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                nextPaymentDate.setDate(tenancy.payment_day_of_month);
            } else {
                // For cycle payments, add cycle days
                nextPaymentDate = new Date(lastDueDate);
                nextPaymentDate.setDate(nextPaymentDate.getDate() + cycleDays);
            }

            const newSchedule = paymentCalculator.generatePaymentSchedule(
                nextPaymentDate,
                parseFloat(tenancy.monthly_rent),
                13,  // ~12 months of payments
                0,   // deposit
                cycleDays,
                tenancy.payment_type || 'cycle',
                tenancy.payment_day_of_month || 1
            );

            // Insert new payments with adjusted payment numbers
            for (const payment of newSchedule) {
                await pool.query(
                    `INSERT INTO payment_schedule (
                        tenancy_id, payment_number, due_date, rent_due
                    ) VALUES ($1, $2, $3, $4)`,
                    [tenancyId, lastPayment.payment_number + payment.paymentNumber,
                     payment.dueDate, payment.rentDue]
                );
            }

            console.log(`Extended payment schedule for tenancy ${tenancyId} with 13 more payments`);
        }
    } catch (error) {
        console.error('Error extending payment schedule:', error);
    }
}

/**
 * Get payment schedule for tenancy
 * @route GET /api/tenancies/:id/payments
 * @auth Required
 * @param {string} id - Tenancy ID
 * @returns {Array} List of payments
 */
router.get('/tenancies/:id/payments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Automatically extend payment schedule if needed
        await extendPaymentSchedule(id);

        const result = await pool.query(
            `SELECT * FROM payment_schedule
             WHERE tenancy_id = $1
             ORDER BY payment_number ASC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to get payments' });
    }
});

/**
 * Lodger submits payment
 * @route POST /api/payments/:id/submit
 * @auth Lodger only
 * @param {string} id - Payment ID
 * @body {number} amount - Payment amount
 * @body {string} payment_reference - Payment reference
 * @body {string} payment_method - Payment method
 * @body {string} notes - Payment notes (optional)
 * @returns {Object} Updated payment
 */
router.post('/:id/submit', authenticateToken, requireRole('lodger'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_reference, payment_method, notes } = req.body;

        const result = await pool.query(
            `UPDATE payment_schedule
             SET lodger_submitted_amount = $1,
                 lodger_submitted_date = CURRENT_TIMESTAMP,
                 lodger_payment_reference = $2,
                 lodger_payment_method = $3,
                 lodger_notes = $4,
                 payment_status = 'submitted',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [amount, payment_reference, payment_method, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Submit payment error:', error);
        res.status(500).json({ error: 'Failed to submit payment' });
    }
});

/**
 * Landlord confirms payment
 * @route POST /api/payments/:id/confirm
 * @auth Landlord/Admin only
 * @param {string} id - Payment ID
 * @body {number} amount - Confirmed payment amount
 * @body {string} notes - Payment notes (optional)
 * @body {string} payment_method - Payment method (optional)
 * @body {string} payment_reference - Payment reference (optional)
 * @returns {Object} Updated payment
 */
router.post('/:id/confirm', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, notes, payment_method, payment_reference } = req.body;

        const result = await pool.query(
            `UPDATE payment_schedule
             SET rent_paid = $1,
                 payment_date = CURRENT_TIMESTAMP,
                 payment_method = $2,
                 payment_reference = $3,
                 notes = $4,
                 payment_status = CASE
                     WHEN $1 >= rent_due THEN 'paid'
                     WHEN $1 > 0 THEN 'partial'
                     ELSE 'pending'
                 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [amount, payment_method, payment_reference, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

/**
 * Get payment summary
 * @route GET /api/tenancies/:id/payment-summary
 * @auth Required
 * @param {string} id - Tenancy ID
 * @returns {Object} Payment summary
 */
router.get('/tenancies/:id/payment-summary', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM payment_schedule WHERE tenancy_id = $1 ORDER BY payment_number',
            [id]
        );

        const summary = paymentCalculator.generatePaymentSummary(result.rows);
        res.json(summary);
    } catch (error) {
        console.error('Get payment summary error:', error);
        res.status(500).json({ error: 'Failed to get payment summary' });
    }
});

/**
 * Get all payments for current user
 * @route GET /api/payments
 * @auth Required
 * @returns {Array} List of payments
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.user_type === 'landlord' || req.user.user_type === 'admin') {
            // Get all tenancies for landlord to extend schedules
            const tenanciesResult = await pool.query(
                'SELECT id FROM tenancies WHERE landlord_id = $1',
                [req.user.id]
            );

            // Auto-extend payment schedules for all tenancies
            for (const tenancy of tenanciesResult.rows) {
                await extendPaymentSchedule(tenancy.id);
            }

            // Get all payments for landlord's tenancies
            const result = await pool.query(
                `SELECT ps.*, CONCAT_WS(', ', t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode) as property_address, u.full_name as lodger_name
                 FROM payment_schedule ps
                 JOIN tenancies t ON ps.tenancy_id = t.id
                 JOIN users u ON t.lodger_id = u.id
                 WHERE t.landlord_id = $1
                 ORDER BY ps.due_date DESC`,
                [req.user.id]
            );
            res.json(result.rows);
        } else if (req.user.user_type === 'lodger') {
            // Get lodger's tenancy and extend schedule
            const tenancyResult = await pool.query(
                'SELECT id FROM tenancies WHERE lodger_id = $1',
                [req.user.id]
            );

            if (tenancyResult.rows.length > 0) {
                await extendPaymentSchedule(tenancyResult.rows[0].id);
            }

            // Get payments for lodger's tenancy
            const result = await pool.query(
                `SELECT ps.*, CONCAT_WS(', ', t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode) as property_address
                 FROM payment_schedule ps
                 JOIN tenancies t ON ps.tenancy_id = t.id
                 WHERE t.lodger_id = $1
                 ORDER BY ps.due_date DESC`,
                [req.user.id]
            );
            res.json(result.rows);
        } else {
            res.status(403).json({ error: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to get payments' });
    }
});

/**
 * Send payment reminder
 * @route POST /api/payments/:id/remind
 * @auth Landlord/Admin only
 * @param {string} id - Payment ID
 * @returns {Object} Created notification
 */
router.post('/:id/remind', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Get payment and tenancy details
        const paymentResult = await pool.query(
            `SELECT ps.*, t.lodger_id, CONCAT_WS(', ', t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode) as property_address, u.full_name as lodger_name
             FROM payment_schedule ps
             JOIN tenancies t ON ps.tenancy_id = t.id
             JOIN users u ON t.lodger_id = u.id
             WHERE ps.id = $1`,
            [id]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentResult.rows[0];

        // Don't send reminder for already paid payments
        if (payment.payment_status === 'paid' || payment.payment_status === 'confirmed') {
            return res.status(400).json({ error: 'Cannot send reminder for paid payment' });
        }

        // Create notification for lodger
        const dueDate = new Date(payment.due_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const notificationResult = await pool.query(
            `INSERT INTO notifications (user_id, tenancy_id, payment_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                payment.lodger_id,
                payment.tenancy_id,
                payment.id,
                'payment_reminder',
                'Payment Reminder',
                `Payment #${payment.payment_number} of �${parseFloat(payment.rent_due).toFixed(2)} is due on ${dueDate}. Please submit your payment at your earliest convenience.`
            ]
        );

        res.json({
            message: 'Payment reminder sent successfully',
            notification: notificationResult.rows[0]
        });
    } catch (error) {
        console.error('Send payment reminder error:', error);
        res.status(500).json({ error: 'Failed to send payment reminder' });
    }
});

module.exports = router;
