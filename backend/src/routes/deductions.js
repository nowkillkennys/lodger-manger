/**
 * Deduction Routes
 * Handles deductions from deposit and advance rent
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Get available funds (advance rent + deposit) for a tenancy
router.get('/:tenancyId/available-funds', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
router.post('/:tenancyId/deductions', authenticateToken, requireRole('landlord', 'admin'), upload.array('evidence', 10), async (req, res) => {
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
router.get('/:tenancyId/deductions', authenticateToken, async (req, res) => {
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
router.post('/deductions/:deductionId/generate-statement', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
        const filepath = path.join(__dirname, '../../uploads', filename);
        const writeStream = fs.createWriteStream(filepath);

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

module.exports = router;
