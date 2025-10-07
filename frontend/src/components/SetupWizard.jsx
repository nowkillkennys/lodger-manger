/**
 * Setup Wizard Component
 * Handles initial system setup when no users exist
 */

import React, { useState } from 'react';
import AdminPasswordSetup from './AdminPasswordSetup';
import LandlordAccountCreation from './LandlordAccountCreation';
import { API_URL } from '../config';

function SetupWizard({ onSetupComplete }) {
    const [currentStep, setCurrentStep] = useState('admin-password');
    const [adminToken, setAdminToken] = useState(null);

    const handleAdminPasswordSet = (token) => {
        setAdminToken(token);
        setCurrentStep('landlord-creation');
    };

    const handleLandlordCreated = () => {
        onSetupComplete();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        System Setup
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Welcome! Let's get your system ready for first use.
                    </p>
                </div>

                <div className="bg-white py-8 px-6 shadow rounded-lg">
                    {/* Progress indicator */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center space-x-4">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                currentStep === 'admin-password'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-green-500 text-white'
                            }`}>
                                1
                            </div>
                            <div className={`flex-1 h-1 ${
                                currentStep === 'landlord-creation'
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-200'
                            }`}></div>
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                currentStep === 'landlord-creation'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                2
                            </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-600">
                            <span>Admin Password</span>
                            <span>Landlord Account</span>
                        </div>
                    </div>

                    {/* Step content */}
                    {currentStep === 'admin-password' && (
                        <AdminPasswordSetup onPasswordSet={handleAdminPasswordSet} />
                    )}

                    {currentStep === 'landlord-creation' && (
                        <LandlordAccountCreation
                            adminToken={adminToken}
                            onLandlordCreated={handleLandlordCreated}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default SetupWizard;