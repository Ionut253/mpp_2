'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Account, Customer, Transaction } from '@/generated/client/default';

interface TransactionWithAccount extends Transaction {
  account?: {
    accountType: string;
  };
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const profileResponse = await fetch('/api/customer/profile');
      
      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          router.push('/pages/login_page');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error(profileData.error || 'Failed to fetch profile');
      }
      
      setCustomer(profileData.data.customer);
      
      const accountsResponse = await fetch('/api/customer/accounts');
      const accountsData = await accountsResponse.json();
      
      if (accountsResponse.ok && accountsData.success) {
        setAccounts(accountsData.data.accounts);
        
        const transactionsResponse = await fetch('/api/customer/transactions?limit=10');
        const transactionsData = await transactionsResponse.json();
        
        if (transactionsResponse.ok && transactionsData.success) {
          setTransactions(transactionsData.data.transactions);
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load customer data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = () => {
    router.push('/pages/accounts_page');
  };

  const handleEditProfile = () => {
    router.push('/pages/customer_profile');
  };

  const handleNewTransaction = (accountId: string) => {
    router.push(`/pages/new_transaction_page?accountId=${accountId}`);
  };

  const handleViewAccountDetails = (accountId: string) => {
    router.push(`/pages/transactions_page?accountId=${accountId}`);
  };

  const handleViewAllTransactions = () => {
    router.push('/pages/transactions_page');
  };

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

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Customer Dashboard</h1>
          <div className="space-x-4">
            <Link 
              href="/pages/settings" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Security Settings
            </Link>
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
        {customer && (
          <p className="text-gray-600">
            Welcome, {customer.firstName} {customer.lastName}
          </p>
        )}
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          {customer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {customer.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                )}
                {customer.dob && (
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium">{new Date(customer.dob).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              {customer.address && (
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{customer.address}</p>
                </div>
              )}
              
              <div className="pt-4">
                <button 
                  className="text-blue-500 hover:text-blue-700"
                  onClick={handleEditProfile}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>
          {accounts.length > 0 ? (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{account.accountType} Account</p>
                      <p className="text-sm text-gray-500">ID: {account.id.slice(-8)}</p>
                      <p className="text-xs text-gray-400">Created: {new Date(account.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Balance</p>
                      <p className="font-bold text-lg">${account.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <button 
                      className="text-blue-500 hover:text-blue-700 mr-4"
                      onClick={() => handleViewAccountDetails(account.id)}
                    >
                      View Details
                    </button>
                    <button 
                      className="text-green-500 hover:text-green-700"
                      onClick={() => handleNewTransaction(account.id)}
                    >
                      New Transaction
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-4"
                  onClick={handleAddAccount}
                >
                  Open New Account
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">You don't have any accounts yet.</p>
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handleAddAccount}
              >
                Open Your First Account
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const account = accounts.find(a => a.id === transaction.accountId);
                  return (
                    <tr key={transaction.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {account?.accountType || transaction.account?.accountType || 'Unknown'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          transaction.type === 'DEPOSIT' ? 'bg-green-100 text-green-800' :
                          transaction.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {transaction.description || 'No description'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">No recent transactions</p>
          </div>
        )}
        <div className="mt-4 text-right">
          <button 
            className="text-blue-500 hover:text-blue-700"
            onClick={handleViewAllTransactions}
          >
            View All Transactions
          </button>
        </div>
      </div>
    </div>
  );
} 