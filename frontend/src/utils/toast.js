/**
 * Toast notification utilities
 * Wrapper around react-hot-toast for consistent notifications
 */

import toast from 'react-hot-toast';

/**
 * Show success toast
 * @param {string} message - Success message
 */
export const showSuccess = (message) => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#10b981',
      color: '#fff',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
  });
};

/**
 * Show error toast
 * @param {string} message - Error message
 */
export const showError = (message) => {
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#ef4444',
      color: '#fff',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
  });
};

/**
 * Show warning toast
 * @param {string} message - Warning message
 */
export const showWarning = (message) => {
  toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#f59e0b',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

/**
 * Show info toast
 * @param {string} message - Info message
 */
export const showInfo = (message) => {
  toast(message, {
    duration: 4000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
    },
  });
};
