'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current 2FA status
    fetch('/api/auth/get-2fa-status')
      .then(res => res.json())
      .then(data => {
        setIs2FAEnabled(data.twoFactorEnabled);
        setIsInitialLoading(false);
      })
      .catch(err => {
        console.error('Error fetching 2FA status:', err);
        setError('Failed to load settings');
        setIsInitialLoading(false);
      });
  }, []);

  const toggle2FA = async () => {
    try {
      setIsToggling(true);
      setError(null);

      const response = await fetch('/api/auth/toggle-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle 2FA');
      }

      setIs2FAEnabled(data.data.twoFactorEnabled);
    } catch (err) {
      console.error('Error toggling 2FA:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle 2FA');
    } finally {
      setIsToggling(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <button
            onClick={handleBack}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add an extra layer of security to your account by requiring a verification code when logging in.
                </p>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  onClick={toggle2FA}
                  disabled={isInitialLoading || isToggling}
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    is2FAEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${(isInitialLoading || isToggling) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  role="switch"
                  aria-checked={is2FAEnabled}
                >
                  <span className="sr-only">Toggle 2FA</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                      is2FAEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <p className="mt-4 text-sm text-gray-500">
              {is2FAEnabled
                ? 'Two-factor authentication is enabled. You will need to enter a verification code sent to your email when logging in.'
                : 'Enable two-factor authentication to add an extra layer of security to your account.'}
            </p>
            
            {(isInitialLoading || isToggling) && (
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isInitialLoading ? 'Loading settings...' : 'Processing...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 