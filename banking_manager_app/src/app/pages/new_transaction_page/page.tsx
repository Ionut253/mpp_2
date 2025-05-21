'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Account = {
  id: string;
  accountType: string;
  balance: number;
};

// Create a client component that uses useSearchParams
function NewTransactionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get('accountId');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    accountId: preselectedAccountId || '',
    type: 'DEPOSIT',
    amount: '0.00',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on component mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsFetchingAccounts(true);
      const response = await fetch('/api/customer/accounts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch accounts');
      }

      setAccounts(data.data.accounts);

      // If no account ID is preselected and we have accounts, select the first one
      if (!preselectedAccountId && data.data.accounts.length > 0) {
        setFormData(prev => ({
          ...prev,
          accountId: data.data.accounts[0].id
        }));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Failed to load accounts. Please try again later.');
    } finally {
      setIsFetchingAccounts(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Make sure amount is positive
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Transaction amount must be a positive number');
      }

      // Find the selected account to check balance for withdrawals
      const selectedAccount = accounts.find(a => a.id === formData.accountId);
      if (formData.type === 'WITHDRAWAL' && selectedAccount && selectedAccount.balance < amount) {
        throw new Error('Insufficient funds for this withdrawal');
      }

      const response = await fetch('/api/customer/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      // Redirect back to the customer dashboard
      router.push('/pages/customer_dashboard');
    } catch (error) {
      console.error('Error creating transaction:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while creating the transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">New Transaction</h1>
          <Link 
            href="/pages/customer_dashboard" 
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isFetchingAccounts ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>You don't have any accounts yet. Please create an account first.</p>
          <Link 
            href="/pages/accounts_page" 
            className="inline-block mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Open a New Account
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <select
                id="accountId"
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.accountType} - Balance: ${account.balance.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="DEPOSIT">Deposit</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USD)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="amount"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={handleChange}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                  placeholder="0.00"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">USD</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Transaction description"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Submit Transaction'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// This loading component will be shown during the suspended state
function LoadingFallback() {
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// This is the main exported component with Suspense boundary
export default function NewTransactionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewTransactionContent />
    </Suspense>
  );
} 