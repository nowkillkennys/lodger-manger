/**
 * User Management Routes
 * Handles user CRUD operations and profile management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { parseAddress } = require('../utils/addressParser');

const SALT_ROUNDS = 10;

/**
 * Create user (landlord/admin only)
 * @route POST /api/users
 * @auth Landlord/Admin only
 * @body {string} email - User email
 * @body {string} password - User password
 * @body {string} user_type - User type (lodger for landlords, any for admins)
 * @body {string} full_name - Full name
 * @body {string} phone - Phone number (optional)
 * @returns {Object} Created user data
 */
router.post('/', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { email, password, user_type, full_name, phone } = req.body;

        // Validate required fields
        if (!email || !password || !user_type || !full_name) {
            return res.status(400).json({ error: 'Email, password, user type, and full name are required' });
        }

        // Landlords can only create lodgers, admins can create anyone
        if (req.user.user_type === 'landlord' && user_type !== 'lodger') {
            return res.status(403).json({ error: 'Landlords can only create lodger accounts' });
        }

        // Check lodger limit for landlords (max 2 active tenancies)
        if (req.user.user_type === 'landlord' && user_type === 'lodger') {
            const activeTenanciesCount = await pool.query(
                `SELECT COUNT(DISTINCT lodger_id) as count
                 FROM tenancies
                 WHERE landlord_id = $1
                 AND status IN ('active', 'draft')`,
                [req.user.id]
            );

            if (parseInt(activeTenanciesCount.rows[0].count) >= 2) {
                return res.status(400).json({
                    error: 'Maximum lodger limit reached. You already have 2 active tenancies. Each landlord can only have 2 lodgers at a time.'
                });
            }
        }

        // Validate user type
        if (!['landlord', 'lodger', 'admin'].includes(user_type)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Set landlord_id if a landlord is creating a lodger
        const landlord_id = (req.user.user_type === 'landlord' && user_type === 'lodger') ? req.user.id : null;

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone, house_number, street_name, city, county, postcode, landlord_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, email, user_type, full_name, phone, house_number, street_name, city, county, postcode`,
            [email, password_hash, user_type, full_name, phone || null, null, null, null, null, null, landlord_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * Reset user password (landlord/admin only)
 * @route POST /api/users/:id/reset-password
 * @auth Landlord/Admin only
 * @param {string} id - User ID
 * @body {string} new_password - New password
 * @returns {Object} Success message
 */
router.post('/:id/reset-password', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [password_hash, id]
        );

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

/**
 * Get own profile
 * @route GET /api/users/profile
 * @auth Required
 * @returns {Object} User profile data with structured address
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, user_type, full_name, phone, house_number, street_name, city, county, postcode, bank_account_number, bank_sort_code, payment_reference, rooms FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            ...user,
            address: {
                house_number: user.house_number,
                street_name: user.street_name,
                city: user.city,
                county: user.county,
                postcode: user.postcode
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * Update own profile
 * @route PUT /api/users/profile
 * @auth Required
 * @body {string} full_name - Full name (optional)
 * @body {string} phone - Phone number (optional)
 * @body {Object|string} address - Address (optional)
 * @body {string} email - Email (optional)
 * @body {string} bank_account_number - Bank account number (optional)
 * @body {string} bank_sort_code - Bank sort code (optional)
 * @body {string} payment_reference - Payment reference (optional)
 * @body {Object} rooms - Rooms data (optional)
 * @returns {Object} Updated user profile
 */
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, phone, address, email, bank_account_number, bank_sort_code, payment_reference, rooms, phone_number } = req.body;
        const userId = req.user.id;

        // Check if email is already taken by another user
        if (email && email !== req.user.email) {
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );

            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (phone_number !== undefined) {
            updates.push(`phone_number = $${paramCount++}`);
            values.push(phone_number);
        }

        // Handle structured address (nested object)
        if (address !== undefined) {
            if (typeof address === 'object') {
                if (address.house_number !== undefined) {
                    updates.push(`house_number = $${paramCount++}`);
                    values.push(address.house_number);
                }
                if (address.street_name !== undefined) {
                    updates.push(`street_name = $${paramCount++}`);
                    values.push(address.street_name);
                }
                if (address.city !== undefined) {
                    updates.push(`city = $${paramCount++}`);
                    values.push(address.city);
                }
                if (address.county !== undefined) {
                    updates.push(`county = $${paramCount++}`);
                    values.push(address.county);
                }
                if (address.postcode !== undefined) {
                    updates.push(`postcode = $${paramCount++}`);
                    values.push(address.postcode);
                }
            } else if (typeof address === 'string') {
                // Parse string address for backward compatibility
                const parsed = parseAddress(address);
                updates.push(`house_number = $${paramCount++}`);
                values.push(parsed.house_number);
                updates.push(`street_name = $${paramCount++}`);
                values.push(parsed.street_name);
                updates.push(`city = $${paramCount++}`);
                values.push(parsed.city);
                updates.push(`county = $${paramCount++}`);
                values.push(parsed.county);
                updates.push(`postcode = $${paramCount++}`);
                values.push(parsed.postcode);
            }
        }

        // Handle individual address fields (sent at top level)
        if (req.body.house_number !== undefined) {
            updates.push(`house_number = $${paramCount++}`);
            values.push(req.body.house_number);
        }
        if (req.body.street_name !== undefined) {
            updates.push(`street_name = $${paramCount++}`);
            values.push(req.body.street_name);
        }
        if (req.body.city !== undefined) {
            updates.push(`city = $${paramCount++}`);
            values.push(req.body.city);
        }
        if (req.body.county !== undefined) {
            updates.push(`county = $${paramCount++}`);
            values.push(req.body.county);
        }
        if (req.body.postcode !== undefined) {
            updates.push(`postcode = $${paramCount++}`);
            values.push(req.body.postcode);
        }

        if (email !== undefined) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (bank_account_number !== undefined) {
            updates.push(`bank_account_number = $${paramCount++}`);
            values.push(bank_account_number);
        }
        if (bank_sort_code !== undefined) {
            updates.push(`bank_sort_code = $${paramCount++}`);
            values.push(bank_sort_code);
        }
        if (payment_reference !== undefined) {
            updates.push(`payment_reference = $${paramCount++}`);
            values.push(payment_reference);
        }
        if (rooms !== undefined) {
            updates.push(`rooms = $${paramCount++}`);
            values.push(JSON.stringify(rooms));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, user_type, full_name, phone, phone_number, house_number, street_name, city, county, postcode, bank_account_number, bank_sort_code, payment_reference, rooms`,
            values
        );

        const user = result.rows[0];
        res.json({
            ...user,
            address: {
                house_number: user.house_number,
                street_name: user.street_name,
                city: user.city,
                county: user.county,
                postcode: user.postcode
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * Update lodger info (landlord/admin only)
 * @route PUT /api/users/:id
 * @auth Landlord/Admin only
 * @param {string} id - User ID
 * @body {string} full_name - Full name (optional)
 * @body {string} phone - Phone number (optional)
 * @body {string} email - Email (optional)
 * @returns {Object} Updated user data
 */
router.put('/:id', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, email, is_active } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, user_type, full_name, phone, is_active`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * Get landlord's lodgers
 * @route GET /api/users/lodgers
 * @auth Landlord/Admin only
 * @returns {Array} List of lodgers for this landlord
 */
router.get('/lodgers', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        let result;

        if (req.user.user_type === 'admin') {
            // Admins see all lodgers
            result = await pool.query(
                `SELECT id, email, user_type, full_name, phone, is_active, created_at
                 FROM users
                 WHERE user_type = 'lodger'
                 ORDER BY created_at DESC`
            );
        } else {
            // Landlords see only their lodgers (by landlord_id)
            result = await pool.query(
                `SELECT id, email, user_type, full_name, phone, is_active, created_at
                 FROM users
                 WHERE landlord_id = $1 AND user_type = 'lodger'
                 ORDER BY created_at DESC`,
                [req.user.id]
            );
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Get lodgers error:', error);
        res.status(500).json({ error: 'Failed to get lodgers' });
    }
});

/**
 * List all users (admin only)
 * @route GET /api/users
 * @auth Admin only
 * @returns {Array} List of all users
 */
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, user_type, full_name, phone, is_active, created_at FROM users ORDER BY created_at DESC'
        );

        res.json(result.rows);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

module.exports = router;
