/**
 * Authentication Routes
 * Handles user login, registration, and token management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { parseAddress } = require('../utils/addressParser');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const SALT_ROUNDS = 10;

/**
 * Login
 * @route POST /api/auth/login
 * @body {string} email - User email
 * @body {string} password - User password
 * @returns {Object} JWT token and user data
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                user_type: user.user_type,
                full_name: user.full_name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                user_type: user.user_type,
                full_name: user.full_name,
                phone: user.phone,
                address: {
                    house_number: user.house_number,
                    street_name: user.street_name,
                    city: user.city,
                    county: user.county,
                    postcode: user.postcode
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * Register new user
 * @route POST /api/auth/register
 * @body {string} email - User email
 * @body {string} password - User password
 * @body {string} user_type - User type (landlord or lodger)
 * @body {string} full_name - Full name
 * @body {string} phone - Phone number (optional)
 * @body {Object|string} address - Address (optional)
 * @returns {Object} JWT token and user data
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, user_type, full_name, phone, address } = req.body;

        // Validate required fields
        if (!email || !password || !user_type || !full_name) {
            return res.status(400).json({ error: 'Email, password, user type, and full name are required' });
        }

        // Validate user type
        if (!['landlord', 'lodger'].includes(user_type)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Parse address if provided
        let addressFields = {
            house_number: null,
            street_name: null,
            city: null,
            county: null,
            postcode: null
        };

        if (address) {
            if (typeof address === 'object') {
                addressFields = {
                    house_number: address.house_number || null,
                    street_name: address.street_name || null,
                    city: address.city || null,
                    county: address.county || null,
                    postcode: address.postcode || null
                };
            } else if (typeof address === 'string') {
                // Parse string address (for backward compatibility)
                const parsed = parseAddress(address);
                addressFields = parsed;
            }
        }

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone, house_number, street_name, city, county, postcode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, email, user_type, full_name, phone, house_number, street_name, city, county, postcode`,
            [email, passwordHash, user_type, full_name, phone || null,
             addressFields.house_number, addressFields.street_name, addressFields.city, addressFields.county, addressFields.postcode]
        );

        const user = result.rows[0];

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                user_type: user.user_type,
                full_name: user.full_name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                user_type: user.user_type,
                full_name: user.full_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * Get current user
 * @route GET /api/auth/me
 * @auth Required
 * @returns {Object} Current user data
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, user_type, full_name, phone FROM users WHERE id = $1',
            [req.user.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

module.exports = router;
