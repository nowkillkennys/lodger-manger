/**
 * Lodger Management System - Backend API Server
 * Main server file (server.js)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Import payment calculator
const paymentCalculator = require('./paymentCalculator');

// ============================================
// CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const SALT_ROUNDS = 10;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://lodger_admin:changeme123@localhost:5432/lodger_management',
    ssl: false
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('✓ Database connected successfully');
        release();
    }
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(cors());
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
                full_name: user.full_name
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
        const { email, password, user_type, full_name, phone } = req.body;

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

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, user_type, full_name, phone`,
            [email, passwordHash, user_type, full_name, phone || null]
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
            `INSERT INTO users (email, password_hash, user_type, full_name, phone)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, user_type, full_name, phone`,
            [email, password_hash, user_type, full_name, phone || null]
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

// List users (landlord/admin only)
app.get('/api/users', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
            // Lodgers see only their tenancies
            query = `
                SELECT t.*, u.full_name as lodger_name, t.property_address as address
                FROM tenancies t
                JOIN users u ON t.lodger_id = u.id
                WHERE t.lodger_id = $1
                ORDER BY t.created_at DESC
            `;
            params = [req.user.id];
        } else {
            // Landlords see all their tenancies
            query = `
                SELECT t.*, u.full_name as lodger_name, t.property_address as address
                FROM tenancies t
                JOIN users u ON t.lodger_id = u.id
                WHERE t.landlord_id = $1
                ORDER BY t.created_at DESC
            `;
            params = [req.user.id];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
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
            monthly_rent, initial_payment, deposit_applicable, deposit_amount, shared_areas
        } = req.body;

        // Create tenancy
        const tenancyResult = await client.query(
            `INSERT INTO tenancies (
                landlord_id, lodger_id, property_address, room_description, shared_areas,
                start_date, initial_term_months, monthly_rent, initial_payment,
                deposit_applicable, deposit_amount, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
            RETURNING *`,
            [req.user.id, lodger_id, property_address, room_description, shared_areas || '',
             start_date, initial_term_months, monthly_rent, initial_payment,
             deposit_applicable || false, deposit_amount || 0]
        );

        const tenancy = tenancyResult.rows[0];

        // Generate payment schedule
        const schedule = paymentCalculator.generatePaymentSchedule(
            new Date(start_date),
            parseFloat(monthly_rent),
            parseInt(initial_term_months)
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

// ============================================
// PAYMENT ROUTES
// ============================================

// Get payment schedule for tenancy
app.get('/api/tenancies/:id/payments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
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
        const { amount, payment_reference } = req.body;
        
        const result = await pool.query(
            `UPDATE payment_schedule 
             SET lodger_submitted_amount = $1,
                 lodger_submitted_date = CURRENT_TIMESTAMP,
                 lodger_payment_reference = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [amount, payment_reference, id]
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
        const { amount, notes } = req.body;
        
        const result = await pool.query(
            `UPDATE payment_schedule 
             SET landlord_confirmed_amount = $1,
                 landlord_confirmed_date = CURRENT_TIMESTAMP,
                 landlord_notes = $2,
                 rent_paid = $1,
                 amounts_match = (lodger_submitted_amount = $1),
                 payment_status = CASE 
                     WHEN $1 >= rent_due THEN 'paid'
                     WHEN $1 > 0 THEN 'partial'
                     ELSE 'pending'
                 END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [amount, notes, id]
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
});

module.exports = app;