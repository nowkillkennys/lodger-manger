import React, { useState } from 'react';
import axios from 'axios';

const Agreement = ({ tenancyId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateAgreement = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios({
        url: `/api/agreements/generate`,
        method: 'POST',
        data: { tenancyId },
        responseType: 'blob'
      });

      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agreement-${tenancyId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate agreement. Please try again.');
      console.error('Agreement generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={generateAgreement}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Agreement'}
      </button>
      {error && (
        <p className="text-red-500 mt-2 text-sm">{error}</p>
      )}
    </div>
  );
};

export default Agreement;