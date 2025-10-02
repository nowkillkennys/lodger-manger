import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 rounded-md">
      {message}
    </div>
  );
};

export default ErrorMessage;