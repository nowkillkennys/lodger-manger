// Find the OnboardingWizard component (lines ~652-850 in your demo)
// Copy entire component
import React, { useState } from 'react';
import { X, CheckCircle, ChevronLeft, ChevronRight, Upload, Info } from 'lucide-react';
import axios from 'axios';

const OnboardingWizard = ({ onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Lodger details
    fullName: '',
    email: '',
    phone: '',
    startDate: '',
    
    // Financial
    monthlyRent: '650',
    depositAmount: '650',
    depositApplicable: true,
    
    // Room details
    roomDescription: '',
    
    // Photo ID
    photoIdFile: null,
    photoIdType: 'passport',
    photoIdNumber: '',
    photoIdExpiry: '',
    photoPreview: null
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        } 
      };

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/tenancies/create`,
        formDataToSend,
        config
      );

      onComplete(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tenancy');
    } finally {
      setLoading(false);
    }
  };

  // Copy the JSX from your OnboardingWizard component here
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* ... rest of your OnboardingWizard JSX ... */}
    </div>
  );
};

export default OnboardingWizard;