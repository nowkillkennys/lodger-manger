import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { NotificationProvider } from '../contexts/NotificationContext';
import TenancyAgreement from '../components/TenancyAgreement';
import PDFGenerationService from '../services/PDFGenerationService';
import AgreementDatabaseService from '../services/AgreementDatabaseService';

jest.mock('../services/PDFGenerationService');
jest.mock('../services/AgreementDatabaseService');

describe('TenancyAgreement Integration', () => {
  const mockAgreement = {
    agreementId: 'TEST-123',
    startDate: new Date(),
    landlordDetails: {
      name: 'John Doe',
      address: '123 Test St',
      contactNumber: '07123456789',
      email: 'john@test.com'
    },
    tenantDetails: {
      name: 'Jane Smith',
      currentAddress: '456 Test Ave',
      contactNumber: '07987654321',
      email: 'jane@test.com',
      idVerification: 'TEST-ID'
    },
    propertyDetails: {
      address: '789 Test Rd',
      includedAmenities: ['Test Amenity'],
      sharedFacilities: ['Test Facility']
    },
    rentAmount: 1000,
    rentPaymentFrequency: 'monthly',
    depositAmount: 1000,
    paymentMethod: 'Bank Transfer',
    noticePeriod: 30,
    houseRules: ['Test Rule'],
    maintenanceTerms: 'Test Terms',
    utilitiesIncluded: ['Test Utility'],
    isSignedByLandlord: true,
    isSignedByTenant: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    (PDFGenerationService.generateTenancyAgreement as jest.Mock).mockResolvedValue(new Uint8Array());
    (AgreementDatabaseService.saveAgreement as jest.Mock).mockResolvedValue(undefined);
  });

  const renderComponent = () => {
    return render(
      <NotificationProvider>
        <TenancyAgreement
          tenantData={mockAgreement}
          onComplete={jest.fn()}
          onCancel={jest.fn()}
        />
      </NotificationProvider>
    );
  };

  it('completes full agreement workflow successfully', async () => {
    renderComponent();

    // Accept agreement
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Preview agreement
    const previewButton = screen.getByText('Preview Agreement');
    fireEvent.click(previewButton);
    
    await waitFor(() => {
      expect(screen.getByText('Agreement Preview')).toBeInTheDocument();
    });

    // Generate PDF
    const generateButton = screen.getByText('Generate PDF');
    await act(async () => {
      fireEvent.click(generateButton);
    });

    expect(PDFGenerationService.generateTenancyAgreement).toHaveBeenCalledWith(mockAgreement);
    expect(AgreementDatabaseService.saveAgreement).toHaveBeenCalledWith(mockAgreement);
    expect(screen.getByText('PDF generated successfully')).toBeInTheDocument();
  });

  it('handles PDF generation errors appropriately', async () => {
    (PDFGenerationService.generateTenancyAgreement as jest.Mock)
      .mockRejectedValue(new Error('PDF generation failed'));

    renderComponent();

    // Accept and preview
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Preview Agreement'));

    // Attempt to generate PDF
    await act(async () => {
      fireEvent.click(screen.getByText('Generate PDF'));
    });

    expect(screen.getByText('Failed to generate PDF')).toBeInTheDocument();
  });

  it('validates agreement before preview', async () => {
    const invalidAgreement = {
      ...mockAgreement,
      isSignedByLandlord: false
    };

    render(
      <NotificationProvider>
        <TenancyAgreement
          tenantData={invalidAgreement}
          onComplete={jest.fn()}
          onCancel={jest.fn()}
        />
      </NotificationProvider>
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('Preview Agreement'));

    expect(screen.getByText('Agreement must be signed by landlord')).toBeInTheDocument();
  });
});