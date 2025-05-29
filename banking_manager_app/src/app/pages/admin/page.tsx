'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardData {
  summary: {
    totalCustomers: number;
    totalAccounts: number;
    totalTransactions: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: string;
    date: string;
    customer: string;
    accountType: string;
  }>;
  recentCustomers: Array<{
    id: string;
    name: string;
    email: string;
    date: string;
    accountCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string;
    details: string;
    date: string;
    user: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me')
      .then(response => response.json())
      .then(data => {
        if (!data.success || data.data.role !== 'ADMIN') {
          router.push('/pages/login_page');
          return;
        }
        setUser(data.data);
      })
      .catch(error => {
        console.error('Error checking auth status:', error);
        router.push('/pages/login_page');
      })
      .finally(() => {
        setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
              href="/pages/admin/users" 
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
            >
              Manage Users
            </Link>
            <Link 
              href="/pages/admin/monitoring" 
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Monitoring
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">User Management</h2>
          <p className="text-gray-600 mb-4">Manage system users, roles, and permissions.</p>
          <Link 
            href="/pages/admin/users"
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Go to Users
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">System Monitoring</h2>
          <p className="text-gray-600 mb-4">Monitor system performance and activity.</p>
          <Link 
            href="/pages/admin/monitoring"
            className="inline-block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            View Monitoring
          </Link>
        </div>
      </div>
    </div>
  );
} 