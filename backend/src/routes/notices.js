/**
 * Notice Routes
 * Handles termination notices, breach notices, and tenancy extensions
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
 * Generate breach notice letter PDF
 */
async function generateBreachNoticeLetter(landlord, lodger, tenancy, breach, remedyDeadline) {
    return new Promise(async (resolve, reject) => {
        try {
            const fileName = `breach-notice-${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads', fileName);

            const doc = new PDFDocument({ margin: 50 });
            const writeStream = fs.createWriteStream(filePath);

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

/**
 * Generate extension offer letter PDF
 */
async function generateExtensionOfferLetter(landlord, lodger, tenancy, extension) {
    return new Promise(async (resolve, reject) => {
        try {
            const fileName = `extension-offer-${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads', fileName);

            const doc = new PDFDocument({ margin: 50 });
            const writeStream = fs.createWriteStream(filePath);

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

// Give notice to terminate tenancy
router.post('/:id/notice', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
                            Math.abs(finalAmount),
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
                    const refundAmount = (dailyRate * daysCovered) + parseFloat(tenancy.monthly_rent);

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

        // Delete all future pending payments beyond termination date
        await client.query(
            `DELETE FROM payment_schedule
             WHERE tenancy_id = $1
             AND due_date > $2
             AND payment_status = 'pending'`,
            [tenancyId, effectiveDate]
        );

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
router.get('/:id/notices', authenticateToken, async (req, res) => {
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

// Issue breach notice (7 days to remedy)
router.post('/:id/breach-notice', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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
        remedyDeadline.setDate(remedyDeadline.getDate() + 7);

        // Generate formal breach notice letter
        const letterPath = await generateBreachNoticeLetter(
            landlord,
            lodger,
            tenancy,
            {
                id: 'TBD',
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
            remedyDeadline,
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
router.put('/notices/:id/remedy', authenticateToken, async (req, res) => {
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
router.post('/notices/:id/escalate', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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

        // Delete all future pending payments beyond termination date
        await client.query(
            `DELETE FROM payment_schedule
             WHERE tenancy_id = $1
             AND due_date > $2
             AND payment_status = 'pending'`,
            [notice.tenancy_id, terminationDeadline]
        );

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

// Offer tenancy extension (landlord)
router.post('/:id/offer-extension', authenticateToken, requireRole('landlord', 'admin'), async (req, res) => {
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

        // Validate rent increase
        const currentRent = parseFloat(tenancy.monthly_rent);
        const proposedRent = parseFloat(new_monthly_rent || tenancy.monthly_rent);

        if (proposedRent > currentRent) {
            const increasePercent = ((proposedRent - currentRent) / currentRent) * 100;
            const maxIncrease = 5;

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
router.put('/notices/:id/extension-response', authenticateToken, requireRole('lodger'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: noticeId } = req.params;
        const { response, notes } = req.body;

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

module.exports = router;
