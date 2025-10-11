/**
 * Setup Routes
 * Handles initial system setup and landlord account creation
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const SALT_ROUNDS = 10;

/**
 * Check if system needs initial setup
 * @route GET /api/setup/status
 * @returns {Object} needs_setup and user_count
 */
router.get('/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
        const userCount = parseInt(result.rows[0].user_count);

        let needsSetup = userCount === 0;

        // Also check if admin account exists but has no password
        if (userCount === 1) {
            const adminResult = await pool.query(
                'SELECT password_hash FROM users WHERE email = $1 AND user_type = $2',
                ['admin@example.com', 'sys_admin']
            );
            if (adminResult.rows.length > 0 && !adminResult.rows[0].password_hash) {
                needsSetup = true;
            }
        }

        res.json({
            needs_setup: needsSetup,
            user_count: userCount
        });
    } catch (error) {
        console.error('Setup status check error:', error);
        res.status(500).json({ error: 'Failed to check setup status' });
    }
});

/**
 * Create admin account (only if no users exist)
 * @route POST /api/setup/admin
 * @body {string} email - Admin email (optional, defaults to admin@example.com)
 * @returns {Object} Created admin account details
 */
router.post('/admin', async (req, res) => {
    try {
        // Check if any users exist
        const userCheck = await pool.query('SELECT COUNT(*) as user_count FROM users');
        const userCount = parseInt(userCheck.rows[0].user_count);

        if (userCount > 0) {
            return res.status(400).json({ error: 'System already has users. Setup not allowed.' });
        }

        // Create admin account without password (will be set later)
        const result = await pool.query(
            `INSERT INTO users (email, user_type, full_name, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, email, user_type, full_name`,
            ['admin@example.com', 'sys_admin', 'System Administrator', true]
        );

        res.status(201).json({
            message: 'Admin account created successfully',
            admin: result.rows[0],
            next_step: 'Set admin password using /api/setup/admin/password'
        });
    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

/**
 * Set admin password (only for admin account with no password)
 * @route POST /api/setup/admin/password
 * @body {string} password - Admin password (min 6 characters)
 * @returns {Object} Success message
 */
router.post('/admin/password', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if admin exists and has no password
        const adminCheck = await pool.query(
            'SELECT id, password_hash FROM users WHERE email = $1 AND user_type = $2',
            ['admin@example.com', 'sys_admin']
        );

        if (adminCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Admin account not found' });
        }

        const admin = adminCheck.rows[0];

        if (admin.password_hash) {
            return res.status(400).json({ error: 'Admin password already set' });
        }

        // Hash and set password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [passwordHash, admin.id]
        );

        res.json({
            message: 'Admin password set successfully',
            next_step: 'Login with admin credentials and create landlord accounts'
        });
    } catch (error) {
        console.error('Admin password setup error:', error);
        res.status(500).json({ error: 'Failed to set admin password' });
    }
});

/**
 * Create landlord account (admin only)
 * @route POST /api/setup/landlord
 * @auth Admin only
 * @body {string} email - Landlord email
 * @body {string} password - Landlord password
 * @body {string} full_name - Landlord full name
 * @body {string} phone - Landlord phone (optional)
 * @returns {Object} Created landlord account details
 */
router.post('/landlord', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;

        // Validate required fields
        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Email, password, and full name are required' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create landlord account
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, email, user_type, full_name, phone`,
            [email, passwordHash, 'landlord', full_name, phone || null, true]
        );

        res.status(201).json({
            message: 'Landlord account created successfully',
            landlord: result.rows[0]
        });
    } catch (error) {
        console.error('Landlord creation error:', error);
        res.status(500).json({ error: 'Failed to create landlord account' });
    }
});

module.exports = router;
