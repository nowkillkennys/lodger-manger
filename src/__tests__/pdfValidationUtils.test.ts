import { validatePDFGeneration, isPDFGenerationValid } from '../utils/pdfValidationUtils';
import type { TenancyAgreement } from '../types/TenancyAgreement';

describe('PDF Validation Utils', () => {
    const validAgreement: TenancyAgreement = {
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
            includedAmenities: ['WiFi'],
            sharedFacilities: ['Kitchen']
        },
        rentAmount: 800,
        rentPaymentFrequency: 'monthly',
        depositAmount: 1000,
        paymentMethod: 'Bank Transfer',
        noticePeriod: 30,
        houseRules: ['No smoking'],
        maintenanceTerms: 'Standard maintenance',
        utilitiesIncluded: ['Water'],
        isSignedByLandlord: true,
        isSignedByTenant: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    it('should return no errors for valid agreement', () => {
        const errors = validatePDFGeneration(validAgreement);
        expect(errors).toHaveLength(0);
        expect(isPDFGenerationValid(validAgreement)).toBe(true);
    });

    it('should validate landlord signature', () => {
        const agreement = {
            ...validAgreement,
            isSignedByLandlord: false
        };
        const errors = validatePDFGeneration(agreement);
        expect(errors).toContainEqual({
            field: 'signature',
            message: 'Agreement must be signed by landlord'
        });
        expect(isPDFGenerationValid(agreement)).toBe(false);
    });

    it('should validate rent amount', () => {
        const agreement = {
            ...validAgreement,
            rentAmount: 0
        };
        const errors = validatePDFGeneration(agreement);
        expect(errors).toContainEqual({
            field: 'rentAmount',
            message: 'Valid rent amount is required'
        });
    });

    it('should validate contact information', () => {
        const agreement = {
            ...validAgreement,
            landlordDetails: {
                ...validAgreement.landlordDetails,
                email: ''
            }
        };
        const errors = validatePDFGeneration(agreement);
        expect(errors).toContainEqual({
            field: 'landlordContact',
            message: 'Landlord contact information is required'
        });
    });

    it('should validate deposit amount is not negative', () => {
        const agreement = {
            ...validAgreement,
            depositAmount: -100
        };
        const errors = validatePDFGeneration(agreement);
        expect(errors).toContainEqual({
            field: 'depositAmount',
            message: 'Deposit amount cannot be negative'
        });
    });
});