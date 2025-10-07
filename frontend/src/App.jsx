/**
 * Main App Component
 * File: src/App.jsx
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import LandlordDashboard from './components/LandlordDashboard';
import LodgerDashboard from './components/LodgerDashboard';
import SetupWizard from './components/SetupWizard';
import { API_URL } from './config';

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

    // Logged in - show appropriate dashboard
    return (
        <div className="min-h-screen bg-gray-50">
            {user.user_type === 'landlord' || user.user_type === 'admin' ? (
                <LandlordDashboard user={user} token={token} onLogout={handleLogout} />
            ) : (
                <LodgerDashboard user={user} token={token} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;
