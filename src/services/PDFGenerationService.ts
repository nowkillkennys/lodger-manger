import PDFDocument from 'pdfkit';
import type TenancyAgreement from '../models/TenancyAgreement';
import { formatDate } from '../utils/dateUtils';

export class PDFGenerationService {
    generateTenancyAgreement(agreement: TenancyAgreement): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                this.addHeader(doc, agreement);
                this.addParties(doc, agreement);
                this.addPropertyDetails(doc, agreement);
                this.addFinancialTerms(doc, agreement);
                this.addTermsAndConditions(doc, agreement);
                this.addSignatures(doc, agreement);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private addHeader(doc: PDFKit.PDFDocument, agreement: TenancyAgreement) {
        doc.fontSize(18)
           .text('TENANCY AGREEMENT', { align: 'center' })
           .moveDown()
           .fontSize(12)
           .text(`Agreement ID: ${agreement.agreementId}`, { align: 'right' })
           .text(`Date: ${formatDate(agreement.createdAt)}`, { align: 'right' })
           .moveDown(2);
    }

    private addParties(doc: PDFKit.PDFDocument, agreement: TenancyAgreement) {
        doc.fontSize(14)
           .text('1. PARTIES', { underline: true })
           .moveDown()
           .fontSize(12);

        doc.text('LANDLORD:')
           .text(agreement.landlordDetails.name)
           .text(agreement.landlordDetails.address)
           .moveDown();

        doc.text('TENANT:')
           .text(agreement.tenantDetails.name)
           .text(agreement.tenantDetails.currentAddress)
           .moveDown(2);
    }

    private addPropertyDetails(doc: PDFKit.PDFDocument, agreement: TenancyAgreement) {
        doc.fontSize(14)
           .text('2. PROPERTY DETAILS', { underline: true })
           .moveDown()
           .fontSize(12);

        doc.text('Property Address:')
           .text(agreement.propertyDetails.address)
           .moveDown();

        if (agreement.propertyDetails.roomNumber) {
            doc.text('Room Number:')
               .text(agreement.propertyDetails.roomNumber)
               .moveDown();
        }

        doc.text('Included Amenities:')
           .list(agreement.propertyDetails.includedAmenities)
           .moveDown();

        doc.text('Shared Facilities:')
           .list(agreement.propertyDetails.sharedFacilities)
           .moveDown(2);
    }

    private addFinancialTerms(doc: PDFKit.PDFDocument, agreement: TenancyAgreement) {
        doc.fontSize(14)
           .text('3. FINANCIAL TERMS', { underline: true })
           .moveDown()
           .fontSize(12);

        doc.text('Rent Amount:')
           .text(`£${agreement.rentAmount} per ${agreement.rentPaymentFrequency}`)
           .moveDown();

        doc.text('Deposit Amount:')
           .text(`£${agreement.depositAmount}`)
           .moveDown();

        doc.text('Payment Method:')
           .text(agreement.paymentMethod)
           .moveDown(2);
    }

    private addTermsAndConditions(doc: PDFKit.PDFDocument, agreement: TenancyAgreement) {
        doc.fontSize(14)
           .text('4. TERMS AND CONDITIONS', { underline: true })
           .moveDown()
           .fontSize(12);

        doc.text('Notice Period:')
           .text(`${agreement.noticePeriod} days`)
           .moveDown();

        doc.text('House Rules:')
           .list(agreement.houseRules)
           .moveDown();

        doc.text('Maintenance Terms:')
           .text(agreement.maintenanceTerms)
           .moveDown();

        doc.text('Utilities Included:')
           .list(agreement.utilitiesIncluded)
           .moveDown(2);
    }

    private addSignatures(doc: PDFKit.PDFDocument, agreement: TenancyAgreement) {
        doc.fontSize(14)
           .text('5. SIGNATURES', { underline: true })
           .moveDown()
           .fontSize(12);

        doc.text('Landlord:')
           .text(agreement.landlordDetails.name)
           .text('Signed: _______________________')
           .text(`Date: ${agreement.isSignedByLandlord ? formatDate(agreement.signedDate!) : '_______________________'}`)
           .moveDown(2);

        doc.text('Tenant:')
           .text(agreement.tenantDetails.name)
           .text('Signed: _______________________')
           .text(`Date: ${agreement.isSignedByTenant ? formatDate(agreement.signedDate!) : '_______________________'}`)
           .moveDown(2);
    }
}

export default new PDFGenerationService();