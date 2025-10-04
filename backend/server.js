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
        'postgresql://postgres:postgres123@localhost:5432/lodger_management',
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

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
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
                full_name: user.full_name,
                phone: user.phone,
                address: user.address
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

        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, user_type, full_name, phone, address)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, user_type, full_name, phone, address`,
            [email, passwordHash, user_type, full_name, phone || null, address || null]
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
            `INSERT INTO users (email, password_hash, user_type, full_name, phone, address)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, email, user_type, full_name, phone, address`,
            [email, password_hash, user_type, full_name, phone || null, null]
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

// Update own profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { full_name, phone, address, email, bank_account_number, bank_sort_code, payment_reference } = req.body;
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
        if (address !== undefined) {
            updates.push(`address = $${paramCount++}`);
            values.push(address);
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

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(userId);

        const result = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, user_type, full_name, phone, address, bank_account_number, bank_sort_code, payment_reference`,
            values
        );

        res.json(result.rows[0]);
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
            // Lodgers see only their tenancies with landlord payment details
            query = `
                SELECT t.*,
                       u.full_name as lodger_name,
                       landlord.full_name as landlord_name,
                       landlord.bank_account_number as landlord_bank_account,
                       landlord.bank_sort_code as landlord_sort_code,
                       landlord.payment_reference as landlord_payment_reference,
                       t.property_address as address
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
                       t.property_address as address
                FROM tenancies t
                JOIN users u ON t.lodger_id = u.id
                JOIN users landlord ON t.landlord_id = landlord.id
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

// Accept tenancy agreement (lodger only)
app.post('/api/tenancies/:id/accept', authenticateToken, upload.single('photo_id'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verify tenancy belongs to lodger
        const tenancyCheck = await pool.query(
            'SELECT * FROM tenancies WHERE id = $1 AND lodger_id = $2',
            [id, req.user.id]
        );

        if (tenancyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const photoIdPath = req.file ? `/uploads/general/${req.file.filename}` : null;

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
        pdfDoc.text(`PROPERTY: ${tenancy.property_address}`);
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
            // Get all payments for landlord's tenancies
            const result = await pool.query(
                `SELECT ps.*, t.property_address, u.full_name as lodger_name
                 FROM payment_schedule ps
                 JOIN tenancies t ON ps.tenancy_id = t.id
                 JOIN users u ON t.lodger_id = u.id
                 WHERE t.landlord_id = $1
                 ORDER BY ps.due_date DESC`,
                [req.user.id]
            );
            res.json(result.rows);
        } else if (req.user.user_type === 'lodger') {
            // Get payments for lodger's tenancy
            const result = await pool.query(
                `SELECT ps.*, t.property_address
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
        // For now, return empty array - can be implemented later
        res.json([]);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
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

        res.json({
            tenancies: tenancyStats.rows[0],
            payments: paymentStats.rows[0],
            upcoming: upcomingPayments.rows[0]
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
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

                // Calculate the last covered date (28 days from last payment)
                const lastCoveredDate = new Date(lastPaymentDate);
                lastCoveredDate.setDate(lastCoveredDate.getDate() + 28);

                // If termination date is after last covered date, calculate pro-rata
                if (effectiveDate > lastCoveredDate) {
                    const daysToCharge = Math.ceil((effectiveDate - lastCoveredDate) / (1000 * 60 * 60 * 24));
                    const dailyRate = parseFloat(tenancy.monthly_rent) / 28;
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
                    const dailyRate = parseFloat(tenancy.monthly_rent) / 28;
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

// Factory Reset (Admin only)
app.post('/api/factory-reset', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
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

            // Get the admin user ID to preserve
            const adminId = req.user.id;

            // Delete all data EXCEPT the admin user
            console.log('Starting factory reset...');

            // Delete payment schedules first (foreign key constraint)
            await client.query('DELETE FROM payment_schedule');
            console.log('✓ Deleted payment schedules');

            // Delete notices
            await client.query('DELETE FROM notices');
            console.log('✓ Deleted notices');

            // Delete tenancies
            await client.query('DELETE FROM tenancies');
            console.log('✓ Deleted tenancies');

            // Delete all users except admin
            await client.query('DELETE FROM users WHERE id != $1', [adminId]);
            console.log('✓ Deleted all users except admin');

            // Reset admin profile to defaults (keep email and password)
            await client.query(
                `UPDATE users
                 SET full_name = 'Admin User',
                     phone = NULL,
                     address = NULL,
                     bank_account_number = NULL,
                     bank_sort_code = NULL,
                     payment_reference = NULL
                 WHERE id = $1`,
                [adminId]
            );
            console.log('✓ Reset admin profile');

            await client.query('COMMIT');
            console.log('✓ Factory reset completed successfully');

            res.json({
                message: 'Factory reset completed successfully',
                note: 'All data has been deleted except your admin account. Please log out and log back in.'
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
});

module.exports = app;