import React, { useEffect, useState } from 'react';

interface OfflineStatusIndicatorProps {
  isServerDown: boolean;
  isOffline: boolean;
}

const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  isServerDown,
  isOffline,
}) => {
  if (!isServerDown && !isOffline) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2">
      {isOffline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Network connection lost. Working in offline mode.
              </p>
            </div>
          </div>
        </div>
      )}
      {isServerDown && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Server is unreachable. Changes will be synced when connection is restored.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatusIndicator; 