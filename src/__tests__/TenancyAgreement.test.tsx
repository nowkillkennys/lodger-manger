import { render, screen, fireEvent, act } from '@testing-library/react';
import TenancyAgreement from '../components/TenancyAgreement';
import { validatePDFGeneration } from '../utils/pdfValidationUtils';
import PDFGenerationService from '../services/PDFGenerationService';

jest.mock('../utils/pdfValidationUtils');
jest.mock('../services/PDFGenerationService');

describe('TenancyAgreement PDF Generation', () => {
  const mockAgreement = {
    agreementId: 'TEST-123',
    // ... other agreement properties
  };

  beforeEach(() => {
    (validatePDFGeneration as jest.Mock).mockReturnValue([]);
    (PDFGenerationService.generateTenancyAgreement as jest.Mock).mockResolvedValue(new Uint8Array());
  });

  it('shows validation error when PDF generation requirements are not met', async () => {
    (validatePDFGeneration as jest.Mock).mockReturnValue([
      { field: 'signature', message: 'Agreement must be signed by landlord' }
    ]);

    render(
      <TenancyAgreement
        tenantData={mockAgreement}
        onComplete={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Preview Agreement'));
    });

    expect(screen.getByText('Agreement must be signed by landlord')).toBeInTheDocument();
  });

  it('generates PDF when all validation requirements are met', async () => {
    (validatePDFGeneration as jest.Mock).mockReturnValue([]);
    
    render(
      <TenancyAgreement
        tenantData={mockAgreement}
        onComplete={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Preview Agreement'));
      fireEvent.click(screen.getByText('Generate PDF'));
    });

    expect(PDFGenerationService.generateTenancyAgreement).toHaveBeenCalled();
    expect(screen.getByText('PDF generated successfully')).toBeInTheDocument();
  });
});