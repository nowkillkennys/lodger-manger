import { render, fireEvent, screen } from '@testing-library/react';
import AgreementPreview from '../components/AgreementPreview';
import type { TenancyAgreement } from '../types/TenancyAgreement';

describe('AgreementPreview', () => {
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
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    };

    const mockHandlers = {
        onApprove: jest.fn(),
        onEdit: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders agreement details correctly', () => {
        render(
            <AgreementPreview
                agreement={mockAgreement}
                onApprove={mockHandlers.onApprove}
                onEdit={mockHandlers.onEdit}
            />
        );

        expect(screen.getByText('Agreement Preview')).toBeInTheDocument();
        expect(screen.getByText(mockAgreement.landlordDetails.name)).toBeInTheDocument();
        expect(screen.getByText(mockAgreement.tenantDetails.name)).toBeInTheDocument();
        expect(screen.getByText(mockAgreement.propertyDetails.address)).toBeInTheDocument();
        expect(screen.getByText(`£${mockAgreement.rentAmount}`)).toBeInTheDocument();
    });

    it('calls onApprove when Generate PDF button is clicked', () => {
        render(
            <AgreementPreview
                agreement={mockAgreement}
                onApprove={mockHandlers.onApprove}
                onEdit={mockHandlers.onEdit}
            />
        );

        fireEvent.click(screen.getByText('Generate PDF'));
        expect(mockHandlers.onApprove).toHaveBeenCalled();
    });

    it('calls onEdit when Edit Agreement button is clicked', () => {
        render(
            <AgreementPreview
                agreement={mockAgreement}
                onApprove={mockHandlers.onApprove}
                onEdit={mockHandlers.onEdit}
            />
        );

        fireEvent.click(screen.getByText('Edit Agreement'));
        expect(mockHandlers.onEdit).toHaveBeenCalled();
    });

    it('displays all house rules', () => {
        render(
            <AgreementPreview
                agreement={mockAgreement}
                onApprove={mockHandlers.onApprove}
                onEdit={mockHandlers.onEdit}
            />
        );

        mockAgreement.houseRules.forEach(rule => {
            expect(screen.getByText(rule)).toBeInTheDocument();
        });
    });

    it('displays all utilities included', () => {
        render(
            <AgreementPreview
                agreement={mockAgreement}
                onApprove={mockHandlers.onApprove}
                onEdit={mockHandlers.onEdit}
            />
        );

        mockAgreement.utilitiesIncluded.forEach(utility => {
            expect(screen.getByText(utility)).toBeInTheDocument();
        });
    });
});