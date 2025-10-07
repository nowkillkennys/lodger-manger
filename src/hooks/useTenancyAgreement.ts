import { useState, useCallback } from 'react';
import type { TenancyAgreement } from '../models/TenancyAgreement';
import { validateTenancyAgreement, type ValidationError } from '../utils/validationUtils';
import PDFGenerationService from '../services/PDFGenerationService';

export const useTenancyAgreement = () => {
    const [agreement, setAgreement] = useState<TenancyAgreement | null>(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<ValidationError[]>([]);

    const generateAgreement = useCallback(async (tenantData: Partial<TenancyAgreement>) => {
        try {
            setLoading(true);
            setErrors([]);
            
            // Validate the agreement data
            const validationErrors = validateTenancyAgreement(tenantData);
            if (validationErrors.length > 0) {
                setErrors(validationErrors);
                return null;
            }

            // Generate unique ID and create agreement
            const agreementId = `TA-${Date.now()}`;
            const newAgreement: TenancyAgreement = {
                agreementId,
                startDate: new Date(),
                landlordDetails: {
                    name: process.env.REACT_APP_LANDLORD_NAME || '',
                    address: process.env.REACT_APP_LANDLORD_ADDRESS || '',
                    contactNumber: process.env.REACT_APP_LANDLORD_CONTACT || '',
                    email: process.env.REACT_APP_LANDLORD_EMAIL || ''
                },
                tenantDetails: {
                    name: '',
                    currentAddress: '',
                    contactNumber: '',
                    email: '',
                    idVerification: ''
                },
                propertyDetails: {
                    address: '',
                    includedAmenities: [],
                    sharedFacilities: []
                },
                rentAmount: 0,
                rentPaymentFrequency: 'monthly',
                depositAmount: 0,
                paymentMethod: '',
                noticePeriod: 30,
                houseRules: [],
                maintenanceTerms: '',
                utilitiesIncluded: [],
                isSignedByLandlord: false,
                isSignedByTenant: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...tenantData
            };

            setAgreement(newAgreement);
            return newAgreement;
        } catch (err) {
            setErrors([{ field: 'general', message: 'Failed to generate agreement' }]);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const signAgreement = useCallback(async (
        agreementId: string, 
        partyType: 'landlord' | 'tenant'
    ) => {
        if (!agreement) return;

        try {
            setLoading(true);
            setErrors([]);
            
            const updatedAgreement = {
                ...agreement,
                isSignedByLandlord: partyType === 'landlord' ? true : agreement.isSignedByLandlord,
                isSignedByTenant: partyType === 'tenant' ? true : agreement.isSignedByTenant,
                signedDate: new Date(),
                updatedAt: new Date()
            };

            setAgreement(updatedAgreement);
            return updatedAgreement;
        } catch (err) {
            setErrors([{ field: 'signature', message: 'Failed to sign agreement' }]);
        } finally {
            setLoading(false);
        }
    }, [agreement]);

    const generatePDF = useCallback(async () => {
        if (!agreement) {
            setErrors([{ field: 'general', message: 'No agreement available' }]);
            return null;
        }

        try {
            setLoading(true);
            return await PDFGenerationService.generateTenancyAgreement(agreement);
        } catch (err) {
            setErrors([{ field: 'pdf', message: 'Failed to generate PDF' }]);
            return null;
        } finally {
            setLoading(false);
        }
    }, [agreement]);

    return {
        agreement,
        loading,
        errors,
        generateAgreement,
        signAgreement,
        generatePDF
    };
};