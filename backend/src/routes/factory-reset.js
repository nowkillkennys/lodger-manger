const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { connectWithRetry } = require('../config/database');

const router = express.Router();

/**
 * Factory Reset Route - System Administrator Only
 * POST /api/factory-reset
 *
 * This endpoint performs a complete database reset by:
 * 1. Dropping all existing tables
 * 2. Recreating the database schema
 * 3. Creating a fresh admin account
 *
 * Security Requirements:
 * - Only system-admin (admin@example.com) can access this
 * - Password verification required
 * - Confirmation text "FACTORY RESET" required
 * - Complete data loss warning provided
 */
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { password, confirm_text } = req.body;

        // Validate input
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        if (confirm_text !== 'FACTORY RESET') {
            return res.status(400).json({ error: 'Please type "FACTORY RESET" exactly to confirm' });
        }

        // Verify user is system administrator
        if (req.user.user_type !== 'sys_admin') {
            return res.status(403).json({
                error: 'Factory reset is restricted to the System Administrator only'
            });
        }

        // Verify admin password
        const pool = require('../config/database').pool;
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
                await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`✓ Dropped table: ${table}`);
            } catch (dropError) {
                console.log(`⚠️ Could not drop table ${table}:`, dropError.message);
            }
        }

        // Recreate database schema
        console.log('🔄 Recreating database schema...');

        // Enable UUID extension
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Create users table
        await pool.query(`
            CREATE TABLE users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('landlord', 'lodger', 'admin', 'sys_admin')),
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query(`
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
        await pool.query('CREATE INDEX idx_notifications_user_id ON notifications(user_id)');
        await pool.query('CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC)');
        console.log('✓ Created indexes');

        // Create initial admin account
        console.log('👤 Creating initial admin account...');
        const adminResult = await pool.query(
            `INSERT INTO users (email, user_type, full_name, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, email, user_type, full_name`,
            ['admin@example.com', 'sys_admin', 'System Administrator', true]
        );

        console.log('✓ Admin account created:', adminResult.rows[0].email);
        console.log('⚠️  Admin password needs to be set via /api/setup/admin/password');

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
        console.error('Factory reset error:', error);
        res.status(500).json({ error: 'Failed to perform factory reset: ' + error.message });
    }
});

module.exports = router;