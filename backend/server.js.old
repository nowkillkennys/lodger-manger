/**
 * Lodger Management System - Backend API Server
 * Main server file (server.js)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');
const cron = require('node-cron');

// Import payment calculator
const paymentCalculator = require('./paymentCalculator');

/**
 * Map payment frequency to cycle days
 * @param {string} paymentFrequency - Payment frequency ('weekly', 'bi-weekly', 'monthly', '4-weekly')
 * @returns {number} Number of days in the payment cycle
 */
function mapPaymentFrequencyToDays(paymentFrequency) {
    const frequencyMap = {
        'weekly': 7,
        'bi-weekly': 14,
        'monthly': 30,
        '4-weekly': 28
    };
    return frequencyMap[paymentFrequency] || 28; // Default to 28 days
}

/**
 * Parse a free-text address into structured components
 * This is a best-effort parser for UK addresses
 * @param {string} addressString - The address string to parse
 * @returns {object} Parsed address components
 */
function parseAddress(addressString) {
    if (!addressString || typeof addressString !== 'string') {
        return {
            house_number: null,
            street_name: null,
            city: null,
            county: null,
            postcode: null
        };
    }

    const address = addressString.trim();

    // Extract postcode (UK format: e.g., SW1A 1AA, M1 1AA, etc.)
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
    const postcodeMatch = address.match(postcodeRegex);
    let postcode = null;
    let addressWithoutPostcode = address;

    if (postcodeMatch) {
        postcode = postcodeMatch[1].toUpperCase();
        addressWithoutPostcode = address.replace(postcodeMatch[0], '').trim();
    }

    // Split by commas to get address components
    const parts = addressWithoutPostcode.split(',').map(p => p.trim()).filter(p => p);

    let house_number = null;
    let street_name = null;
    let city = null;
    let county = null;

    if (parts.length >= 1) {
        // First part usually contains house number and street
        const firstPart = parts[0];
        const houseNumberMatch = firstPart.match(/^(\d+[A-Z]?)\s+(.+)/);

        if (houseNumberMatch) {
            house_number = houseNumberMatch[1];
            street_name = houseNumberMatch[2];
        } else {
            street_name = firstPart;
        }
    }

    if (parts.length >= 2) {
        city = parts[1];
    }

    if (parts.length >= 3) {
        county = parts[2];
    }

    return {
        house_number,
        street_name,
        city,
        county,
        postcode
    };
}

// ============================================
// CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 3003; // chnaged by me
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const SALT_ROUNDS = 10;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'changeme123'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'lodger_management'}`,
    ssl: false
});

// Test database connection with retry logic
const connectWithRetry = async (retries = 10, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const client = await pool.connect();
            console.log('✓ Database connected successfully');

            try {
                // Check if any users exist
                const userCheck = await client.query('SELECT COUNT(*) as user_count FROM users');
                const userCount = parseInt(userCheck.rows[0].user_count);

                if (userCount === 0) {
                    console.log('🔧 No users found. Creating initial admin account...');

                    // Create admin account without password (will be set via setup wizard)
                    await client.query(
                        `INSERT INTO users (email, user_type, full_name, is_active, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        ['admin@example.com', 'admin', 'System Administrator', true]
                    );

                    console.log('✓ Admin account created: admin@example.com');
                    console.log('⚠️  Admin password needs to be set via setup wizard');
                } else {
                    console.log(`✓ Found ${userCount} existing user(s)`);
                }
            } catch (initError) {
                console.error('Error during initialization:', initError);
            }

            client.release();
            return; // Success, exit retry loop
        } catch (err) {
            console.error(`Database connection attempt ${i + 1}/${retries} failed:`, err.message);
            if (i < retries - 1) {
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error('Failed to connect to database after all retries');
    process.exit(1); // Exit if we can't connect
};

connectWithRetry();

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads', req.params.type || 'general');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type'));
    }
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.user_type)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

// ============================================
// INITIAL SETUP ROUTES
// ============================================

// Check if system needs initial setup (no users exist or admin has no password)
app.get('/api/setup/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as user_count FROM users');
        const userCount = parseInt(result.rows[0].user_count);

        let needsSetup = userCount === 0;

        // Also check if admin account exists but has no password
        if (userCount === 1) {
            const adminResult = await pool.query(
                'SELECT password_hash FROM users WHERE email = $1 AND user_type = $2',
                ['admin@example.com', 'admin']
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

// Create admin account (only if no users exist)
app.post('/api/setup/admin', async (req, res) => {
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
            ['admin@example.com', 'admin', 'System Administrator', true]
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

// Set admin password (only for admin account with no password)
app.post('/api/setup/admin/password', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if admin exists and has no password
        const adminCheck = await pool.query(
            'SELECT id, password_hash FROM users WHERE email = $1 AND user_type = $2',
            ['admin@example.com', 'admin']
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

// Create landlord account (admin only)
app.post('/api/setup/landlord', authenticateToken, requireRole('admin'), async (req, res) => {
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

// ============================================
// RESET REQUEST ROUTES
// ============================================

// Submit reset request (landlord only)
app.post('/api/reset-requests', authenticateToken, requireRole('landlord'), async (req, res) => {
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

// Get reset requests (admin only)
app.get('/api/admin/reset-requests', authenticateToken, requireRole('admin'), async (req, res) => {
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

// Handle reset request action (admin only)
app.post('/api/admin/reset-requests/:id/action', authenticateToken, requireRole('admin'), async (req, res) => {
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

// Get landlord's own reset requests
app.get('/api/reset-requests', authenticateToken, requireRole('landlord'), async (req, res) => {
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
// ADMIN ROUTES
// ============================================

// Get system stats (admin only)
app.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req, res) => {
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

// Get landlords with their lodgers (admin only)
app.get('/api/admin/landlords-with-lodgers', authenticateToken, requireRole('admin'), async (req, res) => {
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
// AUTHENTICATION ROUTES
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
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

// Register new user
app.post('/api/auth/register', async (req, res) => {
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

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
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

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

// Create user (landlord/admin only)
app.post('/api/users', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone, house_number, street_name, city, county, postcode)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id, email, user_type, full_name, phone, house_number, street_name, city, county, postcode`,
            [email, password_hash, user_type, full_name, phone || null, null, null, null, null, null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Reset user password (admin only)
app.post('/api/users/:id/reset-password', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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

// Get own profile
app.get('/api/users/profile', authenticateToken, async (req, res) => {
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

// Update own profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, phone, address, email, bank_account_number, bank_sort_code, payment_reference, rooms } = req.body;
        const userId = req.user.id;

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
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, user_type, full_name, phone, house_number, street_name, city, county, postcode, bank_account_number, bank_sort_code, payment_reference, rooms`,
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

// Update lodger info (landlord/admin only)
app.put('/api/users/:id', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, email } = req.body;

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

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, user_type, full_name, phone`,
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

// List users (admin only)
app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
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

// Update user (admin only)
app.put('/api/admin/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, full_name, phone, is_active } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (email !== undefined) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (full_name !== undefined) {
            updates.push(`full_name = $${paramCount++}`);
            values.push(full_name);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount++}`);
            values.push(phone);
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

// Reset user password (admin only)
app.post('/api/admin/users/:id/reset-password', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, full_name',
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Password reset successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Reset user password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Update user profile (email and phone)
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { email, phone_number } = req.body;
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

        // Update user
        const result = await pool.query(
            `UPDATE users
             SET email = COALESCE($1, email),
                 phone_number = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, email, user_type, full_name, phone, phone_number, date_of_birth, id_expiry_date, created_at`,
            [email, phone_number, userId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ============================================
// PROPERTY ROUTES
// ============================================

// Get landlord's properties
app.get('/api/properties', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM properties WHERE landlord_id = $1 AND is_active = true ORDER BY created_at DESC',
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({ error: 'Failed to get properties' });
    }
});

// Create property
app.post('/api/properties', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { property_name, address_line1, address_line2, city, county, postcode, shared_areas } = req.body;
        
        const result = await pool.query(
            `INSERT INTO properties (landlord_id, property_name, address_line1, address_line2, city, county, postcode, shared_areas)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [req.user.id, property_name, address_line1, address_line2, city, county, postcode, shared_areas]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
});

// ============================================
// TENANCY ROUTES
// ============================================

// Get tenancies
app.get('/api/tenancies', authenticateToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.user_type === 'lodger') {
            // Lodgers see only their tenancies with landlord payment details
            query = `
                SELECT t.*,
                        u.full_name as lodger_name,
                        landlord.full_name as landlord_name,
                        landlord.bank_account_number as landlord_bank_account,
                        landlord.bank_sort_code as landlord_sort_code,
                        landlord.payment_reference as landlord_payment_reference,
                        t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode
                FROM tenancies t
                JOIN users u ON t.lodger_id = u.id
                JOIN users landlord ON t.landlord_id = landlord.id
                WHERE t.lodger_id = $1
                ORDER BY t.created_at DESC
            `;
            params = [req.user.id];
        } else {
            // Landlords see all their tenancies
            query = `
                SELECT t.*,
                        u.full_name as lodger_name,
                        landlord.full_name as landlord_name,
                        t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode
                FROM tenancies t
                JOIN users u ON t.lodger_id = u.id
                JOIN users landlord ON t.landlord_id = landlord.id
                WHERE t.landlord_id = $1
                ORDER BY t.created_at DESC
            `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);

        // Format response with structured addresses
        const formattedRows = result.rows.map(row => ({
            ...row,
            address: {
                house_number: row.property_house_number,
                street_name: row.property_street_name,
                city: row.property_city,
                county: row.property_county,
                postcode: row.property_postcode
            }
        }));

        res.json(formattedRows);
    } catch (error) {
        console.error('Get tenancies error:', error);
        res.status(500).json({ error: 'Failed to get tenancies' });
    }
});

// Create tenancy
app.post('/api/tenancies', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            lodger_id, property_address, room_description, start_date, initial_term_months,
            monthly_rent, initial_payment, deposit_applicable, deposit_amount, shared_areas,
            payment_frequency, payment_type, payment_day_of_month
        } = req.body;

        // Parse property address - handle both old format and new structured format
        let propertyAddressFields = {
            house_number: null,
            street_name: null,
            city: null,
            county: null,
            postcode: null
        };

        if (property_address) {
            if (typeof property_address === 'object') {
                // New structured format
                propertyAddressFields = {
                    house_number: property_address.house_number || null,
                    street_name: property_address.street_name || null,
                    city: property_address.city || null,
                    county: property_address.county || null,
                    postcode: property_address.postcode || null
                };
            } else if (typeof property_address === 'string') {
                // Parse string address for backward compatibility
                const parsed = parseAddress(property_address);
                propertyAddressFields = parsed;
            }
        }

        // Validate payment frequency
        const validFrequencies = ['weekly', 'bi-weekly', 'monthly', '4-weekly'];
        const frequency = payment_frequency || '4-weekly';
        if (!validFrequencies.includes(frequency)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid payment frequency. Must be one of: weekly, bi-weekly, monthly, 4-weekly' });
        }

        // Validate payment type
        const validPaymentTypes = ['cycle', 'calendar'];
        const paymentType = payment_type || 'cycle';
        if (!validPaymentTypes.includes(paymentType)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid payment type. Must be one of: cycle, calendar' });
        }

        // Validate payment day of month for calendar payments
        if (paymentType === 'calendar') {
            if (!payment_day_of_month || payment_day_of_month < 1 || payment_day_of_month > 31) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Payment day of month must be between 1 and 31 for calendar payments' });
            }
        }

        // Map payment frequency to cycle days
        const cycleDays = mapPaymentFrequencyToDays(frequency);

        // Create tenancy
        const tenancyResult = await client.query(
            `INSERT INTO tenancies (
                landlord_id, lodger_id, property_house_number, property_street_name, property_city, property_county, property_postcode,
                room_description, shared_areas, start_date, initial_term_months, monthly_rent, initial_payment,
                deposit_applicable, deposit_amount, payment_frequency, payment_cycle_days,
                payment_type, payment_day_of_month, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'active')
            RETURNING *`,
            [req.user.id, lodger_id, propertyAddressFields.house_number, propertyAddressFields.street_name,
             propertyAddressFields.city, propertyAddressFields.county, propertyAddressFields.postcode,
             room_description, shared_areas || '', start_date, initial_term_months, monthly_rent, initial_payment,
             deposit_applicable || false, deposit_amount || 0, frequency, cycleDays,
             paymentType, paymentType === 'calendar' ? payment_day_of_month : null]
        );

        const tenancy = tenancyResult.rows[0];

        // Generate payment schedule - create 24 months of payments for continuous schedule
        // Payment schedule continues until notice is given
        const schedule = paymentCalculator.generatePaymentSchedule(
            new Date(start_date),
            parseFloat(monthly_rent),
            24,  // Generate 2 years of payments
            0,   // deposit
            cycleDays,
            paymentType,
            paymentType === 'calendar' ? payment_day_of_month : 1
        );

        // Insert payment schedule
        for (const payment of schedule) {
            await client.query(
                `INSERT INTO payment_schedule (
                    tenancy_id, payment_number, due_date, rent_due
                ) VALUES ($1, $2, $3, $4)`,
                [tenancy.id, payment.paymentNumber, payment.dueDate, payment.rentDue]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(tenancy);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create tenancy error:', error);
        res.status(500).json({ error: 'Failed to create tenancy' });
    } finally {
        client.release();
    }
});

// Get tenancy details
app.get('/api/tenancies/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Check access permissions
        let query = `
            SELECT t.*, u.full_name as lodger_name, u.email as lodger_email
            FROM tenancies t
            JOIN users u ON t.lodger_id = u.id
            WHERE t.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancy = result.rows[0];

        // Check permissions
        if (req.user.user_type === 'lodger' && tenancy.lodger_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (req.user.user_type === 'landlord' && tenancy.landlord_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(tenancy);
    } catch (error) {
        console.error('Get tenancy error:', error);
        res.status(500).json({ error: 'Failed to get tenancy' });
    }
});

// Update tenancy
app.put('/api/tenancies/:id', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Build dynamic update query
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = Object.values(updates);
        
        const result = await pool.query(
            `UPDATE tenancies SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND landlord_id = $${values.length + 2}
             RETURNING *`,
            [id, ...values, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update tenancy error:', error);
        res.status(500).json({ error: 'Failed to update tenancy' });
    }
});

// Accept tenancy agreement (lodger only)
app.post('/api/tenancies/:id/accept', authenticateToken, upload.single('photo_id'), async (req, res) => {
    try {
        const { id } = req.params;
        const { date_of_birth, id_expiry_date } = req.body;

        // Verify tenancy belongs to lodger
        const tenancyCheck = await pool.query(
            'SELECT * FROM tenancies WHERE id = $1 AND lodger_id = $2',
            [id, req.user.id]
        );

        if (tenancyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const photoIdPath = req.file ? `/uploads/general/${req.file.filename}` : null;

        // Update user with date of birth and ID expiry date
        await pool.query(
            `UPDATE users
             SET date_of_birth = $1,
                 id_expiry_date = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [date_of_birth, id_expiry_date, req.user.id]
        );

        // Update tenancy with lodger signature and photo ID
        const result = await pool.query(
            `UPDATE tenancies
             SET lodger_signature = $1,
                 photo_id_path = $2,
                 signature_date = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND lodger_id = $4
             RETURNING *`,
            [req.user.full_name, photoIdPath, id, req.user.id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Accept tenancy error:', error);
        res.status(500).json({ error: 'Failed to accept tenancy' });
    }
});

// Upload new photo ID (lodger only)
app.post('/api/tenancies/:id/upload-id', authenticateToken, requireRole('lodger'), upload.single('photo_id'), async (req, res) => {
    try {
        const { id } = req.params;
        const { id_expiry_date } = req.body;

        // Verify tenancy belongs to lodger
        const tenancyCheck = await pool.query(
            'SELECT * FROM tenancies WHERE id = $1 AND lodger_id = $2',
            [id, req.user.id]
        );

        if (tenancyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const photoIdPath = `/uploads/general/${req.file.filename}`;

        // Update user with new ID expiry date
        if (id_expiry_date) {
            await pool.query(
                `UPDATE users
                 SET id_expiry_date = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [id_expiry_date, req.user.id]
            );
        }

        // Update tenancy with new photo ID
        const result = await pool.query(
            `UPDATE tenancies
             SET photo_id_path = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND lodger_id = $3
             RETURNING *`,
            [photoIdPath, id, req.user.id]
        );

        res.json({
            message: 'Photo ID uploaded successfully',
            tenancy: result.rows[0]
        });
    } catch (error) {
        console.error('Upload photo ID error:', error);
        res.status(500).json({ error: 'Failed to upload photo ID' });
    }
});

// Approve tenancy and generate PDF (landlord only)
app.post('/api/tenancies/:id/approve', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verify tenancy belongs to landlord and get lodger info
        const tenancyCheck = await pool.query(
            `SELECT t.*, u.full_name as lodger_name
             FROM tenancies t
             JOIN users u ON t.lodger_id = u.id
             WHERE t.id = $1 AND t.landlord_id = $2`,
            [id, req.user.id]
        );

        if (tenancyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancy = tenancyCheck.rows[0];

        // Check if lodger has signed
        if (!tenancy.lodger_signature) {
            return res.status(400).json({ error: 'Lodger has not signed the agreement yet' });
        }

        // Generate PDF path
        const pdfFileName = `agreement_${id}_${Date.now()}.pdf`;
        const pdfPath = `/uploads/agreements/${pdfFileName}`;

        // Create directory if it doesn't exist
        const uploadDir = path.join(__dirname, 'uploads', 'agreements');
        await fs.mkdir(uploadDir, { recursive: true });

        // For now, create a simple text file as placeholder for PDF generation
        // TODO: Implement actual PDF generation with PDFKit
        const PDFDocument = require('pdfkit');
        const pdfDoc = new PDFDocument();
        const pdfFilePath = path.join(uploadDir, pdfFileName);
        const writeStream = require('fs').createWriteStream(pdfFilePath);

        pdfDoc.pipe(writeStream);

        // Add content to PDF
        const margin = 50;
        const pageWidth = pdfDoc.page.width - (margin * 2);

        pdfDoc.fontSize(18).text('LODGER AGREEMENT', { align: 'center' });
        pdfDoc.moveDown(0.5);
        pdfDoc.fontSize(12).text('AGREEMENT FOR NON-EXCLUSIVE OR SHARED OCCUPATION', { align: 'center' });
        pdfDoc.moveDown();

        pdfDoc.fontSize(9).text('This LODGER AGREEMENT is made up of the details about the parties and the agreement in Part 1, the Terms and Conditions printed below in Part 2, and any Special Terms and Conditions agreed between the parties which have been recorded in Part 3, whereby the Room is licensed by the Householder and taken by the Lodger during the Term upon making the Accommodation Payment.', { align: 'justify' });
        pdfDoc.moveDown();

        // PART 1 - PARTICULARS
        pdfDoc.fontSize(12).text('PART 1 - PARTICULARS', { underline: true });
        pdfDoc.moveDown(0.5);
        pdfDoc.fontSize(9);
        const propertyAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
            .filter(part => part)
            .join(', ');
        pdfDoc.text(`PROPERTY: ${propertyAddress}`);
        pdfDoc.text(`ROOM: ${tenancy.room_description || 'means the room or rooms in the Property which as the Householder from time to time allocates to the Lodger'}`);
        pdfDoc.text(`SHARED AREAS: ${tenancy.shared_areas || 'the entrance hall, staircase and landings of the Property, the kitchen for cooking eating and the storage of food, the lavatory and bathroom, the sitting room, the garden (where applicable). Should the Lodger not be allowed to use any of these areas or there are any additional Shared Areas in the Property they can use, this should be reflected in Part 3: Property Rules and Services and Any Additional Terms'}`);
        pdfDoc.text(`HOUSEHOLDER: ${req.user.full_name}`);
        pdfDoc.text(`LODGER: ${tenancy.lodger_name}`);
        pdfDoc.moveDown(0.3);
        pdfDoc.text('_________________________________');
        pdfDoc.moveDown(0.3);
        pdfDoc.text(`START DAY: ${new Date(tenancy.start_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`);
        pdfDoc.text(`TERM: ${tenancy.initial_term_months} Months Rolling Contract until Terminated by either party`);
        pdfDoc.text(`INITIAL PAYMENT: £${tenancy.initial_payment}, (current and month in advanced payment)`);
        pdfDoc.text(`ACCOMMODATION PAYMENT: £${tenancy.monthly_rent} PM`);
        pdfDoc.text(`PAYMENT DAY: The 28th day of each month`);
        pdfDoc.text(`DEPOSIT: £${tenancy.deposit_amount || 0} If Applicable (${tenancy.deposit_applicable ? 'yes' : 'no'})`);
        pdfDoc.moveDown();

        // EARLY TERMINATION & UTILITIES
        pdfDoc.fontSize(10).text('EARLY TERMINATION:', { underline: true });
        pdfDoc.fontSize(9).text('Either party may at any time end this Agreement earlier than the End Date by giving notice in writing of at least one calendar month ending on the Payment Day if within of the rental term any if any deposits and or advance payments was taken will be void unless mutually agreed by both parties and or breach of this agreement');
        pdfDoc.moveDown(0.5);

        pdfDoc.fontSize(10).text('UTILITY COSTS:', { underline: true });
        pdfDoc.fontSize(9).text('all utilities including, gas, electric, water, basic internet.');
        pdfDoc.fontSize(10).text('Excluded Utility Cost:', { underline: true, continued: true });
        pdfDoc.fontSize(9).text(' Television License is not included, if the lodger would like to view any LIVE broadcast, the lodger accepts responsibility to pay for the television licence and provide evidence of the purchase at their own expense (bbc iplayer etc)');
        pdfDoc.fontSize(9).text('Any Utilities not listed as payable by the Lodger in Part 3 of this agreement are included in the Accommodation Payment.');
        pdfDoc.fontSize(9).text('Note: The Householder may not require the Lodger to pay any charge which is not a permitted payment under the Tenant Fees Act 2019.');
        pdfDoc.moveDown();

        // Add new page for terms
        pdfDoc.addPage();

        pdfDoc.fontSize(11).text('NOW IT IS AGREED AS FOLLOWS:', { underline: true });
        pdfDoc.moveDown();

        // Section 1
        pdfDoc.fontSize(10).text('1. About the Licence to Occupy a Room in the Property', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('1.1. The Householder permits the Lodger to occupy the Room until either party ends the arrangement as provided for under clause 9 of this agreement.');
        pdfDoc.text('1.2. The Lodger will occupy the Room personally and shall not share the Room with any other person, except where the Lodger has asked to share the Room with another person and the Householder has agreed in writing (in Part 3: Property Rules and Services and Any Additional Terms) that this person (the "Permitted Occupier") may occupy the Room with Lodger during the Term.');
        pdfDoc.text('1.3. The Lodger shall have use of the Contents in the Room, an inventory of which will be prepared by the Householder and provided to the Lodger.');
        pdfDoc.text('1.4. The Lodger may use the facilities of the Shared Areas of the Property in common with the Householder (and the other Lodgers of the Householder) but only in conjunction with their occupation of the Room under this agreement.');
        pdfDoc.text('1.5. This agreement is not intended to confer exclusive possession upon the Lodger nor to create the relationship of landlord and tenant between the parties. The Lodger shall not be entitled to an assured tenancy or a statutory periodic tenancy under the Housing Act 1988 or any other statutory security of tenure now or when the licence ends.');
        pdfDoc.text('1.6. This agreement is personal to the Lodger, cannot be assigned to any other party, and can be terminated by either party on notice or without notice in the case of serious breaches of the agreement.');
        pdfDoc.text('1.7. It is a condition of this agreement that the Lodger maintain a "Right to Rent" as defined by the Immigration Act 2014 at all times during the Term.');
        pdfDoc.moveDown();

        // Section 2
        pdfDoc.fontSize(10).text('2. Lodger Obligations', { underline: true });
        pdfDoc.fontSize(9).text('The Lodger Agrees with the Householder:');
        pdfDoc.fontSize(8);
        pdfDoc.text('2.1. Payments');
        pdfDoc.text('  2.1.1. To pay the Accommodation Payment at the times and in the manner set out above.');
        pdfDoc.text('  2.1.2. To pay simple interest at the rate of 3% above the Bank of England base rate upon any payment which is not paid within 14 days after the due date.');
        pdfDoc.text('2.2. Utilities - To make only reasonable use of the Utilities consistent with ordinary residential use.');
        pdfDoc.text('2.3. Use of the Property');
        pdfDoc.text('  2.3.1. Not to use or occupy the Room in any way whatsoever other than as a private residence;');
        pdfDoc.text('  2.3.2. Not to let or share any rooms or take in any lodger without consent. Occasional overnight visitors allowed with prior permission.');
        pdfDoc.text('2.4. Maintenance');
        pdfDoc.text('  2.4.1. To keep the interior of the Room and Shared Parts in good and clean condition and make good any damage.');
        pdfDoc.text('  2.4.2. To keep the Contents in good condition and not remove any articles from the Room.');
        pdfDoc.text('  2.4.3. To replace damaged items with articles of similar kind and value.');
        pdfDoc.text('2.5. Activities at the Property');
        pdfDoc.text('  2.5.1. Not to smoke cigarettes, cigars, pipes or any other substances in the Property only outside.');
        pdfDoc.text('  2.5.2. To cook at the Property only in the kitchen;');
        pdfDoc.text('  2.5.3. Not to keep any pet without prior consent;');
        pdfDoc.text('  2.5.4. Not to make any alteration without prior written consent;');
        pdfDoc.text('  2.5.5. Not do anything which may be a nuisance or prejudice insurance;');
        pdfDoc.text('  2.5.6. To ensure Room cleaned weekly and rubbish disposed of daily.');
        pdfDoc.text('2.6. Other Obligations - Comply with Right to Rent checks. Assist with Council Tax discounts/exemptions.');
        pdfDoc.text('2.7. At the end of the Agreement - Vacate and leave in clean condition (fair wear and tear excepted). Return all keys. Provide forwarding address. Remove all personal items.');
        pdfDoc.moveDown();

        // Section 3
        pdfDoc.fontSize(10).text('3. Householder Obligations', { underline: true });
        pdfDoc.fontSize(9).text('The Householder agrees with the Lodger:');
        pdfDoc.fontSize(8);
        pdfDoc.text('3.1. To keep in good repair the structure and exterior of the Property and the Room (including drains gutters and external pipes) and to keep in repair and proper working order the installations (if any) in the Property for the supply of water gas and electricity and for sanitation (including basins sinks and sanitary conveniences but not the fixtures, fittings, and appliances for making use of water gas or electricity) and for space heating and heating water');
        pdfDoc.text('  provided that the Householder is not required:');
        pdfDoc.text('    3.1.1. to carry out any works or repairs for which the Lodger is liable, or');
        pdfDoc.text('    3.1.2. to rebuild or reinstate the Property in the case of destruction or damage by fire by tempest flood or other inevitable accident, or');
        pdfDoc.text('    3.1.3. to keep in repair or maintain anything which the Lodger is entitled to remove from the Property.');
        pdfDoc.text('3.2. To keep in good repair and working order such fixtures and fittings as are provided by the Householder for use by the Lodger');
        pdfDoc.text('3.3. To comply with the Gas Safety (Installation and Use) Regulations 1998 (as amended) by ensuring that all gas appliances in the Property are checked by a Gas Safe-registered installer on an annual basis');
        pdfDoc.text('3.4. To ensure that all furniture and furnishings provided for use by the Lodger complies with the Furniture and Furnishings (Fire)(Safety) Regulations, 1988 (as amended).');
        pdfDoc.text('3.5. To ensure that all electrical equipment supplied to the Lodger is kept in good repair and is not damaged or defective.');
        pdfDoc.text('3.6. To install and keep in good working order smoke detectors in the Property, and, if there is a fixed combustion appliance in any part of the Property, to install and keep in good working order a carbon monoxide detector.');
        pdfDoc.text('3.7. To ensure that all times the Room and the Shared Areas are fit for human habitation.');
        pdfDoc.text('3.8. To pay the Council Tax for the Property during the Term.');
        pdfDoc.text('3.9. To warrant that they have permission to take in lodgers in the Property.');
        pdfDoc.moveDown();

        // Sections 4-8
        pdfDoc.fontSize(10).text('4. Amicable Sharing', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('4.1. The Lodger shall use his or her best efforts to share the use of the Room and Property amicably and peaceably with the Householder (and the Property with such other Lodgers as the Householder shall from time to time permit to use the Property). The Lodger shall not interfere with or otherwise obstruct such shared occupation in any way.');
        pdfDoc.text('4.2. The Householder and the Lodger will respect each other\'s reasonable needs for privacy and decency. Neither party will exercise their rights of access to any room in a way that is likely to violate such reasonable needs. Nothing in this clause is intended to grant the Lodger exclusive possession of the Room or any other part of the Property.');
        pdfDoc.moveDown(0.5);

        pdfDoc.fontSize(10).text('5. Keys', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('5.1. The Householder shall give the Lodger one set of keys to the Room (if applicable) and to the Property.');
        pdfDoc.text('5.2. The Lodger will keep safe any keys or other security devices giving access to the Property or to the Room, and will pay the Householder\'s reasonable costs incurred in consequence of the loss of any such key, or other such device.');
        pdfDoc.text('5.3. The Householder shall retain his or her own set of keys and the Householder and any persons authorised by him or her may exercise their right to use these and obtain free entry to the Room at any reasonable time.');
        pdfDoc.moveDown(0.5);

        pdfDoc.fontSize(10).text('6. Deposit if applicable', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('6.1. The Deposit will be held by the Householder during the Term. No interest will be payable by the Householder to the Lodger in respect of the deposit money.');
        pdfDoc.text('6.2. The Householder is not required to protect the Deposit with a Government approved protection scheme.');
        pdfDoc.text('6.3. At the end of the Term (however it ends) on giving vacant possession of the Room to the Householder the Deposit shall will be refunded to the Lodger but less any reasonable deductions properly made by the Householder to cover any reasonable costs incurred by or losses caused to him by any breaches of the Lodger\'s obligations under this Agreement.');
        pdfDoc.text('6.4. The Deposit shall be repaid to the Lodger, at the forwarding address provided to the Householder, as soon as reasonably practicable. The Householder shall not except where they can demonstrate exceptional circumstances retain the Deposit for more than one month.');
        pdfDoc.moveDown(0.5);

        pdfDoc.fontSize(10).text('7. Uninhabitability', { underline: true });
        pdfDoc.fontSize(8).text('7.1. In the event of destruction to the Property or of damage to it which shall make the same or a substantial portion of the same uninhabitable, the Lodger shall be relieved from making the Payment by an amount proportionate to the extent to which the Lodger\'s ability to live in the Property is thereby prevented, save where the destruction or damage has been caused by any act or default by the Lodger or where the Householder\'s insurance cover has been adversely affected by any act or omission on the part of the Lodger.');
        pdfDoc.moveDown(0.5);

        pdfDoc.fontSize(10).text('8. Moving to another room', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('8.1. The Householder may give reasonable written notice directing the Lodger to use another room of similar size and condition to the Room in the Property. If such notice is given the Lodger must remove his or her personal belongings to the new room and must leave the old room in a clean and tidy condition.');
        pdfDoc.text('8.2. Notice to use another room in the Property must give the Lodger a minimum of 48 hours to move or an amount of time which is reasonable in the circumstances, whichever is longer.');
        pdfDoc.moveDown();

        // Section 9 - Ending Agreement
        pdfDoc.fontSize(10).text('9. Ending this Agreement', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('9.1. Termination for breach of this Agreement: If at any time during the Term the Lodger is in breach of any term of this agreement, or any sums due under this agreement are more than 14 days late, or if the Lodger is declared bankrupt or enters into any form of arrangement with his creditors, the Householder may terminate this agreement by giving 7 days\' notice to the Lodger in writing to remedy the breach. If after 7 days the breach has not been remedied the landlord may terminate this agreement by giving a further 14 days\' notice in writing to the Lodger.');
        pdfDoc.text('9.2. Break Clause: Either party may at any time during the Term terminate this Agreement by giving to the other prior written notice of not less than one calendar month expiring the day before a Payment Day. Upon the expiry of that notice this Agreement shall end with no further liability for either party except for any existing breaches.');
        pdfDoc.text('9.3. Behaviour Clause: If the householder deems that the behaviour of the tenant is unacceptable, the householder will provide in writing a warning notice of this breach, if the tenant fails to correct this behaviour the householder may terminate the contract with a maximum of 14 days notice, depending on the severity of the behaviour, for example aggressive behavior, the contract may be terminated with immediate effect.');
        pdfDoc.text('9.4. At the end of the agreement any items remaining in the Property or Room which are the property of the Lodger must be removed by the Lodger. If any items (apart from perishable food) are left behind by the Lodger the Householder will make reasonable efforts to notify the Lodger and will store them for a period of 14 days, after which time the Householder will be permitted to dispose of the items as they see fit.');
        pdfDoc.moveDown();

        // Section 10
        pdfDoc.fontSize(10).text('10. About the Legal Effect of this agreement', { underline: true });
        pdfDoc.fontSize(8);
        pdfDoc.text('10.1. If any term of this agreement is, in whole or in part, held to be illegal or unenforceable to any extent under any enactment or rule of law, that term or part shall to that extent be deemed not to form part of this agreement and the enforceability of the remainder of this agreement shall not be affected.');
        pdfDoc.text('10.2. The Householder and the Lodger agree that this agreement shall be exclusively governed by and interpreted in accordance with the laws of England and Wales, and agree to submit to the exclusive jurisdiction of the English Courts.');
        pdfDoc.text('10.3. This agreement including the attached Property Rules and Services in Part 3 embody the entire understanding of the parties relating to the Room and the Property and to all matters dealt with by any of the provisions in this agreement.');
        pdfDoc.moveDown();

        // SIGNATURES
        pdfDoc.fontSize(12).text('SIGNATURES', { underline: true });
        pdfDoc.moveDown();
        pdfDoc.fontSize(10);
        pdfDoc.text(`Signed by the Lodger: ${tenancy.lodger_signature}`);
        pdfDoc.text(`Date: ${new Date(tenancy.signature_date).toLocaleString('en-GB')}`);
        pdfDoc.moveDown();
        pdfDoc.text(`Signed by the Householder: ${req.user.full_name}`);
        pdfDoc.text(`Date: ${new Date().toLocaleString('en-GB')}`);

        pdfDoc.end();

        // Wait for PDF to be written
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Update tenancy with landlord signature and PDF path
        const result = await pool.query(
            `UPDATE tenancies
             SET landlord_signature = $1,
                 signed_agreement_path = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [req.user.full_name, pdfPath, id]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Approve tenancy error:', error);
        res.status(500).json({ error: 'Failed to approve tenancy' });
    }
});

// ============================================
// PAYMENT ROUTES
// ============================================

// Helper function to extend payment schedule if needed
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

            console.log(`✓ Extended payment schedule for tenancy ${tenancyId} with 13 more payments`);
        }
    } catch (error) {
        console.error('Error extending payment schedule:', error);
    }
}

// Get payment schedule for tenancy
app.get('/api/tenancies/:id/payments', authenticateToken, async (req, res) => {
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

// Lodger submits payment
app.post('/api/payments/:id/submit', authenticateToken, requireRole('lodger'), async (req, res) => {
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

// Landlord confirms payment
app.post('/api/payments/:id/confirm', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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

// Get payment summary
app.get('/api/tenancies/:id/payment-summary', authenticateToken, async (req, res) => {
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

// Get all payments for landlord
app.get('/api/payments', authenticateToken, async (req, res) => {
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

// ============================================
// NOTIFICATION ROUTES
// ============================================

// Get notifications for user
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(
            `SELECT n.*,
                    CONCAT_WS(', ', t.property_house_number, t.property_street_name, t.property_city, t.property_county, t.property_postcode) as property_address,
                    u.full_name as from_user_name
             FROM notifications n
             LEFT JOIN tenancies t ON n.tenancy_id = t.id
             LEFT JOIN users u ON t.landlord_id = u.id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT 50`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = true, read_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Send payment reminder
app.post('/api/payments/:id/remind', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
                `Payment #${payment.payment_number} of £${parseFloat(payment.rent_due).toFixed(2)} is due on ${dueDate}. Please submit your payment at your earliest convenience.`
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

// ============================================
// DASHBOARD ROUTES
// ============================================

// Get landlord dashboard stats
app.get('/api/dashboard/landlord', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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

// Get lodger dashboard stats
app.get('/api/dashboard/lodger', authenticateToken, requireRole('lodger'), async (req, res) => {
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

// ============================================
// FILE UPLOAD ROUTES
// ============================================

// Upload file
app.post('/api/upload/:type', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        res.json({
            filename: req.file.filename,
            path: `/uploads/${req.params.type}/${req.file.filename}`,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// ============================================
// NOTICES
// ============================================

// Give notice to terminate tenancy
app.post('/api/tenancies/:id/notice', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: tenancyId } = req.params;
        const { reason, sub_reason, notice_period_days, additional_notes } = req.body;

        await client.query('BEGIN');

        // Get tenancy details
        const tenancyResult = await client.query(
            'SELECT * FROM tenancies WHERE id = $1',
            [tenancyId]
        );

        if (tenancyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancy = tenancyResult.rows[0];

        // Calculate notice and effective dates
        const noticeDate = new Date();
        const effectiveDate = new Date();
        effectiveDate.setDate(effectiveDate.getDate() + parseInt(notice_period_days));

        // Determine notice type based on reason
        const noticeType = reason === 'breach' ? 'breach' : 'termination';

        // Map reason categories to labels
        const reasonLabels = {
            'breach': 'Breach of Agreement',
            'end_term': 'End of Agreed Term',
            'landlord_needs': 'Landlord Needs',
            'other': 'Other'
        };

        // Map sub-reasons to labels
        const subReasonLabels = {
            'violence': 'Violence or threats',
            'criminal_activity': 'Criminal activity on premises',
            'non_payment': 'Non-payment of rent',
            'damage_to_property': 'Damage to property',
            'nuisance': 'Causing nuisance to others',
            'unauthorized_occupants': 'Unauthorized occupants',
            'other_breach': 'Other breach of terms',
            'initial_term_ending': 'Initial term ending',
            'no_renewal': 'Not renewing agreement',
            'property_sale': 'Selling the property',
            'personal_use': 'Need property for personal use',
            'renovation': 'Major renovation required',
            'other_reason': 'Other'
        };

        // Build reason text
        let reasonText = `${reasonLabels[reason] || reason}: ${subReasonLabels[sub_reason] || sub_reason}`;
        if (notice_period_days === 0) {
            reasonText += ' (IMMEDIATE TERMINATION)';
        }
        if (additional_notes) {
            reasonText += `\n\nAdditional notes: ${additional_notes}`;
        }

        // Create notice record
        const noticeResult = await client.query(`
            INSERT INTO notices (
                tenancy_id,
                notice_type,
                given_by,
                given_to,
                notice_date,
                effective_date,
                reason,
                breach_clause,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            tenancyId,
            noticeType,
            req.user.userId,
            tenancy.lodger_id,
            noticeDate,
            effectiveDate,
            reasonText,
            sub_reason || null,
            'active'
        ]);

        // Calculate final payment if not immediate termination
        let finalPaymentInfo = null;
        if (notice_period_days > 0) {
            // Get the last payment date from payment_schedule
            const lastPaymentResult = await client.query(
                `SELECT due_date, payment_number FROM payment_schedule
                 WHERE tenancy_id = $1
                 ORDER BY payment_number DESC
                 LIMIT 1`,
                [tenancyId]
            );

            if (lastPaymentResult.rows.length > 0) {
                const lastPayment = lastPaymentResult.rows[0];
                const lastPaymentDate = new Date(lastPayment.due_date);

                // Calculate the last covered date (cycle days from last payment)
                const cycleDays = mapPaymentFrequencyToDays(tenancy.payment_frequency || '4-weekly');
                const lastCoveredDate = new Date(lastPaymentDate);
                lastCoveredDate.setDate(lastCoveredDate.getDate() + cycleDays);

                // If termination date is after last covered date, calculate pro-rata
                if (effectiveDate > lastCoveredDate) {
                    const daysToCharge = Math.ceil((effectiveDate - lastCoveredDate) / (1000 * 60 * 60 * 24));
                    const dailyRate = parseFloat(tenancy.monthly_rent) / cycleDays;
                    const proRataAmount = dailyRate * daysToCharge;

                    // First payment included 1 month advance, so tenant has credit
                    const advanceCredit = parseFloat(tenancy.monthly_rent);
                    const finalAmount = proRataAmount - advanceCredit;

                    finalPaymentInfo = {
                        lastCoveredDate: lastCoveredDate,
                        terminationDate: effectiveDate,
                        daysToCharge: daysToCharge,
                        proRataAmount: parseFloat(proRataAmount.toFixed(2)),
                        advanceCredit: advanceCredit,
                        finalAmount: parseFloat(finalAmount.toFixed(2)),
                        type: finalAmount > 0 ? 'payment_due' : 'refund_due'
                    };

                    // Add final payment to schedule
                    await client.query(
                        `INSERT INTO payment_schedule (
                            tenancy_id, payment_number, due_date, rent_due,
                            payment_status, notes
                        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            tenancyId,
                            lastPayment.payment_number + 1,
                            effectiveDate,
                            Math.abs(finalAmount), // Store as positive, note indicates direction
                            'pending',
                            finalAmount < 0
                                ? `Final settlement: £${advanceCredit} advance credit minus £${proRataAmount.toFixed(2)} for ${daysToCharge} days. REFUND DUE TO TENANT.`
                                : `Final pro-rata payment for ${daysToCharge} days after advance credit applied.`
                        ]
                    );
                } else {
                    // Termination is before last covered date - full refund scenario
                    const daysCovered = Math.ceil((lastCoveredDate - effectiveDate) / (1000 * 60 * 60 * 24));
                    const dailyRate = parseFloat(tenancy.monthly_rent) / cycleDays;
                    const refundAmount = (dailyRate * daysCovered) + parseFloat(tenancy.monthly_rent); // Days + advance

                    finalPaymentInfo = {
                        lastCoveredDate: lastCoveredDate,
                        terminationDate: effectiveDate,
                        daysCovered: daysCovered,
                        refundAmount: parseFloat(refundAmount.toFixed(2)),
                        advanceCredit: parseFloat(tenancy.monthly_rent),
                        type: 'refund_due'
                    };

                    // Add refund entry to schedule
                    await client.query(
                        `INSERT INTO payment_schedule (
                            tenancy_id, payment_number, due_date, rent_due,
                            payment_status, notes
                        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            tenancyId,
                            lastPayment.payment_number + 1,
                            effectiveDate,
                            refundAmount,
                            'pending',
                            `Final settlement: Refund of £${refundAmount.toFixed(2)} (${daysCovered} days overpaid + £${tenancy.monthly_rent} advance credit). REFUND DUE TO TENANT.`
                        ]
                    );
                }
            }
        }

        // If immediate termination, update tenancy status
        if (notice_period_days === 0) {
            await client.query(
                'UPDATE tenancies SET status = $1, termination_date = $2 WHERE id = $3',
                ['terminated', noticeDate, tenancyId]
            );
        } else {
            // Set status to notice_given
            await client.query(
                'UPDATE tenancies SET status = $1 WHERE id = $2',
                ['notice_given', tenancyId]
            );
        }

        await client.query('COMMIT');

        res.json({
            message: 'Notice given successfully',
            notice: noticeResult.rows[0],
            immediate_termination: notice_period_days === 0,
            final_payment: finalPaymentInfo
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Give notice error:', error);
        res.status(500).json({ error: 'Failed to give notice' });
    } finally {
        client.release();
    }
});

// Get notices for a tenancy
app.get('/api/tenancies/:id/notices', authenticateToken, async (req, res) => {
    try {
        const { id: tenancyId } = req.params;

        const result = await pool.query(`
            SELECT n.*,
                   u1.full_name as given_by_name,
                   u2.full_name as given_to_name
            FROM notices n
            LEFT JOIN users u1 ON n.given_by = u1.id
            LEFT JOIN users u2 ON n.given_to = u2.id
            WHERE n.tenancy_id = $1
            ORDER BY n.notice_date DESC
        `, [tenancyId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get notices error:', error);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

// ============================================
// BREACH NOTICE WORKFLOW
// ============================================

// Helper function to generate breach notice letter PDF
async function generateBreachNoticeLetter(landlord, lodger, tenancy, breach, remedyDeadline) {
    return new Promise(async (resolve, reject) => {
        try {
            const fileName = `breach-notice-${Date.now()}.pdf`;
            const filePath = path.join(__dirname, 'uploads', fileName);

            const doc = new PDFDocument({ margin: 50 });
            const writeStream = require('fs').createWriteStream(filePath);

            doc.pipe(writeStream);

            // Header
            doc.fontSize(20).text('BREACH OF AGREEMENT NOTICE', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text('FORMAL NOTICE UNDER LODGER AGREEMENT', { align: 'center' });
            doc.moveDown(2);

            // Date and Reference
            doc.fontSize(10);
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
            doc.text(`Reference: ${breach.id}`, { align: 'right' });
            doc.moveDown(2);

            // Addresses
            doc.fontSize(11);
            doc.text('FROM:', { underline: true });
            doc.text(landlord.full_name);
            const landlordAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
                .filter(part => part)
                .join(', ');
            doc.text(landlordAddress);
            doc.moveDown();

            doc.text('TO:', { underline: true });
            doc.text(lodger.full_name);
            doc.text(lodger.email);
            doc.moveDown(2);

            // Property Details
            doc.fontSize(12).text('RE: LODGER AGREEMENT', { underline: true, bold: true });
            doc.fontSize(10);
            const propertyAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
                .filter(part => part)
                .join(', ');
            doc.text(`Property Address: ${propertyAddress}`);
            doc.text(`Agreement Start Date: ${new Date(tenancy.start_date).toLocaleDateString('en-GB')}`);
            doc.moveDown(2);

            // Notice Body
            doc.fontSize(11).text('NOTICE OF BREACH', { underline: true, bold: true });
            doc.moveDown();

            doc.fontSize(10);
            doc.text('Dear ' + lodger.full_name + ',', { paragraphGap: 10 });

            doc.text(
                'I am writing to formally notify you that you are in breach of the Lodger Agreement dated ' +
                new Date(tenancy.start_date).toLocaleDateString('en-GB') + ' for the above property.',
                { paragraphGap: 10, align: 'justify' }
            );

            // Breach Details
            doc.moveDown();
            doc.fontSize(11).text('DETAILS OF BREACH:', { underline: true });
            doc.fontSize(10).moveDown(0.5);

            const breachTypeLabels = {
                'non_payment': 'Non-payment of rent',
                'damage_to_property': 'Damage to property',
                'nuisance': 'Causing nuisance to others',
                'unauthorized_occupants': 'Unauthorized occupants',
                'smoking': 'Smoking in the property',
                'pets': 'Unauthorized pets',
                'other': 'Other breach of terms'
            };

            doc.text('Type of Breach: ' + (breachTypeLabels[breach.type] || breach.type));
            doc.moveDown(0.5);
            doc.text('Description:', { continued: false });
            doc.text(breach.description, { indent: 20, align: 'justify' });

            if (breach.notes) {
                doc.moveDown(0.5);
                doc.text('Additional Notes:', { continued: false });
                doc.text(breach.notes, { indent: 20, align: 'justify' });
            }

            // Remedy Period
            doc.moveDown(2);
            doc.fontSize(11).text('REMEDY PERIOD - SECTION 9.1 OF AGREEMENT', { underline: true });
            doc.fontSize(10).moveDown(0.5);

            doc.text(
                'In accordance with Section 9.1 of the Lodger Agreement, you are hereby given SEVEN (7) DAYS ' +
                'from the date of this notice to remedy the breach described above.',
                { paragraphGap: 10, align: 'justify' }
            );

            doc.fillColor('red').fontSize(11).text(
                'REMEDY DEADLINE: ' + remedyDeadline.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                }),
                { paragraphGap: 10 }
            );
            doc.fillColor('black').fontSize(10);

            // Consequences
            doc.moveDown();
            doc.text(
                'If the breach is not remedied within the 7-day period, I will issue a further SEVEN (7) DAY ' +
                'TERMINATION NOTICE under Section 9.1 of the Agreement, requiring you to vacate the property.',
                { paragraphGap: 10, align: 'justify' }
            );

            // What to do
            doc.moveDown();
            doc.fontSize(11).text('WHAT YOU MUST DO:', { underline: true });
            doc.fontSize(10).moveDown(0.5);
            doc.list([
                'Immediately take action to remedy the breach described above',
                'Provide evidence of remediation if requested',
                'Contact me to confirm when the breach has been remedied',
                'Ensure the breach does not occur again'
            ], { bulletRadius: 2, textIndent: 20, paragraphGap: 5 });

            // Legal Notice
            doc.moveDown(2);
            doc.fontSize(9).fillColor('gray');
            doc.text(
                'This notice is issued in accordance with the terms of the Lodger Agreement and applicable law. ' +
                'Failure to remedy this breach may result in termination of your agreement and legal action to ' +
                'recover possession of the property.',
                { align: 'justify', paragraphGap: 10 }
            );

            // Signature
            doc.moveDown(2);
            doc.fillColor('black').fontSize(10);
            doc.text('Yours sincerely,');
            doc.moveDown(2);
            doc.text(landlord.full_name);
            doc.text('Landlord/Householder');

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).fillColor('gray');
            doc.text('_'.repeat(100), { align: 'center' });
            doc.text(
                'This is a formal legal notice. Please keep this document for your records. ' +
                'If you have any questions, please contact the landlord immediately.',
                { align: 'center', paragraphGap: 5 }
            );
            doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'center' });

            doc.end();

            writeStream.on('finish', () => {
                resolve(`/uploads/${fileName}`);
            });

            writeStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

// Issue breach notice (7 days to remedy)
app.post('/api/tenancies/:id/breach-notice', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: tenancyId } = req.params;
        const { breach_type, breach_description, additional_notes } = req.body;

        await client.query('BEGIN');

        // Get tenancy details
        const tenancyResult = await client.query(
            'SELECT * FROM tenancies WHERE id = $1',
            [tenancyId]
        );

        if (tenancyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancy = tenancyResult.rows[0];

        // Get landlord and lodger details
        const landlordResult = await client.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
        const lodgerResult = await client.query('SELECT * FROM users WHERE id = $1', [tenancy.lodger_id]);
        const landlord = landlordResult.rows[0];
        const lodger = lodgerResult.rows[0];

        // Calculate dates
        const noticeDate = new Date();
        const remedyDeadline = new Date();
        remedyDeadline.setDate(remedyDeadline.getDate() + 7); // 7 days to remedy

        // Generate formal breach notice letter
        const letterPath = await generateBreachNoticeLetter(
            landlord,
            lodger,
            tenancy,
            {
                id: 'TBD', // Will be updated after notice is created
                type: breach_type,
                description: breach_description,
                notes: additional_notes
            },
            remedyDeadline
        );

        // Build reason text
        const breachTypeLabels = {
            'non_payment': 'Non-payment of rent',
            'damage_to_property': 'Damage to property',
            'nuisance': 'Causing nuisance to others',
            'unauthorized_occupants': 'Unauthorized occupants',
            'smoking': 'Smoking in the property',
            'pets': 'Unauthorized pets',
            'other': 'Other breach of terms'
        };

        let reasonText = `Breach of Agreement: ${breachTypeLabels[breach_type] || breach_type}`;
        if (breach_description) {
            reasonText += `\n\nDetails: ${breach_description}`;
        }
        if (additional_notes) {
            reasonText += `\n\nAdditional notes: ${additional_notes}`;
        }
        reasonText += `\n\nYou have 7 days from ${noticeDate.toLocaleDateString('en-GB')} to remedy this breach. If not remedied, a further 7-day termination notice will be issued.`;

        // Create breach notice record
        const noticeResult = await client.query(`
            INSERT INTO notices (
                tenancy_id,
                notice_type,
                given_by,
                given_to,
                notice_date,
                effective_date,
                reason,
                breach_clause,
                breach_stage,
                remedy_deadline,
                notice_letter_path,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            tenancyId,
            'breach',
            req.user.userId,
            tenancy.lodger_id,
            noticeDate,
            remedyDeadline, // effective_date is remedy deadline for stage 1
            reasonText,
            breach_type,
            'remedy_period',
            remedyDeadline,
            letterPath,
            'active'
        ]);

        // Create notification for lodger
        await client.query(
            `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                tenancy.lodger_id,
                tenancyId,
                'breach_notice',
                'Breach Notice Issued',
                `A breach notice has been issued for: ${breachTypeLabels[breach_type] || breach_type}. You have 7 days to remedy this breach.`
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Breach notice issued successfully',
            notice: noticeResult.rows[0],
            remedy_deadline: remedyDeadline,
            notice_letter_path: letterPath
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Issue breach notice error:', error);
        res.status(500).json({ error: 'Failed to issue breach notice' });
    } finally {
        client.release();
    }
});

// Mark breach as remedied
app.put('/api/notices/:id/remedy', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: noticeId } = req.params;
        const { remedy_notes } = req.body;

        await client.query('BEGIN');

        // Get notice details
        const noticeResult = await client.query(
            'SELECT * FROM notices WHERE id = $1',
            [noticeId]
        );

        if (noticeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Notice not found' });
        }

        const notice = noticeResult.rows[0];

        if (notice.notice_type !== 'breach' || notice.breach_stage !== 'remedy_period') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Can only mark remedy period notices as remedied' });
        }

        // Update notice
        let updatedReason = notice.reason;
        if (remedy_notes) {
            updatedReason += `\n\n[REMEDIED on ${new Date().toLocaleDateString('en-GB')}]\nLandlord notes: ${remedy_notes}`;
        }

        await client.query(
            `UPDATE notices
             SET breach_stage = $1, status = $2, reason = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            ['remedied', 'completed', updatedReason, noticeId]
        );

        // Create notification for lodger
        await client.query(
            `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                notice.given_to,
                notice.tenancy_id,
                'breach_remedied',
                'Breach Marked as Remedied',
                'Your landlord has confirmed that the breach has been remedied. No further action is required.'
            ]
        );

        await client.query('COMMIT');

        res.json({ message: 'Breach marked as remedied successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Mark breach remedied error:', error);
        res.status(500).json({ error: 'Failed to mark breach as remedied' });
    } finally {
        client.release();
    }
});

// Escalate breach to termination (7 days termination notice)
app.post('/api/notices/:id/escalate', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: noticeId } = req.params;
        const { escalation_notes } = req.body;

        await client.query('BEGIN');

        // Get notice details
        const noticeResult = await client.query(
            'SELECT * FROM notices WHERE id = $1',
            [noticeId]
        );

        if (noticeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Notice not found' });
        }

        const notice = noticeResult.rows[0];

        if (notice.notice_type !== 'breach' || notice.breach_stage !== 'remedy_period') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Can only escalate remedy period notices' });
        }

        // Check if remedy period has passed
        const now = new Date();
        const remedyDeadline = new Date(notice.remedy_deadline);
        if (now < remedyDeadline) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot escalate before remedy deadline' });
        }

        // Get tenancy details
        const tenancyResult = await client.query(
            'SELECT * FROM tenancies WHERE id = $1',
            [notice.tenancy_id]
        );
        const tenancy = tenancyResult.rows[0];

        // Calculate termination date (7 days from now)
        const terminationDeadline = new Date();
        terminationDeadline.setDate(terminationDeadline.getDate() + 7);

        // Update notice
        let updatedReason = notice.reason;
        updatedReason += `\n\n[ESCALATED on ${now.toLocaleDateString('en-GB')}]`;
        updatedReason += `\nBreach was not remedied within 7 days. Termination notice issued.`;
        if (escalation_notes) {
            updatedReason += `\nLandlord notes: ${escalation_notes}`;
        }
        updatedReason += `\n\nYou must vacate the property by ${terminationDeadline.toLocaleDateString('en-GB')}.`;

        await client.query(
            `UPDATE notices
             SET breach_stage = $1, termination_deadline = $2, effective_date = $3, reason = $4, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            ['termination_period', terminationDeadline, terminationDeadline, updatedReason, noticeId]
        );

        // Update tenancy status
        await client.query(
            'UPDATE tenancies SET status = $1, termination_date = $2 WHERE id = $3',
            ['notice_given', terminationDeadline, notice.tenancy_id]
        );

        // Calculate final payment
        const lastPaymentResult = await client.query(
            `SELECT due_date, payment_number FROM payment_schedule
             WHERE tenancy_id = $1
             ORDER BY payment_number DESC
             LIMIT 1`,
            [notice.tenancy_id]
        );

        let finalPaymentInfo = null;
        if (lastPaymentResult.rows.length > 0) {
            const lastPayment = lastPaymentResult.rows[0];
            const lastPaymentDate = new Date(lastPayment.due_date);
            const cycleDays = mapPaymentFrequencyToDays(tenancy.payment_frequency || '4-weekly');
            const lastCoveredDate = new Date(lastPaymentDate);
            lastCoveredDate.setDate(lastCoveredDate.getDate() + cycleDays);

            if (terminationDeadline > lastCoveredDate) {
                const daysToCharge = Math.ceil((terminationDeadline - lastCoveredDate) / (1000 * 60 * 60 * 24));
                const dailyRate = parseFloat(tenancy.monthly_rent) / cycleDays;
                const proRataAmount = dailyRate * daysToCharge;
                const advanceCredit = parseFloat(tenancy.monthly_rent);
                const finalAmount = proRataAmount - advanceCredit;

                finalPaymentInfo = {
                    daysToCharge,
                    proRataAmount: parseFloat(proRataAmount.toFixed(2)),
                    advanceCredit,
                    finalAmount: parseFloat(finalAmount.toFixed(2)),
                    type: finalAmount > 0 ? 'payment_due' : 'refund_due'
                };

                // Add final payment to schedule
                await client.query(
                    `INSERT INTO payment_schedule (
                        tenancy_id, payment_number, due_date, rent_due,
                        payment_status, notes
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        notice.tenancy_id,
                        lastPayment.payment_number + 1,
                        terminationDeadline,
                        Math.abs(finalAmount),
                        'pending',
                        finalAmount < 0
                            ? `Final settlement: £${advanceCredit} advance credit minus £${proRataAmount.toFixed(2)} for ${daysToCharge} days. REFUND DUE TO TENANT.`
                            : `Final pro-rata payment for ${daysToCharge} days after advance credit applied.`
                    ]
                );
            }
        }

        // Create notification for lodger
        await client.query(
            `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                notice.given_to,
                notice.tenancy_id,
                'termination_notice',
                'Termination Notice - Breach Not Remedied',
                `The breach was not remedied within 7 days. You must vacate the property by ${terminationDeadline.toLocaleDateString('en-GB')}.`
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Breach escalated to termination',
            termination_date: terminationDeadline,
            final_payment: finalPaymentInfo
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Escalate breach error:', error);
        res.status(500).json({ error: 'Failed to escalate breach notice' });
    } finally {
        client.release();
    }
});

// ============================================
// TENANCY EXTENSION WORKFLOW
// ============================================

// Helper function to generate extension offer letter PDF
async function generateExtensionOfferLetter(landlord, lodger, tenancy, extension) {
    return new Promise(async (resolve, reject) => {
        try {
            const fileName = `extension-offer-${Date.now()}.pdf`;
            const filePath = path.join(__dirname, 'uploads', fileName);

            const doc = new PDFDocument({ margin: 50 });
            const writeStream = require('fs').createWriteStream(filePath);

            doc.pipe(writeStream);

            // Header
            doc.fontSize(20).text('TENANCY EXTENSION OFFER', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text('FORMAL OFFER UNDER LODGER AGREEMENT', { align: 'center' });
            doc.moveDown(2);

            // Date and Reference
            doc.fontSize(10);
            doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
            doc.text(`Reference: EXT-${extension.id}`, { align: 'right' });
            doc.moveDown(2);

            // Addresses
            doc.fontSize(11);
            doc.text('FROM:', { underline: true });
            doc.text(landlord.full_name);
            const landlordAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
                .filter(part => part)
                .join(', ');
            doc.text(landlordAddress);
            doc.moveDown();

            doc.text('TO:', { underline: true });
            doc.text(lodger.full_name);
            doc.text(lodger.email);
            doc.moveDown(2);

            // Property Details
            doc.fontSize(12).text('RE: LODGER AGREEMENT EXTENSION', { underline: true, bold: true });
            doc.fontSize(10);
            const propertyAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
                .filter(part => part)
                .join(', ');
            doc.text(`Property Address: ${propertyAddress}`);
            doc.text(`Current Agreement Start Date: ${new Date(tenancy.start_date).toLocaleDateString('en-GB')}`);
            doc.text(`Current Agreement End Date: ${new Date(extension.currentEndDate).toLocaleDateString('en-GB')}`);
            doc.moveDown(2);

            // Offer Body
            doc.fontSize(11).text('EXTENSION OFFER', { underline: true, bold: true });
            doc.moveDown();

            doc.fontSize(10);
            doc.text('Dear ' + lodger.full_name + ',', { paragraphGap: 10 });

            doc.text(
                'I am pleased to offer you an extension to your current Lodger Agreement for the above property.',
                { paragraphGap: 10, align: 'justify' }
            );

            // Extension Terms
            doc.moveDown();
            doc.fontSize(11).text('EXTENSION TERMS:', { underline: true });
            doc.fontSize(10).moveDown(0.5);

            doc.text(`Extension Period: ${extension.months} months`);
            doc.moveDown(0.5);

            doc.fillColor('green').fontSize(11).text(
                `New End Date: ${new Date(extension.newEndDate).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                })}`,
                { paragraphGap: 10 }
            );
            doc.fillColor('black').fontSize(10);

            // Financial Terms
            doc.moveDown();
            doc.fontSize(11).text('FINANCIAL TERMS:', { underline: true });
            doc.fontSize(10).moveDown(0.5);

            doc.text(`Current Monthly Rent: £${parseFloat(tenancy.monthly_rent).toFixed(2)}`);

            const rentChanged = parseFloat(extension.newRent) !== parseFloat(tenancy.monthly_rent);
            if (rentChanged) {
                const change = parseFloat(extension.newRent) - parseFloat(tenancy.monthly_rent);
                const changeType = change > 0 ? 'Increase' : 'Decrease';
                doc.fillColor(change > 0 ? 'red' : 'green');
                doc.text(`New Monthly Rent: £${parseFloat(extension.newRent).toFixed(2)} (${changeType} of £${Math.abs(change).toFixed(2)})`);
                doc.fillColor('black');
            } else {
                doc.text(`New Monthly Rent: £${parseFloat(extension.newRent).toFixed(2)} (No change)`);
            }

            doc.moveDown(0.5);
            doc.text('Payment Terms: Monthly in advance, 28-day cycles as per current agreement');

            // Additional Notes
            if (extension.notes) {
                doc.moveDown();
                doc.fontSize(11).text('ADDITIONAL TERMS:', { underline: true });
                doc.fontSize(10).moveDown(0.5);
                doc.text(extension.notes, { align: 'justify' });
            }

            // Response Required
            doc.moveDown(2);
            doc.fontSize(11).text('YOUR RESPONSE REQUIRED', { underline: true });
            doc.fontSize(10).moveDown(0.5);

            doc.text(
                'Please review this extension offer carefully. You may accept or reject this offer through your ' +
                'lodger dashboard. If you have any questions, please contact me before responding.',
                { paragraphGap: 10, align: 'justify' }
            );

            doc.moveDown();
            doc.list([
                'Log in to your lodger dashboard',
                'Review the extension offer details',
                'Click "Accept" or "Reject"',
                'Add any notes or questions you may have'
            ], { bulletRadius: 2, textIndent: 20, paragraphGap: 5 });

            // What Happens Next
            doc.moveDown(2);
            doc.fontSize(11).text('WHAT HAPPENS NEXT:', { underline: true });
            doc.fontSize(10).moveDown(0.5);

            doc.text(
                'If you accept: Your tenancy will automatically be extended to the new end date with the terms outlined above. ' +
                'You will continue to reside at the property under the same conditions as your current agreement.',
                { paragraphGap: 10, align: 'justify' }
            );

            doc.text(
                'If you reject: Your current tenancy will end on ' + new Date(extension.currentEndDate).toLocaleDateString('en-GB') + ' ' +
                'and you will be required to vacate the property by that date.',
                { paragraphGap: 10, align: 'justify' }
            );

            // Legal Notice
            doc.moveDown(2);
            doc.fontSize(9).fillColor('gray');
            doc.text(
                'This offer is made in good faith and is subject to your acceptance. All other terms and conditions ' +
                'of the original Lodger Agreement remain in full force and effect unless specifically modified herein.',
                { align: 'justify', paragraphGap: 10 }
            );

            // Signature
            doc.moveDown(2);
            doc.fillColor('black').fontSize(10);
            doc.text('Yours sincerely,');
            doc.moveDown(2);
            doc.text(landlord.full_name);
            doc.text('Landlord/Householder');

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).fillColor('gray');
            doc.text('_'.repeat(100), { align: 'center' });
            doc.text(
                'This is a formal extension offer. Please respond through your lodger dashboard. ' +
                'Keep this document for your records.',
                { align: 'center', paragraphGap: 5 }
            );
            doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, { align: 'center' });

            doc.end();

            writeStream.on('finish', () => {
                resolve(`/uploads/${fileName}`);
            });

            writeStream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
}

// Offer tenancy extension (landlord)
app.post('/api/tenancies/:id/offer-extension', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: tenancyId } = req.params;
        const { extension_months, new_monthly_rent, notes } = req.body;

        await client.query('BEGIN');

        // Get tenancy details
        const tenancyResult = await client.query(
            'SELECT * FROM tenancies WHERE id = $1',
            [tenancyId]
        );

        if (tenancyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancy = tenancyResult.rows[0];

        // Get landlord and lodger details
        const landlordResult = await client.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
        const lodgerResult = await client.query('SELECT * FROM users WHERE id = $1', [tenancy.lodger_id]);
        const landlord = landlordResult.rows[0];
        const lodger = lodgerResult.rows[0];

        // Check if there's already a pending extension offer
        const existingOffer = await client.query(
            `SELECT * FROM notices
             WHERE tenancy_id = $1
             AND notice_type = 'extension_offer'
             AND extension_status = 'pending'`,
            [tenancyId]
        );

        if (existingOffer.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'There is already a pending extension offer for this tenancy' });
        }

        // Calculate new end date
        const currentEndDate = tenancy.end_date ? new Date(tenancy.end_date) : new Date(tenancy.start_date);
        if (!tenancy.end_date) {
            currentEndDate.setMonth(currentEndDate.getMonth() + tenancy.initial_term_months);
        }
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + parseInt(extension_months));

        const noticeDate = new Date();

        // Validate rent increase according to clause 9.3
        const currentRent = parseFloat(tenancy.monthly_rent);
        const proposedRent = parseFloat(new_monthly_rent || tenancy.monthly_rent);

        if (proposedRent > currentRent) {
            const increasePercent = ((proposedRent - currentRent) / currentRent) * 100;
            const maxIncrease = 5; // 5% per annum cap as per agreement clause 9.3

            // Note: In production, you would fetch current CPI and compare
            // For now, we'll use the 5% cap as the limit
            if (increasePercent > maxIncrease) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Rent increase of ${increasePercent.toFixed(2)}% exceeds the maximum allowed increase of ${maxIncrease}% per annum as per clause 9.3 of the Lodger Agreement. Maximum new rent: £${(currentRent * 1.05).toFixed(2)}`,
                    currentRent: currentRent,
                    proposedRent: proposedRent,
                    maxAllowedRent: parseFloat((currentRent * 1.05).toFixed(2)),
                    increasePercent: parseFloat(increasePercent.toFixed(2)),
                    maxIncreasePercent: maxIncrease
                });
            }
        }

        // Generate extension offer letter
        const letterPath = await generateExtensionOfferLetter(
            landlord,
            lodger,
            tenancy,
            {
                id: 'TBD',
                months: extension_months,
                currentEndDate: currentEndDate,
                newEndDate: newEndDate,
                newRent: new_monthly_rent || tenancy.monthly_rent,
                notes: notes
            }
        );

        // Build offer text
        let offerText = `Extension Offer: ${extension_months} months\n`;
        offerText += `Current end date: ${currentEndDate.toLocaleDateString('en-GB')}\n`;
        offerText += `Proposed new end date: ${newEndDate.toLocaleDateString('en-GB')}\n`;
        offerText += `Current rent: £${parseFloat(tenancy.monthly_rent).toFixed(2)}\n`;
        offerText += `New rent: £${parseFloat(new_monthly_rent || tenancy.monthly_rent).toFixed(2)}\n`;
        if (notes) {
            offerText += `\nNotes: ${notes}`;
        }

        // Create extension offer notice
        const noticeResult = await client.query(`
            INSERT INTO notices (
                tenancy_id,
                notice_type,
                given_by,
                given_to,
                notice_date,
                effective_date,
                reason,
                extension_months,
                extension_status,
                notice_letter_path,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            tenancyId,
            'extension_offer',
            req.user.userId,
            tenancy.lodger_id,
            noticeDate,
            newEndDate,
            offerText,
            extension_months,
            'pending',
            letterPath,
            'active'
        ]);

        // Create notification for lodger
        await client.query(
            `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                tenancy.lodger_id,
                tenancyId,
                'extension_offer',
                'Tenancy Extension Offer',
                `Your landlord has offered to extend your tenancy by ${extension_months} months. Please review and respond.`
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Extension offer sent successfully',
            notice: noticeResult.rows[0],
            new_end_date: newEndDate
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Offer extension error:', error);
        res.status(500).json({ error: 'Failed to offer extension' });
    } finally {
        client.release();
    }
});

// Respond to extension offer (lodger)
app.put('/api/notices/:id/extension-response', authenticateToken, requireRole('lodger'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: noticeId } = req.params;
        const { response, notes } = req.body; // response: 'accepted' or 'rejected'

        await client.query('BEGIN');

        // Get notice details
        const noticeResult = await client.query(
            'SELECT * FROM notices WHERE id = $1',
            [noticeId]
        );

        if (noticeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Extension offer not found' });
        }

        const notice = noticeResult.rows[0];

        if (notice.notice_type !== 'extension_offer' || notice.extension_status !== 'pending') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Can only respond to pending extension offers' });
        }

        // Verify user is the intended recipient
        if (notice.given_to !== req.user.userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not authorized to respond to this offer' });
        }

        // Update notice with response
        let updatedReason = notice.reason;
        updatedReason += `\n\n[${response.toUpperCase()} on ${new Date().toLocaleDateString('en-GB')}]`;
        if (notes) {
            updatedReason += `\nLodger notes: ${notes}`;
        }

        await client.query(
            `UPDATE notices
             SET extension_status = $1, reason = $2, status = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [response, updatedReason, 'completed', noticeId]
        );

        // If accepted, update tenancy end date
        if (response === 'accepted') {
            await client.query(
                `UPDATE tenancies
                 SET end_date = $1, status = 'extended', updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [notice.effective_date, notice.tenancy_id]
            );
        }

        // Create notification for landlord
        await client.query(
            `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                notice.given_by,
                notice.tenancy_id,
                response === 'accepted' ? 'extension_accepted' : 'extension_rejected',
                `Extension ${response === 'accepted' ? 'Accepted' : 'Rejected'}`,
                `Your lodger has ${response} the tenancy extension offer.`
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: `Extension offer ${response} successfully`,
            response: response
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Extension response error:', error);
        res.status(500).json({ error: 'Failed to respond to extension offer' });
    } finally {
        client.release();
    }
});

// ============================================
// TENANCY EXPIRY REMINDERS
// ============================================

// Check for expiring tenancies and send reminders
app.post('/api/tenancies/check-expiring', authenticateToken, requireRole('admin', 'landlord'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Find tenancies expiring in 30 days that haven't received a reminder
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringTenancies = await client.query(`
            SELECT t.*, l.full_name as lodger_name, l.email as lodger_email,
                   ll.full_name as landlord_name, ll.email as landlord_email
            FROM tenancies t
            JOIN users l ON t.lodger_id = l.id
            JOIN users ll ON t.landlord_id = ll.id
            WHERE t.status = 'active'
            AND t.end_date IS NOT NULL
            AND t.end_date <= $1
            AND t.end_date >= CURRENT_DATE
            AND NOT EXISTS (
                SELECT 1 FROM notifications n
                WHERE n.tenancy_id = t.id
                AND n.type = 'tenancy_expiring'
                AND n.created_at > CURRENT_DATE - INTERVAL '35 days'
            )
        `, [thirtyDaysFromNow]);

        let remindersCreated = 0;

        for (const tenancy of expiringTenancies.rows) {
            const daysUntilExpiry = Math.ceil((new Date(tenancy.end_date) - new Date()) / (1000 * 60 * 60 * 24));

            // Send notification to landlord
            await client.query(
                `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    tenancy.landlord_id,
                    tenancy.id,
                    'tenancy_expiring',
                    'Tenancy Expiring Soon - Action Required',
                    `The tenancy with ${tenancy.lodger_name} expires in ${daysUntilExpiry} days on ${new Date(tenancy.end_date).toLocaleDateString('en-GB')}. Please consider offering an extension if you wish to continue the tenancy.`
                ]
            );

            // Send notification to lodger
            const propertyAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
                .filter(part => part)
                .join(', ');
            await client.query(
                `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    tenancy.lodger_id,
                    tenancy.id,
                    'tenancy_expiring',
                    'Your Tenancy is Expiring Soon',
                    `Your tenancy at ${propertyAddress} expires in ${daysUntilExpiry} days on ${new Date(tenancy.end_date).toLocaleDateString('en-GB')}. Your landlord may offer you an extension, or you may need to make alternative arrangements.`
                ]
            );

            remindersCreated++;
        }

        await client.query('COMMIT');

        res.json({
            message: `Extension reminders sent successfully`,
            tenancies_checked: expiringTenancies.rows.length,
            reminders_created: remindersCreated
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Check expiring tenancies error:', error);
        res.status(500).json({ error: 'Failed to check expiring tenancies' });
    } finally {
        client.release();
    }
});

// ============================================
// DEDUCTIONS ROUTES
// ============================================

// Get available funds (advance rent + deposit) for a tenancy
app.get('/api/tenancies/:tenancyId/available-funds', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const { tenancyId } = req.params;
        const landlordId = req.user.id;

        // Verify landlord owns this tenancy
        const tenancy = await pool.query(
            'SELECT * FROM tenancies WHERE id = $1 AND landlord_id = $2',
            [tenancyId, landlordId]
        );

        if (tenancy.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancyData = tenancy.rows[0];

        // Get total deductions already made
        const deductions = await pool.query(
            'SELECT SUM(amount_from_deposit) as total_from_deposit, SUM(amount_from_advance) as total_from_advance FROM deductions WHERE tenancy_id = $1',
            [tenancyId]
        );

        const totalFromDeposit = parseFloat(deductions.rows[0]?.total_from_deposit || 0);
        const totalFromAdvance = parseFloat(deductions.rows[0]?.total_from_advance || 0);

        const availableDeposit = parseFloat(tenancyData.deposit_amount || 0) - totalFromDeposit;
        const availableAdvance = parseFloat(tenancyData.initial_payment || 0) - totalFromAdvance;

        res.json({
            original_deposit: parseFloat(tenancyData.deposit_amount || 0),
            original_advance: parseFloat(tenancyData.initial_payment || 0),
            deducted_from_deposit: totalFromDeposit,
            deducted_from_advance: totalFromAdvance,
            available_deposit: Math.max(0, availableDeposit),
            available_advance: Math.max(0, availableAdvance),
            total_available: Math.max(0, availableDeposit) + Math.max(0, availableAdvance)
        });
    } catch (error) {
        console.error('Get available funds error:', error);
        res.status(500).json({ error: 'Failed to get available funds' });
    }
});

// Create a deduction
app.post('/api/tenancies/:tenancyId/deductions', authenticateToken, requireRole('landlord', 'admin'), upload.array('evidence', 10), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { tenancyId } = req.params;
        const landlordId = req.user.id;
        const { deduction_type, description, amount, deduct_from_deposit, deduct_from_advance, notes } = req.body;

        // Verify landlord owns this tenancy
        const tenancy = await client.query(
            'SELECT * FROM tenancies WHERE id = $1 AND landlord_id = $2',
            [tenancyId, landlordId]
        );

        if (tenancy.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancyData = tenancy.rows[0];

        // Get current available funds
        const deductions = await client.query(
            'SELECT SUM(amount_from_deposit) as total_from_deposit, SUM(amount_from_advance) as total_from_advance FROM deductions WHERE tenancy_id = $1',
            [tenancyId]
        );

        const totalFromDeposit = parseFloat(deductions.rows[0]?.total_from_deposit || 0);
        const totalFromAdvance = parseFloat(deductions.rows[0]?.total_from_advance || 0);

        const availableDeposit = parseFloat(tenancyData.deposit_amount || 0) - totalFromDeposit;
        const availableAdvance = parseFloat(tenancyData.initial_payment || 0) - totalFromAdvance;

        // Calculate deduction amounts
        const deductionAmount = parseFloat(amount);
        let amountFromDeposit = parseFloat(deduct_from_deposit || 0);
        let amountFromAdvance = parseFloat(deduct_from_advance || 0);

        // Validate amounts
        if (amountFromDeposit > availableDeposit) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Insufficient deposit funds. Available: £${availableDeposit.toFixed(2)}, Requested: £${amountFromDeposit.toFixed(2)}`
            });
        }

        if (amountFromAdvance > availableAdvance) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Insufficient advance rent. Available: £${availableAdvance.toFixed(2)}, Requested: £${amountFromAdvance.toFixed(2)}`
            });
        }

        if ((amountFromDeposit + amountFromAdvance) !== deductionAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Deduction amounts don't match total. Total: £${deductionAmount.toFixed(2)}, Allocated: £${(amountFromDeposit + amountFromAdvance).toFixed(2)}`
            });
        }

        // Determine deducted_from field
        let deductedFrom = 'both';
        if (amountFromDeposit > 0 && amountFromAdvance === 0) deductedFrom = 'deposit';
        if (amountFromAdvance > 0 && amountFromDeposit === 0) deductedFrom = 'advance_rent';

        // Store evidence file paths
        const evidencePaths = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        // Create deduction record
        const deduction = await client.query(
            `INSERT INTO deductions (
                tenancy_id, deduction_type, description, amount,
                deducted_from, amount_from_deposit, amount_from_advance,
                evidence_paths, created_by, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                tenancyId, deduction_type, description, deductionAmount,
                deductedFrom, amountFromDeposit, amountFromAdvance,
                evidencePaths, landlordId, notes
            ]
        );

        // Send notification to lodger
        await client.query(
            `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                tenancyData.lodger_id,
                tenancyId,
                'deduction_made',
                'Deduction from Deposit/Advance Rent',
                `A deduction of £${deductionAmount.toFixed(2)} has been made for: ${description}. A detailed statement will be provided.`
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Deduction created successfully',
            deduction: deduction.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create deduction error:', error);
        res.status(500).json({ error: 'Failed to create deduction' });
    } finally {
        client.release();
    }
});

// Get all deductions for a tenancy
app.get('/api/tenancies/:tenancyId/deductions', authenticateToken, async (req, res) => {
    try {
        const { tenancyId } = req.params;
        const userId = req.user.id;

        // Verify user has access to this tenancy
        const tenancy = await pool.query(
            'SELECT * FROM tenancies WHERE id = $1 AND (landlord_id = $2 OR lodger_id = $2)',
            [tenancyId, userId]
        );

        if (tenancy.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const deductions = await pool.query(
            `SELECT d.*, u.full_name as created_by_name
             FROM deductions d
             JOIN users u ON d.created_by = u.id
             WHERE d.tenancy_id = $1
             ORDER BY d.created_at DESC`,
            [tenancyId]
        );

        res.json({ deductions: deductions.rows });
    } catch (error) {
        console.error('Get deductions error:', error);
        res.status(500).json({ error: 'Failed to get deductions' });
    }
});

// Generate deduction statement PDF
app.post('/api/deductions/:deductionId/generate-statement', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { deductionId } = req.params;
        const landlordId = req.user.id;

        // Get deduction with tenancy and user details
        const result = await client.query(
            `SELECT d.*, t.*,
                    landlord.full_name as landlord_name, landlord.address as landlord_address,
                    lodger.full_name as lodger_name, lodger.email as lodger_email
             FROM deductions d
             JOIN tenancies t ON d.tenancy_id = t.id
             JOIN users landlord ON t.landlord_id = landlord.id
             JOIN users lodger ON t.lodger_id = lodger.id
             WHERE d.id = $1 AND t.landlord_id = $2`,
            [deductionId, landlordId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Deduction not found' });
        }

        const data = result.rows[0];

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `deduction-statement-${deductionId}.pdf`;
        const filepath = path.join(__dirname, 'uploads', filename);
        const writeStream = require('fs').createWriteStream(filepath);

        doc.pipe(writeStream);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('DEDUCTION STATEMENT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica').text(`Date: ${new Date().toLocaleDateString('en-GB')}`, { align: 'right' });
        doc.moveDown(2);

        // Parties
        doc.fontSize(12).font('Helvetica-Bold').text('LANDLORD:', 50, doc.y);
        doc.fontSize(10).font('Helvetica')
           .text(data.landlord_name, 50, doc.y)
           .text(data.landlord_address, 50, doc.y);
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text('LODGER:', 50, doc.y);
        doc.fontSize(10).font('Helvetica')
           .text(data.lodger_name, 50, doc.y)
           .text(data.lodger_email, 50, doc.y);
        doc.moveDown(2);

        // Tenancy Details
        doc.fontSize(12).font('Helvetica-Bold').text('TENANCY DETAILS:', 50, doc.y);
        doc.fontSize(10).font('Helvetica')
           .text(`Property: ${[data.property_house_number, data.property_street_name, data.property_city, data.property_county, data.property_postcode].filter(part => part).join(', ')}`, 50, doc.y)
           .text(`Start Date: ${new Date(data.start_date).toLocaleDateString('en-GB')}`, 50, doc.y)
           .text(`Monthly Rent: £${parseFloat(data.monthly_rent).toFixed(2)}`, 50, doc.y);
        doc.moveDown(2);

        // Financial Summary
        doc.fontSize(12).font('Helvetica-Bold').text('ORIGINAL FUNDS HELD:', 50, doc.y);
        doc.fontSize(10).font('Helvetica');
        if (parseFloat(data.deposit_amount) > 0) {
            doc.text(`Deposit: £${parseFloat(data.deposit_amount).toFixed(2)}`, 50, doc.y);
        }
        if (parseFloat(data.initial_payment) > 0) {
            doc.text(`Advance Rent: £${parseFloat(data.initial_payment).toFixed(2)}`, 50, doc.y);
        }
        doc.moveDown(2);

        // Deduction Details
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#990000').text('DEDUCTION DETAILS:', 50, doc.y);
        doc.fillColor('#000000');
        doc.moveDown();

        doc.fontSize(10).font('Helvetica-Bold').text('Type:', 50, doc.y, { continued: true });
        doc.font('Helvetica').text(` ${data.deduction_type.replace('_', ' ').toUpperCase()}`, { align: 'left' });

        doc.font('Helvetica-Bold').text('Description:', 50, doc.y);
        doc.font('Helvetica').text(data.description, 50, doc.y, { width: 500 });
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Total Amount Deducted:', 50, doc.y, { continued: true });
        doc.font('Helvetica').text(` £${parseFloat(data.amount).toFixed(2)}`, { align: 'left' });
        doc.moveDown();

        // Breakdown
        doc.fontSize(12).font('Helvetica-Bold').text('DEDUCTION BREAKDOWN:', 50, doc.y);
        doc.fontSize(10).font('Helvetica');
        if (parseFloat(data.amount_from_deposit) > 0) {
            doc.text(`From Deposit: £${parseFloat(data.amount_from_deposit).toFixed(2)}`, 70, doc.y);
        }
        if (parseFloat(data.amount_from_advance) > 0) {
            doc.text(`From Advance Rent: £${parseFloat(data.amount_from_advance).toFixed(2)}`, 70, doc.y);
        }
        doc.moveDown(2);

        // Remaining Funds
        const remainingDeposit = parseFloat(data.deposit_amount) - parseFloat(data.amount_from_deposit);
        const remainingAdvance = parseFloat(data.initial_payment) - parseFloat(data.amount_from_advance);

        doc.fontSize(12).font('Helvetica-Bold').text('REMAINING FUNDS:', 50, doc.y);
        doc.fontSize(10).font('Helvetica');
        if (parseFloat(data.deposit_amount) > 0) {
            doc.text(`Remaining Deposit: £${remainingDeposit.toFixed(2)}`, 50, doc.y);
        }
        if (parseFloat(data.initial_payment) > 0) {
            doc.text(`Remaining Advance Rent: £${remainingAdvance.toFixed(2)}`, 50, doc.y);
        }
        doc.moveDown(2);

        // Notes
        if (data.notes) {
            doc.fontSize(12).font('Helvetica-Bold').text('ADDITIONAL NOTES:', 50, doc.y);
            doc.fontSize(10).font('Helvetica').text(data.notes, 50, doc.y, { width: 500 });
            doc.moveDown(2);
        }

        // Footer
        doc.moveDown(3);
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
           .text('This statement is issued in accordance with the lodger agreement dated ' + new Date(data.start_date).toLocaleDateString('en-GB'), 50, doc.y, { width: 500, align: 'center' });
        doc.text('If you have any queries regarding this deduction, please contact your landlord.', { width: 500, align: 'center' });

        doc.end();

        // Wait for PDF to finish writing
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Update deduction record with statement path
        await client.query(
            'UPDATE deductions SET statement_path = $1 WHERE id = $2',
            [`/uploads/${filename}`, deductionId]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Deduction statement generated successfully',
            statement_path: `/uploads/${filename}`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Generate statement error:', error);
        res.status(500).json({ error: 'Failed to generate deduction statement' });
    } finally {
        client.release();
    }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================
// BACKUP & RESTORE ROUTES
// ============================================

// Backup database
app.get('/api/backup', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    try {
        const landlordId = req.user.id;

        // Get all data for this landlord
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            landlord_id: landlordId,
            data: {}
        };

        // Get user profile
        const userResult = await pool.query(
            'SELECT id, email, full_name, phone, address, bank_account_number, bank_sort_code, payment_reference FROM users WHERE id = $1',
            [landlordId]
        );
        backup.data.profile = userResult.rows[0];

        // Get all tenancies
        const tenanciesResult = await pool.query(
            `SELECT t.*, u.full_name as lodger_name, u.email as lodger_email, u.phone as lodger_phone
             FROM tenancies t
             LEFT JOIN users u ON t.lodger_id = u.id
             WHERE t.landlord_id = $1
             ORDER BY t.created_at DESC`,
            [landlordId]
        );
        backup.data.tenancies = tenanciesResult.rows;

        // Get all payment schedules for landlord's tenancies
        const paymentResult = await pool.query(
            `SELECT ps.*
             FROM payment_schedule ps
             JOIN tenancies t ON ps.tenancy_id = t.id
             WHERE t.landlord_id = $1
             ORDER BY ps.due_date DESC`,
            [landlordId]
        );
        backup.data.payments = paymentResult.rows;

        // Get all notices
        const noticesResult = await pool.query(
            `SELECT n.*
             FROM notices n
             JOIN tenancies t ON n.tenancy_id = t.id
             WHERE t.landlord_id = $1
             ORDER BY n.notice_date DESC`,
            [landlordId]
        );
        backup.data.notices = noticesResult.rows;

        // Get all lodgers
        const lodgersResult = await pool.query(
            `SELECT DISTINCT u.id, u.email, u.full_name, u.phone, u.created_at
             FROM users u
             JOIN tenancies t ON u.id = t.lodger_id
             WHERE t.landlord_id = $1`,
            [landlordId]
        );
        backup.data.lodgers = lodgersResult.rows;

        // Set headers for file download
        const filename = `lodger-backup-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.json(backup);
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Restore database from backup
app.post('/api/restore', authenticateToken, requireRole('landlord', 'admin'), upload.single('backup'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No backup file provided' });
        }

        // Read and parse the backup file
        const fs = require('fs');
        const backupData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));

        // Validate backup format
        if (!backupData.version || !backupData.data) {
            return res.status(400).json({ error: 'Invalid backup file format' });
        }

        // Verify this backup belongs to the current user
        if (backupData.landlord_id !== req.user.id) {
            return res.status(403).json({ error: 'This backup belongs to a different user' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Restore user profile (only specific fields)
            if (backupData.data.profile) {
                await client.query(
                    `UPDATE users
                     SET full_name = $1, phone = $2, address = $3,
                         bank_account_number = $4, bank_sort_code = $5, payment_reference = $6
                     WHERE id = $7`,
                    [
                        backupData.data.profile.full_name,
                        backupData.data.profile.phone,
                        backupData.data.profile.address,
                        backupData.data.profile.bank_account_number,
                        backupData.data.profile.bank_sort_code,
                        backupData.data.profile.payment_reference,
                        req.user.id
                    ]
                );
            }

            await client.query('COMMIT');

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            res.json({
                message: 'Profile restored successfully',
                note: 'Only profile settings were restored. Tenancy and payment data restoration requires manual database operations for safety.'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Failed to restore backup: ' + error.message });
    }
});

// Factory Reset (Admin only) - Complete database reset
app.post('/api/factory-reset', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { password, confirm_text } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        if (confirm_text !== 'FACTORY RESET') {
            return res.status(400).json({ error: 'Please type "FACTORY RESET" to confirm' });
        }

        // Verify admin password
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            console.log('🚨 Starting complete factory reset...');

            // Drop all tables (in reverse dependency order)
            const tablesToDrop = [
                'deductions',
                'payment_transactions',
                'payment_schedule',
                'notices',
                'notifications',
                'tax_year_summary',
                'landlord_payment_details',
                'tenancies',
                'users'
            ];

            for (const table of tablesToDrop) {
                try {
                    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                    console.log(`✓ Dropped table: ${table}`);
                } catch (dropError) {
                    console.log(`⚠️ Could not drop table ${table}:`, dropError.message);
                }
            }

            // Recreate database schema
            console.log('🔄 Recreating database schema...');

            // Enable UUID extension
            await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

            // Create users table
            await client.query(`
                CREATE TABLE users (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255),
                    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('landlord', 'lodger', 'admin')),
                    full_name VARCHAR(255) NOT NULL,
                    phone VARCHAR(50),
                    phone_number VARCHAR(20),
                    house_number VARCHAR(20),
                    street_name VARCHAR(255),
                    city VARCHAR(100),
                    county VARCHAR(100),
                    postcode VARCHAR(20),
                    date_of_birth DATE,
                    id_expiry_date DATE,
                    bank_account_number VARCHAR(8),
                    bank_sort_code VARCHAR(8),
                    payment_reference VARCHAR(50),
                    rooms JSONB,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT true
                )
            `);
            console.log('✓ Created users table');

            // Create landlord_payment_details table
            await client.query(`
                CREATE TABLE landlord_payment_details (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    account_number VARCHAR(8) NOT NULL,
                    sort_code VARCHAR(8) NOT NULL,
                    account_name VARCHAR(255) NOT NULL,
                    payment_reference VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Created landlord_payment_details table');

            // Create tenancies table
            await client.query(`
                CREATE TABLE tenancies (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    lodger_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    property_house_number VARCHAR(20),
                    property_street_name VARCHAR(255),
                    property_city VARCHAR(100),
                    property_county VARCHAR(100),
                    property_postcode VARCHAR(20),
                    room_description TEXT,
                    shared_areas TEXT,
                    start_date DATE NOT NULL,
                    initial_term_months INTEGER NOT NULL CHECK (initial_term_months IN (3, 6, 12)),
                    end_date DATE,
                    notice_given_date DATE,
                    notice_given_by VARCHAR(20) CHECK (notice_given_by IN ('landlord', 'lodger')),
                    termination_date DATE,
                    monthly_rent DECIMAL(10, 2) NOT NULL,
                    initial_payment DECIMAL(10, 2) NOT NULL,
                    deposit_amount DECIMAL(10, 2) DEFAULT 0,
                    deposit_applicable BOOLEAN DEFAULT false,
                    payment_frequency VARCHAR(20) DEFAULT '4-weekly' CHECK (payment_frequency IN ('weekly', 'bi-weekly', 'monthly', '4-weekly')),
                    payment_cycle_days INTEGER DEFAULT 28,
                    payment_day_of_cycle INTEGER,
                    payment_type VARCHAR(20) DEFAULT 'cycle' CHECK (payment_type IN ('cycle', 'calendar')),
                    payment_day_of_month INTEGER CHECK (payment_day_of_month >= 1 AND payment_day_of_month <= 31),
                    utilities_included TEXT,
                    utilities_excluded TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'notice_given', 'terminated', 'extended')),
                    photo_id_path VARCHAR(500),
                    signed_agreement_path VARCHAR(500),
                    lodger_signature TEXT,
                    landlord_signature TEXT,
                    signature_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Created tenancies table');

            // Create payment_schedule table
            await client.query(`
                CREATE TABLE payment_schedule (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
                    payment_number INTEGER NOT NULL,
                    due_date DATE NOT NULL,
                    rent_due DECIMAL(10, 2) NOT NULL,
                    rent_paid DECIMAL(10, 2) DEFAULT 0,
                    balance DECIMAL(10, 2) GENERATED ALWAYS AS (rent_paid - rent_due) STORED,
                    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue', 'waived', 'submitted')),
                    payment_date TIMESTAMP,
                    payment_method VARCHAR(50),
                    payment_reference VARCHAR(100),
                    lodger_submitted_amount DECIMAL(10, 2),
                    lodger_submitted_date TIMESTAMP,
                    lodger_payment_reference VARCHAR(100),
                    lodger_payment_method VARCHAR(50),
                    lodger_notes TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(tenancy_id, payment_number)
                )
            `);
            console.log('✓ Created payment_schedule table');

            // Create payment_transactions table
            await client.query(`
                CREATE TABLE payment_transactions (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    payment_schedule_id UUID REFERENCES payment_schedule(id) ON DELETE CASCADE,
                    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
                    amount DECIMAL(10, 2) NOT NULL,
                    transaction_date TIMESTAMP NOT NULL,
                    payment_method VARCHAR(50),
                    reference VARCHAR(100),
                    notes TEXT,
                    created_by UUID REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Created payment_transactions table');

            // Create tax_year_summary table
            await client.query(`
                CREATE TABLE tax_year_summary (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    tax_year_start DATE NOT NULL,
                    tax_year_end DATE NOT NULL,
                    total_rent_received DECIMAL(10, 2) DEFAULT 0,
                    rent_a_room_allowance DECIMAL(10, 2) DEFAULT 7500.00,
                    allowance_exceeded BOOLEAN GENERATED ALWAYS AS (total_rent_received > rent_a_room_allowance) STORED,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(landlord_id, tax_year_start)
                )
            `);
            console.log('✓ Created tax_year_summary table');

            // Create notices table
            await client.query(`
                CREATE TABLE notices (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
                    notice_type VARCHAR(50) NOT NULL CHECK (notice_type IN ('termination', 'breach', 'extension_offer', 'early_termination')),
                    given_by UUID REFERENCES users(id),
                    given_to UUID REFERENCES users(id),
                    notice_date DATE NOT NULL,
                    effective_date DATE NOT NULL,
                    reason TEXT,
                    breach_clause TEXT,
                    breach_stage VARCHAR(20) CHECK (breach_stage IN ('remedy_period', 'termination_period', 'remedied')),
                    remedy_deadline DATE,
                    termination_deadline DATE,
                    extension_months INTEGER CHECK (extension_months IN (3, 6, 12)),
                    extension_status VARCHAR(20) CHECK (extension_status IN ('pending', 'accepted', 'rejected')),
                    notice_letter_path VARCHAR(500),
                    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Created notices table');

            // Create notifications table
            await client.query(`
                CREATE TABLE notifications (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
                    payment_id UUID REFERENCES payment_schedule(id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL CHECK (type IN ('payment_reminder', 'payment_received', 'notice_given', 'tenancy_expiring', 'breach_notice', 'breach_remedied', 'termination_notice', 'extension_offer', 'extension_accepted', 'extension_rejected', 'deduction_made', 'general')),
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT false,
                    read_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Created notifications table');

            // Create deductions table
            await client.query(`
                CREATE TABLE deductions (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    tenancy_id UUID REFERENCES tenancies(id) ON DELETE CASCADE,
                    deduction_type VARCHAR(50) NOT NULL,
                    description TEXT NOT NULL,
                    amount DECIMAL(10, 2) NOT NULL,
                    deducted_from VARCHAR(20) CHECK (deducted_from IN ('deposit', 'advance_rent', 'both')),
                    amount_from_deposit DECIMAL(10, 2) DEFAULT 0,
                    amount_from_advance DECIMAL(10, 2) DEFAULT 0,
                    evidence_paths JSONB,
                    statement_path VARCHAR(500),
                    created_by UUID REFERENCES users(id),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✓ Created deductions table');

            // Create indexes
            await client.query('CREATE INDEX idx_notifications_user_id ON notifications(user_id)');
            await client.query('CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC)');
            console.log('✓ Created indexes');

            // Create initial admin account
            console.log('👤 Creating initial admin account...');
            const adminResult = await client.query(
                `INSERT INTO users (email, user_type, full_name, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                 RETURNING id, email, user_type, full_name`,
                ['admin@example.com', 'admin', 'System Administrator', true]
            );

            console.log('✓ Admin account created:', adminResult.rows[0].email);
            console.log('⚠️  Admin password needs to be set via /api/setup/admin/password');

            await client.query('COMMIT');
            console.log('✅ Complete factory reset completed successfully');

            res.json({
                message: 'Complete factory reset completed successfully',
                note: 'All tables have been dropped and recreated. Admin account created with email: admin@example.com. Please set admin password and restart the application to trigger setup flow.',
                admin_email: 'admin@example.com',
                next_steps: [
                    'Set admin password using /api/setup/admin/password',
                    'Restart the application',
                    'Complete initial setup wizard'
                ]
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Factory reset rollback:', error);
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Factory reset error:', error);
        res.status(500).json({ error: 'Failed to perform factory reset: ' + error.message });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start cron job for daily tenancy expiry checks (runs at 9 AM daily)
    console.log('✓ Starting daily tenancy expiry check scheduler');
    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Running daily tenancy expiry check at', new Date().toISOString());
        try {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Find tenancies expiring in 30 days that haven't received a reminder
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

                const expiringTenancies = await client.query(`
                    SELECT t.*, l.full_name as lodger_name, l.email as lodger_email,
                           ll.full_name as landlord_name, ll.email as landlord_email
                    FROM tenancies t
                    JOIN users l ON t.lodger_id = l.id
                    JOIN users ll ON t.landlord_id = ll.id
                    WHERE t.status = 'active'
                    AND t.end_date IS NOT NULL
                    AND t.end_date <= $1
                    AND t.end_date >= CURRENT_DATE
                    AND NOT EXISTS (
                        SELECT 1 FROM notifications n
                        WHERE n.tenancy_id = t.id
                        AND n.type = 'tenancy_expiring'
                        AND n.created_at > CURRENT_DATE - INTERVAL '35 days'
                    )
                `, [thirtyDaysFromNow]);

                let remindersCreated = 0;

                for (const tenancy of expiringTenancies.rows) {
                    const daysUntilExpiry = Math.ceil((new Date(tenancy.end_date) - new Date()) / (1000 * 60 * 60 * 24));

                    // Send notification to landlord
                    await client.query(
                        `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            tenancy.landlord_id,
                            tenancy.id,
                            'tenancy_expiring',
                            'Tenancy Expiring Soon - Action Required',
                            `The tenancy with ${tenancy.lodger_name} expires in ${daysUntilExpiry} days on ${new Date(tenancy.end_date).toLocaleDateString('en-GB')}. Please consider offering an extension if you wish to continue the tenancy.`
                        ]
                    );

                    // Send notification to lodger
                    const propertyAddress = [tenancy.property_house_number, tenancy.property_street_name, tenancy.property_city, tenancy.property_county, tenancy.property_postcode]
                        .filter(part => part)
                        .join(', ');
                    await client.query(
                        `INSERT INTO notifications (user_id, tenancy_id, type, title, message)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            tenancy.lodger_id,
                            tenancy.id,
                            'tenancy_expiring',
                            'Your Tenancy is Expiring Soon',
                            `Your tenancy at ${propertyAddress} expires in ${daysUntilExpiry} days on ${new Date(tenancy.end_date).toLocaleDateString('en-GB')}. Your landlord may offer you an extension, or you may need to make alternative arrangements.`
                        ]
                    );

                    remindersCreated++;
                }

                await client.query('COMMIT');
                console.log(`[CRON] Extension reminders sent: ${remindersCreated} tenancies notified`);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('[CRON] Error in tenancy expiry check:', error);
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('[CRON] Failed to connect to database:', error);
        }
    });
});

module.exports = app;