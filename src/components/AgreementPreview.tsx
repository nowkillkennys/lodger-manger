import React from 'react';
import type { TenancyAgreement } from '../types/TenancyAgreement';
import { formatDate } from '../utils/dateUtils';

interface AgreementPreviewProps {
  agreement: TenancyAgreement;
  onApprove: () => void;
  onEdit: () => void;
}

const AgreementPreview: React.FC<AgreementPreviewProps> = ({
  agreement,
  onApprove,
  onEdit,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center mb-4">Agreement Preview</h2>
        <p className="text-gray-500 text-sm text-center">Please review the agreement details before generating the PDF</p>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold mb-2">Parties</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Landlord</h4>
              <p>{agreement.landlordDetails.name}</p>
              <p className="text-sm text-gray-600">{agreement.landlordDetails.address}</p>
            </div>
            <div>
              <h4 className="font-medium">Tenant</h4>
              <p>{agreement.tenantDetails.name}</p>
              <p className="text-sm text-gray-600">{agreement.tenantDetails.currentAddress}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Property Details</h3>
          <p>{agreement.propertyDetails.address}</p>
          {agreement.propertyDetails.roomNumber && (
            <p className="text-sm text-gray-600">Room: {agreement.propertyDetails.roomNumber}</p>
          )}
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Financial Terms</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Rent:</strong> £{agreement.rentAmount} per {agreement.rentPaymentFrequency}</p>
              <p><strong>Deposit:</strong> £{agreement.depositAmount}</p>
            </div>
            <div>
              <p><strong>Payment Method:</strong> {agreement.paymentMethod}</p>
              <p><strong>Notice Period:</strong> {agreement.noticePeriod} days</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Terms</h3>
          <div className="space-y-2">
            <div>
              <h4 className="font-medium">House Rules</h4>
              <ul className="list-disc list-inside">
                {agreement.houseRules.map((rule, index) => (
                  <li key={index} className="text-sm">{rule}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Utilities Included</h4>
              <ul className="list-disc list-inside">
                {agreement.utilitiesIncluded.map((utility, index) => (
                  <li key={index} className="text-sm">{utility}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={onEdit}
          className="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
        >
          Edit Agreement
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generate PDF
        </button>
      </div>
    </div>
  );
};

export default AgreementPreview;