import { TenancyAgreement } from '../types/TenancyAgreement';

interface ValidationError {
  field: string;
  message: string;
}

export function validateTenancyAgreement(agreement: TenancyAgreement): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!agreement.landlordDetails.name) {
    errors.push({
      field: 'landlordName',
      message: 'Landlord name is required'
    });
  }

  if (!agreement.tenantDetails.name) {
    errors.push({
      field: 'tenantName',
      message: 'Tenant name is required'
    });
  }

  if (!agreement.propertyDetails.address) {
    errors.push({
      field: 'propertyAddress',
      message: 'Property address is required'
    });
  }

  if (!agreement.startDate) {
    errors.push({
      field: 'startDate',
      message: 'Start date is required'
    });
  }

  if (agreement.rentAmount <= 0) {
    errors.push({
      field: 'rentAmount',
      message: 'Rent amount must be greater than 0'
    });
  }

  if (agreement.depositAmount < 0) {
    errors.push({
      field: 'depositAmount',
      message: 'Deposit amount cannot be negative'
    });
  }

  if (!agreement.paymentMethod) {
    errors.push({
      field: 'paymentMethod',
      message: 'Payment method is required'
    });
  }

  return errors;
}

export function validatePDFGeneration(agreement: TenancyAgreement): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const basicValidation = validateTenancyAgreement(agreement);
  if (basicValidation.length > 0) {
    return basicValidation;
  }

  if (!agreement.agreementId) {
    errors.push({
      field: 'agreementId',
      message: 'Agreement ID is required for PDF generation'
    });
  }

  const requiredSignatures = ['landlord', 'tenant'];
  const missingSignatures = requiredSignatures.filter(
    role => !agreement.signatures?.some(sig => sig.role === role)
  );

  if (missingSignatures.length > 0) {
    errors.push({
      field: 'signatures',
      message: `Missing signatures from: ${missingSignatures.join(', ')}`
    });
  }

  return errors;
}

export function validateFileUpload(file: File): ValidationError[] {
  const errors: ValidationError[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['application/pdf'];

  if (file.size > maxSize) {
    errors.push({
      field: 'fileSize',
      message: 'File size exceeds 5MB limit'
    });
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'fileType',
      message: 'Only PDF files are allowed'
    });
  }

  return errors;
}