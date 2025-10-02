/**
 * API Utility Functions
 * File: src/utils/api.js
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Get authorization headers
 */
const getAuthHeaders = (token) => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'An error occurred');
    }
    
    return data;
};

/**
 * Generic API request function
 */
const apiRequest = async (endpoint, options = {}, token = null) => {
    const config = {
        ...options,
        headers: {
            ...options.headers,
            ...(token ? getAuthHeaders(token) : {}),
        },
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        return await handleResponse(response);
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// ============================================
// AUTHENTICATION
// ============================================

export const login = async (email, password) => {
    return apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
    });
};

export const getCurrentUser = async (token) => {
    return apiRequest('/api/auth/me', { method: 'GET' }, token);
};

// ============================================
// USERS
// ============================================

export const createUser = async (userData, token) => {
    return apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    }, token);
};

export const getUsers = async (token) => {
    return apiRequest('/api/users', { method: 'GET' }, token);
};

export const resetPassword = async (userId, newPassword, token) => {
    return apiRequest(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword }),
    }, token);
};

// ============================================
// PROPERTIES
// ============================================

export const getProperties = async (token) => {
    return apiRequest('/api/properties', { method: 'GET' }, token);
};

export const createProperty = async (propertyData, token) => {
    return apiRequest('/api/properties', {
        method: 'POST',
        body: JSON.stringify(propertyData),
    }, token);
};

// ============================================
// TENANCIES
// ============================================

export const getTenancies = async (token) => {
    return apiRequest('/api/tenancies', { method: 'GET' }, token);
};

export const getTenancy = async (tenancyId, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}`, { method: 'GET' }, token);
};

export const createTenancy = async (tenancyData, token) => {
    return apiRequest('/api/tenancies', {
        method: 'POST',
        body: JSON.stringify(tenancyData),
    }, token);
};

export const updateTenancy = async (tenancyId, updates, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    }, token);
};

// ============================================
// PAYMENTS
// ============================================

export const getPaymentSchedule = async (tenancyId, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}/payments`, { method: 'GET' }, token);
};

export const submitPayment = async (paymentId, amount, reference, token) => {
    return apiRequest(`/api/payments/${paymentId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ amount, payment_reference: reference }),
    }, token);
};

export const confirmPayment = async (paymentId, amount, notes, token) => {
    return apiRequest(`/api/payments/${paymentId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ amount, notes }),
    }, token);
};

export const getPaymentSummary = async (tenancyId, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}/payment-summary`, { method: 'GET' }, token);
};

// ============================================
// NOTICES
// ============================================

export const giveNotice = async (tenancyId, noticeData, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}/notice`, {
        method: 'POST',
        body: JSON.stringify(noticeData),
    }, token);
};

export const respondToNotice = async (noticeId, response, token) => {
    return apiRequest(`/api/notices/${noticeId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response }),
    }, token);
};

export const getNotices = async (tenancyId, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}/notices`, { method: 'GET' }, token);
};

// ============================================
// MAINTENANCE
// ============================================

export const getMaintenanceRequests = async (token) => {
    return apiRequest('/api/maintenance', { method: 'GET' }, token);
};

export const createMaintenanceRequest = async (requestData, token) => {
    return apiRequest('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify(requestData),
    }, token);
};

export const updateMaintenanceRequest = async (requestId, updates, token) => {
    return apiRequest(`/api/maintenance/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    }, token);
};

export const addMaintenanceComment = async (requestId, comment, isInternal, token) => {
    return apiRequest(`/api/maintenance/${requestId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment, is_internal: isInternal }),
    }, token);
};

export const getMaintenanceComments = async (requestId, token) => {
    return apiRequest(`/api/maintenance/${requestId}/comments`, { method: 'GET' }, token);
};

// ============================================
// DAMAGE REPORTS
// ============================================

export const getDamageReports = async (tenancyId, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}/damage-reports`, { method: 'GET' }, token);
};

export const createDamageReport = async (reportData, token) => {
    return apiRequest('/api/damage-reports', {
        method: 'POST',
        body: JSON.stringify(reportData),
    }, token);
};

export const getDepositRefund = async (tenancyId, token) => {
    return apiRequest(`/api/tenancies/${tenancyId}/deposit-refund`, { method: 'GET' }, token);
};

// ============================================
// TAX YEAR
// ============================================

export const getCurrentTaxYear = async (token) => {
    return apiRequest('/api/tax-year/current', { method: 'GET' }, token);
};

export const toggleTaxTracking = async (enabled, token) => {
    return apiRequest('/api/tax-year/toggle', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
    }, token);
};

// ============================================
// NOTIFICATIONS
// ============================================

export const getNotifications = async (token) => {
    return apiRequest('/api/notifications', { method: 'GET' }, token);
};

export const markNotificationRead = async (notificationId, token) => {
    return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
    }, token);
};

// ============================================
// BACKUP & RESTORE
// ============================================

export const createBackup = async (token) => {
    const response = await fetch(`${API_URL}/api/backup`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (!response.ok) {
        throw new Error('Backup failed');
    }
    
    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${new Date().toISOString()}.sql`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const getBackups = async (token) => {
    return apiRequest('/api/backups', { method: 'GET' }, token);
};

export const restoreBackup = async (file, token) => {
    const formData = new FormData();
    formData.append('backup', file);
    
    const response = await fetch(`${API_URL}/api/restore`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });
    
    return await handleResponse(response);
};

// ============================================
// FILE UPLOAD
// ============================================

export const uploadFile = async (file, type, token) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/upload/${type}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });
    
    return await handleResponse(response);
};

// ============================================
// LANDLORD PAYMENT DETAILS
// ============================================

export const getPaymentDetails = async (token) => {
    return apiRequest('/api/payment-details', { method: 'GET' }, token);
};

export const updatePaymentDetails = async (detailsId, updates, token) => {
    return apiRequest(`/api/payment-details/${detailsId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    }, token);
};

// ============================================
// PDF GENERATION
// ============================================

export const generateAgreementPDF = async (tenancyId, token) => {
    const response = await fetch(`${API_URL}/api/tenancies/${tenancyId}/generate-agreement`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate agreement');
    }
    
    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lodger-Agreement-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const downloadAgreementPDF = async (tenancyId, token) => {
    const response = await fetch(`${API_URL}/api/tenancies/${tenancyId}/download-agreement`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (!response.ok) {
        throw new Error('Failed to download agreement');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lodger-Agreement.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const generateNoticePDF = async (noticeId, token) => {
    const response = await fetch(`${API_URL}/api/notices/${noticeId}/generate-letter`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate notice');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Termination-Notice.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const previewAgreementPDF = async (tenancyId, token) => {
    const response = await fetch(`${API_URL}/api/tenancies/${tenancyId}/preview-agreement`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (!response.ok) {
        throw new Error('Failed to preview agreement');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Agreement-Preview.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const generatePaymentReceiptPDF = async (paymentId, token) => {
    const response = await fetch(`${API_URL}/api/payments/${paymentId}/generate-receipt`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    
    if (!response.ok) {
        throw new Error('Failed to generate receipt');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payment-Receipt.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
    }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

/**
 * Format datetime
 */
export const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Calculate days between dates
 */
export const daysBetween = (date1, date2) => {
    const diffTime = Math.abs(new Date(date2) - new Date(date1));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is in the past
 */
export const isPast = (date) => {
    return new Date(date) < new Date();
};

/**
 * Check if date is upcoming (within X days)
 */
export const isUpcoming = (date, days = 7) => {
    const now = new Date();
    const target = new Date(date);
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= days;
};

export default {
    login,
    getCurrentUser,
    createUser,
    getUsers,
    resetPassword,
    getProperties,
    createProperty,
    getTenancies,
    getTenancy,
    createTenancy,
    updateTenancy,
    getPaymentSchedule,
    submitPayment,
    confirmPayment,
    getPaymentSummary,
    giveNotice,
    respondToNotice,
    getNotices,
    getMaintenanceRequests,
    createMaintenanceRequest,
    updateMaintenanceRequest,
    addMaintenanceComment,
    getMaintenanceComments,
    getDamageReports,
    createDamageReport,
    getDepositRefund,
    getCurrentTaxYear,
    toggleTaxTracking,
    getNotifications,
    markNotificationRead,
    createBackup,
    getBackups,
    restoreBackup,
    uploadFile,
    getPaymentDetails,
    updatePaymentDetails,
    formatCurrency,
    formatDate,
    formatDateTime,
    daysBetween,
    isPast,
    isUpcoming,
};