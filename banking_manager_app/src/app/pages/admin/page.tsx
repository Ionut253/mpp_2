'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser, isAdmin } from '@/lib/auth';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const currentUser = getAuthUser();
    if (!currentUser || !isAdmin()) {
      router.push('/pages/login_page');
      return;
    }
    setUser(currentUser);
    
    // Fetch dashboard data
    fetch('/api/admin/dashboard')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setDashboardData(data.data);
        }
      })
      .catch(error => {
        console.error('Error fetching dashboard data:', error);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      router.push('/pages/login_page');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="space-x-4">
            <Link 
              href="/" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Main Dashboard
            </Link>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <p className="text-gray-600">Logged in as: {user.email} (Admin)</p>
      </header>

      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add your dashboard content here using dashboardData */}
        </div>
      )}
    </div>
  );
} 