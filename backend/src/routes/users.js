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

        // Check user creation permissions based on hierarchy
        if (req.user.user_type === 'landlord' && user_type !== 'lodger') {
            return res.status(403).json({ error: 'Landlords can only create lodger accounts' });
        }

        if (req.user.user_type === 'admin' && user_type === 'admin') {
            return res.status(403).json({ error: 'Sub-administrators cannot create other admin accounts. Contact the System Administrator for assistance.' });
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
             RETURNING u.id, u.email, u.user_type, u.full_name, u.phone, u.house_number, u.street_name, u.city, u.county, u.postcode, u.landlord_id,
                      l.email as landlord_email, l.full_name as landlord_name`,
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
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
             RETURNING u.id, u.email, u.user_type, u.full_name, u.phone, u.is_active, u.landlord_id,
                      l.email as landlord_email, l.full_name as landlord_name`,
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
 * Claim existing lodger by ID (landlord/admin only)
 * @route POST /api/users/:id/claim
 * @auth Landlord/Admin only
 * @param {string} id - Lodger user ID
 * @returns {Object} Success message or error
 */
router.post('/:id/claim', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find the lodger by ID
    const lodgerResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND user_type = $2',
      [id, 'lodger']
    );

    if (lodgerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lodger not found with this ID' });
    }

    const lodger = lodgerResult.rows[0];

    // Check if lodger is already assigned to a landlord
    if (lodger.landlord_id) {
        return res.status(400).json({
            error: 'This lodger is already assigned to a landlord. Please contact an admin to reassign.'
        });
    }

    // Determine which landlord to assign to
    let targetLandlordId = req.user.id; // Default to current user

    // If admin is assigning to a different landlord, validate that landlord exists and has capacity
    if (req.user.user_type === 'admin' && (req.body.landlord_email || req.body.landlord_id)) {
        let landlordResult;

        if (req.body.landlord_email) {
            // Find landlord by email
            landlordResult = await pool.query(
                'SELECT id, full_name, email FROM users WHERE email = $1 AND user_type = $2 AND is_active = true',
                [req.body.landlord_email, 'landlord']
            );

            if (landlordResult.rows.length === 0) {
                return res.status(404).json({ error: 'Landlord not found with this email' });
            }
        } else if (req.body.landlord_id) {
            // Find landlord by ID
            landlordResult = await pool.query(
                'SELECT id, full_name, email FROM users WHERE id = $1 AND user_type = $2 AND is_active = true',
                [req.body.landlord_id, 'landlord']
            );

            if (landlordResult.rows.length === 0) {
                return res.status(404).json({ error: 'Landlord not found with this ID' });
            }
        }

        targetLandlordId = landlordResult.rows[0].id;

        // Check target landlord's current lodger count (max 2 active tenancies)
        const activeTenanciesCount = await pool.query(
            `SELECT COUNT(DISTINCT lodger_id) as count
             FROM tenancies
             WHERE landlord_id = $1
             AND status IN ('active', 'draft')`,
            [targetLandlordId]
        );

        if (parseInt(activeTenanciesCount.rows[0].count) >= 2) {
            return res.status(400).json({
                error: 'Target landlord has reached the maximum lodger limit (2 active tenancies).'
            });
        }
    } else if (req.user.user_type === 'landlord') {
        // For regular landlords, check their own limit
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

    // Assign lodger to the determined landlord
    await pool.query(
        'UPDATE users SET landlord_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [targetLandlordId, lodger.id]
    );

    const targetLandlord = landlordResult ? landlordResult.rows[0] : { email: req.user.email, full_name: req.user.full_name };
    res.json({
        message: `Lodger successfully linked and assigned to ${targetLandlord.full_name} (${targetLandlord.email})`,
        lodger: {
            id: lodger.id,
            email: lodger.email,
            full_name: lodger.full_name
        },
        landlord: {
            id: targetLandlordId,
            email: targetLandlord.email,
            full_name: targetLandlord.full_name
        }
    });

  } catch (error) {
    console.error('Claim lodger by ID error:', error);
    res.status(500).json({ error: 'Failed to claim lodger' });
  }
});

/**
 * Claim existing lodger by email (landlord/admin only)
 * @route POST /api/users/claim-lodger
 * @auth Landlord/Admin only
 * @body {string} lodger_email - Email of lodger to claim
 * @returns {Object} Success message or error
 */
router.post('/claim-lodger', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { lodger_email } = req.body;

        if (!lodger_email) {
            return res.status(400).json({ error: 'Lodger email is required' });
        }

        // Find the lodger by email
        const lodgerResult = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND user_type = $2',
            [lodger_email, 'lodger']
        );

        if (lodgerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lodger not found with this email' });
        }

        const lodger = lodgerResult.rows[0];

        // Check if lodger is already assigned to a landlord
        if (lodger.landlord_id) {
            return res.status(400).json({
                error: 'This lodger is already assigned to a landlord. Please contact an admin to reassign.'
            });
        }

        // Check landlord's current lodger count (max 2 active tenancies)
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

        // Assign lodger to landlord
        await pool.query(
            'UPDATE users SET landlord_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [req.user.id, lodger.id]
        );

        res.json({
            message: 'Lodger successfully claimed and assigned to you',
            lodger: {
                id: lodger.id,
                email: lodger.email,
                full_name: lodger.full_name
            }
        });

    } catch (error) {
        console.error('Claim lodger error:', error);
        res.status(500).json({ error: 'Failed to claim lodger' });
    }
});

/**
 * Remove landlord-lodger association (landlord/admin only)
 * @route DELETE /api/users/:id/unlink
 * @auth Landlord/Admin only
 * @param {string} id - Lodger user ID
 * @returns {Object} Success message
 */
router.delete('/:id/unlink', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check permissions - landlord can only unlink their own lodgers, admin can unlink any
        if (req.user.user_type === 'landlord') {
            // Verify the lodger belongs to this landlord
            const lodgerCheck = await pool.query(
                'SELECT * FROM users WHERE id = $1 AND landlord_id = $2 AND user_type = $3',
                [id, req.user.id, 'lodger']
            );

            if (lodgerCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Lodger not found or not assigned to you' });
            }
        } else if (req.user.user_type === 'admin') {
            // Admin can unlink any lodger
            const lodgerCheck = await pool.query(
                'SELECT * FROM users WHERE id = $1 AND user_type = $2',
                [id, 'lodger']
            );

            if (lodgerCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Lodger not found' });
            }
        } else {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Check if there are active tenancies (shouldn't unlink if there are active agreements)
        const activeTenancies = await pool.query(
            `SELECT COUNT(*) as count FROM tenancies
             WHERE lodger_id = $1 AND landlord_id = $2 AND status IN ('active', 'draft')`,
            [id, req.user.user_type === 'landlord' ? req.user.id : undefined]
        );

        if (parseInt(activeTenancies.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Cannot unlink lodger with active tenancy agreements. Please terminate tenancies first.'
            });
        }

        // Remove the association
        await pool.query(
            'UPDATE users SET landlord_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );

        res.json({
            message: 'Lodger successfully unlinked from landlord'
        });

    } catch (error) {
        console.error('Unlink lodger error:', error);
        res.status(500).json({ error: 'Failed to unlink lodger' });
    }
});

/**
 * Get available landlords for lodger assignment
 * @route GET /api/users/landlords
 * @auth Admin only
 * @returns {Array} List of landlords who can accept more lodgers
 */
router.get('/landlords', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        // Get landlords who have less than 2 active tenancies
        const result = await pool.query(
            `SELECT u.id, u.email, u.full_name, u.phone,
                    COALESCE(active_count.count, 0) as current_lodgers
             FROM users u
             LEFT JOIN (
                 SELECT landlord_id, COUNT(DISTINCT lodger_id) as count
                 FROM tenancies
                 WHERE status IN ('active', 'draft')
                 GROUP BY landlord_id
             ) active_count ON u.id = active_count.landlord_id
             WHERE u.user_type = 'landlord'
             AND u.is_active = true
             AND (active_count.count IS NULL OR active_count.count < 2)
             ORDER BY u.full_name`,
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get available landlords error:', error);
        res.status(500).json({ error: 'Failed to get available landlords' });
    }
});

/**
 * Get available lodgers (unassigned)
 * @route GET /api/users/available-lodgers
 * @auth Landlord/Admin only
 * @returns {Array} List of lodgers without landlord_id
 */
router.get('/available-lodgers', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
  try {
    // Get lodgers who don't have a landlord_id assigned
    const result = await pool.query(
        `SELECT u.id, u.email, u.user_type, u.full_name, u.phone, u.is_active, u.created_at, u.landlord_id,
                l.email as landlord_email, l.full_name as landlord_name
         FROM users u
         LEFT JOIN users l ON u.landlord_id = l.id
         WHERE u.user_type = 'lodger'
         AND u.landlord_id IS NULL
         AND u.is_active = true
         ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get available lodgers error:', error);
    res.status(500).json({ error: 'Failed to get available lodgers' });
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
                `SELECT u.id, u.email, u.user_type, u.full_name, u.phone, u.is_active, u.created_at, u.landlord_id,
                        l.email as landlord_email, l.full_name as landlord_name
                 FROM users u
                 LEFT JOIN users l ON u.landlord_id = l.id
                 WHERE u.user_type = 'lodger'
                 ORDER BY u.created_at DESC`
            );
        } else {
            // Landlords see only their lodgers (by landlord_id)
            result = await pool.query(
                `SELECT u.id, u.email, u.user_type, u.full_name, u.phone, u.is_active, u.created_at, u.landlord_id,
                        l.email as landlord_email, l.full_name as landlord_name
                 FROM users u
                 LEFT JOIN users l ON u.landlord_id = l.id
                 WHERE u.landlord_id = $1 AND u.user_type = 'lodger'
                 ORDER BY u.created_at DESC`,
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
            `SELECT u.id, u.email, u.user_type, u.full_name, u.phone, u.is_active, u.created_at, u.landlord_id,
                    l.email as landlord_email, l.full_name as landlord_name
             FROM users u
             LEFT JOIN users l ON u.landlord_id = l.id
             ORDER BY u.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

/**
 * Delete user (admin only)
 * @route DELETE /api/users/:id
 * @auth Admin only
 * @param {string} id - User ID
 * @returns {Object} Success message
 */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Get user details before deletion
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Check if trying to delete an admin user
        if (user.user_type === 'admin') {
            // Only the System Administrator can delete other admin users
            if (req.user.user_type !== 'sys_admin') {
                return res.status(403).json({
                    error: 'Only the System Administrator can delete other admin users.'
                });
            }

            // Prevent System Administrator from deleting themselves
            if (user.id === req.user.id) {
                return res.status(400).json({
                    error: 'System Administrator cannot delete their own account.'
                });
            }
        }

        // Check if user has active tenancies (shouldn't delete if there are active agreements)
        if (user.user_type === 'lodger' && user.landlord_id) {
            const activeTenancies = await pool.query(
                `SELECT COUNT(*) as count FROM tenancies
                 WHERE lodger_id = $1 AND landlord_id = $2 AND status IN ('active', 'draft')`,
                [id, user.landlord_id]
            );

            if (parseInt(activeTenancies.rows[0].count) > 0) {
                return res.status(400).json({
                    error: 'Cannot delete lodger with active tenancy agreements. Please terminate tenancies first or unlink the lodger.'
                });
            }
        }

        if (user.user_type === 'landlord') {
            const activeTenancies = await pool.query(
                `SELECT COUNT(*) as count FROM tenancies
                 WHERE landlord_id = $1 AND status IN ('active', 'draft')`,
                [id]
            );

            if (parseInt(activeTenancies.rows[0].count) > 0) {
                return res.status(400).json({
                    error: 'Cannot delete landlord with active tenancy agreements. Please terminate all tenancies first.'
                });
            }
        }

        // Delete the user
        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                user_type: user.user_type
            }
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
