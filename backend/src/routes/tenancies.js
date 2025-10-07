/**
 * Tenancy Routes
 * Handles tenancy creation, retrieval, updates, and agreement signing
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const paymentCalculator = require('../utils/paymentCalculator');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/general');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

/**
 * Map payment frequency to cycle days
 * @param {string} paymentFrequency - Payment frequency
 * @returns {number} Number of days in the payment cycle
 */
function mapPaymentFrequencyToDays(paymentFrequency) {
    const frequencyMap = {
        'weekly': 7,
        'bi-weekly': 14,
        'monthly': 30,
        '4-weekly': 28
    };
    return frequencyMap[paymentFrequency] || 28;
}

/**
 * Parse a free-text address into structured components
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

// Get tenancies
router.get('/', authenticateToken, async (req, res) => {
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
router.post('/', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            lodger_id, room_description, start_date, initial_term_months,
            monthly_rent, initial_payment, deposit_applicable, deposit_amount, shared_areas,
            payment_frequency, payment_type, payment_day_of_month
        } = req.body;

        // Get landlord's profile to use their property address
        const landlordProfile = await client.query(
            'SELECT house_number, street_name, city, county, postcode FROM users WHERE id = $1',
            [req.user.id]
        );

        if (landlordProfile.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Landlord profile not found' });
        }

        // Use landlord's address for property address (ignore any address sent from frontend)
        const propertyAddressFields = {
            house_number: landlordProfile.rows[0].house_number || null,
            street_name: landlordProfile.rows[0].street_name || null,
            city: landlordProfile.rows[0].city || null,
            county: landlordProfile.rows[0].county || null,
            postcode: landlordProfile.rows[0].postcode || null
        };

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
router.get('/:id', authenticateToken, async (req, res) => {
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
router.put('/:id', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
router.post('/:id/accept', authenticateToken, upload.single('photo_id'), async (req, res) => {
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
router.post('/:id/upload-id', authenticateToken, requireRole('lodger'), upload.single('photo_id'), async (req, res) => {
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
router.post('/:id/approve', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
        const uploadDir = path.join(__dirname, '../../uploads/agreements');
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate PDF document
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

/**
 * Cancel an unsigned tenancy offer
 * @route DELETE /api/tenancies/:id/cancel
 * @auth Landlord/Admin only
 * @param {string} id - Tenancy ID
 * @returns {Object} Success message
 */
router.delete('/:id/cancel', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Get the tenancy
        const tenancyResult = await client.query(
            'SELECT * FROM tenancies WHERE id = $1',
            [id]
        );

        if (tenancyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Tenancy not found' });
        }

        const tenancy = tenancyResult.rows[0];

        // Check if landlord owns this tenancy (admins can cancel any)
        if (req.user.user_type !== 'admin' && tenancy.landlord_id !== req.user.id) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Not authorized to cancel this tenancy' });
        }

        // Check if tenancy is already signed
        if (tenancy.lodger_signature) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot cancel a signed tenancy. Use notice procedures instead.' });
        }

        // Delete payment schedule
        await client.query(
            'DELETE FROM payment_schedule WHERE tenancy_id = $1',
            [id]
        );

        // Create notification for lodger
        await client.query(
            `INSERT INTO notifications (user_id, type, title, message)
             VALUES ($1, $2, $3, $4)`,
            [
                tenancy.lodger_id,
                'general',
                'Tenancy Offer Cancelled',
                `Your tenancy offer for ${tenancy.property_house_number} ${tenancy.property_street_name} has been cancelled by the landlord.`
            ]
        );

        // Delete the tenancy
        await client.query(
            'DELETE FROM tenancies WHERE id = $1',
            [id]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Tenancy offer cancelled successfully',
            cancelled_tenancy_id: id
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cancel tenancy error:', error);
        res.status(500).json({ error: 'Failed to cancel tenancy offer' });
    } finally {
        client.release();
    }
});

module.exports = router;
