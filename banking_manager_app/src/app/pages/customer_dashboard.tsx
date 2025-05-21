'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Account, Customer, Transaction } from '@/generated/client/default';

// Extended type to include the account relationship
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

  useEffect(() => {
    // Fetch customer data when component mounts
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current customer profile
      const profileResponse = await fetch('/api/customer/profile');
      
      if (!profileResponse.ok) {
        // If unauthorized, redirect to login
        if (profileResponse.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }
      
      const profileData = await profileResponse.json();
      
      if (!profileData.success) {
        throw new Error(profileData.error || 'Failed to fetch profile');
      }
      
      setCustomer(profileData.data.customer);
      
      // Get customer accounts
      const accountsResponse = await fetch(`/api/customer/accounts`);
      const accountsData = await accountsResponse.json();
      
      if (accountsResponse.ok && accountsData.success) {
        setAccounts(accountsData.data.accounts);
        
        // Get recent transactions
        const transactionsResponse = await fetch(`/api/customer/transactions?limit=10`);
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
    router.push('/customer/accounts/new');
  };

  const handleEditProfile = () => {
    router.push('/customer/profile/edit');
  };

  const handleNewTransaction = (accountId: string) => {
    router.push(`/customer/transactions/new?accountId=${accountId}`);
  };

  const handleViewAccountDetails = (accountId: string) => {
    // For now, we'll just show the transactions for this account
    router.push(`/customer/transactions?accountId=${accountId}`);
  };

  const handleViewAllTransactions = () => {
    router.push('/customer/transactions');
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
              href="/" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Main Dashboard
            </Link>
            <Link 
              href="/api/auth/logout" 
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Logout
            </Link>
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