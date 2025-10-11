/**
 * API Utility Functions
 * File: src/utils/api.js
 * Enhanced with authentication management and token refresh
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3003';

// Force correct API URL for development
const FORCE_API_URL = 'http://localhost:3003';

// Use forced URL if environment variable is default
const FINAL_API_URL = API_URL.includes('3001') ? FORCE_API_URL : API_URL;

// Log API URL for debugging
console.log('🔗 API Configuration:', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    DEFAULT_API_URL: API_URL,
    FORCE_API_URL: FORCE_API_URL,
    FINAL_API_URL: FINAL_API_URL,
    BACKEND_PORT: 3003
});

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
 * Check if token is expired
 */
const isTokenExpired = (token) => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        return payload.exp < currentTime;
    } catch (error) {
        return true; // Invalid token format
    }
};

/**
 * Get stored authentication data
 */
const getStoredAuth = () => {
    try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            return null;
        }

        // Check if token is expired
        if (isTokenExpired(token)) {
            console.warn('Token expired, clearing stored auth');
            clearStoredAuth();
            return null;
        }

        return {
            token,
            user: JSON.parse(user)
        };
    } catch (error) {
        console.error('Error getting stored auth:', error);
        clearStoredAuth();
        return null;
    }
};

/**
 * Store authentication data
 */
const setStoredAuth = (token, user) => {
    try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
        console.error('Error storing auth:', error);
    }
};

/**
 * Clear stored authentication data
 */
const clearStoredAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

/**
 * Handle API response with authentication error handling
 */
const handleResponse = async (response) => {
    const data = await response.json();

    if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
            console.warn('Authentication failed (401), clearing stored auth');
            clearStoredAuth();

            // Trigger login redirect if available
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }

            throw new Error('Authentication required. Please log in again.');
        }

        if (response.status === 403) {
            console.warn('Access forbidden (403):', data.error);

            // Check if it's a token issue
            const auth = getStoredAuth();
            if (auth && isTokenExpired(auth.token)) {
                clearStoredAuth();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                throw new Error('Session expired. Please log in again.');
            }

            throw new Error(data.error || 'Access denied. Insufficient permissions.');
        }

        throw new Error(data.error || 'An error occurred');
    }

    return data;
};

/**
 * Generic API request function with automatic authentication
 */
const apiRequest = async (endpoint, options = {}, token = null) => {
    // Use provided token or get from storage
    const authToken = token || (getStoredAuth()?.token);

    const config = {
        ...options,
        headers: {
            ...options.headers,
            ...(authToken ? getAuthHeaders(authToken) : {}),
        },
    };

    try {
        const response = await fetch(`${FINAL_API_URL}${endpoint}`, config);
        return await handleResponse(response);
    } catch (error) {
        console.error('API request failed:', error);

        // If authentication error, ensure auth is cleared
        if (error.message.includes('Authentication required') ||
            error.message.includes('Session expired') ||
            error.message.includes('Access denied')) {
            clearStoredAuth();
        }

        throw error;
    }
};

// ============================================
// AUTHENTICATION
// ============================================

export const login = async (email, password) => {
    try {
        const response = await fetch(`${FINAL_API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await handleResponse(response);

        // Store authentication data
        if (data.token && data.user) {
            setStoredAuth(data.token, data.user);
        }

        return data;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};

export const logout = () => {
    clearStoredAuth();
    window.location.href = '/login';
};

export const getCurrentUser = async (token) => {
    return apiRequest('/api/auth/me', { method: 'GET' }, token);
};

export const isAuthenticated = () => {
    const auth = getStoredAuth();
    return auth && auth.token && !isTokenExpired(auth.token);
};

export const getCurrentUserRole = () => {
    const auth = getStoredAuth();
    return auth?.user?.user_type || null;
};

export const hasRole = (role) => {
    const userRole = getCurrentUserRole();
    return userRole === role;
};

export const hasAnyRole = (roles) => {
    const userRole = getCurrentUserRole();
    return roles.includes(userRole);
};

export const requireAuth = () => {
    if (!isAuthenticated()) {
        logout();
        return false;
    }
    return true;
};

export const requireRole = (role) => {
    if (!requireAuth()) return false;

    if (!hasRole(role)) {
        console.error(`Access denied. Required role: ${role}, Current role: ${getCurrentUserRole()}`);
        return false;
    }

    return true;
};

export const requireAnyRole = (roles) => {
    if (!requireAuth()) return false;

    if (!hasAnyRole(roles)) {
        console.error(`Access denied. Required roles: ${roles.join(', ')}, Current role: ${getCurrentUserRole()}`);
        return false;
    }

    return true;
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
    const response = await fetch(`${FINAL_API_URL}/api/backup`, {
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

    const response = await fetch(`${FINAL_API_URL}/api/restore`, {
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

    const response = await fetch(`${FINAL_API_URL}/api/upload/${type}`, {
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
    const response = await fetch(`${FINAL_API_URL}/api/tenancies/${tenancyId}/generate-agreement`, {
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
    const response = await fetch(`${FINAL_API_URL}/api/tenancies/${tenancyId}/download-agreement`, {
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
    const response = await fetch(`${FINAL_API_URL}/api/notices/${noticeId}/generate-letter`, {
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
    const response = await fetch(`${FINAL_API_URL}/api/tenancies/${tenancyId}/preview-agreement`, {
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
    const response = await fetch(`${FINAL_API_URL}/api/payments/${paymentId}/generate-receipt`, {
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

/**
 * Debug authentication state (useful for troubleshooting)
 */
export const debugAuthState = () => {
    const auth = getStoredAuth();
    const token = auth?.token;
    const user = auth?.user;

    console.group('🔐 Authentication Debug Info');
    console.log('Is authenticated:', isAuthenticated());
    console.log('Current user:', user);
    console.log('User role:', getCurrentUserRole());
    console.log('Token exists:', !!token);

    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Token payload:', payload);
            console.log('Token expires:', new Date(payload.exp * 1000));
            console.log('Token expired:', isTokenExpired(token));
        } catch (error) {
            console.error('Invalid token format:', error);
        }
    }

    console.log('API URL:', FINAL_API_URL);
    console.groupEnd();

    return {
        isAuthenticated: isAuthenticated(),
        user,
        role: getCurrentUserRole(),
        tokenExists: !!token,
        tokenExpired: token ? isTokenExpired(token) : true,
        apiUrl: FINAL_API_URL
    };
};

/**
 * Quick authentication fix - clears expired tokens and redirects to login
 */
export const fixAuthIssues = () => {
    console.log('🔧 Running authentication diagnostics...');

    const debugInfo = debugAuthState();

    if (!debugInfo.tokenExists) {
        console.log('❌ No token found - redirecting to login');
        logout();
        return false;
    }

    if (debugInfo.tokenExpired) {
        console.log('⏰ Token expired - clearing and redirecting to login');
        clearStoredAuth();
        window.location.href = '/login';
        return false;
    }

    if (!debugInfo.isAuthenticated) {
        console.log('❌ Not properly authenticated - clearing auth data');
        clearStoredAuth();
        window.location.href = '/login';
        return false;
    }

    if (!debugInfo.role) {
        console.log('❌ No user role found - clearing auth data');
        clearStoredAuth();
        window.location.href = '/login';
        return false;
    }

    console.log('✅ Authentication appears valid');
    console.log('User:', debugInfo.user.email);
    console.log('Role:', debugInfo.role);

    return true;
};

/**
 * Test admin authentication and permissions
 */
export const testAdminAuth = async () => {
    console.log('🧪 Testing admin authentication...');

    try {
        // First check if we can get the current user
        const userResponse = await fetch(`${FINAL_API_URL}/api/auth/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                console.log('❌ Authentication failed - token invalid or expired');
                return false;
            }
            if (userResponse.status === 403) {
                console.log('❌ Access forbidden - insufficient permissions');
                return false;
            }
        }

        const userData = await userResponse.json();
        console.log('✅ Current user:', userData);

        // Test if we can access admin-only endpoints
        const usersResponse = await fetch(`${FINAL_API_URL}/api/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (usersResponse.ok) {
            console.log('✅ Admin permissions confirmed');
            return true;
        } else if (usersResponse.status === 403) {
            console.log('❌ Admin permissions not granted');
            return false;
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
};

export default {
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    getCurrentUserRole,
    hasRole,
    hasAnyRole,
    requireAuth,
    requireRole,
    requireAnyRole,
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
    debugAuthState,
    fixAuthIssues,
    testAdminAuth,
};

// Also export individual functions for convenience
export {
    login,
    logout,
    getCurrentUser,
    isAuthenticated,
    getCurrentUserRole,
    hasRole,
    hasAnyRole,
    requireAuth,
    requireRole,
    requireAnyRole,
    debugAuthState,
    fixAuthIssues,
    testAdminAuth,
};