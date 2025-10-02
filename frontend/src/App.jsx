/**
 * Main App Component
 * File: src/App.jsx
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import LandlordDashboard from './components/LandlordDashboard';
import LodgerDashboard from './components/LodgerDashboard';
import { API_URL } from './config';

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const checkAuth = async () => {
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

            setLoading(false);
        };

        checkAuth();
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