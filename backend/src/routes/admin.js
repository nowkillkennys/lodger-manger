/**
 * Admin Routes
 * Handles admin operations and reset request management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SALT_ROUNDS = 10;

// ============================================
// ADMIN STATS AND DATA
// ============================================

/**
 * Get system statistics
 * @route GET /api/admin/stats
 * @auth Admin only
 * @returns {Object} System statistics (landlords, lodgers, tenancies, revenue)
 */
router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [landlordsResult, lodgersResult, tenanciesResult, revenueResult] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM users WHERE user_type = 'landlord'"),
            pool.query("SELECT COUNT(*) as count FROM users WHERE user_type = 'lodger'"),
            pool.query("SELECT COUNT(*) as count FROM tenancies WHERE status IN ('active', 'draft')"),
            pool.query("SELECT COALESCE(SUM(rent_due), 0) as total FROM payment_schedule WHERE payment_status IN ('paid', 'confirmed')")
        ]);

        res.json({
            totalLandlords: parseInt(landlordsResult.rows[0].count),
            totalLodgers: parseInt(lodgersResult.rows[0].count),
            totalTenancies: parseInt(tenanciesResult.rows[0].count),
            totalRevenue: parseFloat(revenueResult.rows[0].total)
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ error: 'Failed to get system stats' });
    }
});

/**
 * Get landlords with their lodgers
 * @route GET /api/admin/landlords-with-lodgers
 * @auth Admin only
 * @returns {Array} List of landlords with associated lodgers
 */
router.get('/landlords-with-lodgers', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                l.id, l.full_name, l.email, l.created_at,
                json_agg(
                    json_build_object(
                        'id', lodger.id,
                        'full_name', lodger.full_name,
                        'email', lodger.email,
                        'tenancy_status', t.status,
                        'monthly_rent', t.monthly_rent
                    )
                ) FILTER (WHERE lodger.id IS NOT NULL) as lodgers
            FROM users l
            LEFT JOIN tenancies t ON l.id = t.landlord_id AND t.status IN ('active', 'draft')
            LEFT JOIN users lodger ON t.lodger_id = lodger.id
            WHERE l.user_type = 'landlord'
            GROUP BY l.id, l.full_name, l.email, l.created_at
            ORDER BY l.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Get landlords with lodgers error:', error);
        res.status(500).json({ error: 'Failed to get landlords data' });
    }
});

// ============================================
// RESET REQUEST ROUTES
// ============================================

/**
 * Submit reset request (landlord only)
 * @route POST /api/admin/reset-requests
 * @auth Landlord only
 * @body {string} request_type - Type of reset request
 * @body {string} details - Additional details (optional)
 * @returns {Object} Created reset request
 */
router.post('/reset-requests', authenticateToken, requireRole('landlord'), async (req, res) => {
    try {
        const { request_type, details } = req.body;

        // Validate request type
        const validTypes = ['forgot_password', 'account_locked', 'data_corruption', 'account_transfer', 'other'];
        if (!validTypes.includes(request_type)) {
            return res.status(400).json({ error: 'Invalid request type' });
        }

        // Check if landlord already has a pending request
        const existingRequest = await pool.query(
            'SELECT id FROM reset_requests WHERE landlord_id = $1 AND status = $2',
            [req.user.id, 'pending']
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a pending reset request' });
        }

        // Create reset request
        const result = await pool.query(
            `INSERT INTO reset_requests (landlord_id, request_type, details, status)
             VALUES ($1, $2, $3, $4)
             RETURNING id, request_type, details, status, created_at`,
            [req.user.id, request_type, details || null, 'pending']
        );

        // Create notification for admin
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES (
                 (SELECT id FROM users WHERE user_type = 'admin' LIMIT 1),
                 'admin_reset_request',
                 'New Account Reset Request',
                 $1
             )`,
            [`${req.user.full_name} has submitted a ${request_type.replace('_', ' ')} request`]
        );

        res.status(201).json({
            message: 'Reset request submitted successfully',
            request: result.rows[0]
        });
    } catch (error) {
        console.error('Submit reset request error:', error);
        res.status(500).json({ error: 'Failed to submit reset request' });
    }
});

/**
 * Get all reset requests (admin only)
 * @route GET /api/admin/reset-requests
 * @auth Admin only
 * @returns {Array} List of all reset requests
 */
router.get('/reset-requests', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT rr.*, u.full_name as landlord_name, u.email as landlord_email
             FROM reset_requests rr
             JOIN users u ON rr.landlord_id = u.id
             ORDER BY rr.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get reset requests error:', error);
        res.status(500).json({ error: 'Failed to get reset requests' });
    }
});

/**
 * Handle reset request action (admin only)
 * @route POST /api/admin/reset-requests/:id/action
 * @auth Admin only
 * @param {string} id - Reset request ID
 * @body {string} action - Action to take (password_reset, contact_landlord, deny)
 * @body {string} response - Admin response message
 * @returns {Object} Action result
 */
router.post('/reset-requests/:id/action', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { action, response } = req.body;

        // Get the reset request
        const requestResult = await pool.query(
            'SELECT * FROM reset_requests WHERE id = $1',
            [id]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'Reset request not found' });
        }

        const resetRequest = requestResult.rows[0];

        if (resetRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Request has already been processed' });
        }

        let newStatus = 'completed';
        let adminResponse = response || '';

        // Handle different actions
        if (action === 'password_reset') {
            // Generate a temporary password and update the landlord's account
            const tempPassword = Math.random().toString(36).slice(-12) + 'Temp123!';
            const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

            await pool.query(
                'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [passwordHash, resetRequest.landlord_id]
            );

            adminResponse = `Password reset to: ${tempPassword}. Please change this after logging in.`;

            // Create notification for landlord
            await pool.query(
                `INSERT INTO notifications (user_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    resetRequest.landlord_id,
                    'password_reset',
                    'Password Reset Complete',
                    'Your password has been reset by an administrator. Please check your email for the new temporary password.'
                ]
            );

        } else if (action === 'contact_landlord') {
            newStatus = 'pending';
            adminResponse = response || 'Admin will contact you directly.';

        } else if (action === 'deny') {
            newStatus = 'denied';
            adminResponse = response || 'Request denied.';

            // Create notification for landlord
            await pool.query(
                `INSERT INTO notifications (user_id, type, title, message)
                 VALUES ($1, $2, $3, $4)`,
                [
                    resetRequest.landlord_id,
                    'request_denied',
                    'Reset Request Denied',
                    'Your account reset request has been denied. Please contact support for more information.'
                ]
            );
        }

        // Update the reset request
        await pool.query(
            `UPDATE reset_requests
             SET status = $1, admin_response = $2, admin_id = $3, responded_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [newStatus, adminResponse, req.user.id, id]
        );

        res.json({
            message: `Reset request ${action} successfully`,
            status: newStatus
        });
    } catch (error) {
        console.error('Reset request action error:', error);
        res.status(500).json({ error: 'Failed to process reset request' });
    }
});

/**
 * Get landlord's own reset requests
 * @route GET /api/admin/landlord/reset-requests
 * @auth Landlord only
 * @returns {Array} List of landlord's reset requests
 */
router.get('/landlord/reset-requests', authenticateToken, requireRole('landlord'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, request_type, details, status, admin_response, created_at, responded_at
             FROM reset_requests
             WHERE landlord_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get landlord reset requests error:', error);
        res.status(500).json({ error: 'Failed to get reset requests' });
    }
});

// ============================================
// BACKUP AND EXPORT

/**
 * Export all platform data as JSON
 * @route GET /api/admin/backup/json
 * @auth Admin only
 * @returns {Object} Complete database export
 */
router.get('/backup/json', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        // Fetch all data from all tables
        const [users, tenancies, payments, notices, notifications, deductions, resetRequests, paymentTransactions] = await Promise.all([
            pool.query('SELECT * FROM users'),
            pool.query('SELECT * FROM tenancies'),
            pool.query('SELECT * FROM payment_schedule'),
            pool.query('SELECT * FROM notices'),
            pool.query('SELECT * FROM notifications'),
            pool.query('SELECT * FROM deductions'),
            pool.query('SELECT * FROM reset_requests'),
            pool.query('SELECT * FROM payment_transactions')
        ]);

        const backup = {
            export_date: new Date().toISOString(),
            version: '1.0',
            data: {
                users: users.rows,
                tenancies: tenancies.rows,
                payment_schedule: payments.rows,
                notices: notices.rows,
                notifications: notifications.rows,
                deductions: deductions.rows,
                reset_requests: resetRequests.rows,
                payment_transactions: paymentTransactions.rows
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="lodger-manager-backup-${new Date().toISOString()}.json"`);
        res.json(backup);
    } catch (error) {
        console.error('Backup JSON export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

/**
 * Create PostgreSQL database dump
 * @route GET /api/admin/backup/database
 * @auth Admin only
 * @returns {File} SQL dump file
 */
router.get('/backup/database', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { exec } = require('child_process');
        const fs = require('fs').promises;
        const path = require('path');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `lodger-manager-db-${timestamp}.sql`;
        const filepath = path.join('/tmp', filename);

        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || '5433',
            database: process.env.DB_NAME || 'lodger_management',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'changeme123'
        };

        const pgDumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f ${filepath}`;

        exec(pgDumpCommand, async (error, stdout, stderr) => {
            if (error) {
                console.error('pg_dump error:', error);
                return res.status(500).json({ error: 'Failed to create database backup' });
            }

            try {
                const fileContent = await fs.readFile(filepath);

                res.setHeader('Content-Type', 'application/sql');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.send(fileContent);

                // Clean up temp file
                await fs.unlink(filepath).catch(err => console.error('Failed to delete temp file:', err));
            } catch (readError) {
                console.error('File read error:', readError);
                res.status(500).json({ error: 'Failed to read backup file' });
            }
        });
    } catch (error) {
        console.error('Database backup error:', error);
        res.status(500).json({ error: 'Failed to create database backup' });
    }
});

module.exports = router;
