import { validateTenancyAgreement, validatePDFGeneration, validateFileUpload } from '../utils/validationUtils';
import type { TenancyAgreement } from '../types/TenancyAgreement';

describe('Validation Utils', () => {
  const validAgreement = {
    agreementId: 'test-123',
    landlordDetails: { name: 'John Doe' },
    tenantDetails: { name: 'Jane Smith' },
    propertyDetails: { address: '123 Test St' },
    startDate: new Date().toISOString(),
    rentAmount: 1000,
    depositAmount: 1500,
    paymentMethod: 'bank_transfer',
    signatures: [
      { role: 'landlord', date: new Date().toISOString() },
      { role: 'tenant', date: new Date().toISOString() }
    ]
  };

  describe('validateTenancyAgreement', () => {
    it('returns no errors for valid agreement', () => {
      const errors = validateTenancyAgreement(validAgreement);
      expect(errors).toHaveLength(0);
    });

    it('validates required fields', () => {
      const invalidAgreement = {
        ...validAgreement,
        landlordDetails: { name: '' },
        rentAmount: 0
      };
      const errors = validateTenancyAgreement(invalidAgreement);
      expect(errors).toHaveLength(2);
      expect(errors[0].field).toBe('landlordName');
      expect(errors[1].field).toBe('rentAmount');
    });
  });

  describe('validatePDFGeneration', () => {
    it('returns no errors for valid agreement with signatures', () => {
      const errors = validatePDFGeneration(validAgreement);
      expect(errors).toHaveLength(0);
    });

    it('validates required signatures', () => {
      const agreementWithoutSignatures = {
        ...validAgreement,
        signatures: []
      };
      const errors = validatePDFGeneration(agreementWithoutSignatures);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('signatures');
    });
  });

  describe('validateFileUpload', () => {
    it('validates file size and type', () => {
      const validFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 }); // 1MB

      const errors = validateFileUpload(validFile);
      expect(errors).toHaveLength(0);
    });

    it('returns errors for invalid files', () => {
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(invalidFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      const errors = validateFileUpload(invalidFile);
      expect(errors).toHaveLength(2);
      expect(errors[0].field).toBe('fileSize');
      expect(errors[1].field).toBe('fileType');
    });
  });
});