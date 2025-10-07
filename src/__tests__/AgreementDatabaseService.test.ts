import AgreementDatabaseService from '../services/AgreementDatabaseService';
import type { TenancyAgreement } from '../types/TenancyAgreement';

describe('AgreementDatabaseService', () => {
  const mockAgreement: TenancyAgreement = {
    agreementId: 'TEST-123',
    startDate: new Date('2024-01-01'),
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves agreement correctly', async () => {
    await AgreementDatabaseService.saveAgreement(mockAgreement);
    const retrieved = await AgreementDatabaseService.getAgreement(mockAgreement.agreementId);
    
    // Convert dates back to Date objects for comparison
    const expectedAgreement = {
      ...mockAgreement,
      startDate: new Date(mockAgreement.startDate),
      createdAt: new Date(mockAgreement.createdAt),
      updatedAt: new Date(mockAgreement.updatedAt)
    };
    
    expect(retrieved).toEqual(expectedAgreement);
  });

  it('updates existing agreement', async () => {
    await AgreementDatabaseService.saveAgreement(mockAgreement);
    
    const updatedAgreement = {
      ...mockAgreement,
      isSignedByTenant: true,
      updatedAt: new Date('2024-01-02')
    };
    
    await AgreementDatabaseService.saveAgreement(updatedAgreement);
    const retrieved = await AgreementDatabaseService.getAgreement(mockAgreement.agreementId);
    
    expect(retrieved?.isSignedByTenant).toBe(true);
  });

  it('returns null for non-existent agreement', async () => {
    const retrieved = await AgreementDatabaseService.getAgreement('NON-EXISTENT-ID');
    expect(retrieved).toBeNull();
  });

  it('handles localStorage errors gracefully', async () => {
    // Mock localStorage setItem to throw an error
    const mockSetItem = jest.spyOn(Storage.prototype, 'setItem');
    mockSetItem.mockImplementation(() => {
      throw new Error('Storage full');
    });

    await expect(AgreementDatabaseService.saveAgreement(mockAgreement))
      .rejects
      .toThrow('Failed to save agreement');

    mockSetItem.mockRestore();
  });
});