import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-4"
    >
      <div 
        className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-2"
        aria-hidden="true"
      />
      <p className="text-gray-600">{message}</p>
    </div>
  );
};

export default LoadingSpinner;