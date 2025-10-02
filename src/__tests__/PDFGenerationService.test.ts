import PDFGenerationService from '../services/PDFGenerationService';
import type { TenancyAgreement } from '../types/TenancyAgreement';

jest.mock('pdfkit', () => {
    return jest.fn().mockImplementation(() => ({
        pipe: jest.fn(),
        fontSize: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        list: jest.fn().mockReturnThis(),
        on: jest.fn((event, callback) => {
            if (event === 'end') {
                callback();
            }
        }),
        end: jest.fn()
    }));
});

describe('PDFGenerationService', () => {
    const mockAgreement: TenancyAgreement = {
        agreementId: 'TEST-123',
        startDate: new Date(),
        landlordDetails: {
            name: 'John Doe',
            address: '123 Landlord St',
            contactNumber: '07123456789',
            email: 'john@example.com'
        },
        tenantDetails: {
            name: 'Jane Smith',
            currentAddress: '456 Tenant Ave',
            contactNumber: '07987654321',
            email: 'jane@example.com',
            idVerification: 'PASSPORT-123'
        },
        propertyDetails: {
            address: '789 Rental Rd',
            includedAmenities: ['WiFi', 'Washing Machine'],
            sharedFacilities: ['Kitchen', 'Bathroom']
        },
        rentAmount: 800,
        rentPaymentFrequency: 'monthly',
        depositAmount: 1000,
        paymentMethod: 'Bank Transfer',
        noticePeriod: 30,
        houseRules: ['No smoking', 'No pets'],
        maintenanceTerms: 'Standard maintenance included',
        utilitiesIncluded: ['Water', 'Electricity', 'Gas'],
        isSignedByLandlord: false,
        isSignedByTenant: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    it('should generate PDF buffer', async () => {
        const pdfBuffer = await PDFGenerationService.generateTenancyAgreement(mockAgreement);
        expect(pdfBuffer).toBeInstanceOf(Buffer);
    });

    it('should handle errors during PDF generation', async () => {
        const invalidAgreement = { ...mockAgreement, landlordDetails: undefined };
        await expect(PDFGenerationService.generateTenancyAgreement(invalidAgreement as any))
            .rejects
            .toThrow();
    });
});