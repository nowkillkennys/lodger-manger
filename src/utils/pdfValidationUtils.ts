import type { TenancyAgreement } from '../types/TenancyAgreement';

export interface PDFValidationError {
    field: string;
    message: string;
}

export const validatePDFGeneration = (agreement: TenancyAgreement): PDFValidationError[] => {
    const errors: PDFValidationError[] = [];

    // Required signatures
    if (!agreement.isSignedByLandlord) {
        errors.push({
            field: 'signature',
            message: 'Agreement must be signed by landlord'
        });
    }

    // Required dates
    if (!agreement.startDate) {
        errors.push({
            field: 'startDate',
            message: 'Start date is required'
        });
    }

    // Required amounts
    if (agreement.rentAmount <= 0) {
        errors.push({
            field: 'rentAmount',
            message: 'Valid rent amount is required'
        });
    }

    if (agreement.depositAmount < 0) {
        errors.push({
            field: 'depositAmount',
            message: 'Deposit amount cannot be negative'
        });
    }

    // Required contact information
    if (!agreement.landlordDetails.contactNumber || !agreement.landlordDetails.email) {
        errors.push({
            field: 'landlordContact',
            message: 'Landlord contact information is required'
        });
    }

    if (!agreement.tenantDetails.contactNumber || !agreement.tenantDetails.email) {
        errors.push({
            field: 'tenantContact',
            message: 'Tenant contact information is required'
        });
    }

    return errors;
};

export const isPDFGenerationValid = (agreement: TenancyAgreement): boolean => {
    return validatePDFGeneration(agreement).length === 0;
};