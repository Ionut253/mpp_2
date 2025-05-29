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
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!isMounted) return;

        if (!data.success) {
          setError('Authentication failed');
          setIsAuthorized(false);
          return;
        }

        if (data.data.role !== 'ADMIN') {
          setError('You must be an admin to view this page');
          setIsAuthorized(false);
          return;
        }

        setUser(data.data);
        setIsAuthorized(true);
        
        // Only fetch dashboard data if user is authorized
        try {
          const dashResponse = await fetch('/api/admin/dashboard');
          const dashData = await dashResponse.json();
          
          if (!isMounted) return;

          if (dashData.success) {
            setDashboardData(dashData.data);
          }
        } catch (dashError) {
          console.error('Error fetching dashboard data:', dashError);
          setError('Failed to load dashboard data');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        if (isMounted) {
          setError('Failed to verify authentication');
          setIsAuthorized(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      router.push('/login_page');
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error || 'You do not have permission to view this page.'}</p>
          <div className="flex justify-center">
            <Link
              href="/login_page"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
            >
              Go to Login
            </Link>
          </div>
        </div>
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
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Customers</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboardData.summary.totalCustomers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Accounts</h3>
              <p className="text-3xl font-bold text-green-600">{dashboardData.summary.totalAccounts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Transactions</h3>
              <p className="text-3xl font-bold text-purple-600">{dashboardData.summary.totalTransactions}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h3>
              <div className="space-y-4">
                {dashboardData.recentTransactions.map(tx => (
                  <div key={tx.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{tx.customer}</p>
                        <p className="text-sm text-gray-600">{tx.accountType}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount}
                        </p>
                        <p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Customers */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Customers</h3>
              <div className="space-y-4">
                {dashboardData.recentCustomers.map(customer => (
                  <div key={customer.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600">{customer.accountCount} accounts</p>
                        <p className="text-sm text-gray-500">{new Date(customer.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {dashboardData.recentActivity.map(activity => (
                  <div key={activity.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{activity.action} {activity.entity}</p>
                        <p className="text-sm text-gray-600">{activity.details}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{activity.user}</p>
                        <p className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 