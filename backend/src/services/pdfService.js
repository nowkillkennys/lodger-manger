/**
 * PDF Agreement Generator
 * File: backend/pdfGenerator.js
 * Generates lodger agreements as PDF documents
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a complete lodger agreement PDF
 * @param {Object} tenancy - Tenancy data from database
 * @param {Object} landlord - Landlord user data
 * @param {Object} lodger - Lodger user data
 * @param {Object} property - Property data
 * @param {string} outputPath - Where to save the PDF
 * @returns {Promise<string>} Path to generated PDF
 */
async function generateAgreementPDF(tenancy, landlord, lodger, property, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Create PDF document
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            // Pipe to file
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // Generate content
            addHeader(doc);
            addTitle(doc, 'LODGER AGREEMENT');
            addSubtitle(doc, 'AGREEMENT FOR NON-EXCLUSIVE OR SHARED OCCUPATION');
            
            addIntroduction(doc, tenancy);
            addParticulars(doc, tenancy, landlord, lodger, property);
            addTermsAndConditions(doc);
            addSignatures(doc, tenancy, landlord, lodger);
            
            // Add photo ID if available
            if (tenancy.photo_id_path) {
                addPhotoID(doc, tenancy);
            }

            // Finalize PDF
            doc.end();

            stream.on('finish', () => {
                resolve(outputPath);
            });

            stream.on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add header with logo/branding
 */
function addHeader(doc) {
    doc.fontSize(10)
       .fillColor('#666666')
       .text('Lodger Management System', { align: 'right' })
       .text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, { align: 'right' })
       .moveDown(2);
}

/**
 * Add main title
 */
function addTitle(doc, title) {
    doc.fontSize(20)
       .fillColor('#000000')
       .font('Helvetica-Bold')
       .text(title, { align: 'center' })
       .moveDown(0.5);
}

/**
 * Add subtitle
 */
function addSubtitle(doc, subtitle) {
    doc.fontSize(12)
       .fillColor('#666666')
       .font('Helvetica')
       .text(subtitle, { align: 'center' })
       .moveDown(2);
}

/**
 * Add introduction paragraph
 */
function addIntroduction(doc, tenancy) {
    doc.fontSize(10)
       .fillColor('#000000')
       .font('Helvetica')
       .text(
           'This LODGER AGREEMENT is made up of the details about the parties and the agreement in Part 1, ' +
           'the Terms and Conditions printed below in Part 2, and any Special Terms and Conditions agreed ' +
           'between the parties which have been recorded in Part 3, whereby the Room is licensed by the ' +
           'Householder and taken by the Lodger during the Term upon making the Accommodation Payment.',
           { align: 'justify' }
       )
       .moveDown(2);
}

/**
 * Add Part 1 - Particulars
 */
function addParticulars(doc, tenancy, landlord, lodger, property) {
    addSectionHeader(doc, 'PART 1 - PARTICULARS');

    const particulars = [
        {
            label: 'PROPERTY:',
            value: `${property.address_line1}${property.address_line2 ? ', ' + property.address_line2 : ''}${property.city ? ', ' + property.city : ''}${property.county ? ', ' + property.county : ''}, ${property.postcode}`
        },
        {
            label: 'ROOM:',
            value: tenancy.room_description && tenancy.room_description.trim() 
                ? tenancy.room_description 
                : 'The room or rooms in the Property which the Householder from time to time allocates to the Lodger'
        },
        {
            label: 'SHARED AREAS:',
            value: property.shared_areas || 'The entrance hall, staircase and landings of the Property, the kitchen for cooking eating and the storage of food, the lavatory and bathroom, the sitting room, the garden (where applicable).'
        },
        {
            label: 'HOUSEHOLDER:',
            value: landlord.full_name
        },
        {
            label: 'LODGER:',
            value: lodger.full_name
        },
        {
            label: 'START DATE:',
            value: formatDate(tenancy.start_date)
        },
        {
            label: 'TERM:',
            value: `${tenancy.initial_term_months} Months Rolling Contract until Terminated by either party`
        },
        {
            label: 'INITIAL PAYMENT:',
            value: `£${parseFloat(tenancy.initial_payment).toFixed(2)} (current and month in advance payment)`
        },
        {
            label: 'ACCOMMODATION PAYMENT:',
            value: `£${parseFloat(tenancy.monthly_rent).toFixed(2)} per month`
        },
        {
            label: 'PAYMENT DAY:',
            value: tenancy.payment_type === 'calendar'
                ? `On the ${tenancy.payment_day_of_month}th of each month`
                : `Every ${tenancy.payment_cycle_days || 28} days from the Start Date`
        },
        {
            label: 'DEPOSIT:',
            value: tenancy.deposit_applicable 
                ? `£${parseFloat(tenancy.deposit_amount).toFixed(2)}` 
                : 'Not Applicable'
        },
        {
            label: 'EARLY TERMINATION:',
            value: 'Either party may at any time end this Agreement earlier than the End Date by giving notice in writing of at least one calendar month ending on the Payment Day. If within the rental term any deposits taken will be void unless mutually agreed by both parties.'
        },
        {
            label: 'UTILITY COSTS:',
            value: 'All utilities including gas, electric, water, basic internet. Council Tax paid by Householder.'
        },
        {
            label: 'EXCLUDED UTILITY COST:',
            value: 'Television License is not included. If the lodger would like to view any LIVE broadcast, the lodger accepts responsibility to pay for the television licence and provide evidence of the purchase at their own expense.'
        }
    ];

    particulars.forEach(item => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(item.label, { continued: false })
           .font('Helvetica')
           .text(item.value, { indent: 20 })
           .moveDown(0.5);
    });

    doc.moveDown();
}

/**
 * Add section header
 */
function addSectionHeader(doc, title) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(title)
       .moveDown(1);
}

/**
 * Add Terms and Conditions
 */
function addTermsAndConditions(doc) {
    doc.addPage();
    addSectionHeader(doc, 'PART 2 - TERMS AND CONDITIONS');

    const sections = [
        {
            number: '1.',
            title: 'About the Licence to Occupy a Room in the Property',
            clauses: [
                'The Householder permits the Lodger to occupy the Room until either party ends the arrangement as provided for under clause 9 of this agreement.',
                'The Lodger will occupy the Room personally and shall not share the Room with any other person, except where the Lodger has asked to share the Room with another person and the Householder has agreed in writing.',
                'The Lodger shall have use of the Contents in the Room, an inventory of which will be prepared by the Householder and provided to the Lodger.',
                'The Lodger may use the facilities of the Shared Areas of the Property in common with the Householder (and the other Lodgers of the Householder) but only in conjunction with their occupation of the Room under this agreement.',
                'This agreement is not intended to confer exclusive possession upon the Lodger nor to create the relationship of landlord and tenant between the parties. The Lodger shall not be entitled to an assured tenancy or a statutory periodic tenancy under the Housing Act 1988 or any other statutory security of tenure now or when the licence ends.',
                'This agreement is personal to the Lodger, cannot be assigned to any other party, and can be terminated by either party on notice or without notice in the case of serious breaches of the agreement.',
                'It is a condition of this agreement that the Lodger maintain a "Right to Rent" as defined by the Immigration Act 2014 at all times during the Term.'
            ]
        },
        {
            number: '2.',
            title: 'Lodger Obligations',
            clauses: [
                '2.1. Payments',
                '2.1.1. To pay the Accommodation Payment at the times and in the manner set out above.',
                '2.1.2. To pay simple interest at the rate of 3% above the Bank of England base rate upon any payment or other money lawfully due from the Lodger under this Agreement which is not paid to the Householder within 14 days after the due date for payment.',
                '',
                '2.2. Use of the Property',
                '2.2.1. Not to use or occupy the Room in any way whatsoever other than as a private residence.',
                '2.2.2. Not to let or purport to let or share any rooms at the Property or take in any lodger or paying guest.',
                '2.2.3. With the Householder\'s prior permission, the Lodger is allowed to have occasional overnight visitors.',
                '',
                '2.3. Maintenance',
                '2.3.1. To keep the interior of the Room and all other Shared Parts (including the lavatory and bathroom) in good and clean condition.',
                '2.3.2. To keep the Contents in good condition and shall not remove any articles from the Room.',
                '2.3.3. To make good all damage to the Contents and replace with articles of a similar kind and value any items broken or damaged by the Lodger.',
                '',
                '2.4. Activities at the Property',
                '2.4.1. Not to smoke cigarettes, cigars, pipes or any other substances in the Property (only outside).',
                '2.4.2. To cook at the Property only in the kitchen.',
                '2.4.3. Not to keep any pet or any kind of animal at the Property without the Householder\'s prior consent.',
                '2.4.4. Not make any alteration or addition to the Room or without the Householder\'s prior written consent do any redecoration or painting of the Room.',
                '2.4.5. Not do or omit to do anything on or at the Property which may be or become a nuisance or annoyance to the Householder or any other occupiers of the Property.',
                '2.4.6. To ensure that the Room is cleaned weekly and that all rubbish is disposed of daily.',
                '',
                '2.5. At the end of the Agreement',
                '2.5.1. To vacate the Room and the Property at the end of Term and leave the Room in the same clean and tidy state and condition it was in at the beginning of the Term (fair wear and tear excepted).',
                '2.5.2. To provide the Householder with a forwarding address when the agreement comes to an end and remove all rubbish and all personal items from the Property before leaving.'
            ]
        },
        {
            number: '3.',
            title: 'Householder Obligations',
            clauses: [
                'The Householder agrees with the Lodger:',
                '3.1. To keep in good repair the structure and exterior of the Property and the Room (including drains gutters and external pipes).',
                '3.2. To keep in repair and proper working order the installations in the Property for the supply of water, gas and electricity and for sanitation.',
                '3.3. To comply with the Gas Safety (Installation and Use) Regulations 1998 by ensuring that all gas appliances in the Property are checked by a Gas Safe-registered installer on an annual basis.',
                '3.4. To ensure that all furniture and furnishings provided for use by the Lodger complies with the Furniture and Furnishings (Fire)(Safety) Regulations, 1988.',
                '3.5. To ensure that all electrical equipment supplied to the Lodger is kept in good repair and is not damaged or defective.',
                '3.6. To install and keep in good working order smoke detectors in the Property, and, if there is a fixed combustion appliance, a carbon monoxide detector.',
                '3.7. To ensure that at all times the Room and the Shared Areas are fit for human habitation.',
                '3.8. To pay the Council Tax for the Property during the Term.',
                '3.9. To warrant that they have permission to take in lodgers in the Property.'
            ]
        }
    ];

    sections.forEach(section => {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(`${section.number} ${section.title}`)
           .moveDown(0.5);

        section.clauses.forEach(clause => {
            if (clause === '') {
                doc.moveDown(0.3);
            } else {
                doc.fontSize(9)
                   .font('Helvetica')
                   .text(clause, { indent: clause.startsWith('2.') || clause.startsWith('3.') ? 0 : 20 })
                   .moveDown(0.3);
            }
        });

        doc.moveDown(1);
    });

    // Add page for remaining clauses
    addRemainingClauses(doc);
}

/**
 * Add remaining clauses (Ending Agreement, Deposit, etc.)
 */
function addRemainingClauses(doc) {
    doc.addPage();

    const additionalSections = [
        {
            number: '9.',
            title: 'Ending this Agreement',
            clauses: [
                '9.1. Termination for breach: If at any time during the Term the Lodger is in breach of any term of this agreement, or any sums due under this agreement are more than 14 days late, the Householder may terminate this agreement by giving 7 days\' notice to the Lodger in writing to remedy the breach. If after 7 days the breach has not been remedied the landlord may terminate this agreement by giving a further 14 days\' notice in writing to the Lodger.',
                '',
                '9.2. Break Clause: Either party may at any time during the Term terminate this Agreement by giving to the other prior written notice of not less than one calendar month expiring the day before a Payment Day. Upon the expiry of that notice this Agreement shall end with no further liability for either party except for any existing breaches.',
                '',
                '9.3. Behaviour Clause: If the householder deems that the behaviour of the tenant is unacceptable, the householder will provide in writing a warning notice of this breach. If the tenant fails to correct this behaviour the householder may terminate the contract with a maximum of 14 days notice, depending on the severity of the behaviour. For example, aggressive behavior may result in immediate termination.',
                '',
                '9.4. At the end of the agreement any items remaining in the Property or Room which are the property of the Lodger must be removed by the Lodger. If any items (apart from perishable food) are left behind by the Lodger the Householder will make reasonable efforts to notify the Lodger and will store them for a period of 14 days, after which time the Householder will be permitted to dispose of the items as they see fit.'
            ]
        },
        {
            number: '6.',
            title: 'Deposit (if applicable)',
            clauses: [
                '6.1. The Deposit will be held by the Householder during the Term. No interest will be payable by the Householder to the Lodger in respect of the deposit money.',
                '6.2. The Householder is not required to protect the Deposit with a Government approved protection scheme.',
                '6.3. At the end of the Term (however it ends) on giving vacant possession of the Room to the Householder the Deposit shall will be refunded to the Lodger but less any reasonable deductions properly made by the Householder to cover any reasonable costs incurred by or losses caused to him by any breaches of the Lodger\'s obligations under this Agreement.',
                '6.4. The Deposit shall be repaid to the Lodger, at the forwarding address provided to the Householder, as soon as reasonably practicable. The Householder shall not except where they can demonstrate exceptional circumstances retain the Deposit for more than one month.'
            ]
        }
    ];

    additionalSections.forEach(section => {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(`${section.number} ${section.title}`)
           .moveDown(0.5);

        section.clauses.forEach(clause => {
            if (clause === '') {
                doc.moveDown(0.3);
            } else {
                doc.fontSize(9)
                   .font('Helvetica')
                   .text(clause, { indent: 20 })
                   .moveDown(0.3);
            }
        });

        doc.moveDown(1);
    });
}

/**
 * Add signatures section
 */
function addSignatures(doc, tenancy, landlord, lodger) {
    doc.addPage();
    addSectionHeader(doc, 'SIGNATURES');

    doc.fontSize(10)
       .font('Helvetica')
       .text('The parties agree to the terms and conditions set out in this agreement:', { align: 'justify' })
       .moveDown(2);

    // Agreement Reference
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .text('Agreement Reference: ', { continued: true })
       .font('Helvetica')
       .text(tenancy.agreement_reference)
       .moveDown(2);

    // Lodger Signature
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('LODGER SIGNATURE')
       .moveDown(0.5);

    if (tenancy.lodger_signature_data) {
        doc.font('Helvetica-Oblique')
           .fontSize(12)
           .text(lodger.full_name)
           .fontSize(9)
           .font('Helvetica')
           .text(tenancy.lodger_signature_data)
           .moveDown(0.3);
    }

    doc.fontSize(9)
       .text('Date: ' + formatDate(tenancy.signature_date || tenancy.created_at))
       .moveDown(2);

    // Landlord Signature
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('HOUSEHOLDER (LANDLORD) SIGNATURE')
       .moveDown(0.5);

    if (tenancy.landlord_signature_data) {
        doc.font('Helvetica-Oblique')
           .fontSize(12)
           .text(landlord.full_name)
           .fontSize(9)
           .font('Helvetica')
           .text(tenancy.landlord_signature_data)
           .moveDown(0.3);
    }

    doc.fontSize(9)
       .text('Date: ' + formatDate(tenancy.signature_date || tenancy.created_at))
       .moveDown(3);

    // Important Notice
    doc.fontSize(8)
       .fillColor('#666666')
       .text(
           'This agreement is legally binding. Both parties should keep a signed copy for their records. ' +
           'This document was generated electronically by the Lodger Management System.',
           { align: 'center' }
       );
}

/**
 * Add photo ID page
 */
function addPhotoID(doc, tenancy) {
    doc.addPage();
    addSectionHeader(doc, 'PHOTO IDENTIFICATION');

    doc.fontSize(10)
       .font('Helvetica')
       .text('ID Type: ', { continued: true })
       .font('Helvetica-Bold')
       .text(tenancy.photo_id_type === 'passport' ? 'Passport' : 'Driving License')
       .font('Helvetica')
       .text('Expiry Date: ', { continued: true })
       .font('Helvetica-Bold')
       .text(formatDate(tenancy.photo_id_expiry_date))
       .moveDown(2);

    // Add photo if exists
    try {
        const photoPath = path.join(__dirname, '..', tenancy.photo_id_path);
        if (fs.existsSync(photoPath)) {
            doc.image(photoPath, {
                fit: [400, 400],
                align: 'center'
            });
        }
    } catch (error) {
        doc.fontSize(9)
           .fillColor('#999999')
           .text('Photo ID image could not be embedded', { align: 'center' });
    }
}

/**
 * Format date helper
 */
function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Generate termination notice letter
 */
async function generateTerminationNoticePDF(notice, tenancy, property, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // Header
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text('NOTICE OF TERMINATION', { align: 'center' })
               .moveDown(2);

            // Date
            doc.fontSize(10)
               .font('Helvetica')
               .text('Date: ' + formatDate(notice.notice_date), { align: 'right' })
               .moveDown(2);

            // Property details
            doc.text('Property Address:', { continued: false })
               .font('Helvetica-Bold')
               .text(`${property.address_line1}, ${property.city}, ${property.postcode}`)
               .moveDown(1);

            // Notice details
            doc.font('Helvetica')
               .text('Agreement Reference: ', { continued: true })
               .font('Helvetica-Bold')
               .text(tenancy.agreement_reference)
               .moveDown(2);

            // Main content
            doc.font('Helvetica')
               .fontSize(11)
               .text('Dear ' + (notice.given_by === tenancy.landlord_id ? tenancy.lodger_name : tenancy.landlord_name) + ',')
               .moveDown(1);

            const noticeText = getNoticeText(notice);
            doc.text(noticeText, { align: 'justify' })
               .moveDown(2);

            // Key dates
            doc.fontSize(10)
               .font('Helvetica-Bold')
               .text('Notice Given: ', { continued: true })
               .font('Helvetica')
               .text(formatDate(notice.notice_date))
               .font('Helvetica-Bold')
               .text('Effective Date: ', { continued: true })
               .font('Helvetica')
               .text(formatDate(notice.effective_date))
               .font('Helvetica-Bold')
               .text('Days Notice: ', { continued: true })
               .font('Helvetica')
               .text(notice.days_notice + ' days')
               .moveDown(2);

            // Footer
            doc.fontSize(9)
               .text('This notice is issued in accordance with the terms of the Lodger Agreement.')
               .moveDown(2);

            doc.fontSize(10)
               .text('Yours sincerely,')
               .moveDown(3)
               .font('Helvetica-Bold')
               .text(notice.given_by === tenancy.landlord_id ? tenancy.landlord_name : tenancy.lodger_name);

            doc.end();

            stream.on('finish', () => resolve(outputPath));
            stream.on('error', reject);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get notice text based on type
 */
function getNoticeText(notice) {
    switch(notice.notice_type) {
        case 'standard_termination':
            return 'I am writing to give you formal notice that I wish to terminate the lodger agreement. ' +
                   'As per the terms of the agreement, this notice period is one calendar month (28 days) ' +
                   'from the date of this letter. The termination will be effective on the date specified above.';
        
        case 'late_payment_breach':
            return 'I am writing to notify you that due to late payment of rent (more than 14 days overdue), ' +
                   'this constitutes a breach of the lodger agreement. You were given 7 days notice to remedy ' +
                   'this breach. As the breach has not been remedied, I am now giving you 14 days notice to ' +
                   'terminate the agreement as per clause 9.1 of the agreement.';
        
        case 'behaviour_breach':
            return 'I am writing to notify you that your behaviour has been deemed unacceptable and constitutes ' +
                   'a breach of the lodger agreement. You were given a warning notice about this breach. As the ' +
                   'behaviour has not been corrected, I am terminating the agreement with the notice period ' +
                   'specified above, as per clause 9.3 of the agreement.';
        
        case 'early_termination':
            return 'I am writing to give you notice that I wish to terminate the lodger agreement early, ' +
                   'within the rental term. As per the early termination clause, this requires mutual agreement. ' +
                   'Any deposit taken will be void unless we mutually agree otherwise.';
        
        default:
            return 'I am writing to give you formal notice of termination of the lodger agreement.';
    }
}

module.exports = {
    generateAgreementPDF,
    generateTerminationNoticePDF
};