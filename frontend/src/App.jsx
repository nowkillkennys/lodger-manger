/**
 * Main App Component
 * File: src/App.jsx
 */

import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import LandlordDashboard from './components/LandlordDashboard';
import LodgerDashboard from './components/LodgerDashboard';
import AdminDashboard from './components/AdminDashboard';
import SystemAdminDashboard from './components/SystemAdminDashboard';
import SetupWizard from './components/SetupWizard';
import { API_URL } from './config';

import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "https://acda07d0377dc8373f2e18e8e7ee23f5@o4510150914736128.ingest.de.sentry.io/4510150919323728",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,

    integrations: [Sentry.browserTracingIntegration(), Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }), Sentry.replayIntegration()],

        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
        // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    enableLogs: true,
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0 // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [needsSetup, setNeedsSetup] = useState(false);

    // Check setup status and existing session on mount
    useEffect(() => {
        const checkSetupAndAuth = async () => {
            try {
                // First check if system needs initial setup
                const setupResponse = await fetch(`${API_URL}/api/setup/status`);
                if (setupResponse.ok) {
                    const setupData = await setupResponse.json();
                    if (setupData.needs_setup) {
                        setNeedsSetup(true);
                        setLoading(false);
                        return;
                    }
                }

                // If setup not needed, check for existing session
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');

                if (storedToken && storedUser) {
                    try {
                        // Verify token is still valid
                        const response = await fetch(`${API_URL}/api/auth/me`, {
                            headers: {
                                'Authorization': `Bearer ${storedToken}`,
                            },
                        });

                        if (response.ok) {
                            const userData = await response.json();
                            setUser(userData);
                            setToken(storedToken);
                        } else {
                            // Token invalid, clear storage
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                        }
                    } catch (error) {
                        console.error('Auth check failed:', error);
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                }
            } catch (error) {
                console.error('Setup/Auth check failed:', error);
            }

            setLoading(false);
        };

        checkSetupAndAuth();
    }, []);

    const handleLoginSuccess = (userData, userToken) => {
        console.log('🔑 Login Success - User data received:', userData);
        console.log('🔑 Login Success - User type:', userData?.user_type);
        console.log('🔑 Login Success - User email:', userData?.email);
        setUser(userData);
        setToken(userToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
    };

    const handleSetupComplete = () => {
        setNeedsSetup(false);
        // Trigger a re-check of auth status
        window.location.reload();
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Setup needed
    if (needsSetup) {
        return <SetupWizard onSetupComplete={handleSetupComplete} />;
    }

    // Not logged in
    if (!user || !token) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    // Debug logging
    console.log('🔍 App.jsx - User data:', user);
    console.log('🔍 App.jsx - User type:', user?.user_type);
    console.log('🔍 App.jsx - User email:', user?.email);
    console.log('🔍 App.jsx - Available user types: sys_admin, admin, landlord, lodger');

    // Debug logging
    console.log('App.jsx - User data:', user);
    console.log('App.jsx - User type:', user?.user_type);
    console.log('App.jsx - User email:', user?.email);

    // Logged in - show appropriate dashboard
    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster />
            {user.user_type === 'sys_admin' ? (
                <>
                    {console.log('App.jsx - Loading SystemAdminDashboard for sys_admin:', user.email)}
                    <SystemAdminDashboard user={user} onLogout={handleLogout} />
                </>
            ) : user.user_type === 'admin' ? (
                <>
                    {console.log('App.jsx - Loading AdminDashboard for admin:', user.email)}
                    <AdminDashboard user={user} onLogout={handleLogout} />
                </>
            ) : user.user_type === 'landlord' ? (
                <>
                    {console.log('App.jsx - Loading LandlordDashboard for landlord:', user.email)}
                    <LandlordDashboard user={user} token={token} onLogout={handleLogout} />
                </>
            ) : user.user_type === 'lodger' ? (
                <>
                    {console.log('App.jsx - Loading LodgerDashboard for lodger:', user.email)}
                    <LodgerDashboard user={user} token={token} onLogout={handleLogout} />
                </>
            ) : (
                <>
                    {console.log('App.jsx - Unknown user type:', user?.user_type)}
                    <div>Unknown user type: {user?.user_type}</div>
                </>
            )}
        </div>
    );
}

export default App;
