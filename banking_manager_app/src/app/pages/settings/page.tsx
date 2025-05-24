'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch current 2FA status
    fetch('/api/auth/get-2fa-status')
      .then(res => res.json())
      .then(data => {
        setIs2FAEnabled(data.twoFactorEnabled);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching 2FA status:', err);
        setError('Failed to load settings');
        setIsLoading(false);
      });
  }, []);

  const toggle2FA = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

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
                  disabled={isLoading}
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    is2FAEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className="sr-only">Toggle 2FA</span>
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                      is2FAEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                {is2FAEnabled
                  ? 'Two-factor authentication is enabled. You will need to enter a verification code sent to your email when logging in.'
                  : 'Enable two-factor authentication to add an extra layer of security to your account.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 