import React, { useState, useEffect } from 'react';
import { useTenancyAgreement } from '../hooks/useTenancyAgreement';
import PDFGenerationService from '../services/PDFGenerationService';
import AnalyticsService from '../services/AnalyticsService';
import { validatePDFGeneration } from '../utils/pdfValidationUtils';
import AgreementDatabaseService from '../services/AgreementDatabaseService';
import AgreementPreview from './AgreementPreview';
import { Toast } from './Toast';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import { useNotification } from '../contexts/NotificationContext';
import type { TenancyAgreement } from '../types/TenancyAgreement';
import { validateTenancyAgreement } from '../utils/validationUtils';
import ErrorBoundary from './ErrorBoundary';

interface TenancyAgreementProps {
  tenantData: Partial<TenancyAgreement>;
  onComplete: () => void;
  onCancel: () => void;
}

const TenancyAgreementComponent: React.FC<TenancyAgreementProps> = ({
  tenantData,
  onComplete,
  onCancel
}) => {
  const {
    agreement,
    loading,
    errors,
    generateAgreement,
    signAgreement
  } = useTenancyAgreement();

  const { showNotification } = useNotification();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const initializeAgreement = async () => {
      const newAgreement = await generateAgreement(tenantData);
      if (newAgreement) {
        const validationErrors = validateTenancyAgreement(newAgreement);
        setValidationErrors(validationErrors);
      }
    };
    
    initializeAgreement();
  }, [tenantData]);

  useEffect(() => {
    if (agreement) {
      AnalyticsService.trackEvent('agreement_view', {
        agreementId: agreement.agreementId
      });
    }
  }, [agreement]);

  const handlePreview = async () => {
    if (!agreement) return;

    try {
      const pdfErrors = validatePDFGeneration(agreement);
      if (pdfErrors.length > 0) {
        showToast(pdfErrors[0].message, 'error');
        AnalyticsService.trackEvent('error', {
          agreementId: agreement.agreementId,
          errorMessage: pdfErrors[0].message,
          errorType: 'validation'
        });
        return;
      }

      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      AnalyticsService.trackEvent('error', {
        agreementId: agreement.agreementId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'preview'
      });
    }
  };

  const handleEditAgreement = () => {
    setShowPreview(false);
  };

  const handleDownloadPDF = async () => {
    if (!agreement) return;
    
    try {
      setIsPdfGenerating(true);
      AnalyticsService.trackEvent('pdf_generate', {
        agreementId: agreement.agreementId
      });

      const pdfBuffer = await PDFGenerationService.generateTenancyAgreement(agreement);
      await AgreementDatabaseService.saveAgreement(agreement);
      
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenancy-agreement-${agreement.agreementId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('PDF generated successfully', 'success');
      onComplete();
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast('Failed to generate PDF', 'error');
      AnalyticsService.trackEvent('error', {
        agreementId: agreement.agreementId,
        errorMessage: err instanceof Error ? err.message : 'PDF generation failed',
        errorType: 'pdf_generation'
      });
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleAccept = async () => {
    if (!agreement || !isAgreed) return;
    
    try {
      await signAgreement(agreement.agreementId, 'tenant');
      AnalyticsService.trackEvent('agreement_sign', {
        agreementId: agreement.agreementId,
        signedBy: 'tenant'
      });
      showToast('Agreement signed successfully', 'success');
      handlePreview();
    } catch (err) {
      console.error('Failed to process agreement:', err);
      showToast('Failed to sign agreement', 'error');
      AnalyticsService.trackEvent('error', {
        agreementId: agreement.agreementId,
        errorMessage: err instanceof Error ? err.message : 'Signing failed',
        errorType: 'signature'
      });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading agreement..." />;
  }

  if (!agreement) {
    return <div className="text-gray-600 p-4">No agreement available</div>;
  }

  if (showPreview) {
    return (
      <AgreementPreview
        agreement={agreement}
        onApprove={handleDownloadPDF}
        onEdit={handleEditAgreement}
      />
    );
  }

  return (
    <ErrorBoundary>
      <form className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Tenancy Agreement</h2>
        
        {validationErrors.length > 0 && (
          <div className="mb-4">
            {validationErrors.map((error, index) => (
              <ErrorMessage key={index} message={error.message} />
            ))}
          </div>
        )}

        {/* Agreement content */}
        <div className="prose mb-6">
          <section className="mb-4">
            <h3 className="text-lg font-semibold">1. Parties</h3>
            <div className="mt-2">
              <p><strong>Landlord:</strong> {agreement.landlordDetails.name}</p>
              <p><strong>Tenant:</strong> {agreement.tenantDetails.name}</p>
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-lg font-semibold">2. Property Details</h3>
            <div className="mt-2">
              <p><strong>Address:</strong> {agreement.propertyDetails.address}</p>
              {agreement.propertyDetails.roomNumber && (
                <p><strong>Room Number:</strong> {agreement.propertyDetails.roomNumber}</p>
              )}
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-lg font-semibold">3. Financial Terms</h3>
            <div className="mt-2">
              <p><strong>Rent Amount:</strong> £{agreement.rentAmount} per {agreement.rentPaymentFrequency}</p>
              <p><strong>Deposit Amount:</strong> £{agreement.depositAmount}</p>
              <p><strong>Payment Method:</strong> {agreement.paymentMethod}</p>
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-lg font-semibold">4. Term and Notices</h3>
            <div className="mt-2">
              <p><strong>Start Date:</strong> {agreement.startDate.toLocaleDateString()}</p>
              <p><strong>Notice Period:</strong> {agreement.noticePeriod} days</p>
            </div>
          </section>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <input
            type="checkbox"
            id="agreement"
            checked={isAgreed}
            onChange={(e) => setIsAgreed(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
            disabled={validationErrors.length > 0}
          />
          <label htmlFor="agreement" className="text-sm text-gray-700">
            I have read and agree to the terms of this tenancy agreement
          </label>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!isAgreed || loading || isPdfGenerating || validationErrors.length > 0}
            className={`px-4 py-2 rounded transition-colors ${
              isAgreed && !loading && !isPdfGenerating && validationErrors.length === 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Preview Agreement
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || isPdfGenerating}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            Decline
          </button>
        </div>
      </form>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </ErrorBoundary>
  );
};

export default TenancyAgreementComponent;